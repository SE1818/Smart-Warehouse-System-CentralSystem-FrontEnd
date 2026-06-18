import { useState, useEffect, useCallback } from 'react';
import type { StockLevel, Warehouse, Product } from '@/types/stock';
import { stockService } from '@/services/stock';
import { Icons } from '@/components/Icons';

export function StockLevelsPage() {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState<string>('');
  const [filterProduct, setFilterProduct] = useState<string>('');

  const fetchStockLevels = useCallback(async () => {
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
  }, [filterWarehouse, filterProduct]);

  const fetchFilterOptions = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFilterOptions();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchFilterOptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStockLevels();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStockLevels]);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8 relative overflow-hidden tech-grid">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.StockBox className="w-8 h-8 text-brand-600 glow-blue" />
            <span>Tồn kho hiện tại</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem và lọc tồn kho theo kho hàng hoặc sản phẩm
          </p>
        </div>
        <button
          onClick={fetchStockLevels}
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-98 cursor-pointer"
        >
          <Icons.Refresh className="w-3.5 h-3.5 text-slate-500" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-semibold"
            >
              <option value="">Tất cả kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} - {w.name}
                </option>
              ))}
            </select>
            <Icons.Warehouse className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative">
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-semibold"
            >
              <option value="">Tất cả sản phẩm</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}
                </option>
              ))}
            </select>
            <Icons.Product className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all hover:-translate-y-0.5 duration-200 hover:border-slate-350">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Tổng tồn kho</p>
          <p className="text-3xl font-heading font-black text-slate-900 mt-2">{totalQuantity}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all hover:-translate-y-0.5 duration-200 hover:border-slate-350">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Đã đặt trước</p>
          <p className="text-3xl font-heading font-black text-amber-600 mt-2">{totalReserved}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm transition-all hover:-translate-y-0.5 duration-200 hover:border-slate-350">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Tồn sẵn sàng</p>
          <p className={`text-3xl font-heading font-black mt-2 ${totalAvailable <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {totalAvailable}
          </p>
        </div>
      </div>

      {/* Error block */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2.5">
          <Icons.AlertWarning className="w-4 h-4 text-red-650 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-550 text-sm font-semibold">Đang tải dữ liệu tồn kho...</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {Object.entries(grouped).length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm">
              <Icons.StockBox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-450 italic text-sm">Không có dữ liệu tồn kho nào</p>
            </div>
          )}

          {Object.entries(grouped).map(([warehouseName, levels]) => (
            <div key={warehouseName} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:border-slate-300 transition-all">
              <div className="bg-slate-50 px-6 py-4.5 border-b border-slate-200">
                <h2 className="font-heading font-bold text-slate-900 flex items-center gap-2.5">
                  <Icons.Warehouse className="w-5 h-5 text-brand-600" />
                  <span>{warehouseName}</span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="p-4 pl-6">Mã sản phẩm</th>
                      <th className="p-4">Tên sản phẩm</th>
                      <th className="p-4 text-center">Tồn kho</th>
                      <th className="p-4 text-center">Đã đặt</th>
                      <th className="p-4 text-center">Có sẵn</th>
                      <th className="p-4 pr-6 text-center">Trạng thái có sẵn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-650 font-semibold">
                    {levels.map((level) => {
                      const available = level.quantity - level.reservedQuantity;
                      const percent = level.quantity > 0 ? (available / level.quantity) * 100 : 0;
                      return (
                        <tr key={level.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 pl-6 font-bold text-brand-600 font-mono text-xs">
                            {level.product?.sku || 'N/A'}
                          </td>
                          <td className="p-4 font-bold text-slate-800">
                            {level.product?.name || 'N/A'}
                          </td>
                          <td className="p-4 text-center font-extrabold text-slate-900">
                            {level.quantity}
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-amber-600 font-bold">
                              {level.reservedQuantity}
                            </span>
                          </td>
                          <td className={`p-4 text-center font-extrabold ${available <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            {available}
                          </td>
                          <td className="p-4 pr-6 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/40">
                                <div
                                  className={`h-full rounded-full transition-all duration-350 ${percent <= 20 ? 'bg-red-500' : percent <= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(percent, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-500">{percent.toFixed(0)}%</span>
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
