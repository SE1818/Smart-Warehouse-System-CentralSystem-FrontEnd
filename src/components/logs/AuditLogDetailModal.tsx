import type { AuditLog } from '@/types';

interface AuditLogDetailModalProps {
  log: AuditLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditLogDetailModal({ log, isOpen, onClose }: AuditLogDetailModalProps) {
  if (!isOpen || !log) return null;

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'Info':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Warning':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Error':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Critical':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      default:
        return 'bg-slate-50 text-slate-500 border border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-3xl mx-auto z-50">
        <div className="relative flex flex-col w-full bg-white border border-slate-200/80 rounded-2xl shadow-2xl outline-none focus:outline-none max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-slate-100 rounded-t-xl">
            <div>
              <h3 className="text-lg font-heading font-bold text-slate-900">Chi tiết nhật ký hoạt động</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">ID: {log.id}</p>
            </div>
            <button
              className="p-1 ml-auto bg-transparent border-0 text-slate-400 hover:text-slate-650 float-right text-2xl leading-none font-semibold outline-none focus:outline-none transition-colors"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="relative p-6 flex-auto overflow-y-auto space-y-6">
            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mức độ</span>
                <span className={`mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getSeverityBadgeClass(log.severity)}`}>
                  {log.severity}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loại hoạt động</span>
                <span className="text-sm font-bold text-slate-700 mt-1 block">{log.activityType}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Người dùng</span>
                <span className="text-sm text-slate-750 font-semibold mt-1 block">
                  {log.userName ? `${log.userName} (${log.userId || 'N/A'})` : log.userId || 'Hệ thống'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thời gian</span>
                <span className="text-sm text-slate-750 font-semibold mt-1 block">{formatDateTime(log.createdAt)}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thực thể ảnh hưởng</span>
                <span className="text-sm text-slate-750 font-semibold mt-1 block">
                  {log.entityType ? `${log.entityType} (ID: ${log.entityId || 'N/A'})` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Địa chỉ IP</span>
                <span className="text-sm text-slate-750 mt-1 block font-mono truncate" title={log.ipAddress}>
                  {log.ipAddress || 'N/A'}
                  {log.userAgent && <span className="block text-[10px] text-slate-400 font-sans truncate mt-0.5" title={log.userAgent}>{log.userAgent}</span>}
                </span>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chi tiết thông điệp</h4>
              <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-xl leading-relaxed font-medium">
                {log.message || 'Không có thông điệp cụ thể.'}
              </p>
            </div>

            {/* Old & New Values Side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dữ liệu trước (Old Value)</h4>
                <div className="bg-slate-50 text-slate-700 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-60 border border-slate-200 shadow-inner">
                  {log.oldValue && Object.keys(log.oldValue).length > 0 ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.oldValue, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-400 italic">Không có dữ liệu cũ</span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dữ liệu sau (New Value)</h4>
                <div className="bg-slate-50 text-slate-700 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-60 border border-slate-200 shadow-inner">
                  {log.newValue && Object.keys(log.newValue).length > 0 ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.newValue, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-400 italic">Không có dữ liệu mới</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-4 border-t border-slate-100 rounded-b-xl bg-slate-50/50">
            <button
              className="px-4 py-2 border border-slate-250 hover:bg-slate-100 text-slate-650 font-bold text-xs rounded-xl transition-all active:scale-98 focus:outline-none"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
