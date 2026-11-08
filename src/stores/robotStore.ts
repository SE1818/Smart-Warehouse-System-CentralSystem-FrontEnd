import { create } from 'zustand';
import * as signalR from '@microsoft/signalr';
import { robotService } from '@/services/robot';
import { resolveBaseUrl, resolveEdgeBaseUrl, getValidAuthTokenOrRefresh, handleSignalR401, isUnauthorizedError } from '@/services/api';
import { sqliteService } from '@/services/sqliteService';
import { edgeSyncService } from '@/services/edgeSyncService';
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
let disconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isInitiatingConnection = false;

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

      // Silently persist activity / transfer log to local SQLite
      void sqliteService.saveTransferLog({
        errorNotes: message,
        statusResult: type,
        robotId: 'AMR',
        transferRequestId: 'LOG-EVENT',
        createdAt: new Date().toISOString(),
      });
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
      if (disconnectTimeoutId) {
        clearTimeout(disconnectTimeoutId);
        disconnectTimeoutId = null;
      }

      const existingConn = get().connection;
      if (
        isInitiatingConnection ||
        (existingConn &&
          (existingConn.state === signalR.HubConnectionState.Connected ||
           existingConn.state === signalR.HubConnectionState.Connecting))
      ) {
        // Connection already in progress or connected, skip creation to avoid duplicate websockets
        return;
      }

      isInitiatingConnection = true;
      set({ status: 'connecting' });
      get().addLog('Đang kết nối đến Robot Hub...', 'info');

      // If running on Local Edge (port 3200 or LAN hostname), connect to Local Edge Robot Hub directly
      const isEdge = typeof window !== 'undefined' && (window.location.port === '3200' || window.location.hostname?.endsWith('.local'));
      let connectionUrl = '';
      if (isEdge) {
        const edgeBase = resolveEdgeBaseUrl().replace(/\/+$/, '');
        connectionUrl = edgeBase.endsWith('/v1')
          ? `${edgeBase}/robots/tracking-hub`
          : `${edgeBase}/v1/robots/tracking-hub`;
      } else {
        const cleanBase = resolveBaseUrl().replace(/\/+$/, '');
        connectionUrl = cleanBase.endsWith('/v1')
          ? `${cleanBase}/robots/tracking-hub`
          : `${cleanBase}/v1/robots/tracking-hub`;
      }

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(connectionUrl, {
          accessTokenFactory: async () => (await getValidAuthTokenOrRefresh()) || '',
          headers: { 'ngrok-skip-browser-warning': 'true' },
        })
        .configureLogging(signalR.LogLevel.Warning)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.retryReason && isUnauthorizedError(retryContext.retryReason)) {
              void handleSignalR401();
              return null;
            }
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
            x: Number(updatedRobot.x ?? 0),
            y: Number(updatedRobot.y ?? 0),
            yaw: typeof updatedRobot.yaw === 'number' ? updatedRobot.yaw : 0,
            battery: updatedRobot.battery,
            status: updatedRobot.status,
            destination: updatedRobot.destination,
            currentX: Number(updatedRobot.x ?? 0),
            currentY: Number(updatedRobot.y ?? 0),
            batteryLevel: updatedRobot.battery,
            timestamp: updatedRobot.timestamp,
            transitLatencyMs: typeof updatedRobot.transitLatencyMs === 'number'
              ? updatedRobot.transitLatencyMs
              : (updatedRobot.timestamp ? Math.max(0, Date.now() - new Date(updatedRobot.timestamp).getTime()) : undefined),
          };

          const newRobots = [...state.robots];
          if (idx > -1) {
            newRobots[idx] = { ...newRobots[idx], ...mapped };
          } else {
            newRobots.push(mapped);
          }
          return { robots: newRobots };
        });

        // Persist telemetry to local SQLite
        void sqliteService.updateRobotTelemetry({
          id: updatedRobot.id,
          name: updatedRobot.name,
          x: updatedRobot.x,
          y: updatedRobot.y,
          battery: updatedRobot.battery,
          status: updatedRobot.status,
          destination: updatedRobot.destination,
        });

        get().addLog(
          `Robot [${updatedRobot.name || updatedRobot.id.substring(0, 8)}] cập nhật vị trí: (${updatedRobot.x}, ${updatedRobot.y}) | Pin: ${updatedRobot.battery?.toFixed(0)}%`,
          'info'
        );
      });

      connection.on('ReceiveRobotLocationReplay', (data: any) => {
        if (data?.points && Array.isArray(data.points) && data.points.length > 0) {
          const sorted = [...data.points].sort(
            (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          const latest = sorted[sorted.length - 1];
          if (latest) {
            set((state) => {
              const idx = state.robots.findIndex((r) => r.id === data.robotId);
              if (idx > -1) {
                const newRobots = [...state.robots];
                newRobots[idx] = {
                  ...newRobots[idx],
                  x: latest.x,
                  y: latest.y,
                  yaw: latest.yaw ?? newRobots[idx].yaw,
                  currentX: latest.x,
                  currentY: latest.y,
                  battery: latest.battery ?? newRobots[idx].battery,
                  batteryLevel: latest.battery ?? newRobots[idx].batteryLevel,
                  status: (latest.status || newRobots[idx].status) as any,
                  timestamp: latest.timestamp ?? newRobots[idx].timestamp,
                };
                return { robots: newRobots };
              }
              return {};
            });

            // Persist latest telemetry point to SQLite
            void sqliteService.updateRobotTelemetry({
              id: data.robotId,
              name: data.robotName,
              x: latest.x,
              y: latest.y,
              battery: latest.battery,
              status: latest.status,
            });
          }

          get().addLog(
            `Robot [${data.robotName || (data.robotId ? data.robotId.substring(0, 8) : 'AMR')}] đồng bộ bù ${data.count || sorted.length} tọa độ đệm từ vùng mất sóng (BurstSync Replay)`,
            'info'
          );
        }
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

        // Persist status change to SQLite
        void sqliteService.updateRobotTelemetry({
          id: data.robotId,
          status: data.status,
          battery: data.batteryLevel,
          x: 0,
          y: 0,
        });

        get().addLog(`Robot [ID: ${data.robotId.substring(0, 8)}] thay đổi trạng thái sang "${data.status}"`, 'warning');
      });

      connection.on('ReceiveSlamMapUpdate', (map: any) => {
        // Persist SLAM map and real MQTT waypoints directly into local SQLite
        if (map) {
          void sqliteService.saveSlamMap(map);
        }
        window.dispatchEvent(new CustomEvent('vora:slam-map-updated', { detail: map }));
        get().addLog(`Bản đồ SLAM cập nhật: ${map?.name || map?.mapId || 'ROS Map'} (${map?.waypoints?.length || 0} waypoints)`, 'info');
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
        void edgeSyncService.announceEdgeNode();
      });

      const startConnection = () => {
        if (!get().connection) return;
        if (connection.state === signalR.HubConnectionState.Connected) return;

        connection.start()
          .then(() => {
            set({ status: 'connected', connection });
            get().addLog('Kết nối SignalR Hub thành công.', 'success');
            // Attach edge sync to the SAME single hub connection! Zero duplicate WebSockets!
            edgeSyncService.attachToHubConnection(connection);
          })
          .catch(async (err) => {
            set({ status: 'disconnected' });
            get().addLog(`Kết nối SignalR Hub thất bại: ${err?.message || err}`, 'error');
            if (isUnauthorizedError(err)) {
              const refreshed = await handleSignalR401();
              if (refreshed && get().connection && get().status === 'disconnected') {
                get().addLog('Đã làm mới phiên xác thực. Thử kết nối lại Robot Hub...', 'info');
                set({ status: 'connecting' });
                startConnection();
              }
              return;
            }
            if (activeConnectionsCount > 0) {
              setTimeout(() => {
                if (get().connection && get().status === 'disconnected' && activeConnectionsCount > 0) {
                  get().addLog('Thử kết nối lại Robot Hub...', 'info');
                  set({ status: 'connecting' });
                  startConnection();
                }
              }, 5000);
            }
          })
          .finally(() => {
            isInitiatingConnection = false;
          });
      };

      connection.onclose((error) => {
        set({ status: 'disconnected' });
        if (error) {
          get().addLog(`Kết nối Robot Hub bị đóng: ${error?.message}`, 'error');
          if (isUnauthorizedError(error)) {
            void handleSignalR401();
            return;
          }
          if (activeConnectionsCount > 0) {
            setTimeout(() => {
              if (get().connection && get().status === 'disconnected' && activeConnectionsCount > 0) {
                get().addLog('Thử khởi động lại kết nối Robot Hub...', 'info');
                set({ status: 'connecting' });
                startConnection();
              }
            }, 10000);
          }
        }
      });

      set({ connection });
      startConnection();
    },

    disconnect: () => {
      activeConnectionsCount = Math.max(0, activeConnectionsCount - 1);
      // Grace period (30s) to avoid closing and renegotiating connection during rapid page transitions or StrictMode
      if (activeConnectionsCount === 0) {
        if (disconnectTimeoutId) {
          clearTimeout(disconnectTimeoutId);
        }
        disconnectTimeoutId = setTimeout(() => {
          if (activeConnectionsCount === 0 && get().connection) {
            const conn = get().connection;
            set({ connection: null, status: 'disconnected' });
            conn?.stop().catch((e) => console.error('Error stopping Robot Hub connection:', e));
          }
          disconnectTimeoutId = null;
        }, 30000);
      }
    },
  };
});
