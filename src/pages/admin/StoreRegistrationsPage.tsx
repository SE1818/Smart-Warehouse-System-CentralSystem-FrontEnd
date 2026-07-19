/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Icons } from '@/components/Icons';
import { storeService } from '@/services';
import type { StoreRegistrationDto } from '@/services/storeService';

type TabType = 'Pending' | 'Approved' | 'Rejected';

const TAB_CONFIG: {
  key: TabType;
  label: string;
  icon: string;
  activeClass: string;
  badgeClass: string;
}[] = [
  {
    key: 'Pending',
    label: 'Chờ duyệt',
    icon: '⏳',
    activeClass: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeClass: 'bg-amber-500 text-white',
  },
  {
    key: 'Approved',
    label: 'Đã duyệt',
    icon: '✓',
    activeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badgeClass: 'bg-emerald-500 text-white',
  },
  {
    key: 'Rejected',
    label: 'Từ chối',
    icon: '✕',
    activeClass: 'text-red-700 bg-red-50 border-red-200',
    badgeClass: 'bg-red-500 text-white',
  },
];

const STATUS_BADGE: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  Approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Rejected: 'bg-red-100 text-red-700 border border-red-200',
};

const STATUS_LABEL: Record<string, string> = {
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
};

export function StoreRegistrationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('Pending');
  const [registrations, setRegistrations] = useState<StoreRegistrationDto[]>([]);
  const [counts, setCounts] = useState<Record<TabType, number>>({
    Pending: 0,
    Approved: 0,
    Rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [rejectingReg, setRejectingReg] = useState<StoreRegistrationDto | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRegistrations = async (tab: TabType) => {
    setLoading(true);
    try {
      const data = await storeService.getAllRegistrations(tab);
      setRegistrations(data);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách đăng ký cửa hàng.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const [all] = await Promise.all([storeService.getAllRegistrations()]);
      const c = { Pending: 0, Approved: 0, Rejected: 0 } as Record<TabType, number>;
      all.forEach((r) => {
        if (r.status in c) c[r.status as TabType]++;
      });
      setCounts(c);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    void fetchCounts();
  }, []);

  useEffect(() => {
    void fetchRegistrations(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleRefresh = () => {
      void fetchCounts();
      void fetchRegistrations(activeTab);
    };
    window.addEventListener('smartwarehouse-notification', handleRefresh);
    return () => window.removeEventListener('smartwarehouse-notification', handleRefresh);
  }, [activeTab]);

  const handleApprove = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn phê duyệt mở cửa hàng "${name}"?`)) return;
    setActionLoadingId(id);
    try {
      const response = await storeService.approveRegistration(id);
      toast.success(response.message || 'Đã phê duyệt cửa hàng thành công.');
      await fetchCounts();
      fetchRegistrations(activeTab);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message || 'Không thể phê duyệt yêu cầu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReg || !rejectionReason.trim()) return;
    const id = rejectingReg.id;
    setActionLoadingId(id);
    try {
      const response = await storeService.rejectRegistration(id, rejectionReason.trim());
      toast.success(response.message || 'Đã từ chối yêu cầu đăng ký cửa hàng.');
      setRejectingReg(null);
      setRejectionReason('');
      await fetchCounts();
      fetchRegistrations(activeTab);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message || 'Không thể từ chối yêu cầu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeTabConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Yêu cầu mở cửa hàng
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Quản lý tất cả đơn đăng ký cửa hàng theo từng trạng thái
          </p>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2">
            <span className="text-xs font-black">{counts.Pending}</span>
            <span className="text-xs font-semibold">chờ duyệt</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2">
            <span className="text-xs font-black">{counts.Approved}</span>
            <span className="text-xs font-semibold">đã duyệt</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2">
            <span className="text-xs font-black">{counts.Rejected}</span>
            <span className="text-xs font-semibold">từ chối</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        {TAB_CONFIG.map(({ key, label, badgeClass }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`
              relative flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all duration-200 cursor-pointer rounded-t-lg -mb-px border border-b-0
              ${activeTab === key
                ? `${TAB_CONFIG.find((t) => t.key === key)!.activeClass} shadow-sm`
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'}
            `}
          >
            {label}
            <span
              className={`
                text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-black px-1
                ${activeTab === key ? badgeClass : 'bg-slate-200 text-slate-500'}
              `}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <Icons.Warehouse className="w-6 h-6 text-slate-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
              <Icons.Spinner className="w-3 h-3 text-brand-600 animate-spin" />
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">Đang tải danh sách...</p>
        </div>
      ) : registrations.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-sm flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
            <Icons.Inbox className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Không có đơn đăng ký</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              {activeTab === 'Pending'
                ? 'Hiện tại không có đơn đăng ký mới nào đang chờ xử lý.'
                : activeTab === 'Approved'
                ? 'Chưa có đơn đăng ký nào được phê duyệt.'
                : 'Chưa có đơn đăng ký nào bị từ chối.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4 w-56">Cửa hàng / Chủ sở hữu</th>
                  <th className="px-6 py-4">Liên hệ</th>
                  <th className="px-6 py-4">Vị trí</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Thời gian</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  {activeTab === 'Pending' && (
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  )}
                  {activeTab === 'Rejected' && (
                    <th className="px-6 py-4 max-w-[200px]">Lý do từ chối</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {registrations.map((reg) => (
                  <tr
                    key={reg.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Store + Owner */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-brand-100 transition-colors select-none">
                          {reg.storeName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">
                            {reg.storeName}
                          </div>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                            <Icons.User className="w-3 h-3 shrink-0" />
                            {reg.ownerName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-700">
                          {reg.ownerEmail}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">{reg.phoneNumber}</div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-700">{reg.areaName}</div>
                        <span className="text-[11px] text-brand-600 font-bold bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full inline-block">
                          {reg.stationName}
                        </span>
                      </div>
                    </td>

                    {/* Time */}
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                        {new Date(reg.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap ${STATUS_BADGE[reg.status] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {STATUS_LABEL[reg.status] ?? reg.status}
                      </span>
                    </td>

                    {/* Actions (Pending only) */}
                    {activeTab === 'Pending' && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(reg.id, reg.storeName)}
                            disabled={actionLoadingId !== null}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoadingId === reg.id ? (
                              <Icons.Spinner className="w-3 h-3 animate-spin" />
                            ) : (
                              <Icons.Check className="w-3.5 h-3.5" />
                            )}
                            Duyệt
                          </button>
                          <button
                            onClick={() => setRejectingReg(reg)}
                            disabled={actionLoadingId !== null}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Icons.Close className="w-3 h-3" />
                            Từ chối
                          </button>
                        </div>
                      </td>
                    )}

                    {/* Rejection reason */}
                    {activeTab === 'Rejected' && (
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-xs text-red-600 font-medium line-clamp-2">
                          {reg.rejectionReason ?? '—'}
                        </p>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              {registrations.length} kết quả •{' '}
              <span className={activeTabConfig.activeClass.split(' ')[0]}>
                {activeTabConfig.label}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ── Reject Reason Modal ── */}
      {rejectingReg && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setRejectingReg(null); setRejectionReason(''); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setRejectingReg(null); setRejectionReason(''); } }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') { setRejectingReg(null); setRejectionReason(''); } }}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                  <Icons.Close className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base leading-tight">
                    Từ chối yêu cầu
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Yêu cầu mở cửa hàng
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setRejectingReg(null); setRejectionReason(''); }}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Icons.Close className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div className="p-6 space-y-4">
                {/* Store info pill */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center font-black text-sm shrink-0 select-none">
                    {rejectingReg.storeName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      {rejectingReg.storeName}
                    </div>
                    <div className="text-xs text-slate-500">{rejectingReg.ownerName}</div>
                  </div>
                </div>

                {/* Reason textarea */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">
                    Lý do từ chối <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 focus:bg-white transition-all text-sm text-slate-800 placeholder-slate-400 resize-none"
                    placeholder="Vui lòng nêu rõ lý do tại sao từ chối yêu cầu này..."
                  />
                  <p className="text-xs text-slate-400">
                    Lý do này sẽ được gửi tới người dùng qua email.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setRejectingReg(null); setRejectionReason(''); }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-bold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId !== null || !rejectionReason.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-bold rounded-xl shadow-sm shadow-red-600/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoadingId === rejectingReg.id ? (
                    <Icons.Spinner className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Icons.Close className="w-3.5 h-3.5" />
                  )}
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
