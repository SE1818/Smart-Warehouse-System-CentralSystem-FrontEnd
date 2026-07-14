import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Icons } from '@/components/Icons';
import { storeService, userService, settlementService } from '@/services';
import type { StoreDto } from '@/services/storeService';
import type { AdminUserResponse } from '@/services/userService';
import type { SettlementDto, PayoutTransactionDto, PendingSettlementsResponse } from '@/services/settlementService';

type SubTabType = 'pending_details' | 'history' | 'payouts' | 'withdraw';

export function SettlementPage() {
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreDto | null>(null);
  const [matchedManager, setMatchedManager] = useState<AdminUserResponse | null>(null);

  // Loading states
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Store data
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [pendingResponse, setPendingResponse] = useState<PendingSettlementsResponse | null>(null);
  const [settlementHistory, setSettlementHistory] = useState<SettlementDto[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutTransactionDto[]>([]);

  // Filters & Actions state
  const [activeTab, setActiveTab] = useState<SubTabType>('pending_details');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawNotes, setWithdrawNotes] = useState<string>('');

  // Fetch initial store list and users list
  const initializeData = async () => {
    setLoadingStores(true);
    try {
      const [storesData, usersData] = await Promise.all([
        storeService.getAllStores(),
        userService.getAllUsers(),
      ]);
      setStores(storesData);
      setUsers(usersData);
      if (storesData.length > 0) {
        setSelectedStore(storesData[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải dữ liệu ban đầu cho đối soát.');
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    void initializeData();
  }, []);

  // Whenever selected store or users list changes, resolve the manager and load store details
  useEffect(() => {
    if (!selectedStore) {
      setMatchedManager(null);
      return;
    }

    const manager = users.find(
      (u) => u.email.toLowerCase() === selectedStore.ownerEmail.toLowerCase()
    ) || null;
    setMatchedManager(manager);
  }, [selectedStore, users]);

  // Load details for the selected store
  const fetchStoreDetails = async () => {
    if (!selectedStore) return;
    setLoadingDetails(true);
    try {
      // 1. Get Pending Settlements
      const pendingData = await settlementService.getStorePendingSettlements(selectedStore.id);
      setPendingResponse(pendingData);

      // 2. Get Settlement History
      const fromIso = new Date(dateFrom).toISOString();
      const toIso = new Date(dateTo + 'T23:59:59Z').toISOString();
      const historyData = await settlementService.getStoreSettlements(selectedStore.id, fromIso, toIso);
      setSettlementHistory(historyData);

      // 3. Resolve wallet balance & Payout history if manager is found
      if (matchedManager) {
        const [walletRes, payoutsRes] = await Promise.all([
          settlementService.getStoreWalletBalance(matchedManager.id),
          settlementService.getManagerPayoutHistory(matchedManager.id),
        ]);
        setWalletBalance(walletRes.balance);
        setPayoutHistory(payoutsRes);
      } else {
        setWalletBalance(null);
        setPayoutHistory([]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi tải thông tin đối soát của cửa hàng.');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedStore) {
      void fetchStoreDetails();
    }
  }, [selectedStore, matchedManager, dateFrom, dateTo]);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;
    if (!matchedManager) {
      toast.error('Không tìm thấy tài khoản quản lý của cửa hàng này để thực hiện rút tiền.');
      return;
    }
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Số tiền rút không hợp lệ.');
      return;
    }
    if (walletBalance !== null && amountNum > walletBalance) {
      toast.error('Số dư khả dụng trong ví không đủ để thực hiện yêu cầu.');
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const response = await settlementService.withdrawStoreFunds({
        storeId: selectedStore.id,
        storeManagerId: matchedManager.id,
        amount: amountNum,
        notes: withdrawNotes.trim() || undefined,
      });
      toast.success(response.message || 'Yêu cầu rút tiền đã được thực hiện thành công.');
      setWithdrawAmount('');
      setWithdrawNotes('');
      setActiveTab('payouts');
      void fetchStoreDetails();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Không thể thực hiện yêu cầu rút tiền.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Helper to filter history based on status dropdown
  const filteredHistory = settlementHistory.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-amber-600',
      'from-rose-500 to-pink-600',
      'from-indigo-500 to-blue-600',
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Đối soát & Payout</h1>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Quản lý dòng tiền đối soát doanh thu của Store Manager và chi trả Payout / Rút tiền
          </p>
        </div>
        <button
          onClick={fetchStoreDetails}
          disabled={loadingDetails}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-sm flex items-center gap-2 cursor-pointer font-semibold disabled:opacity-60"
        >
          <Icons.Refresh className={`w-4 h-4 ${loadingDetails ? 'animate-spin' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* ── Settlement Process Alert Guide ── */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl p-6 shadow-md border border-brand-400/20 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-1/4 translate-x-1/4 opacity-10">
          <Icons.Wallet className="w-64 h-64" />
        </div>
        <div className="relative z-10 space-y-3 max-w-4xl">
          <h3 className="text-base font-extrabold flex items-center gap-2">
            💡 Quy trình Đối soát & Chi trả tự động
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium text-brand-50/90 pt-1">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 space-y-1">
              <span className="font-bold text-white block">1. Hold tạm tính</span>
              <p>Khách hàng thanh toán đơn hàng. Doanh thu được giữ ở trạng thái Chờ đối soát (Pending).</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 space-y-1">
              <span className="font-bold text-white block">2. Chạy Job 23:59</span>
              <p>Hệ thống tự động gom đơn của ngày, trừ đi 5% phí nền tảng để tính số tiền thực nhận (Net Amount).</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 space-y-1">
              <span className="font-bold text-white block">3. Cộng ví Shop</span>
              <p>Cập nhật trạng thái các đơn hàng thành Completed và chuyển tiền Net vào ví của Store Manager.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 space-y-1">
              <span className="font-bold text-white block">4. Rút tiền</span>
              <p>Store Manager yêu cầu rút tiền từ Ví điện tử về tài khoản ngân hàng của họ.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* left column: Store Selector */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Chọn Cửa Hàng</h3>
              <span className="text-[11px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">
                {stores.length} Cửa hàng
              </span>
            </div>

            {loadingStores ? (
              <div className="flex items-center justify-center py-10 gap-2">
                <Icons.Spinner className="w-5 h-5 text-brand-600" />
                <span className="text-xs text-slate-400 font-semibold">Đang tải danh sách...</span>
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                Chưa có cửa hàng hoạt động nào.
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {stores.map((store) => {
                  const isSelected = selectedStore?.id === store.id;
                  return (
                    <button
                      key={store.id}
                      onClick={() => {
                        setSelectedStore(store);
                        setActiveTab('pending_details');
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-brand-50 to-brand-100/10 border-brand-200 text-slate-900 font-bold shadow-xs'
                          : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(
                          store.name
                        )} text-white flex items-center justify-center font-bold text-sm shrink-0`}
                      >
                        {store.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs truncate ${isSelected ? 'text-brand-900 font-extrabold' : 'text-slate-800 font-bold'}`}>
                          {store.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate font-medium mt-0.5">
                          {store.ownerEmail}
                        </p>
                      </div>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manager Account status details card */}
          {selectedStore && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <h3 className="font-black text-slate-800 text-sm tracking-tight uppercase">Tài khoản Quản lý</h3>
              {matchedManager ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base shrink-0">
                      {matchedManager.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{matchedManager.username}</p>
                      <p className="text-[10px] text-slate-400 truncate">{matchedManager.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-semibold">User ID</span>
                      <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        {matchedManager.id}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-semibold">Vai trò</span>
                      <span className="font-bold text-brand-600 capitalize">{matchedManager.role}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-semibold">Trạng thái tài khoản</span>
                      <span className={`font-bold ${matchedManager.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                        {matchedManager.isActive ? 'Hoạt động' : 'Khóa'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-xs font-medium space-y-2">
                  <p className="flex items-center gap-1.5 font-bold">
                    ⚠️ Chưa khớp được Manager Account!
                  </p>
                  <p className="text-amber-600">
                    Không tìm thấy user nào khớp với email <strong>{selectedStore.ownerEmail}</strong>. Vui lòng kiểm tra lại danh sách người dùng.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* right column: Stats & Lists */}
        <div className="lg:col-span-8 space-y-6">
          {selectedStore ? (
            <>
              {/* ── Stats Row ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Available Wallet Balance Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute right-2 top-2 opacity-5 text-slate-500">
                    <Icons.Wallet className="w-16 h-16" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Số dư Ví khả dụng
                  </span>
                  <div className="my-2.5">
                    <span className="text-2xl font-black text-emerald-600 tracking-tight">
                      {walletBalance !== null ? formatCurrency(walletBalance) : '---'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {matchedManager ? 'Có thể yêu cầu rút tiền' : 'Không có ví tài khoản'}
                  </span>
                </div>

                {/* Total Pending Balance Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute right-2 top-2 opacity-5 text-slate-500">
                    <Icons.TagDiscount className="w-16 h-16" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Doanh thu chờ đối soát
                  </span>
                  <div className="my-2.5">
                    <span className="text-2xl font-black text-amber-500 tracking-tight">
                      {pendingResponse ? formatCurrency(pendingResponse.totalPendingAmount) : '---'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Sẽ kết toán tự động vào 23:59
                  </span>
                </div>

                {/* Unsettled Orders Count Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute right-2 top-2 opacity-5 text-slate-500">
                    <Icons.CartOrder className="w-16 h-16" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Đơn hàng chưa đối soát
                  </span>
                  <div className="my-2.5">
                    <span className="text-2xl font-black text-slate-800 tracking-tight">
                      {pendingResponse ? pendingResponse.count : '---'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">Đơn hàng ở trạng thái Paid</span>
                </div>
              </div>

              {/* ── Sub Navigation Tabs ── */}
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                <div className="flex border-b border-slate-100 overflow-x-auto">
                  <TabButton
                    active={activeTab === 'pending_details'}
                    onClick={() => setActiveTab('pending_details')}
                    label="Đối soát chờ xử lý"
                  />
                  <TabButton
                    active={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                    label="Lịch sử đối soát"
                  />
                  <TabButton
                    active={activeTab === 'payouts'}
                    onClick={() => setActiveTab('payouts')}
                    label="Payout & Rút tiền"
                  />
                  <TabButton
                    active={activeTab === 'withdraw'}
                    onClick={() => setActiveTab('withdraw')}
                    label="Yêu cầu rút hộ"
                  />
                </div>

                <div className="p-6">
                  {loadingDetails ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Icons.Spinner className="w-8 h-8 text-brand-600 animate-spin" />
                      <p className="text-sm text-slate-400 font-semibold">Đang tải dữ liệu đối soát...</p>
                    </div>
                  ) : (
                    <>
                      {/* 1. Pending Details Tab */}
                      {activeTab === 'pending_details' && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-800 text-sm">
                              Danh sách đơn chờ đối soát cuối ngày ({pendingResponse?.pendingSettlements.length || 0})
                            </h4>
                          </div>

                          {!pendingResponse || pendingResponse.pendingSettlements.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs font-semibold bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
                              <Icons.Inbox className="w-8 h-8 text-slate-300" />
                              <span>Không có đơn hàng nào chờ đối soát cho cửa hàng này.</span>
                            </div>
                          ) : (
                            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                    <th className="p-3.5">Mã đơn hàng</th>
                                    <th className="p-3.5 text-right">Tổng tiền</th>
                                    <th className="p-3.5 text-right">Phí sàn (5%)</th>
                                    <th className="p-3.5 text-right">Thực nhận (Net)</th>
                                    <th className="p-3.5">Thời gian tạo</th>
                                    <th className="p-3.5 text-center">Trạng thái</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                                  {pendingResponse.pendingSettlements.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/30">
                                      <td className="p-3.5 font-mono text-[10px] text-slate-500">{item.orderId}</td>
                                      <td className="p-3.5 text-right text-slate-800 font-bold">
                                        {formatCurrency(item.subtotal)}
                                      </td>
                                      <td className="p-3.5 text-right text-red-500">
                                        -{formatCurrency(item.platformFee)}
                                      </td>
                                      <td className="p-3.5 text-right text-emerald-600 font-bold">
                                        {formatCurrency(item.netAmount)}
                                      </td>
                                      <td className="p-3.5 text-slate-400 font-normal">
                                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                                      </td>
                                      <td className="p-3.5 text-center">
                                        <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-bold rounded-full">
                                          Chờ xử lý
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. Settlement History Tab */}
                      {activeTab === 'history' && (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <h4 className="font-bold text-slate-800 text-sm">Lịch sử kết toán đối soát</h4>
                            <div className="flex gap-2.5">
                              {/* Filter inputs */}
                              <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Từ</label>
                                <input
                                  type="date"
                                  value={dateFrom}
                                  onChange={(e) => setDateFrom(e.target.value)}
                                  className="border border-slate-200 rounded-lg p-1 text-xs text-slate-700 focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Đến</label>
                                <input
                                  type="date"
                                  value={dateTo}
                                  onChange={(e) => setDateTo(e.target.value)}
                                  className="border border-slate-200 rounded-lg p-1 text-xs text-slate-700 focus:outline-none"
                                />
                              </div>
                              <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none"
                              >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="completed">Đã hoàn thành</option>
                                <option value="pending">Chờ đối soát</option>
                                <option value="failed">Thất bại</option>
                              </select>
                            </div>
                          </div>

                          {filteredHistory.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs font-semibold bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
                              <Icons.Inbox className="w-8 h-8 text-slate-300" />
                              <span>Không tìm thấy lịch sử đối soát nào trong khoảng thời gian này.</span>
                            </div>
                          ) : (
                            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                    <th className="p-3.5">Mã đơn hàng</th>
                                    <th className="p-3.5 text-right">Tổng tiền</th>
                                    <th className="p-3.5 text-right">Phí sàn</th>
                                    <th className="p-3.5 text-right">Thực nhận</th>
                                    <th className="p-3.5">Ngày đối soát</th>
                                    <th className="p-3.5 text-center">Trạng thái</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                                  {filteredHistory.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/30">
                                      <td className="p-3.5 font-mono text-[10px] text-slate-500">{item.orderId}</td>
                                      <td className="p-3.5 text-right text-slate-800 font-bold">
                                        {formatCurrency(item.subtotal)}
                                      </td>
                                      <td className="p-3.5 text-right text-red-400">
                                        -{formatCurrency(item.platformFee)}
                                      </td>
                                      <td className="p-3.5 text-right text-emerald-600 font-bold">
                                        {formatCurrency(item.netAmount)}
                                      </td>
                                      <td className="p-3.5 text-slate-400 font-normal">
                                        {item.settledAt
                                          ? new Date(item.settledAt).toLocaleString('vi-VN')
                                          : '---'}
                                      </td>
                                      <td className="p-3.5 text-center">
                                        <span
                                          className={`px-2 py-0.5 border text-[10px] font-bold rounded-full ${
                                            item.status === 'Completed'
                                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                              : item.status === 'Failed'
                                              ? 'bg-red-50 border-red-200 text-red-600'
                                              : 'bg-amber-50 border-amber-200 text-amber-600'
                                          }`}
                                        >
                                          {item.status === 'Completed'
                                            ? 'Đã hoàn thành'
                                            : item.status === 'Failed'
                                            ? 'Thất bại'
                                            : 'Chờ kết toán'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Payout Transactions Tab */}
                      {activeTab === 'payouts' && (
                        <div className="space-y-4">
                          <h4 className="font-bold text-slate-800 text-sm">Lịch sử Payout & Rút tiền từ ví</h4>

                          {payoutHistory.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs font-semibold bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center gap-3">
                              <Icons.Inbox className="w-8 h-8 text-slate-300" />
                              <span>Không có lịch sử payout hoặc yêu cầu rút tiền nào.</span>
                            </div>
                          ) : (
                            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                    <th className="p-3.5">Mã giao dịch</th>
                                    <th className="p-3.5 text-right">Tổng tiền</th>
                                    <th className="p-3.5 text-center">Số đơn trong batch</th>
                                    <th className="p-3.5">Thời gian xử lý</th>
                                    <th className="p-3.5">Ngày tạo</th>
                                    <th className="p-3.5 text-center">Trạng thái</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                                  {payoutHistory.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/30">
                                      <td className="p-3.5 font-mono text-[10px] text-slate-500">{item.id}</td>
                                      <td className="p-3.5 text-right text-brand-700 font-black">
                                        {formatCurrency(item.totalAmount)}
                                      </td>
                                      <td className="p-3.5 text-center font-bold text-slate-600">
                                        {item.settlementCount > 0 ? `${item.settlementCount} đơn` : 'Rút tiền'}
                                      </td>
                                      <td className="p-3.5 text-slate-400 font-normal">
                                        {item.processedAt
                                          ? new Date(item.processedAt).toLocaleString('vi-VN')
                                          : '---'}
                                      </td>
                                      <td className="p-3.5 text-slate-400 font-normal">
                                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                                      </td>
                                      <td className="p-3.5 text-center">
                                        <span
                                          className={`px-2 py-0.5 border text-[10px] font-bold rounded-full ${
                                            item.status === 'Completed'
                                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                              : item.status === 'Failed'
                                              ? 'bg-red-50 border-red-200 text-red-600'
                                              : 'bg-amber-50 border-amber-200 text-amber-600'
                                          }`}
                                        >
                                          {item.status === 'Completed'
                                            ? 'Đã duyệt / Xong'
                                            : item.status === 'Failed'
                                            ? 'Thất bại'
                                            : 'Đang xử lý'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4. Request Withdrawal Tab */}
                      {activeTab === 'withdraw' && (
                        <div className="space-y-4 max-w-xl">
                          <h4 className="font-bold text-slate-800 text-sm">Yêu cầu rút tiền hộ Store Manager</h4>
                          <p className="text-xs text-slate-500">
                            Thực hiện rút tiền từ ví khả dụng của Store Manager. Thao tác này sẽ trừ trực tiếp vào số dư ví của shop và tạo ra một giao dịch Payout yêu cầu chuyển khoản.
                          </p>

                          {!matchedManager ? (
                            <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-red-800 text-xs font-semibold">
                              Không thể rút tiền vì cửa hàng này chưa có liên kết với tài khoản quản lý hệ thống.
                            </div>
                          ) : (
                            <form onSubmit={handleWithdrawSubmit} className="space-y-4 pt-2">
                              {/* Amount input */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Số tiền rút (VND)</label>
                                <input
                                  type="number"
                                  required
                                  min="1000"
                                  placeholder="Nhập số tiền muốn rút"
                                  value={withdrawAmount}
                                  onChange={(e) => setWithdrawAmount(e.target.value)}
                                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800"
                                />
                                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                  Tối đa có thể rút:{' '}
                                  <strong className="text-slate-600">
                                    {walletBalance !== null ? formatCurrency(walletBalance) : '0đ'}
                                  </strong>
                                </span>
                              </div>

                              {/* Notes input */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Ghi chú rút tiền</label>
                                <textarea
                                  placeholder="Ví dụ: Rút tiền doanh thu tuần 2 tháng 7"
                                  value={withdrawNotes}
                                  onChange={(e) => setWithdrawNotes(e.target.value)}
                                  rows={3}
                                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={submittingWithdraw || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all active:scale-98 shadow-md shadow-brand-500/10 cursor-pointer disabled:opacity-60 flex items-center gap-2"
                              >
                                {submittingWithdraw ? (
                                  <>
                                    <Icons.Spinner className="w-4 h-4 text-white animate-spin" />
                                    <span>Đang tạo yêu cầu...</span>
                                  </>
                                ) : (
                                  <>
                                    <Icons.Check className="w-4 h-4" />
                                    <span>Gửi yêu cầu rút tiền</span>
                                  </>
                                )}
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/80 shadow-sm flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                <Icons.Store className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">Chưa chọn cửa hàng</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto">
                  Vui lòng chọn một cửa hàng ở cột bên trái để xem chi tiết đối soát và lịch sử payout.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// TabButton sub component
function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 text-xs font-extrabold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
        active
          ? 'border-brand-600 text-brand-700 bg-brand-50/5'
          : 'border-transparent text-slate-400 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );
}
