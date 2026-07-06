import { useState, useEffect, useCallback } from 'react';
import { transferService } from '@/services/transferService';
import type { TransferRequest, TransferStats } from '@/services/transferService';
import { Icons } from '@/components/Icons';
import { toast } from 'react-toastify';
import { TransferDetailDrawer } from '@/components/TransferDetailDrawer';

export function TransfersPage() {
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [stats, setStats] = useState<TransferStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [transfersData, statsData] = await Promise.all([
        transferService.listTransfers(),
        transferService.getTransferStats()
      ]);
      setTransfers(transfersData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải danh sách chuyến vận chuyển');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Hook into live SignalR notifications to refresh stats/transfers
  useEffect(() => {
    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener('smartwarehouse-notification', handleRefresh);
    return () => window.removeEventListener('smartwarehouse-notification', handleRefresh);
  }, [loadData]);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy chuyến vận chuyển này và dừng robot liên quan?')) {
      return;
    }
    try {
      await transferService.cancelTransfer(id);
      toast.success('Đã yêu cầu hủy chuyến vận chuyển thành công');
      loadData();
      if (selectedTransferId === id) {
        setSelectedTransferId(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể hủy chuyến vận chuyển');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      pending: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Chờ gán' },
      assigned: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500 animate-pulse', label: 'Đã gán' },
      in_progress: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500 animate-pulse', label: 'Đang chạy' },
      completed: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Hoàn thành' },
      failed: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500 animate-bounce', label: 'Lỗi' },
      cancelled: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Đã hủy' }
    };

    const style = styles[status.toLowerCase()] || styles.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {style.label}
      </span>
    );
  };

  const filteredTransfers = transfers.filter(t => {
    const matchesStatus = filterStatus === 'all' || t.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.fromStationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.toStationId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading && transfers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm max-w-sm w-full">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-550 text-sm font-semibold">Đang tải danh sách chuyến vận chuyển...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 space-y-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600 shadow-sm border border-brand-100">
                <Icons.Truck className="w-7 h-7" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Chuyến vận chuyển</span>
            </h1>
            <p className="text-slate-500 text-sm">Giám sát và kiểm tra lộ trình thực tế, lệnh robot và phản hồi cảm biến real-time.</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-700 rounded-xl text-sm font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <Icons.Refresh className="w-4 h-4" />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Stats Bento Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng hôm nay</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-900">{stats.totalToday}</span>
                <span className="p-1.5 bg-slate-100 rounded-lg text-slate-600 text-xs"><Icons.HistoryLogs className="w-4 h-4" /></span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Đang hoạt động</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-900">{stats.active}</span>
                <span className="p-1.5 bg-blue-50 rounded-lg text-blue-600 text-xs"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-ping" /></span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Hoàn thành</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-900">{stats.completed}</span>
                <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 text-xs"><Icons.Check className="w-4 h-4 text-emerald-500" /></span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Gặp lỗi</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-900">{stats.failed}</span>
                <span className="p-1.5 bg-rose-50 rounded-lg text-rose-600 text-xs"><Icons.AlertWarning className="w-4 h-4 text-rose-500" /></span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Đã hủy</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-3xl font-extrabold text-slate-900">{stats.cancelled}</span>
                <span className="p-1.5 bg-amber-50 rounded-lg text-amber-600 text-xs"><Icons.Close className="w-4 h-4 text-amber-500" /></span>
              </div>
            </div>
          </div>
        )}

        {/* Filter and search controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full sm:max-w-xs">
            <Icons.Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm ID, Trạm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-sm w-full outline-none text-slate-800 placeholder-slate-400 font-semibold"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['all', 'pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === status
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {status === 'all' ? 'Tất cả' : status === 'in_progress' ? 'Đang chạy' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table/List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Mã Chuyến (ID)</th>
                  <th className="px-6 py-4">Trạm đi (From)</th>
                  <th className="px-6 py-4">Trạm đến (To)</th>
                  <th className="px-6 py-4">Độ ưu tiên</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Thời gian tạo</th>
                  <th className="px-6 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {filteredTransfers.map((tr) => (
                  <tr
                    key={tr.id}
                    className="hover:bg-slate-50/50 cursor-pointer transition-all group"
                    onClick={() => setSelectedTransferId(tr.id)}
                  >
                    <td className="px-6 py-4 font-mono text-xs text-brand-600 font-bold group-hover:underline">
                      {tr.id.substring(0, 8)}...{tr.id.substring(tr.id.length - 8)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200/50">
                        {tr.fromStationId.substring(0, 4) === '5555' ? 'ST05 (Pickup)' : 'Station'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200/50">
                        {tr.toStationId.substring(0, 4) === '1111' ? 'ST01' : 
                         tr.toStationId.substring(0, 4) === '2222' ? 'ST02' :
                         tr.toStationId.substring(0, 4) === '3333' ? 'ST03' :
                         tr.toStationId.substring(0, 4) === '4444' ? 'ST04' : 'Station'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        tr.priority > 3 ? 'bg-rose-50 text-rose-700' : 'bg-slate-150 text-slate-650'
                      }`}>
                        Cấp {tr.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(tr.status)}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-400">
                      {new Date(tr.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedTransferId(tr.id)}
                          className="p-1.5 text-slate-450 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-all"
                          title="Xem chi tiết"
                        >
                          <Icons.Info className="w-5 h-5" />
                        </button>
                        {(tr.status.toLowerCase() === 'assigned' || tr.status.toLowerCase() === 'in_progress') && (
                          <button
                            onClick={() => handleCancel(tr.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-all"
                            title="Hủy chuyến"
                          >
                            <Icons.Close className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredTransfers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                      Không tìm thấy chuyến vận chuyển nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details drawer */}
      {selectedTransferId && (
        <TransferDetailDrawer
          transferId={selectedTransferId}
          onClose={() => setSelectedTransferId(null)}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
