import { useState } from 'react';
import { ActivityType, LogSeverity } from '@/types';

interface AuditLogFiltersProps {
  onFilterChange: (filters: {
    startDate?: string;
    endDate?: string;
    activityType?: ActivityType | '';
    severity?: LogSeverity | '';
    search?: string;
  }) => void;
}

const getDefaultDates = () => {
  const now = Date.now();
  return {
    start: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date(now).toISOString().split('T')[0],
  };
};

export function AuditLogFilters({ onFilterChange }: AuditLogFiltersProps) {
  const [search, setSearch] = useState('');
  const [activityType, setActivityType] = useState<ActivityType | ''>('');
  const [severity, setSeverity] = useState<LogSeverity | ''>('');
  const [startDate, setStartDate] = useState(() => getDefaultDates().start);
  const [endDate, setEndDate] = useState(() => getDefaultDates().end);

  const handleApply = () => {
    onFilterChange({
      search: search || undefined,
      activityType: activityType || undefined,
      severity: severity || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const handleReset = () => {
    const d = getDefaultDates();
    setSearch('');
    setActivityType('');
    setSeverity('');
    setStartDate(d.start);
    setEndDate(d.end);
    onFilterChange({
      startDate: d.start,
      endDate: d.end,
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Search */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Tìm kiếm
          </label>
          <input
            type="text"
            placeholder="Tìm theo tin nhắn, thực thể..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Activity Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Hoạt động
          </label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as ActivityType | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">Tất cả</option>
            {Object.values(ActivityType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Mức độ
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as LogSeverity | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">Tất cả</option>
            {Object.values(LogSeverity).map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Từ ngày
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Đến ngày
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Đặt lại
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
}
