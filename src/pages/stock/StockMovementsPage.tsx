import { useState, useEffect } from 'react';
import type { StockMovement } from '@/types/stock';
import { StockMovementType } from '@/types/stock';
import { stockService } from '@/services/stock';

export function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterWarehouse, setFilterWarehouse] = useState<string>('');
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const fetchMovements = async () => {
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
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovements();
    }, 0);
    return () => clearTimeout(timer);
  }, [filterWarehouse, filterProduct, filterType]);

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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case StockMovementType.Out:
        return 'bg-red-50 text-red-700 border-red-200';
      case StockMovementType.Adjust:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📋</span> Lịch sử di chuyển tồn kho
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi tất cả các giao dịch nhập/xuất/điều chỉnh tồn kho
          </p>
        </div>
        <button
          onClick={fetchMovements}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 flex items-center gap-2 self-start sm:self-auto transition-all duration-150 active:scale-98"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🏭</span>
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
            >
              <option value="">Tất cả kho</option>
              {/* TODO: Populate from warehouses API */}
            </select>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">📦</span>
            <input
              type="text"
              placeholder="Lọc theo mã sản phẩm..."
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
            />
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
            >
              <option value="">Tất cả loại</option>
              <option value="0">Nhập kho</option>
              <option value="1">Xuất kho</option>
              <option value="2">Điều chỉnh</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error block */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold leading-relaxed">
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
          <p className="text-slate-500 text-xs font-medium">
            Đang tải lịch sử di chuyển...
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-4">Ngày giờ</th>
                  <th className="p-4">Loại</th>
                  <th className="p-4">Sản phẩm</th>
                  <th className="p-4">Kho</th>
                  <th className="p-4 text-center">Số lượng</th>
                  <th className="p-4">Mã tham chiếu</th>
                  <th className="p-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                {sortedMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-slate-900 font-mono text-xs">
                      {new Date(movement.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getTypeColor(movement.type)}`}>
                        {getTypeLabel(movement.type)}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      {movement.product?.name || 'N/A'}
                    </td>
                    <td className="p-4 text-slate-600">
                      {movement.warehouse?.name || 'N/A'}
                    </td>
                    <td className={`p-4 text-center font-bold ${movement.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {movement.referenceNo || '-'}
                    </td>
                    <td className="p-4 text-slate-500 text-xs max-w-xs truncate">
                      {movement.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sortedMovements.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <p className="text-slate-400 italic">Không có lịch sử di chuyển nào</p>
        </div>
      )}
    </div>
  );
}
