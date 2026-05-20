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
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'Error':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Critical':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-3xl mx-auto my-6 p-4 z-50">
        <div className="relative flex flex-col w-full bg-white border border-gray-200 rounded-xl shadow-2xl outline-none focus:outline-none max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-gray-100 rounded-t-xl">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Chi tiết nhật ký hoạt động</h3>
              <p className="text-xs text-gray-400 mt-1">ID: {log.id}</p>
            </div>
            <button
              className="p-1 ml-auto bg-transparent border-0 text-gray-400 hover:text-gray-600 float-right text-3xl leading-none font-semibold outline-none focus:outline-none"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="relative p-6 flex-auto overflow-y-auto space-y-6">
            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Mức độ</span>
                <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityBadgeClass(log.severity)}`}>
                  {log.severity}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Loại hoạt động</span>
                <span className="text-sm font-semibold text-gray-800 mt-1 block">{log.activityType}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Người dùng</span>
                <span className="text-sm text-gray-800 mt-1 block">
                  {log.userName ? `${log.userName} (${log.userId || 'N/A'})` : log.userId || 'Hệ thống'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Thời gian</span>
                <span className="text-sm text-gray-800 mt-1 block">{formatDateTime(log.createdAt)}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Thực thể ảnh hưởng</span>
                <span className="text-sm text-gray-800 mt-1 block">
                  {log.entityType ? `${log.entityType} (ID: ${log.entityId || 'N/A'})` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase">Địa chỉ IP & Trình duyệt</span>
                <span className="text-sm text-gray-800 mt-1 block font-mono truncate" title={log.userAgent}>
                  {log.ipAddress || 'N/A'}
                  {log.userAgent && <span className="block text-xs text-gray-400 font-sans truncate">{log.userAgent}</span>}
                </span>
              </div>
            </div>

            {/* Message */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-2">Chi tiết thông điệp</h4>
              <p className="text-sm text-gray-700 bg-blue-50 border border-blue-100 p-4 rounded-lg">
                {log.message || 'Không có thông điệp cụ thể.'}
              </p>
            </div>

            {/* Old & New Values Side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">Dữ liệu trước (Old Value)</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-60 border border-gray-800">
                  {log.oldValue && Object.keys(log.oldValue).length > 0 ? (
                    <pre>{JSON.stringify(log.oldValue, null, 2)}</pre>
                  ) : (
                    <span className="text-gray-500 italic">Không có dữ liệu cũ</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">Dữ liệu sau (New Value)</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-60 border border-gray-800">
                  {log.newValue && Object.keys(log.newValue).length > 0 ? (
                    <pre>{JSON.stringify(log.newValue, null, 2)}</pre>
                  ) : (
                    <span className="text-gray-500 italic">Không có dữ liệu mới</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-4 border-t border-gray-100 rounded-b-xl">
            <button
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm rounded-lg transition-colors focus:outline-none"
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
