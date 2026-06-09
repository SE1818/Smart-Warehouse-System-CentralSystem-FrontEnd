import { useState } from 'react';

export function ReportsPage() {
  const [timePeriod, setTimePeriod] = useState('7days');

  const stats = {
    avgDeliveryTime: '3 phút 45 giây',
    robotEfficiency: '94.2%',
    mostActiveStation: 'Trạm B (Khu Đóng Gói)',
    totalDeliveries: 1248,
  };

  const deliveryEfficiencyData = [
    { name: 'AMR-01 (Mantis)', deliveries: 482, rating: '98%', speed: '3m 15s' },
    { name: 'AMR-02 (Scarab)', deliveries: 412, rating: '96%', speed: '3m 30s' },
    { name: 'AMR-03 (Hornet)', deliveries: 354, rating: '89%', speed: '4m 10s' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📈</span> Báo cáo hiệu suất kho
          </h1>
          <p className="mt-1 text-sm text-slate-505">Phân tích tần suất giao nhận, hiệu quả vận hành của robot và thống kê tiêu dùng</p>
        </div>
        <div>
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
        </div>
      </div>

      {/* Stats grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Thời gian giao trung bình', value: stats.avgDeliveryTime, icon: '⏱️', color: 'bg-blue-50/50 text-blue-700 border-blue-200' },
          { title: 'Hiệu suất vận hành', value: stats.robotEfficiency, icon: '📈', color: 'bg-emerald-50/50 text-emerald-700 border-emerald-200' },
          { title: 'Trạm nhận nhiều nhất', value: stats.mostActiveStation, icon: '📍', color: 'bg-purple-50/50 text-purple-700 border-purple-200' },
          { title: 'Tổng số lượt giao', value: stats.totalDeliveries.toLocaleString(), icon: '🚀', color: 'bg-amber-50/50 text-amber-700 border-amber-200' }
        ].map((item, idx) => (
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
        {/* Robot comparison table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-heading font-bold text-slate-900 text-base flex items-center gap-2">
              <span>🤖</span> Hiệu suất đội Robot AMR
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-4">Robot</th>
                  <th className="p-4">Số lượt giao</th>
                  <th className="p-4">Tỷ lệ thành công</th>
                  <th className="p-4">Tốc độ trung bình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                {deliveryEfficiencyData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{row.name}</td>
                    <td className="p-4">{row.deliveries} lượt</td>
                    <td className="p-4 text-emerald-700 font-bold">{row.rating}</td>
                    <td className="p-4 text-slate-800 font-bold">{row.speed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Most Ordered Products */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          <h3 className="font-heading font-bold text-slate-900 text-base flex items-center gap-2">
            <span>🥤</span> Mặt hàng ưa thích
          </h3>
          
          <div className="space-y-4">
            {[
              { name: 'Đồ uống Coca Cola', count: 582, pct: '46%' },
              { name: 'Khẩu trang y tế N95', count: 320, pct: '25%' },
              { name: 'Cồn sát khuẩn 70 độ', count: 184, pct: '15%' },
              { name: 'Nước suối Aquafina', count: 162, pct: '14%' }
            ].map((p, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{p.name}</span>
                  <span className="text-slate-500 font-bold">{p.count} lượt ({p.pct})</span>
                </div>
                {/* Progress bar line */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/40">
                  <div className="bg-brand-500 h-full rounded-full" style={{ width: p.pct }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
