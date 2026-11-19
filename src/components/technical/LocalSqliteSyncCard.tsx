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

interface LocalSqliteSyncLiveSummary {
  robotsCount: number;
  tablesCount: number;
  missionsCount: number;
  alertsCount: number;
  signalRStatus: string;
  tenantLabel?: string;
}

interface LocalSqliteSyncCardProps {
  className?: string;
  liveSummary?: LocalSqliteSyncLiveSummary;
}

export const LocalSqliteSyncCard: React.FC<LocalSqliteSyncCardProps> = ({
  className = '',
  liveSummary,
}) => {
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

  const storageQuotaPercent =
    stats?.storageQuotaBytes && stats.storageQuotaBytes > 0
      ? Math.min(100, Math.round(((stats.storageUsageBytes || 0) / stats.storageQuotaBytes) * 100))
      : 0;

  return (
    <div className={`lg:h-[calc(100vh-88px)] min-h-[480px] flex flex-col gap-3 ${className}`}>
      <div className="shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 shadow-xl dark-scrollbar">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Cơ Sở Dữ Liệu SQLite Cục Bộ (Local Edge Engine)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-semibold">
                  sql.js WASM + IndexedDB
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Toàn bộ dữ liệu RobotService được nạp và lưu trữ cục bộ tại máy trạm, sẵn sàng nhận lệnh đồng bộ ngầm từ VPS SuperAdmin.
              </p>
            </div>
          </div>

          {/* VPS Connection Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
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
        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Encryption Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Web Crypto AES-GCM 256-bit</span>
              <span className="text-[10px] text-emerald-400/80 font-mono">(Mã hóa chống xem F12)</span>
            </div>

            {/* Edge Single-Tenant SQLite Schema Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium bg-emerald-950/40 text-emerald-300 border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>SQLite Edge: Sạch (Không chứa store_id / tenant_id - Tự động bổ sung khi đẩy lên Supabase)</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer self-start md:self-auto disabled:opacity-50 shrink-0"
              title="Yêu cầu trình duyệt cấp quyền lưu trữ vĩnh viễn để không tự động xóa IndexedDB"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEnablingPersist ? 'Đang yêu cầu...' : 'Khóa Chống Tự Xóa Cache'}</span>
            </button>
          )}
        </div>

        {/* Real-time Status Message Toast */}
        {statusMessage && (
          <div className="mt-2.5 p-2.5 bg-blue-950/60 border border-blue-500/40 rounded-xl text-xs text-blue-200 flex items-center gap-2 animate-fade-in">
            <Radio className="w-4 h-4 text-blue-400 animate-pulse flex-shrink-0" />
            <span className="font-medium">{statusMessage}</span>
          </div>
        )}

        {/* Metrics Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 my-3">
          {/* Robots */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Robot AMR</span>
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-black text-white font-mono tabular-nums">
              {stats ? stats.robotsCount : 0}
            </div>
            <div className="text-[10px] text-slate-400 truncate">Lưu từ Supabase / BE</div>
          </div>

          {/* SLAM Map */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Bản Đồ SLAM</span>
              <Layers className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-lg font-black text-white font-mono tabular-nums">
              {stats?.hasMap ? '1 Active' : '0'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {stats?.mapName || 'Từ MQTT ROS 2'}
            </div>
          </div>

          {/* MQTT Waypoints */}
          <div
            className={`p-2.5 rounded-xl border space-y-0.5 ${
              stats?.hasMqttWaypoints
                ? 'bg-slate-950/60 border-slate-800/80'
                : 'bg-amber-950/20 border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className={stats?.hasMqttWaypoints ? 'text-slate-400' : 'text-amber-400 font-bold'}>
                MQTT Waypoints
              </span>
              <MapPin className={`w-3.5 h-3.5 ${stats?.hasMqttWaypoints ? 'text-emerald-400' : 'text-amber-400'}`} />
            </div>
            <div className="text-lg font-black font-mono tabular-nums">
              {stats ? stats.waypointsCount : 0}
            </div>
            <div className={`text-[10px] truncate ${stats?.hasMqttWaypoints ? 'text-emerald-400' : 'text-amber-400'}`}>
              {stats?.hasMqttWaypoints ? 'Đã nhận từ MQTT' : 'Chưa nhận MQTT'}
            </div>
          </div>

          {/* Dining Tables */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Bàn Phục Vụ</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-lg font-black text-white font-mono tabular-nums">
              {stats ? stats.tablesCount : 0}
            </div>
            <div className="text-[10px] text-slate-400 truncate">Từ Waypoints MQTT</div>
          </div>

          {/* Transfer Logs */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Log Transfer</span>
              <FileText className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-black text-white font-mono tabular-nums">
              {stats ? stats.transferLogsCount : 0}
            </div>
            <div className="text-[10px] text-slate-400 truncate">Nhật ký nhiệm vụ</div>
          </div>

          {/* Database Size */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
              <span>Dung Lượng DB</span>
              <Database className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-white font-mono tabular-nums">
              {stats ? formatBytes(stats.dbSizeBytes) : '0 B'}
            </div>
            <div className="text-[10px] text-emerald-400 truncate flex items-center gap-1 font-mono">
              <Lock className="w-2.5 h-2.5" />
              <span>{stats?.isEncrypted ? 'AES-GCM Encrypted' : 'IndexedDB Cache'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-800">
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
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/60">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>
              Quy tắc an toàn: Không tự ý sinh Waypoint ảo khi chưa nhận tín hiệu MQTT từ robot.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom 12-Col Bento Details: Sync Audit Log + Edge vs Live Reconciliation */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left (7 cols): Sync Audit Trail */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 shadow-lg flex flex-col gap-3 min-h-0 dark-scrollbar">
          <div className="shrink-0 flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Nhật Ký Yêu Cầu Đồng Bộ SQLite ↔ VPS ({audits.length} phiên gần nhất)</span>
            </h4>
            <button
              type="button"
              onClick={loadData}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Cập nhật</span>
            </button>
          </div>

          {audits.length > 0 ? (
            <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-800 bg-slate-950/50 dark-scrollbar">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="sticky top-0 bg-slate-900/95 text-[10px] text-slate-400 uppercase font-mono border-b border-slate-800">
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
                      <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                        {new Date(a.timestamp).toLocaleTimeString('vi-VN')}
                      </td>
                      <td className="px-3 py-2 font-semibold text-cyan-300 whitespace-nowrap">{a.action}</td>
                      <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{a.requestedBy}</td>
                      <td className="px-3 py-2 text-slate-400 font-sans">{a.details || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
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
          ) : (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center py-4 px-4 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 space-y-2">
              <FileText className="w-7 h-7 text-slate-600" />
              <div className="space-y-0.5 max-w-md">
                <p className="text-xs font-bold text-slate-300">
                  Chưa có giao dịch đồng bộ nào được ghi nhận trong bộ nhớ SQLite cục bộ
                </p>
                <p className="text-[11px] text-slate-400">
                  Khi có lệnh đồng bộ thủ công hoặc yêu cầu từ SuperAdmin trên VPS, lịch sử đối soát sẽ hiển thị trực tiếp tại đây.
                </p>
              </div>
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay lên VPS'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right (5 cols): Edge <-> Live API Reconciliation & Storage Health */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 shadow-lg flex flex-col gap-3 min-h-0">
          <div className="shrink-0 flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Đối Chiếu Dữ Liệu Edge ↔ Live</span>
            </h4>
            {liveSummary?.tenantLabel && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800 truncate max-w-[140px]">
                {liveSummary.tenantLabel}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto dark-scrollbar pr-1 space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-slate-400 font-medium">Robot AMR (Local / Live)</span>
              <span className="font-mono font-bold text-white tabular-nums">
                {stats ? stats.robotsCount : 0}
                <span className="text-slate-500 mx-1.5">/</span>
                <span className="text-cyan-400">{liveSummary ? liveSummary.robotsCount : '—'}</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-slate-400 font-medium">Bàn Phục Vụ (Local / Live)</span>
              <span className="font-mono font-bold text-white tabular-nums">
                {stats ? stats.tablesCount : 0}
                <span className="text-slate-500 mx-1.5">/</span>
                <span className="text-purple-400">{liveSummary ? liveSummary.tablesCount : '—'}</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-slate-400 font-medium">Log Transfer / Nhiệm vụ Live</span>
              <span className="font-mono font-bold text-white tabular-nums">
                {stats ? stats.transferLogsCount : 0}
                <span className="text-slate-500 mx-1.5">/</span>
                <span className="text-amber-400">{liveSummary ? `${liveSummary.missionsCount} lệnh` : '—'}</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-slate-400 font-medium">Bảo mật &amp; Lưu trữ</span>
              <span className="font-mono text-[11px] font-bold text-emerald-400">
                {stats?.isEncrypted ? 'AES-GCM Encrypted' : 'IndexedDB Cache'} •{' '}
                {stats?.isPersisted ? 'Persistent' : 'Best-Effort'}
              </span>
            </div>

            {Boolean(stats?.storageQuotaBytes && stats.storageQuotaBytes > 0) && (
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Hạn mức IndexedDB trình duyệt</span>
                  <span className="font-mono text-slate-300 tabular-nums">
                    {formatBytes(stats?.storageUsageBytes || 0)} / {formatBytes(stats?.storageQuotaBytes || 0)} ({storageQuotaPercent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${Math.max(2, storageQuotaPercent)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <span>Cập nhật DB: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString('vi-VN') : '—'}</span>
            <span>Sync: {lastSyncTime || 'Chưa phát sinh'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LocalSqliteSyncCard;
