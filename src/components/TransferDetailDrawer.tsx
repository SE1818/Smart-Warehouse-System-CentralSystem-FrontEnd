import { useState, useEffect, useCallback } from 'react';
import { transferService } from '@/services/transferService';
import type { TransferAudit } from '@/services/transferService';
import { Icons } from '@/components/Icons';
import { toast } from 'react-toastify';

interface TransferDetailDrawerProps {
  transferId: string;
  onClose: () => void;
  onCancel: (id: string) => Promise<void>;
}

export function TransferDetailDrawer({ transferId, onClose, onCancel }: TransferDetailDrawerProps) {
  const [audit, setAudit] = useState<TransferAudit | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      const data = await transferService.getTransferHistory(transferId);
      setAudit(data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải chi tiết chuyến vận chuyển');
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    loadDetail();
    // Refresh detail every 4s to track live robot position/commands
    const interval = setInterval(loadDetail, 4000);
    return () => clearInterval(interval);
  }, [loadDetail]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      pending: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Chờ gán' },
      assigned: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500 animate-pulse', label: 'Đã gán' },
      in_progress: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500 animate-pulse', label: 'Đang chạy' },
      completed: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Hoàn thành' },
      failed: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500 animate-bounce', label: 'Lỗi' },
      cancelled: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Đã hủy' }
    };
    const style = styles[status?.toLowerCase()] || styles.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {style.label}
      </span>
    );
  };

  const getCommandStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'executed': return 'text-emerald-600 bg-emerald-50 border border-emerald-100';
      case 'executing': return 'text-blue-600 bg-blue-50 border border-blue-100 animate-pulse';
      case 'failed': return 'text-rose-600 bg-rose-50 border border-rose-100';
      default: return 'text-slate-650 bg-slate-50 border border-slate-200';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex pl-10 max-w-full">
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-screen max-w-lg bg-white shadow-2xl border-l border-slate-200/80 flex flex-col h-full animate-slide-in">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Icons.Truck className="w-5 h-5 text-brand-600" />
              <span>Chuyến #{(audit?.request.id || transferId).substring(0, 8)}</span>
            </h2>
            <p className="text-slate-400 text-xs font-semibold">Bản kiểm thử & Lịch sử hành trình chi tiết</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-all">
            <Icons.Close className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {loading && !audit ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <Icons.Spinner className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        ) : audit ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Overview */}
            <div className="bg-slate-50/80 border border-slate-200/50 rounded-2xl p-5 space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái hiện tại</span>
                {getStatusBadge(audit.request.status)}
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1">
                  <span className="text-slate-400 block">Trạm lấy hàng (From)</span>
                  <span className="text-slate-850 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200/50 inline-block">ST05 (Pickup)</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block">Trạm trả hàng (To)</span>
                  <span className="text-slate-850 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200/50 inline-block">
                    {audit.request.toStationId.substring(0, 4) === '1111' ? 'ST01' : 
                     audit.request.toStationId.substring(0, 4) === '2222' ? 'ST02' :
                     audit.request.toStationId.substring(0, 4) === '3333' ? 'ST03' :
                     audit.request.toStationId.substring(0, 4) === '4444' ? 'ST04' : 'Station'}
                  </span>
                </div>
              </div>

              {audit.transferLog && (
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <span className="text-slate-400 block">Robot xử lý</span>
                    <span className="text-slate-800 font-bold">Robot ID: {audit.transferLog.robotId.substring(0, 8)}...</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block">Thời gian bắt đầu</span>
                    <span className="text-slate-800 font-bold">{new Date(audit.transferLog.startedAt).toLocaleTimeString('vi-VN')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Timeline (Status History) */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Icons.HistoryLogs className="w-4 h-4 text-slate-400" />
                <span>Tiến độ hành trình (Timeline)</span>
              </h3>
              <div className="relative pl-5 border-l border-slate-200 space-y-4">
                {audit.statusHistory.map((s) => (
                  <div key={s.id} className="relative">
                    {/* Timeline dot */}
                    <span className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white ring-4 ring-slate-100" />
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 uppercase tracking-wider">{s.newStatus}</span>
                        <span className="text-[10px] text-slate-400">{new Date(s.createdAt).toLocaleTimeString('vi-VN')}</span>
                      </div>
                      {s.notes && <p className="text-slate-500 font-medium">{s.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Commands list */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Icons.Robot className="w-4 h-4 text-slate-400" />
                <span>Lệnh gửi tới Robot</span>
              </h3>
              <div className="space-y-2">
                {audit.commands.map((c) => (
                  <div key={c.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200/50 flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">{c.commandType}</span>
                        <span className="text-[10px] font-mono text-slate-400">ID: {c.id.substring(0, 8)}</span>
                      </div>
                      {c.parametersJson && (
                        <code className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md font-mono">
                          {c.parametersJson}
                        </code>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getCommandStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                ))}

                {audit.commands.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-250">
                    Chưa có lệnh nào được tạo cho chuyến này.
                  </p>
                )}
              </div>
            </div>

            {/* 4. Responses telemetry logs */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Icons.Metrics className="w-4 h-4 text-slate-400" />
                <span>Nhật ký Telemetry (Phản hồi)</span>
              </h3>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl bg-slate-950 font-mono text-[10px] p-4 text-slate-350 space-y-1">
                {audit.responses.map((r) => (
                  <div key={r.id} className="hover:bg-slate-900 py-0.5 rounded-sm">
                    <span className="text-slate-500">[{new Date(r.createdAt).toLocaleTimeString('vi-VN')}]</span>{' '}
                    <span className="text-emerald-400">status:</span> {r.status} |{' '}
                    <span className="text-indigo-400">loc:</span> ({r.currentX},{r.currentY}) |{' '}
                    <span className="text-amber-400">batt:</span> {r.batteryAtResponse?.toFixed(0)}%
                  </div>
                ))}

                {audit.responses.length === 0 && (
                  <p className="text-xs text-slate-500 italic text-center py-4">
                    // Đang đợi nhận dữ liệu telemetry từ robot...
                  </p>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-slate-400">
            Không tìm thấy thông tin chuyến vận chuyển.
          </div>
        )}

        {/* Action Footer */}
        {audit && (audit.request.status.toLowerCase() === 'assigned' || audit.request.status.toLowerCase() === 'in_progress') && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
            <button
              onClick={() => onCancel(audit.request.id)}
              className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-sm font-bold border border-rose-200/50 shadow-xs active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              Hủy Chuyến & Dừng Robot
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
