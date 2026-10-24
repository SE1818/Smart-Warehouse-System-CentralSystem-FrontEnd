import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  CloudUpload,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileText,
  Bot,
  MapPin,
  Clock,
  Layers,
  ShieldCheck,
  Lock,
  HardDrive,
  ShieldAlert,
} from 'lucide-react';
import { sqliteService, type SqliteDbStats, type SqliteAuditEntry } from '@/services/sqliteService';
import { edgeSyncService, type SyncConnectionState } from '@/services/edgeSyncService';

interface LocalSqliteSyncCardProps {
  className?: string;
}

export const LocalSqliteSyncCard: React.FC<LocalSqliteSyncCardProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<SqliteDbStats | null>(null);
  const [audits, setAudits] = useState<SqliteAuditEntry[]>([]);
  const [connectionState, setConnectionState] = useState<SyncConnectionState>('disconnected');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isEnablingPersist, setIsEnablingPersist] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const currentStats = await sqliteService.getStats();
      const currentAudits = await sqliteService.getSyncAudits(10);
      setStats(currentStats);
      setAudits(currentAudits);
      setConnectionState(edgeSyncService.getConnectionState());
      setLastSyncTime(edgeSyncService.getLastSyncedAt());
    } catch (err) {
      console.warn('[LocalSqliteSyncCard] Lỗi nạp thông tin SQLite:', err);
    }
  }, []);

  useEffect(() => {
    void loadData();

    const handleSyncEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type === 'request_received') {
        setStatusMessage(`SuperAdmin trên VPS đã yêu cầu đồng bộ: ${customEvent.detail.dataType.toUpperCase()}`);
      } else if (customEvent.detail?.type === 'completed' || customEvent.detail?.type === 'manual_completed') {
        setStatusMessage(`Đã hoàn tất gửi ${customEvent.detail.recordCount || 0} bản ghi SQLite lên VPS.`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
      void loadData();
    };

    const handleStateEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ state: SyncConnectionState }>;
      if (customEvent.detail?.state) {
        setConnectionState(customEvent.detail.state);
      }
    };

    window.addEventListener('vora:edge-sync-event', handleSyncEvent);
    window.addEventListener('vora:edge-sync-state', handleStateEvent);
    window.addEventListener('vora:slam-map-updated', loadData);

    const interval = setInterval(loadData, 5000);

    return () => {
      window.removeEventListener('vora:edge-sync-event', handleSyncEvent);
      window.removeEventListener('vora:edge-sync-state', handleStateEvent);
      window.removeEventListener('vora:slam-map-updated', loadData);
      clearInterval(interval);
    };
  }, [loadData]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatusMessage('Đang trích xuất dữ liệu SQLite và gửi lên máy chủ VPS...');
    try {
      const success = await edgeSyncService.triggerManualSyncToVps('all');
      if (success) {
        setStatusMessage('Đã đồng bộ toàn bộ dữ liệu SQLite lên máy chủ VPS thành công!');
      } else {
        setStatusMessage('Đồng bộ thất bại, vui lòng kiểm tra kết nối mạng!');
      }
      await loadData();
    } catch {
      setStatusMessage('Đã xảy ra lỗi trong quá trình đồng bộ!');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDownloadDb = async () => {
    try {
      await edgeSyncService.downloadSqliteFile();
    } catch (e) {
      console.error('Lỗi tải file SQLite:', e);
    }
  };

  const handleEnablePersistence = async () => {
    setIsEnablingPersist(true);
    try {
      const granted = await sqliteService.enablePersistentStorage();
      if (granted) {
        setStatusMessage('Đã cấp quyền Persistent Storage thành công! Trình duyệt sẽ không tự ý dọn dẹp cache SQLite.');
      } else {
        setStatusMessage('Trình duyệt chưa cấp quyền Persistent Storage (hoặc đang ở chế độ Best-Effort).');
      }
      await loadData();
    } catch {
      setStatusMessage('Lỗi khi kích hoạt Persistent Storage.');
    } finally {
      setIsEnablingPersist(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl ${className}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Cơ Sở Dữ Liệu SQLite Cục Bộ (Local Edge Engine)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-semibold">
                sql.js WASM + IndexedDB
              </span>
            </div>
            <p className="text-xs text-slate-450 mt-0.5">
              Toàn bộ dữ liệu RobotService được nạp và lưu trữ cục bộ tại máy trạm, sẵn sàng nhận lệnh đồng bộ ngầm từ VPS SuperAdmin.
            </p>
          </div>
        </div>

        {/* VPS Connection Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              connectionState === 'connected'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : connectionState === 'connecting'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                connectionState === 'connected'
                  ? 'animate-pulse text-emerald-400'
                  : connectionState === 'connecting'
                  ? 'animate-spin text-amber-300'
                  : 'text-rose-400'
              }`}
            />
            <span>
              {connectionState === 'connected'
                ? 'Kênh Ngầm VPS: Đã kết nối'
                : connectionState === 'connecting'
                ? 'Đang kết nối VPS...'
                : 'Mất kết nối VPS'}
            </span>
          </div>
        </div>
      </div>

      {/* Security & Storage Hardening Bar */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Encryption Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Web Crypto AES-GCM 256-bit</span>
            <span className="text-[10px] text-emerald-400/80 font-mono">(Mã hóa chống xem F12)</span>
          </div>

          {/* Persistent Storage Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium ${
              stats?.isPersisted
                ? 'bg-blue-950/50 text-blue-300 border-blue-500/30'
                : 'bg-amber-950/50 text-amber-300 border-amber-500/30'
            }`}
          >
            {stats?.isPersisted ? (
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {stats?.isPersisted ? 'Persistent Storage (Đã khóa chống xóa)' : 'Best-Effort (Chưa cấp quyền lưu vĩnh viễn)'}
            </span>
          </div>

          {/* Quota info if available */}
          {Boolean(stats?.storageQuotaBytes && stats.storageQuotaBytes > 0) && (
            <div className="flex items-center gap-1 text-slate-400 text-[11px] font-mono px-2 py-1">
              <HardDrive className="w-3 h-3 text-slate-500" />
              <span>
                Ổ đĩa: {formatBytes(stats?.storageUsageBytes || 0)} / {formatBytes(stats?.storageQuotaBytes || 0)}
              </span>
            </div>
          )}
        </div>

        {/* Action to Request Persistent Storage if not persisted */}
        {!stats?.isPersisted && (
          <button
            type="button"
            onClick={handleEnablePersistence}
            disabled={isEnablingPersist}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer self-start md:self-auto disabled:opacity-50"
            title="Yêu cầu trình duyệt cấp quyền lưu trữ vĩnh viễn để không tự động xóa IndexedDB"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>{isEnablingPersist ? 'Đang yêu cầu...' : 'Khóa Chống Tự Xóa Cache'}</span>
          </button>
        )}
      </div>

      {/* Real-time Status Message Toast */}
      {statusMessage && (
        <div className="mt-4 p-3 bg-blue-950/60 border border-blue-500/40 rounded-xl text-xs text-blue-200 flex items-center gap-2 animate-fade-in">
          <Radio className="w-4 h-4 text-blue-400 animate-pulse flex-shrink-0" />
          <span className="font-medium">{statusMessage}</span>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 my-5">
        {/* Robots */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-450 text-[11px] font-medium">
            <span>Robot AMR</span>
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {stats ? stats.robotsCount : 0}
          </div>
          <div className="text-[10px] text-slate-400 truncate">Lưu từ Supabase / BE</div>
        </div>

        {/* SLAM Map */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-450 text-[11px] font-medium">
            <span>Bản Đồ SLAM</span>
            <Layers className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {stats?.hasMap ? '1 Active' : '0'}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {stats?.mapName || 'Từ MQTT ROS 2'}
          </div>
        </div>

        {/* MQTT Waypoints */}
        <div
          className={`p-3.5 rounded-xl border space-y-1 ${
            stats?.hasMqttWaypoints
              ? 'bg-slate-950/60 border-slate-800/80'
              : 'bg-amber-950/20 border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span className={stats?.hasMqttWaypoints ? 'text-slate-450' : 'text-amber-400 font-bold'}>
              MQTT Waypoints
            </span>
            <MapPin className={`w-3.5 h-3.5 ${stats?.hasMqttWaypoints ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="text-xl font-black font-mono">
            {stats ? stats.waypointsCount : 0}
          </div>
          <div className={`text-[10px] truncate ${stats?.hasMqttWaypoints ? 'text-emerald-400' : 'text-amber-400'}`}>
            {stats?.hasMqttWaypoints ? '🟢 Đã nhận từ MQTT' : '⚠️ Chưa nhận MQTT'}
          </div>
        </div>

        {/* Dining Tables */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-450 text-[11px] font-medium">
            <span>Bàn Phục Vụ</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {stats ? stats.tablesCount : 0}
          </div>
          <div className="text-[10px] text-slate-400 truncate">Từ Waypoints MQTT</div>
        </div>

        {/* Transfer Logs */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-450 text-[11px] font-medium">
            <span>Log Transfer</span>
            <FileText className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {stats ? stats.transferLogsCount : 0}
          </div>
          <div className="text-[10px] text-slate-400 truncate">Nhật ký nhiệm vụ</div>
        </div>

        {/* Database Size */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-slate-450 text-[11px] font-medium">
            <span>Dung Lượng DB</span>
            <Database className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {stats ? formatBytes(stats.dbSizeBytes) : '0 B'}
          </div>
          <div className="text-[10px] text-emerald-400 truncate flex items-center gap-1 font-mono">
            <Lock className="w-2.5 h-2.5" />
            <span>{stats?.isEncrypted ? 'AES-GCM Encrypted' : 'IndexedDB Cache'}</span>
          </div>
        </div>
      </div>

      {/* Action Controls & Audit Panel */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Manual Sync Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
          >
            <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay lên VPS'}</span>
          </button>

          {/* Download SQLite Binary */}
          <button
            type="button"
            onClick={handleDownloadDb}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            title="Tải file SQLite để xem bằng DB Browser for SQLite"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tải file .sqlite</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Tải lại số liệu từ SQLite"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {lastSyncTime && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5 ml-1">
              <Clock className="w-3 h-3 text-slate-500" />
              Lần đồng bộ gần nhất: <span className="text-slate-300 font-medium">{lastSyncTime}</span>
            </span>
          )}
        </div>

        {/* Invariant Policy Notice */}
        <div className="text-[11px] text-slate-450 flex items-center gap-1.5 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/60">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>
            Quy tắc an toàn: Không tự ý sinh Waypoint ảo khi chưa nhận tín hiệu MQTT từ robot.
          </span>
        </div>
      </div>

      {/* Sync Audit Table (if any) */}
      {audits.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            Nhật Ký Yêu Cầu Đồng Bộ Từ SuperAdmin VPS ({audits.length} phiên gần nhất)
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[10px] text-slate-450 uppercase font-mono border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2">Thời gian</th>
                  <th className="px-3 py-2">Hành động</th>
                  <th className="px-3 py-2">Người yêu cầu</th>
                  <th className="px-3 py-2">Chi tiết</th>
                  <th className="px-3 py-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {audits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-3 py-2 text-slate-400">
                      {new Date(a.timestamp).toLocaleTimeString('vi-VN')}
                    </td>
                    <td className="px-3 py-2 font-semibold text-cyan-300">{a.action}</td>
                    <td className="px-3 py-2 text-slate-300">{a.requestedBy}</td>
                    <td className="px-3 py-2 text-slate-400 font-sans">{a.details || '-'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default LocalSqliteSyncCard;
