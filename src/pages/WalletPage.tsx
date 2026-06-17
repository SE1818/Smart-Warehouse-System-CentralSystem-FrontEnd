import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { walletService } from '../services/wallet';
import type { Wallet, WalletTransaction } from '../types/wallet';

export function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpDesc, setTopUpDesc] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadWalletData();
    }
  }, [user]);

  const loadWalletData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [walletData, transactionsData] = await Promise.all([
        walletService.getBalance(user.id),
        walletService.getTransactions(user.id),
      ]);
      setWallet(walletData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h1 className="text-2xl font-heading font-bold text-slate-900 mb-6">Ví điện tử</h1>

        {message && (
          <div
            className={`p-4 rounded-xl mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Card */}
          <div className="lg:col-span-1 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white shadow-lg">
            <h2 className="text-lg font-semibold opacity-90">Số dư hiện tại</h2>
            <div className="text-4xl font-bold mt-2">
              {wallet ? formatCurrency(wallet.balance) : '0 VND'}
            </div>
            <div className="text-sm opacity-75 mt-1">
              Ví #{wallet?.id?.slice(0, 8) || 'N/A'}
            </div>
          </div>

          {/* Top Up Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Nạp tiền</h3>
            <form onSubmit={handleTopUp} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Số tiền (VND)
                  </label>
                  <input
                    type="number"
                    min="10000"
                    step="1000"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    placeholder="VD: 100000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mô tả (tuỳ chọn)
                  </label>
                  <input
                    type="text"
                    value={topUpDesc}
                    onChange={(e) => setTopUpDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    placeholder="VD: Nạp cho đơn hàng..."
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full md:w-auto px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold transition-all active:scale-98 shadow-md shadow-brand-500/10"
              >
                Nạp tiền
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-2xl font-heading font-bold text-slate-900 mb-6">Lịch sử giao dịch</h2>
        {transactions.length === 0 ? (
          <div className="text-slate-500 text-center py-12">Chưa có giao dịch nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Loại</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Số tiền</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Mô tả</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          tx.transactionType === 'TopUp'
                            ? 'bg-green-100 text-green-700'
                            : tx.transactionType === 'Payment'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-900">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-4 px-4 text-slate-600">{tx.description}</td>
                    <td className="py-4 px-4 text-slate-500 text-sm">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
