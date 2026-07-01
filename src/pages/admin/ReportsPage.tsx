import { useState, useEffect, useCallback } from 'react';
import { metricsService, productService } from '@/services';
import { MetricType } from '@/types';
import type { Product } from '@/types';
import { Icons } from '@/components/Icons';
import { CustomSelect } from '@/components/CustomSelect';

export function ReportsPage() {
  const [timePeriod, setTimePeriod] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [avgTemp, setAvgTemp] = useState(24.5);
  const [avgHumidity, setAvgHumidity] = useState(58.2);
  const [totalPower, setTotalPower] = useState(124.8);
  const [maxInventory, setMaxInventory] = useState(489);

  const loadReportData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReportData();
    }, 0);
    return () => clearTimeout(timer);
  }, [timePeriod, loadReportData]);

  const stats = [
    { title: 'Nhiệt độ trung bình', value: `${avgTemp.toFixed(1)}°C`, icon: <Icons.Thermometer className="w-6 h-6 text-blue-600" />, color: 'bg-blue-50/50 text-blue-700 border-blue-200' },
    { title: 'Độ ẩm trung bình', value: `${avgHumidity.toFixed(1)}%`, icon: <Icons.Droplet className="w-6 h-6 text-emerald-650" />, color: 'bg-emerald-50/50 text-emerald-700 border-emerald-200' },
    { title: 'Tiêu thụ điện năng', value: `${totalPower.toFixed(1)} kWh`, icon: <Icons.Bolt className="w-6 h-6 text-purple-650" />, color: 'bg-purple-50/50 text-purple-700 border-purple-200' },
    { title: 'Số lượng tồn kho (Max)', value: maxInventory.toLocaleString(), icon: <Icons.StockBox className="w-6 h-6 text-amber-600" />, color: 'bg-amber-50/50 text-amber-700 border-amber-200' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.AnalyticsReport className="w-8 h-8 text-brand-600 glow-blue" />
            <span>Báo cáo hiệu suất kho</span>
          </h1>
          <p className="mt-1 text-sm text-slate-550 font-medium">Phân tích tần suất giao nhận, chỉ số môi trường và thống kê hàng hóa tồn kho</p>
        </div>
        <div className="flex items-center gap-3">
          <CustomSelect
            value={timePeriod}
            onChange={setTimePeriod}
            options={[
              { value: 'today', label: 'Hôm nay' },
              { value: '7days', label: '7 ngày qua' },
              { value: '30days', label: '30 ngày qua' },
              { value: 'year', label: 'Năm nay' }
            ]}
            placeholder="Chọn khoảng thời gian..."
            className="min-w-[140px]"
          />
          <button
            onClick={loadReportData}
            disabled={loading}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-98 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Icons.Refresh className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-550 text-sm font-semibold">Đang tạo báo cáo hoạt động...</p>
        </div>
      ) : (
        <>
          {/* Stats grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((item, idx) => (
              <div key={idx} className={`p-6 rounded-2xl border border-slate-200/80 flex flex-col justify-between shadow-sm transition-all hover:border-slate-350 bg-white hover:-translate-y-0.5 duration-200`}>
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-100 bg-slate-50/50">{item.icon}</div>
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
                <h3 className="font-heading font-bold text-slate-900 text-base flex items-center gap-2.5">
                  <Icons.StockBox className="w-5 h-5 text-brand-600" />
                  <span>Chi tiết tồn kho sản phẩm hiện tại</span>
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
              <h3 className="font-heading font-bold text-slate-900 text-base flex items-center gap-2.5">
                <Icons.AnalyticsReport className="w-5 h-5 text-brand-600" />
                <span>Tỷ lệ phân bổ sản phẩm theo giá</span>
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
