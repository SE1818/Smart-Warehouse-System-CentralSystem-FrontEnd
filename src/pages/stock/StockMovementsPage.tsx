import { useState, useEffect, useCallback } from 'react';
import type { StockMovement, Warehouse } from '@/types/stock';
import { StockMovementType } from '@/types/stock';
import { stockService } from '@/services/stock';
import { Icons } from '@/components/Icons';
import { CustomSelect } from '@/components/CustomSelect';

export function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterWarehouse, setFilterWarehouse] = useState<string>('');
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    stockService.getWarehouses().then(setWarehouses).catch(console.error);
  }, []);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: StockMovement[];
      if (filterWarehouse) {
        data = await stockService.getStockMovementsByWarehouse(filterWarehouse);
      } else if (filterProduct) {
        data = await stockService.getStockMovementsByProduct(filterProduct);
      } else {
        data = await stockService.getStockMovements();
      }
      setMovements(data);
    } catch (err) {
      console.error('Error fetching stock movements from API', err);
      setError('Không thể tải lịch sử di chuyển tồn kho.');
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [filterWarehouse, filterProduct]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovements();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMovements]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchMovements();
    };
    window.addEventListener('smartwarehouse-notification', handleRefresh);
    return () => window.removeEventListener('smartwarehouse-notification', handleRefresh);
  }, [fetchMovements]);

  const getTypeLabel = (type: StockMovementType) => {
    switch (type) {
      case StockMovementType.In:
        return 'Nhập kho';
      case StockMovementType.Out:
        return 'Xuất kho';
      case StockMovementType.Adjust:
        return 'Điều chỉnh';
      default:
        return 'Khác';
    }
  };

  const getTypeColor = (type: StockMovementType) => {
    switch (type) {
      case StockMovementType.In:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
      case StockMovementType.Out:
        return 'bg-red-50 text-red-700 border-red-200/50';
      case StockMovementType.Adjust:
        return 'bg-amber-50 text-amber-700 border-amber-200/50';
      default:
        return 'bg-slate-50 text-slate-650 border-slate-200';
    }
  };

  const filteredMovements = movements.filter((m) => {
    if (filterType && m.type !== parseInt(filterType)) return false;
    return true;
  });

  // Sort by date descending
  const sortedMovements = [...filteredMovements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-850 font-sans p-6 md:p-10 space-y-8 relative overflow-hidden tech-grid">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.HistoryLogs className="w-8 h-8 text-brand-650 glow-blue" />
            <span>Lịch sử di chuyển tồn kho</span>
          </h1>
          <p className="mt-1 text-sm text-slate-550">
            Theo dõi tất cả các giao dịch nhập/xuất/điều chỉnh tồn kho
          </p>
        </div>
        <button
          onClick={fetchMovements}
          disabled={loading}
          className="px-4 py-2.5 bg-white hover:bg-slate-55 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-98 cursor-pointer shadow-xs disabled:opacity-50"
        >
          <Icons.Refresh className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CustomSelect
            value={filterWarehouse}
            onChange={setFilterWarehouse}
            options={[
              { value: '', label: 'Tất cả kho' },
              ...warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))
            ]}
            placeholder="Tất cả kho"
            icon={<Icons.Warehouse className="w-5 h-5 text-slate-400" />}
          />
          <div className="relative">
            <input
              type="text"
              placeholder="Lọc theo mã sản phẩm..."
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 placeholder-slate-400 font-semibold"
            />
            <Icons.Product className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <CustomSelect
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: '', label: 'Tất cả loại' },
              { value: '0', label: 'Nhập kho' },
              { value: '1', label: 'Xuất kho' },
              { value: '2', label: 'Điều chỉnh' }
            ]}
            placeholder="Tất cả loại"
            icon={<Icons.Filter className="w-5 h-5 text-slate-400" />}
          />
        </div>
      </div>

      {/* Error block */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
          <Icons.AlertWarning className="w-4 h-4 text-red-655 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-550 text-sm font-semibold">Đang tải lịch sử di chuyển...</p>
        </div>
      ) : (
        <>
          {sortedMovements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm">
              <Icons.HistoryLogs className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-450 italic text-sm">Không có lịch sử di chuyển nào</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:border-slate-300 transition-all">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="p-4 pl-6">Ngày giờ</th>
                      <th className="p-4">Loại</th>
                      <th className="p-4">Sản phẩm</th>
                      <th className="p-4">Kho</th>
                      <th className="p-4 text-center">Số lượng</th>
                      <th className="p-4">Mã tham chiếu</th>
                      <th className="p-4 pr-6">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650 font-semibold">
                    {sortedMovements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 text-slate-500 font-mono text-xs">
                          {new Date(movement.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${getTypeColor(movement.type)}`}>
                            {getTypeLabel(movement.type)}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          {movement.product?.name || 'N/A'}
                        </td>
                        <td className="p-4 text-slate-600">
                          {movement.warehouse?.name || 'N/A'}
                        </td>
                        <td className={`p-4 text-center font-extrabold ${movement.quantity > 0 ? 'text-emerald-750' : 'text-red-600'}`}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                        </td>
                        <td className="p-4 font-mono text-xs text-brand-650 font-bold">
                          {movement.referenceNo || '-'}
                        </td>
                        <td className="p-4 pr-6 text-slate-500 text-xs max-w-xs truncate font-medium">
                          {movement.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
