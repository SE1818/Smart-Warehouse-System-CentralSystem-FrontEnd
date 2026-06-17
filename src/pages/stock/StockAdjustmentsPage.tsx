import { useState, useEffect } from 'react';
import type { Warehouse, Product, StockLevel } from '@/types/stock';
import { StockMovementType } from '@/types/stock';
import { stockService as stockApi } from '@/services/stock';

export function StockAdjustmentsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<StockMovementType>(StockMovementType.Adjust);
  const [quantity, setQuantity] = useState<number>(0);
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch warehouses and products on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [warehousesData, productsData] = await Promise.all([
          stockApi.getWarehouses(),
          stockApi.getProducts(),
        ]);
        setWarehouses(warehousesData);
        setProducts(productsData);
      } catch (err) {
        console.error('Error fetching initial data', err);
        setError('Không thể tải danh sách kho và sản phẩm.');
      }
    };
    fetchInitialData();
  }, []);

  // Fetch stock levels when warehouse or product selected
  useEffect(() => {
    if (selectedWarehouse && selectedProduct) {
      const fetchStockLevel = async () => {
        try {
          const levels = await stockApi.getStockLevels();
          const level = levels.find(
            (l) => l.warehouseId === selectedWarehouse && l.productId === selectedProduct
          );
          setStockLevels(level ? [level] : []);
        } catch (err) {
          console.error('Error fetching stock level', err);
        }
      };
      fetchStockLevel();
    } else {
      setStockLevels([]);
    }
  }, [selectedWarehouse, selectedProduct]);

  const currentStockLevel = stockLevels[0];
  const currentQuantity = currentStockLevel?.quantity || 0;
  const newQuantity = currentQuantity + quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedWarehouse || quantity === 0) {
      setError('Vui lòng chọn kho, sản phẩm và nhập số lượng điều chỉnh.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await stockApi.adjustStock(selectedProduct, selectedWarehouse, {
        quantityChange: quantity,
        type: adjustmentType,
        referenceNo: referenceNo || undefined,
        note: note || undefined,
      });
      setSuccess(`Điều chỉnh thành công! Tồn kho mới: ${result.quantity}`);
      setQuantity(0);
      setReferenceNo('');
      setNote('');
      // Refresh stock levels
      const levels = await stockApi.getStockLevels();
      setStockLevels(
        levels.filter(
          (l) => l.warehouseId === selectedWarehouse && l.productId === selectedProduct
        )
      );
    } catch (err) {
      console.error('Error adjusting stock', err);
      setError('Không thể điều chỉnh tồn kho. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🔧</span> Điều chỉnh tồn kho
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Thêm/xóa/sửa số lượng tồn kho thủ công (cho admin)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📝</span> Form điều chỉnh
            </h2>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200/60 rounded-xl text-red-700 text-xs font-semibold">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-xl text-emerald-700 text-xs font-semibold">
                ✅ {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Kho hàng
                  </label>
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-700"
                  >
                    <option value="">Chọn kho...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Sản phẩm
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-700"
                  >
                    <option value="">Chọn sản phẩm...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentStockLevel && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Tồn kho hiện tại
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-bold text-slate-900">
                      {currentQuantity} đơn vị
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-600">
                      Đã đặt: {currentStockLevel.reservedQuantity}
                    </span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-600">
                      Có sẵn: {currentQuantity - currentStockLevel.reservedQuantity}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Loại điều chỉnh
                </label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(parseInt(e.target.value) as StockMovementType)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-700"
                >
                  <option value={StockMovementType.Adjust}>Điều chỉnh (Adjust)</option>
                  <option value={StockMovementType.In}>Nhập kho (In)</option>
                  <option value={StockMovementType.Out}>Xuất kho (Out)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Số lượng {adjustmentType === 1 ? 'xuất' : adjustmentType === 0 ? 'nhập' : 'điều chỉnh'}
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  required
                  min="1"
                  placeholder="Nhập số lượng..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800"
                />
                {currentQuantity > 0 && (
                  <p className="text-xs text-slate-500">
                    Tồn kho mới sẽ là: <strong>{newQuantity}</strong>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Mã tham chiếu (tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="Ví dụ: PO-123, ADJ-001..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Ghi chú (tuỳ chọn)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Lý do điều chỉnh..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm text-slate-800 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/10 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Đang xử lý...
                    </span>
                  ) : (
                    '✅ Xác nhận điều chỉnh'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span>ℹ️</span> Hướng dẫn
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Chọn kho và sản phẩm cần điều chỉnh</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Nhập số lượng dương để tăng, âm để giảm</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Chọn loại: Nhập kho, Xuất kho, hoặc Điều chỉnh</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Có thể thêm mã tham chiếu và ghi chú</span>
              </li>
              <li className="flex items-start gap-2">
                <span>⚠️</span>
                <span className="text-amber-600 font-semibold">
                  Hành động này sẽ ghi log và không thể hoàn tác
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span>📊</span> Thống kê
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Tổng số kho:</span>
                <span className="text-sm font-bold text-slate-900">{warehouses.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Tổng số sản phẩm:</span>
                <span className="text-sm font-bold text-slate-900">{products.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Số lượng tồn hiện tại:</span>
                <span className="text-sm font-bold text-slate-900">{currentQuantity}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
