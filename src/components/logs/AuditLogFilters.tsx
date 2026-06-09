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
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Search */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">
            Tìm kiếm
          </label>
          <input
            type="text"
            placeholder="Tìm theo tin nhắn, thực thể..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-700 placeholder-slate-400 transition-all font-medium"
          />
        </div>

        {/* Activity Type */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">
            Hoạt động
          </label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as ActivityType | '')}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-700 transition-all font-medium"
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
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">
            Mức độ
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as LogSeverity | '')}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-700 transition-all font-medium"
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
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">
            Từ ngày
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-700 transition-all font-medium"
          />
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest">
            Đến ngày
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white text-sm text-slate-700 transition-all font-medium"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-slate-250 hover:bg-slate-100 text-slate-650 rounded-xl text-xs font-bold transition-all active:scale-98"
        >
          Đặt lại
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all"
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
}
