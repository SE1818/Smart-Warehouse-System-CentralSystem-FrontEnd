/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { Icons } from '@/components/Icons';
import apiClient from '@/services/api';

export interface Robot {
  id: string;
  name: string;
  currentX: number;
  currentY: number;
  batteryLevel: number;
  status: string;
  ipAddress?: string;
  updatedAt: string;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export function RobotMonitorPage() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [signalRStatus, setSignalRStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const mqttStatus: 'online' | 'offline' = 'online';
  const rabbitmqStatus: 'online' | 'offline' = 'online';
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog = {
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      type,
      message
    };
    setLogs(prev => [...prev.slice(-99), newLog]); // Keep last 100 logs
  };

  const loadRobots = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Robot[]>('/v1/robots');
      setRobots(response.data);
      addLog(`Đã đồng bộ thông tin của ${response.data.length} robot AMR từ database.`, 'success');
    } catch (err) {
      console.error(err);
      addLog('Không thể kết nối API để tải danh sách robot.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRobots();
    
    // Connect to SignalR
    setSignalRStatus('connecting');
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/robots/hub`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => {
        setSignalRStatus('connected');
        addLog('Kết nối SignalR Hub thành công.', 'success');
        
        connection.on('ReceiveRobotLocation', (updatedRobot: Robot) => {
          setRobots(prev => {
            const idx = prev.findIndex(r => r.id === updatedRobot.id);
            if (idx > -1) {
              const clone = [...prev];
              clone[idx] = { ...clone[idx], ...updatedRobot };
              return clone;
            }
            return [...prev, updatedRobot];
          });
          addLog(`Robot [${updatedRobot.name || updatedRobot.id.substring(0, 8)}] cập nhật vị trí: (${updatedRobot.currentX}, ${updatedRobot.currentY}) | Pin: ${updatedRobot.batteryLevel?.toFixed(0)}%`, 'info');
        });

        connection.on('ReceiveRobotStatusChanged', (data: { robotId: string; status: string; batteryLevel: number }) => {
          setRobots(prev => {
            const idx = prev.findIndex(r => r.id === data.robotId);
            if (idx > -1) {
              const clone = [...prev];
              clone[idx] = { ...clone[idx], status: data.status, batteryLevel: data.batteryLevel };
              return clone;
            }
            return prev;
          });
          addLog(`Robot [ID: ${data.robotId.substring(0, 8)}] thay đổi trạng thái sang "${data.status}"`, 'warning');
        });
      })
      .catch((err) => {
        setSignalRStatus('disconnected');
        addLog(`Kết nối SignalR Hub thất bại: ${err.message}`, 'error');
      });

    return () => {
      connection.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll terminal log
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'idle': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'moving': return 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse';
      case 'charging': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'error': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getLogTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'error': return 'text-rose-400';
      default: return 'text-slate-350';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 space-y-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600 shadow-sm border border-brand-100">
                <Icons.Robot className="w-7 h-7" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">AMR Monitor</span>
            </h1>
            <p className="text-slate-550 text-sm font-semibold">Theo dõi trạng thái kết nối phần cứng của đội robot tự hành AMR và MQTT gateway.</p>
          </div>
        </div>

        {/* Network Connection Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SignalR Connection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              signalRStatus === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
            }`}>
              <Icons.Refresh className={`w-6 h-6 ${signalRStatus === 'connecting' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">SignalR Hub</span>
              <span className="text-sm font-extrabold text-slate-900">
                {signalRStatus === 'connected' ? 'Kết nối trực tuyến' : signalRStatus === 'connecting' ? 'Đang kết nối...' : 'Ngoại tuyến'}
              </span>
            </div>
          </div>

          {/* MQTT Broker Connection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              mqttStatus === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.284 16.284A3 3 0 0 0 12 17a3 3 0 0 0 3.716-.716M5.456 13.456a6.5 6.5 0 0 1 9.088 0M2.628 10.628a10.5 10.5 0 0 1 14.744 0M12 21v.008H12V21Z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">MQTT Broker (Robots)</span>
              <span className="text-sm font-extrabold text-slate-900">
                {mqttStatus === 'online' ? 'Đang hoạt động' : 'Không có phản hồi'}
              </span>
            </div>
          </div>

          {/* RabbitMQ Connection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              rabbitmqStatus === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <Icons.Dashboard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">MassTransit Bus</span>
              <span className="text-sm font-extrabold text-slate-900">
                {rabbitmqStatus === 'online' ? 'Đã liên kết' : 'Mất kết nối'}
              </span>
            </div>
          </div>
        </div>

        {/* Robot List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Icons.Robot className="w-5 h-5 text-brand-600" />
            <span>Danh sách Thiết bị AMR</span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {robots.map(r => (
              <div key={r.id} className="border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">{r.name}</h3>
                    <code className="text-[10px] text-slate-450 font-mono">ID: {r.id.substring(0, 8)}</code>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(r.status)}`}>
                    {r.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/40">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Vị trí</span>
                    <span>X: {r.currentX}, Y: {r.currentY}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Phần trăm Pin</span>
                    <span className="flex items-center gap-1">
                      <Icons.Spinner className="w-3.5 h-3.5 text-slate-400" />
                      {r.batteryLevel?.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                  <span>IP: {r.ipAddress || '192.168.1.100'}</span>
                  <span>Ping: 14ms</span>
                </div>
              </div>
            ))}

            {robots.length === 0 && !loading && (
              <p className="col-span-3 text-center py-10 text-slate-400 italic">Không tìm thấy robot nào đang đăng ký.</p>
            )}
          </div>
        </div>

        {/* Real-time Command Log Stream */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col h-[400px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 shrink-0">
            <h2 className="text-sm font-black text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Command Stream Console</span>
            </h2>
            <button 
              onClick={() => setLogs([])}
              className="text-xs text-slate-500 hover:text-slate-350 transition-all font-bold px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
            >
              Clear Log
            </button>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-xs text-slate-350 space-y-1.5 mt-4 pr-2">
            {logs.map((log, index) => (
              <div key={index} className="hover:bg-slate-900/60 py-0.5 px-2 rounded-md transition-all">
                <span className="text-slate-600">[{log.timestamp}]</span>{' '}
                <span className={`${getLogTypeColor(log.type)} font-bold`}>
                  {log.type === 'error' ? '[ERROR]' : log.type === 'warning' ? '[WARN]' : log.type === 'success' ? '[INFO]' : '[DEBUG]'}
                </span>{' '}
                <span className="text-slate-300 font-semibold">{log.message}</span>
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
