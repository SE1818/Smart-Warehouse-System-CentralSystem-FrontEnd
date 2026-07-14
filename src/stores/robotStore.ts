import { create } from 'zustand';
import * as signalR from '@microsoft/signalr';
import { robotService } from '@/services/robot';
import type { Robot } from '@/types/robot';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

// Extended Robot interface to support UI fields from RobotMonitorPage (currentX, currentY, batteryLevel)
export interface MonitorRobot extends Robot {
  currentX: number;
  currentY: number;
  batteryLevel: number;
  ipAddress?: string;
}

interface RobotState {
  robots: MonitorRobot[];
  status: 'connected' | 'connecting' | 'disconnected';
  connection: signalR.HubConnection | null;
  logs: LogEntry[];
  fetchRobots: () => Promise<void>;
  connect: () => void;
  disconnect: () => void;
  clearLogs: () => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
}

let activeConnectionsCount = 0;

export const useRobotStore = create<RobotState>((set, get) => {
  return {
    robots: [],
    status: 'disconnected',
    connection: null,
    logs: [],

    addLog: (message, type = 'info') => {
      const newLog: LogEntry = {
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        type,
        message,
      };
      set((state) => ({
        logs: [...state.logs.slice(-99), newLog], // Keep last 100 logs
      }));
    },

    clearLogs: () => set({ logs: [] }),

    fetchRobots: async () => {
      try {
        const data = await robotService.listRobots();
        // Map standard Robot to MonitorRobot containing both properties
        const mapped: MonitorRobot[] = data.map((r) => ({
          ...r,
          currentX: r.x,
          currentY: r.y,
          batteryLevel: r.battery,
        }));
        set({ robots: mapped });
        get().addLog(`Đã đồng bộ thông tin của ${mapped.length} robot AMR từ database.`, 'success');
      } catch (err) {
        console.error('Error fetching robots in store:', err);
        get().addLog('Không thể kết nối API để tải danh sách robot.', 'error');
      }
    },

    connect: () => {
      activeConnectionsCount++;
      if (get().connection) {
        // Connection already exists, skip creation
        return;
      }

      set({ status: 'connecting' });
      get().addLog('Đang kết nối đến Robot Hub...', 'info');

      const token = localStorage.getItem('authToken');
      const connectionUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/robots/tracking-hub`;

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(connectionUrl, {
          accessTokenFactory: () => token || '',
          headers: import.meta.env.DEV ? { 'ngrok-skip-browser-warning': 'true' } : undefined,
        })
        .configureLogging(signalR.LogLevel.Information)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            const delay = Math.min(2000 * Math.pow(2, retryContext.previousRetryCount), 30000);
            get().addLog(`Thử kết nối lại Robot Hub lần #${retryContext.previousRetryCount + 1} sau ${delay}ms...`, 'warning');
            return delay;
          }
        })
        .build();

      connection.on('ReceiveRobotLocation', (updatedRobot: any) => {
        set((state) => {
          const idx = state.robots.findIndex((r) => r.id === updatedRobot.id);
          const mapped: MonitorRobot = {
            id: updatedRobot.id,
            name: updatedRobot.name,
            x: updatedRobot.x,
            y: updatedRobot.y,
            battery: updatedRobot.battery,
            status: updatedRobot.status,
            destination: updatedRobot.destination,
            currentX: updatedRobot.x,
            currentY: updatedRobot.y,
            batteryLevel: updatedRobot.battery,
          };

          const newRobots = [...state.robots];
          if (idx > -1) {
            newRobots[idx] = { ...newRobots[idx], ...mapped };
          } else {
            newRobots.push(mapped);
          }
          return { robots: newRobots };
        });

        get().addLog(
          `Robot [${updatedRobot.name || updatedRobot.id.substring(0, 8)}] cập nhật vị trí: (${updatedRobot.x}, ${updatedRobot.y}) | Pin: ${updatedRobot.battery?.toFixed(0)}%`,
          'info'
        );
      });

      connection.on('ReceiveRobotStatusChanged', (data: { robotId: string; status: string; batteryLevel: number }) => {
        set((state) => {
          const idx = state.robots.findIndex((r) => r.id === data.robotId);
          if (idx > -1) {
            const newRobots = [...state.robots];
            const displayStatus = data.status.length > 0 ? (data.status.charAt(0).toUpperCase() + data.status.slice(1).toLowerCase()) : 'Idle';
            newRobots[idx] = {
              ...newRobots[idx],
              status: displayStatus as any,
              battery: data.batteryLevel,
              batteryLevel: data.batteryLevel,
            };
            return { robots: newRobots };
          }
          return {};
        });

        get().addLog(`Robot [ID: ${data.robotId.substring(0, 8)}] thay đổi trạng thái sang "${data.status}"`, 'warning');
      });

      connection.onreconnecting((error) => {
        set({ status: 'connecting' });
        get().addLog(`Mất kết nối Robot Hub. Đang thử kết nối lại... Chi tiết: ${error?.message}`, 'warning');
      });

      connection.onreconnected((connectionId) => {
        set({ status: 'connected' });
        get().addLog(`Đã kết nối lại Robot Hub thành công. Connection ID: ${connectionId}`, 'success');
        // Re-sync initial data after reconnecting
        get().fetchRobots();
      });

      const startConnection = () => {
        if (!get().connection) return;
        connection.start()
          .then(() => {
            set({ status: 'connected', connection });
            get().addLog('Kết nối SignalR Hub thành công.', 'success');
          })
          .catch((err) => {
            set({ status: 'disconnected' });
            get().addLog(`Kết nối SignalR Hub thất bại: ${err.message}`, 'error');
            setTimeout(() => {
              if (get().connection && get().status === 'disconnected') {
                get().addLog('Thử kết nối lại Robot Hub...', 'info');
                set({ status: 'connecting' });
                startConnection();
              }
            }, 5000);
          });
      };

      connection.onclose((error) => {
        set({ status: 'disconnected' });
        get().addLog(`Kết nối Robot Hub bị đóng: ${error?.message}`, 'error');
        setTimeout(() => {
          if (get().connection && get().status === 'disconnected') {
            get().addLog('Thử khởi động lại kết nối Robot Hub...', 'info');
            set({ status: 'connecting' });
            startConnection();
          }
        }, 10000);
      });

      set({ connection });
      startConnection();
    },

    disconnect: () => {
      activeConnectionsCount = Math.max(0, activeConnectionsCount - 1);
      if (activeConnectionsCount === 0 && get().connection) {
        const conn = get().connection;
        set({ connection: null, status: 'disconnected' });
        conn?.stop().catch((e) => console.error('Error stopping Robot Hub connection:', e));
      }
    },
  };
});
