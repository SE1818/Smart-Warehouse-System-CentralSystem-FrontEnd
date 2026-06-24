import { useState, useEffect } from 'react';
import { schedulerService } from '@/services/scheduler';
import type { SchedulerResponse, SchedulerJob } from '@/services/scheduler';
import { toast } from 'react-toastify';

export function SchedulerPage() {
  const [data, setData] = useState<SchedulerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchSchedulerData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await schedulerService.getJobs();
      setData(response);
    } catch (err: any) {
      console.error('Error fetching scheduler jobs:', err);
      toast.error('Không thể tải danh sách công việc từ Scheduler Service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulerData();
    // Auto refresh every 10 seconds for real-time monitoring
    const interval = setInterval(() => fetchSchedulerData(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerJob = async (jobName: string, group: string) => {
    const key = `${group}-${jobName}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await schedulerService.triggerJob(jobName, group);
      toast.success(`Đã kích hoạt thủ công công việc "${jobName}" thành công!`);
      fetchSchedulerData(true);
    } catch (err: any) {
      console.error(`Error triggering job ${jobName}:`, err);
      toast.error(`Kích hoạt công việc "${jobName}" thất bại.`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handlePauseJob = async (jobName: string, group: string) => {
    const key = `${group}-${jobName}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await schedulerService.pauseJob(jobName, group);
      toast.info(`Đã tạm dừng công việc "${jobName}".`);
      fetchSchedulerData(true);
    } catch (err: any) {
      console.error(`Error pausing job ${jobName}:`, err);
      toast.error(`Tạm dừng công việc "${jobName}" thất bại.`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleResumeJob = async (jobName: string, group: string) => {
    const key = `${group}-${jobName}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await schedulerService.resumeJob(jobName, group);
      toast.success(`Đã khôi phục hoạt động cho công việc "${jobName}".`);
      fetchSchedulerData(true);
    } catch (err: any) {
      console.error(`Error resuming job ${jobName}:`, err);
      toast.error(`Khôi phục công việc "${jobName}" thất bại.`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const getTriggerStateBadge = (state: string) => {
    switch (state.toUpperCase()) {
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Hoạt động
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Tạm dừng
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            Bị chặn
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Lỗi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            {state}
          </span>
        );
    }
  };

  const formatDateString = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  // Stats calculation
  const totalJobs = data?.jobCount ?? 0;
  const runningJobs = data?.jobs.filter((j) => j.isCurrentlyRunning).length ?? 0;
  const pausedJobs = data?.jobs.filter((j) => j.triggers.some((t) => t.state.toUpperCase() === 'PAUSED')).length ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <svg
              className="w-8 h-8 text-brand-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
              />
            </svg>
            <span>Quản lý Scheduler (Quartz Jobs)</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Giám sát, tạm dừng, khôi phục hoặc kích hoạt thủ công các tác vụ ngầm định kỳ của hệ thống.
          </p>
        </div>
        <div>
          <button
            onClick={() => fetchSchedulerData(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Làm mới
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng số Jobs</p>
              <p className="text-3xl font-heading font-black text-slate-800 tracking-tight">{loading ? '...' : totalJobs}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border text-blue-600 bg-blue-50/80 border-blue-100/50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đang thực thi</p>
              <p className="text-3xl font-heading font-black text-emerald-700 tracking-tight">{loading ? '...' : runningJobs}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border text-emerald-600 bg-emerald-50/80 border-emerald-100/50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đang tạm dừng</p>
              <p className="text-3xl font-heading font-black text-amber-700 tracking-tight">{loading ? '...' : pausedJobs}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border text-amber-600 bg-amber-50/80 border-amber-100/50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-heading font-bold text-slate-900">Danh sách Quartz Jobs</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Instance: {data?.schedulerInstanceId ?? 'N/A'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-semibold">
            <div className="w-8 h-8 border-4 border-slate-300 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
            Đang tải dữ liệu Scheduler...
          </div>
        ) : !data || data.jobs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <svg
              className="w-12 h-12 text-slate-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Không tìm thấy Quartz Job nào đang chạy trong hệ thống.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-250 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Tên tác vụ</th>
                  <th className="px-6 py-4">Trình kích hoạt (Triggers)</th>
                  <th className="px-6 py-4">Thời gian chạy</th>
                  <th className="px-6 py-4 text-center">Trạng thái chạy</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {data.jobs.map((job: SchedulerJob) => {
                  const trigger = job.triggers[0]; // quartz standard mostly 1 trigger per job here
                  const triggerState = trigger?.state ?? 'UNKNOWN';
                  const isPaused = triggerState.toUpperCase() === 'PAUSED';
                  const actionKey = `${job.jobGroup}-${job.jobName}`;
                  const isActionLoading = actionLoading[actionKey] ?? false;

                  return (
                    <tr key={actionKey} className="hover:bg-slate-50/50 transition-colors duration-150">
                      {/* Name & Class info */}
                      <td className="px-6 py-5">
                        <div className="space-y-1 max-w-xs">
                          <p className="font-bold text-slate-900 truncate" title={job.jobName}>{job.jobName}</p>
                          <p className="text-[11px] text-slate-450 truncate" title={job.description ?? ''}>
                            {job.description || 'Không có mô tả'}
                          </p>
                          <span className="inline-block text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {job.jobGroup}
                          </span>
                        </div>
                      </td>

                      {/* Trigger Cron & State */}
                      <td className="px-6 py-5">
                        {trigger ? (
                          <div className="space-y-2">
                            {trigger.cronExpression ? (
                              <code className="text-xs text-brand-650 bg-brand-50/80 px-2 py-1 rounded font-mono font-bold border border-brand-100/50">
                                {trigger.cronExpression}
                              </code>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Simple Trigger</span>
                            )}
                            <div>{getTriggerStateBadge(trigger.state)}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Không có trigger</span>
                        )}
                      </td>

                      {/* Next/Prev Fire Time */}
                      <td className="px-6 py-5">
                        {trigger ? (
                          <div className="space-y-1 text-xs">
                            <p className="text-slate-500">
                              Lần trước: <span className="font-bold text-slate-700">{formatDateString(trigger.previousFireTime)}</span>
                            </p>
                            <p className="text-slate-500">
                              Lần tới: <span className="font-bold text-slate-900">{formatDateString(trigger.nextFireTime)}</span>
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </td>

                      {/* Current execution */}
                      <td className="px-6 py-5 text-center">
                        {job.isCurrentlyRunning ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Đang chạy
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Chờ lệnh</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleTriggerJob(job.jobName, job.jobGroup)}
                            disabled={isActionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 disabled:opacity-50 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs border border-brand-100"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z" />
                            </svg>
                            Chạy ngay
                          </button>

                          {trigger && (
                            isPaused ? (
                              <button
                                onClick={() => handleResumeJob(job.jobName, job.jobGroup)}
                                disabled={isActionLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 disabled:opacity-50 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs border border-emerald-100"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                                Khôi phục
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePauseJob(job.jobName, job.jobGroup)}
                                disabled={isActionLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 disabled:opacity-50 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs border border-amber-100"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                                </svg>
                                Tạm dừng
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
