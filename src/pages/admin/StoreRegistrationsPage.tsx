import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Icons } from '@/components/Icons';
import { storeService } from '@/services';
import type { StoreRegistrationDto } from '@/services/storeService';

type TabType = 'Pending' | 'Approved' | 'Rejected';

const TAB_CONFIG: { key: TabType; label: string; color: string; badge: string }[] = [
  { key: 'Pending', label: 'Chờ duyệt', color: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  { key: 'Approved', label: 'Đã duyệt', color: 'text-green-600', badge: 'bg-green-100 text-green-700' },
  { key: 'Rejected', label: 'Từ chối', color: 'text-red-600', badge: 'bg-red-100 text-red-700' },
];

const STATUS_BADGE: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  Approved: 'bg-green-100 text-green-700 border border-green-200',
  Rejected: 'bg-red-100 text-red-700 border border-red-200',
};

export function StoreRegistrationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('Pending');
  const [registrations, setRegistrations] = useState<StoreRegistrationDto[]>([]);
  const [counts, setCounts] = useState<Record<TabType, number>>({ Pending: 0, Approved: 0, Rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Rejection modal state
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
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchRegistrations(activeTab);
  }, [activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleApprove = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn phê duyệt mở cửa hàng "${name}"?`)) return;
    setActionLoadingId(id);
    try {
      const response = await storeService.approveRegistration(id);
      toast.success(response.message || 'Đã phê duyệt cửa hàng thành công.');
      await fetchCounts();
      fetchRegistrations(activeTab);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể phê duyệt yêu cầu.');
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể từ chối yêu cầu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Yêu cầu mở cửa hàng</h1>
        <p className="text-sm text-slate-500 font-medium">Quản lý tất cả đơn đăng ký cửa hàng theo từng trạng thái</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TAB_CONFIG.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
              ${activeTab === key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}
            `}
          >
            {label}
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${activeTab === key ? STATUS_BADGE[key] : 'bg-slate-200 text-slate-500'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Icons.Spinner className="w-8 h-8 text-brand-600 animate-spin" />
          <span className="text-slate-500 font-medium text-sm">Đang tải danh sách...</span>
        </div>
      ) : registrations.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-100 shadow-sm flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
            <Icons.Inbox className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Không có đơn đăng ký</h3>
            <p className="text-slate-450 text-sm max-w-sm">
              {activeTab === 'Pending'
                ? 'Hiện tại không có bất kỳ đơn đăng ký mới nào đang chờ xử lý.'
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
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Tên cửa hàng / Chủ sở hữu</th>
                  <th className="px-6 py-4">Liên hệ (Email/SĐT)</th>
                  <th className="px-6 py-4">Vị trí (Khu vực / Trạm)</th>
                  <th className="px-6 py-4 text-center">Thời gian</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  {activeTab === 'Pending' && <th className="px-6 py-4 text-right">Thao tác</th>}
                  {activeTab === 'Rejected' && <th className="px-6 py-4">Lý do từ chối</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-slate-800">{reg.storeName}</div>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Icons.User className="w-3.5 h-3.5" /> {reg.ownerName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-xs text-slate-650">
                        <div className="font-semibold">{reg.ownerEmail}</div>
                        <div>{reg.phoneNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-700">{reg.areaName}</div>
                        <div className="text-[11px] text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-full inline-block">
                          {reg.stationName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-xs text-slate-450 font-medium">
                      {new Date(reg.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[reg.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {reg.status === 'Pending' ? 'Chờ duyệt' : reg.status === 'Approved' ? 'Đã duyệt' : 'Từ chối'}
                      </span>
                    </td>
                    {activeTab === 'Pending' && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(reg.id, reg.storeName)}
                            disabled={actionLoadingId !== null}
                            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoadingId === reg.id ? (
                              <Icons.Spinner className="w-3 h-3 text-white animate-spin" />
                            ) : (
                              <Icons.Check className="w-3.5 h-3.5" />
                            )}
                            <span>Duyệt</span>
                          </button>
                          <button
                            onClick={() => setRejectingReg(reg)}
                            disabled={actionLoadingId !== null}
                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 text-xs font-bold rounded-lg active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Icons.Trash className="w-3.5 h-3.5" />
                            <span>Từ chối</span>
                          </button>
                        </div>
                      </td>
                    )}
                    {activeTab === 'Rejected' && (
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-xs text-red-600 font-medium line-clamp-2">{reg.rejectionReason ?? '—'}</p>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingReg && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-base">Từ chối yêu cầu mở cửa hàng</h3>
              <button
                onClick={() => { setRejectingReg(null); setRejectionReason(''); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <div className="text-sm text-slate-600 font-semibold mb-2">
                    Cửa hàng: <strong className="text-slate-800">{rejectingReg.storeName}</strong>
                  </div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Lý do từ chối
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-850"
                    placeholder="Vui lòng nêu rõ lý do tại sao từ chối yêu cầu này..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setRejectingReg(null); setRejectionReason(''); }}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-bold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId !== null || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoadingId === rejectingReg.id ? (
                    <Icons.Spinner className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Icons.Trash className="w-3.5 h-3.5" />
                  )}
                  <span>Xác nhận từ chối</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
