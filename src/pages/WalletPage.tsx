import { useEffect, useState, useCallback } from 'react';
import { walletService } from '../services/wallet';
import type { Wallet, WalletTransaction } from '../types/wallet';
import type { User } from '@/types/auth';
import { Icons } from '@/components/Icons';

export function WalletPage() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpDesc, setTopUpDesc] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr) as User;
        setUser(parsed);
        return;
      } catch (err) {
        console.error('Error parsing user from localStorage:', err);
      }
    }
    setLoading(false);
  }, []);

  const loadWalletData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [walletData, transactionsData] = await Promise.all([
        walletService.getBalance(user.id),
        walletService.getTransactions(user.id),
      ]);
      setWallet(walletData);
      setTransactions(transactionsData);
    } catch {
      console.error('Error loading wallet data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      const timer = setTimeout(() => {
        loadWalletData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, loadWalletData]);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'Số tiền không hợp lệ' });
      return;
    }

    try {
      const updatedWallet = await walletService.topUp({
        userId: user.id,
        amount,
        description: topUpDesc || 'Nạp tiền vào ví',
      });
      setWallet(updatedWallet);
      setTopUpAmount('');
      setTopUpDesc('');
      setMessage({ type: 'success', text: `Nạp thành công ${amount.toLocaleString('vi-VN')} VND` });
      await loadWalletData();
    } catch {
      setMessage({ type: 'error', text: 'Nạp tiền thất bại' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-550 text-sm font-semibold">Đang tải thông tin ví...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Main Header & Balance block */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Icons.Wallet className="w-8 h-8 text-brand-600" />
            <h1 className="text-2xl font-heading font-black text-slate-900">Ví điện tử cá nhân</h1>
          </div>

          {message && (
            <div
              className={`p-4 rounded-xl flex items-start gap-2.5 text-sm font-semibold border ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                  : 'bg-red-50 text-red-750 border-red-200/60'
              }`}
            >
              {message.type === 'success' ? (
                <Icons.SuccessCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Icons.AlertWarning className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Balance Card */}
            <div className="lg:col-span-1 bg-gradient-to-br from-brand-600 to-brand-500 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between min-h-40 relative overflow-hidden group">
              {/* background light glow */}
              <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-300"></div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider opacity-85">Số dư hiện tại</h2>
                <div className="text-3xl font-heading font-black mt-3">
                  {wallet ? formatCurrency(wallet.balance) : '0 VND'}
                </div>
              </div>
              <div className="text-[10px] font-mono opacity-70 mt-6 bg-black/15 py-1 px-2.5 rounded-lg w-max select-none">
                Ví #{wallet?.id?.slice(0, 8) || 'N/A'}
              </div>
            </div>

            {/* Top Up Form */}
            <div className="lg:col-span-2 bg-slate-50/50 rounded-2xl p-6 border border-slate-200/60">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Nạp tiền vào tài khoản</h3>
              <form onSubmit={handleTopUp} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Số tiền (VND)
                    </label>
                    <input
                      type="number"
                      min="10000"
                      step="1000"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold"
                      placeholder="VD: 100000"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-widest">
                      Mô tả (tuỳ chọn)
                    </label>
                    <input
                      type="text"
                      value={topUpDesc}
                      onChange={(e) => setTopUpDesc(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm font-semibold"
                      placeholder="VD: Nạp cho đơn hàng..."
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all active:scale-98 shadow-md shadow-brand-500/10 hover:shadow-brand-500/25 cursor-pointer"
                >
                  Nạp tiền ngay
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-heading font-bold text-slate-900 flex items-center gap-2">
              <Icons.HistoryLogs className="w-5 h-5 text-brand-600" />
              <span>Lịch sử giao dịch ví</span>
            </h2>
          </div>
          {transactions.length === 0 ? (
            <div className="text-slate-400 text-center py-16 space-y-2">
              <Icons.Search className="w-12 h-12 text-slate-350 mx-auto" />
              <p className="font-semibold text-sm">Chưa phát sinh giao dịch nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th className="p-4">Loại</th>
                    <th className="p-4">Số tiền</th>
                    <th className="p-4">Mô tả</th>
                    <th className="p-4">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            tx.transactionType === 'TopUp'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                              : tx.transactionType === 'Payment'
                              ? 'bg-red-50 text-red-700 border-red-200/60'
                              : 'bg-blue-50 text-blue-700 border-blue-200/60'
                          }`}
                        >
                          {tx.transactionType === 'TopUp' ? 'Nạp tiền' : tx.transactionType === 'Payment' ? 'Thanh toán' : tx.transactionType}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="p-4 text-slate-600">{tx.description}</td>
                      <td className="p-4 text-slate-500 text-xs">{formatDate(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

