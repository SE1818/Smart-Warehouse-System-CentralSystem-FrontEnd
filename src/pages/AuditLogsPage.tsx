import { useState, useEffect } from 'react';
import { auditLogService } from '@/services';
import {
  AuditLogRow,
  AuditLogDetailModal,
  AuditLogFilters,
} from '@/components/logs';
import type { AuditLog } from '@/types';
import { Icons } from '@/components/Icons';


// Default to last 7 days
const getDefaultFilters = () => {
  const now = Date.now();
  return {
    startDate: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(now).toISOString().split('T')[0],
  };
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState(getDefaultFilters);

  useEffect(() => {
    let active = true;

    auditLogService.getLogs(filters)
      .then((data) => {
        if (active) {
          setLogs(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError('Không thể tải dữ liệu log. Vui lòng thử lại sau.');
          console.error('Error fetching audit logs:', err);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filters]);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    auditLogService.getLogs(filters)
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError('Không thể tải dữ liệu log. Vui lòng thử lại sau.');
        console.error('Error fetching audit logs:', err);
        setLoading(false);
      });
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters({ ...getDefaultFilters(), ...newFilters });
    setLoading(true);
    setError(null);
  };

  const handleLogClick = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedLog(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.HistoryLogs className="w-8 h-8 text-brand-600" />
            <span>Nhật ký hoạt động hệ thống</span>
          </h1>
          <p className="mt-1 text-sm text-slate-550">
            Tra cứu, lọc và giám sát lịch sử hoạt động bảo mật của SmartWarehouse
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <Icons.Refresh className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filters */}
      <div>
        <AuditLogFilters onFilterChange={handleFilterChange} />
      </div>

      {/* Error block */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-750 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
          <Icons.AlertWarning className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-550 text-sm font-semibold">Đang tải lịch sử nhật ký...</p>
        </div>
      ) : (
        <>
          {/* Statistics counter rows */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Tổng số log', count: logs.length, color: 'border-blue-200 text-blue-700 bg-blue-50/50' },
              { label: 'Lỗi phát sinh', count: logs.filter((l) => l.severity === 'Error').length, color: 'border-red-200 text-red-700 bg-red-50/50' },
              { label: 'Cảnh báo', count: logs.filter((l) => l.severity === 'Warning').length, color: 'border-amber-200 text-amber-700 bg-amber-50/50' },
              { label: 'Critical', count: logs.filter((l) => l.severity === 'Critical').length, color: 'border-purple-200 text-purple-700 bg-purple-50/50' }
            ].map((stat, idx) => (
              <div key={idx} className={`bg-white p-5 rounded-2xl border ${stat.color} shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm`}>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                <div className="mt-2 text-3xl font-heading font-black text-slate-800">{stat.count}</div>
              </div>
            ))}
          </div>

          {/* Log list table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-3">
                <Icons.Search className="w-12 h-12 text-slate-350 mx-auto" />
                <p className="font-semibold text-sm">Không có dữ liệu log cho bộ lọc đã chọn</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="p-4">Mức độ</th>
                      <th className="p-4">Hoạt động</th>
                      <th className="p-4">Thông điệp</th>
                      <th className="p-4">Người dùng</th>
                      <th className="p-4">Thực thể</th>
                      <th className="p-4">Thời gian</th>
                      <th className="p-4">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {logs.map((log) => (
                      <AuditLogRow
                        key={log.id}
                        log={log}
                        onClick={handleLogClick}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail overlay Modal */}
      <AuditLogDetailModal
        log={selectedLog}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}