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
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Critical':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
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
      className="hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100"
    >
      <td className="p-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getSeverityBadgeClass(log.severity)}`}>
          {log.severity}
        </span>
      </td>
      <td className="p-4 whitespace-nowrap font-bold text-slate-800">
        {log.activityType}
      </td>
      <td className="p-4 text-slate-650 max-w-xs truncate font-medium" title={log.message}>
        {log.message || 'N/A'}
      </td>
      <td className="p-4 whitespace-nowrap text-slate-500 font-medium">
        {log.userName || log.userId || 'Hệ thống'}
      </td>
      <td className="p-4 whitespace-nowrap text-slate-500">
        {log.entityType ? (
          <div>
            <span className="font-bold text-slate-700">{log.entityType}</span>
            {log.entityId && (
              <span className="block text-[10px] text-slate-400 font-mono">ID: {log.entityId}</span>
            )}
          </div>
        ) : (
          'N/A'
        )}
      </td>
      <td className="p-4 whitespace-nowrap text-slate-500 text-xs font-medium">
        {formatDateTime(log.createdAt)}
      </td>
      <td className="p-4 whitespace-nowrap text-slate-400 font-mono text-xs">
        {log.ipAddress || 'N/A'}
      </td>
    </tr>
  );
}
