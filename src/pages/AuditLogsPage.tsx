import { useState, useEffect } from 'react';
import { auditLogService } from '@/services';
import {
  AuditLogRow,
  AuditLogDetailModal,
  AuditLogFilters,
} from '@/components/logs';
import type { AuditLog } from '@/types';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to last 7 days
  const getDefaultFilters = () => ({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [filters, setFilters] = useState(getDefaultFilters());

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditLogService.getLogs(filters);
      setLogs(data);
    } catch (err) {
      setError('Không thể tải dữ liệu log. Vui lòng thử lại sau.');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters({ ...getDefaultFilters(), ...newFilters });
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Nhật ký hệ thống</h1>
          <p className="mt-1 text-sm text-gray-500">
            Theo dõi và quản lý các hoạt động trong hệ thống
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6">
          <AuditLogFilters onFilterChange={handleFilterChange} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Tổng số log</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{logs.length}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Lỗi</div>
                <div className="mt-2 text-2xl font-bold text-red-600">
                  {logs.filter((l) => l.severity === 'Error').length}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Cảnh báo</div>
                <div className="mt-2 text-2xl font-bold text-yellow-600">
                  {logs.filter((l) => l.severity === 'Warning').length}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm font-medium text-gray-500">Critical</div>
                <div className="mt-2 text-2xl font-bold text-purple-600">
                  {logs.filter((l) => l.severity === 'Critical').length}
                </div>
              </div>
            </div>

            {/* Log Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Không có dữ liệu log cho bộ lọc đã chọn
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mức độ
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hoạt động
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thông điệp
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Người dùng
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thực thể
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thời gian
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
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
      </div>

      {/* Detail Modal */}
      <AuditLogDetailModal
        log={selectedLog}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}