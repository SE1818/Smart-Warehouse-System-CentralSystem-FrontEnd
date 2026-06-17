import { useState, useEffect } from 'react';
import type { StockLevel, Warehouse, Product } from '@/types/stock';
import { stockService } from '@/services/stock';

export function StockLevelsPage() {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState<string>('');
  const [filterProduct, setFilterProduct] = useState<string>('');

  const fetchStockLevels = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: StockLevel[];
      if (filterWarehouse) {
        data = await stockService.getStockLevelsByWarehouse(filterWarehouse);
      } else if (filterProduct) {
        data = await stockService.getStockLevelsByProduct(filterProduct);
      } else {
        data = await stockService.getStockLevels();
      }
      setStockLevels(data);
    } catch (err) {
      console.error('Error fetching stock levels from API', err);
      setError('Không thể tải dữ liệu tồn kho.');
      setStockLevels([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [warehousesData, productsData] = await Promise.all([
        stockService.getWarehouses(),
        stockService.getProducts(),
      ]);
      setWarehouses(warehousesData);
      setProducts(productsData);
    } catch (err) {
      console.error('Error fetching filter options', err);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStockLevels();
    }, 0);
    return () => clearTimeout(timer);
  }, [filterWarehouse, filterProduct]);

  // Group stock levels by warehouse
  const grouped = stockLevels.reduce((acc, level) => {
    const warehouseName = level.warehouse?.name || 'Không xác định';
    if (!acc[warehouseName]) {
      acc[warehouseName] = [];
    }
    acc[warehouseName].push(level);
    return acc;
  }, {} as Record<string, StockLevel[]>);

  const totalQuantity = stockLevels.reduce((sum, l) => sum + l.quantity, 0);
  const totalReserved = stockLevels.reduce((sum, l) => sum + l.reservedQuantity, 0);
  const totalAvailable = totalQuantity - totalReserved;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📦</span> Tồn kho hiện tại
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem và lọc tồn kho theo kho hàng hoặc sản phẩm
          </p>
        </div>
        <button
          onClick={fetchStockLevels}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 flex items-center gap-2 self-start sm:self-auto transition-all duration-150 active:scale-98"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🏭</span>
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
            >
              <option value="">Tất cả kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">📦</span>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
            >
              <option value="">Tất cả sản phẩm</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tổng tồn kho</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalQuantity}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Đã đặt</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{totalReserved}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Có sẵn</p>
          <p className={`text-2xl font-bold mt-1 ${totalAvailable <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {totalAvailable}
          </p>
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
            Đang tải dữ liệu tồn kho...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
              <p className="text-slate-400 italic">Không có dữ liệu tồn kho</p>
            </div>
          )}

          {Object.entries(grouped).map(([warehouseName, levels]) => (
            <div key={warehouseName} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <span>🏭</span> {warehouseName}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="p-4">Mã sản phẩm</th>
                      <th className="p-4">Tên sản phẩm</th>
                      <th className="p-4 text-center">Tồn kho</th>
                      <th className="p-4 text-center">Đã đặt</th>
                      <th className="p-4 text-center">Có sẵn</th>
                      <th className="p-4 text-center">% Có sẵn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {levels.map((level) => {
                      const available = level.quantity - level.reservedQuantity;
                      const percent = level.quantity > 0 ? (available / level.quantity) * 100 : 0;
                      return (
                        <tr key={level.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-900 font-mono text-xs">
                            {level.product?.sku || 'N/A'}
                          </td>
                          <td className="p-4 font-bold text-slate-800">
                            {level.product?.name || 'N/A'}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-900">
                            {level.quantity}
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-amber-600 font-semibold">
                              {level.reservedQuantity}
                            </span>
                          </td>
                          <td className={`p-4 text-center font-bold ${available <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {available}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full ${percent <= 20 ? 'bg-red-500' : percent <= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(percent, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-mono">{percent.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
