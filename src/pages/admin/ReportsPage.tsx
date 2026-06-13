import { useState, useEffect } from 'react';
import { metricsService, productService } from '@/services';
import { MetricType } from '@/types';
import type { Product } from '@/types';

export function ReportsPage() {
  const [timePeriod, setTimePeriod] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [avgTemp, setAvgTemp] = useState(24.5);
  const [avgHumidity, setAvgHumidity] = useState(58.2);
  const [totalPower, setTotalPower] = useState(124.8);
  const [maxInventory, setMaxInventory] = useState(489);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Fetch metrics
      const metrics = await metricsService.getMetrics().catch(() => []);
      
      const temps = metrics.filter(m => m.metricType === MetricType.Temperature).map(m => m.metricValue);
      const hums = metrics.filter(m => m.metricType === MetricType.Humidity).map(m => m.metricValue);
      const powers = metrics.filter(m => m.metricType === MetricType.PowerConsumption).map(m => m.metricValue);
      const invs = metrics.filter(m => m.metricType === MetricType.InventoryCount).map(m => m.metricValue);

      if (temps.length) setAvgTemp(temps.reduce((a, b) => a + b, 0) / temps.length);
      if (hums.length) setAvgHumidity(hums.reduce((a, b) => a + b, 0) / hums.length);
      if (powers.length) setTotalPower(powers.reduce((a, b) => a + b, 0));
      if (invs.length) setMaxInventory(Math.max(...invs));

      // Fetch products
      const prods = await productService.getProducts().catch(() => []);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [timePeriod]);

  const stats = [
    { title: 'Nhiệt độ trung bình', value: `${avgTemp.toFixed(1)}°C`, icon: '🌡️', color: 'bg-blue-50/50 text-blue-700 border-blue-200' },
    { title: 'Độ ẩm trung bình', value: `${avgHumidity.toFixed(1)}%`, icon: '💧', color: 'bg-emerald-50/50 text-emerald-700 border-emerald-200' },
    { title: 'Tiêu thụ điện năng', value: `${totalPower.toFixed(1)} kWh`, icon: '⚡', color: 'bg-purple-50/50 text-purple-700 border-purple-200' },
    { title: 'Số lượng tồn kho (Max)', value: maxInventory.toLocaleString(), icon: '📦', color: 'bg-amber-50/50 text-amber-700 border-amber-200' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📈</span> Báo cáo hiệu suất kho
          </h1>
          <p className="mt-1 text-sm text-slate-505">Phân tích tần suất giao nhận, chỉ số môi trường và thống kê hàng hóa tồn kho</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs text-xs font-bold text-slate-700"
          >
            <option value="today">Hôm nay</option>
            <option value="7days">7 ngày qua</option>
            <option value="30days">30 ngày qua</option>
            <option value="year">Năm nay</option>
          </select>
          <button
            onClick={loadReportData}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
          >
            🔄 Tải lại
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
          <p className="text-slate-500 text-xs font-medium">Đang tạo báo cáo hoạt động...</p>
        </div>
      ) : (
        <>
          {/* Stats grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((item, idx) => (
              <div key={idx} className={`p-6 rounded-2xl border ${item.color} flex flex-col justify-between shadow-sm transition-all hover:border-slate-300 bg-white`}>
                <div className="space-y-3">
                  <span className="text-3xl block">{item.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.title}</p>
                    <h4 className="text-lg font-heading font-black text-slate-900 mt-1">{item.value}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Real Product Stocks comparison table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-heading font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>📦</span> Chi tiết tồn kho sản phẩm hiện tại
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="p-4">Tên sản phẩm</th>
                      <th className="p-4">Phân loại</th>
                      <th className="p-4">Giá bán</th>
                      <th className="p-4">Số lượng tồn kho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {products.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{row.name}</td>
                        <td className="p-4">{row.category}</td>
                        <td className="p-4 text-slate-800 font-bold">{row.price.toLocaleString()}đ</td>
                        <td className={`p-4 font-bold ${row.stockQuantity <= 0 ? 'text-red-650' : 'text-emerald-700'}`}>
                          {row.stockQuantity} {row.unit}
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 italic">Không có dữ liệu hàng hóa</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Most Ordered Products mock ratios replaced with actual product proportions */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <h3 className="font-heading font-bold text-slate-900 text-base flex items-center gap-2">
                <span>🥤</span> Tỷ lệ phân bổ sản phẩm theo giá
              </h3>
              
              <div className="space-y-4">
                {products.slice(0, 5).map((p, i) => {
                  const maxPrice = Math.max(...products.map(pr => pr.price), 1);
                  const pct = Math.round((p.price / maxPrice) * 100);
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{p.name}</span>
                        <span className="text-slate-500 font-bold">{p.price.toLocaleString()}đ</span>
                      </div>
                      {/* Progress bar line */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/40">
                        <div className="bg-brand-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
                {products.length === 0 && (
                  <p className="text-slate-400 italic text-xs text-center py-8">Không có dữ liệu phân bổ</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
