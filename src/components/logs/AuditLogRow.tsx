import type { AuditLog } from '@/types';
import { LogSeverity } from '@/types';

interface AuditLogRowProps {
  log: AuditLog;
  onClick: (log: AuditLog) => void;
}

export function AuditLogRow({ log, onClick }: AuditLogRowProps) {
  const getSeverityBadgeClass = (severity: LogSeverity) => {
    switch (severity) {
      case 'Info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Critical':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

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

  return (
    <tr
      onClick={() => onClick(log)}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityBadgeClass(log.severity)}`}>
          {log.severity}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-700">
        {log.activityType}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
        {log.message || 'N/A'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {log.userName || log.userId || 'Hệ thống'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {log.entityType ? (
          <div>
            <span className="font-medium text-gray-800">{log.entityType}</span>
            {log.entityId && (
              <span className="block text-xs text-gray-400">ID: {log.entityId}</span>
            )}
          </div>
        ) : (
          'N/A'
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {formatDateTime(log.createdAt)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
        {log.ipAddress || 'N/A'}
      </td>
    </tr>
  );
}
