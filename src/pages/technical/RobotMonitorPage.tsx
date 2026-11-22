/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { useRobotStore } from '@/stores/robotStore';
import { Bot, RefreshCw, Wifi, Activity, Battery } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface RobotMonitorPageProps {
  embedded?: boolean;
}

export function RobotMonitorPage({ embedded = false }: RobotMonitorPageProps = {}) {
  const { 
    robots, 
    status: signalRStatus, 
    logs, 
    connect: connectRobotHub, 
    disconnect: disconnectRobotHub, 
    fetchRobots, 
    clearLogs 
  } = useRobotStore();
  const [loading, setLoading] = useState(true);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchRobots();
      setLoading(false);
    };
    void init();
    connectRobotHub();
    return () => {
      disconnectRobotHub();
    };
  }, [fetchRobots, connectRobotHub, disconnectRobotHub]);

  // Auto-scroll terminal log
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'idle': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'moving': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'swapping_battery': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'error': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getLogTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'error': return 'text-rose-400';
      default: return 'text-slate-300';
    }
  };

  const activeCount = robots.filter((r) => r.status.toLowerCase() !== 'offline').length;

  return (
    <div className={embedded ? 'text-slate-800 font-sans' : 'min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 font-sans'}>
      <div className={embedded ? 'w-full lg:h-[calc(100vh-88px)] min-h-[480px] flex flex-col gap-3' : 'max-w-6xl mx-auto space-y-8'}>
        
        {/* Header */}
        <div
          className={
            embedded
              ? 'shrink-0 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5'
              : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6'
          }
        >
          <div className={embedded ? 'space-y-0.5' : 'space-y-1'}>
            <h1 className={embedded ? 'text-base sm:text-lg font-extrabold text-slate-900 tracking-tight' : 'text-3xl font-extrabold text-slate-900 tracking-tight'}>
              Giám Sát Kết Nối Đội Robot AMR
            </h1>
            <p className={embedded ? 'text-slate-500 text-xs font-medium' : 'text-slate-500 text-xs sm:text-sm font-medium'}>
              Theo dõi trạng thái kết nối thiết bị và nhật ký điều hướng của đội robot tự hành AMR tại nhà hàng.
            </p>
          </div>
          {embedded && (
            <div className="flex items-center gap-2 text-xs font-mono shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-bold">
                {robots.length} AMR
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-bold">
                {logs.length} Bản ghi
              </span>
            </div>
          )}
        </div>

        {/* Network Connection Status Cards */}
        <div className={embedded ? 'shrink-0 grid grid-cols-1 md:grid-cols-3 gap-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5'}>
          {/* Connection Status */}
          <div className={embedded ? 'bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3' : 'bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4'}>
            <div className={`${embedded ? 'p-2' : 'p-3'} rounded-xl ${
              signalRStatus === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
            }`}>
              <RefreshCw className={`${embedded ? 'w-5 h-5' : 'w-6 h-6'} ${signalRStatus === 'connecting' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Kết Nối Trạm Điều Phối</span>
              <span className="text-sm font-extrabold text-slate-900">
                {signalRStatus === 'connected' ? 'Đang hoạt động' : signalRStatus === 'connecting' ? 'Đang kết nối lại...' : 'Chưa kết nối'}
              </span>
            </div>
          </div>

          {/* Fleet Online Count */}
          <div className={embedded ? 'bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3' : 'bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4'}>
            <div className={`${embedded ? 'p-2' : 'p-3'} rounded-xl ${
              activeCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
            }`}>
              <Wifi className={embedded ? 'w-5 h-5' : 'w-6 h-6'} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Thiết Bị Sẵn Sàng</span>
              <span className="text-sm font-extrabold text-slate-900">
                {activeCount} / {robots.length} Robot
              </span>
            </div>
          </div>

          {/* Recorded Telemetry Events */}
          <div className={embedded ? 'bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3' : 'bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4'}>
            <div className={`${embedded ? 'p-2' : 'p-3'} rounded-xl bg-blue-50 text-blue-600`}>
              <Activity className={embedded ? 'w-5 h-5' : 'w-6 h-6'} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nhật Ký Phiên Hiện Tại</span>
              <span className="text-sm font-extrabold text-slate-900">
                {logs.length} Sự kiện
              </span>
            </div>
          </div>
        </div>

        {/* Robot List & Command Stream Split */}
        <div className={embedded ? 'flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3' : 'space-y-8'}>
          {/* Robot List */}
          <div className={embedded ? 'lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 flex flex-col gap-3 min-h-0' : 'bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-6 space-y-4'}>
            <h2 className={`${embedded ? 'shrink-0 text-sm sm:text-base' : 'text-base sm:text-lg'} font-extrabold text-slate-900 flex items-center gap-2`}>
              <Bot className="w-5 h-5 text-brand-600" />
              <span>Danh Sách Thiết Bị AMR</span>
            </h2>
            
            <div className={embedded ? 'flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
              {robots.map(r => (
                <div key={r.id} className={`border border-slate-200/80 rounded-2xl ${embedded ? 'p-3.5 space-y-2.5' : 'p-4 space-y-3'} shadow-xs hover:border-slate-300 transition-all`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">{r.name}</h3>
                      <code className="text-[10px] text-slate-400 font-mono">Mã: {r.id.substring(0, 8)}</code>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(r.status)}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-200/40">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Vị trí</span>
                      <span>X: {r.currentX ?? 0}, Y: {r.currentY ?? 0}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Phần trăm Pin</span>
                      <span className="flex items-center gap-1">
                        <Battery className="w-3.5 h-3.5 text-slate-400" />
                        {r.batteryLevel !== undefined ? `${r.batteryLevel.toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                    <span>Địa chỉ mạng: {r.ipAddress || 'Chưa ghi nhận'}</span>
                  </div>
                </div>
              ))}

              {robots.length === 0 && !loading && (
                <p className="col-span-full text-center py-8 text-slate-400 text-xs">Chưa có thiết bị AMR nào đang kết nối.</p>
              )}
            </div>
          </div>

          {/* Command Log Stream */}
          <div className={embedded ? 'lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col min-h-[260px] lg:min-h-0 flex-1 dark-scrollbar' : 'bg-slate-950 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col h-[420px] dark-scrollbar'}>
            <div className={`flex justify-between items-center border-b border-slate-800 ${embedded ? 'pb-3' : 'pb-4'} shrink-0`}>
              <h2 className="text-sm font-black text-slate-200 tracking-wide flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Nhật Ký Điều Hướng Thiết Bị</span>
              </h2>
              <button 
                onClick={clearLogs}
                className="text-xs text-slate-400 hover:text-slate-200 transition-all font-bold px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
              >
                Xóa Nhật Ký
              </button>
            </div>

            <div className={`flex-1 min-h-0 overflow-y-auto dark-scrollbar font-mono text-xs text-slate-300 space-y-1.5 ${embedded ? 'mt-3' : 'mt-4'} pr-2`}>
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Chưa có bản ghi nhật ký nào trong phiên hiện tại.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="hover:bg-slate-900/60 py-0.5 px-2 rounded-md transition-all">
                    <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                    <span className={`${getLogTypeColor(log.type)} font-bold`}>
                      {log.type === 'error' ? '[ERROR]' : log.type === 'warning' ? '[WARN]' : log.type === 'success' ? '[INFO]' : '[DEBUG]'}
                    </span>{' '}
                    <span className="text-slate-300 font-semibold">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
