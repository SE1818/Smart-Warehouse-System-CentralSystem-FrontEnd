import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_ORDERS, STATUS_COLORS, STATUS_LABELS, type PortalOrder } from '@/constants';

export function DashboardPage() {
  const [stats] = useState({
    totalSales: 15420000,
    totalOrders: 148,
    activeRobots: 3,
    capacity: 72, // 72%
  });

  const [recentOrders] = useState<PortalOrder[]>(() => {
    const ordersStr = localStorage.getItem('orders');
    if (ordersStr) {
      try {
        return JSON.parse(ordersStr).slice(0, 5);
      } catch {
        return [];
      }
    }
    const defaultOrders = DEFAULT_ORDERS();
    localStorage.setItem('orders', JSON.stringify(defaultOrders));
    return defaultOrders.slice(0, 5);
  });

  const cardConfig = [
    { title: 'Doanh thu tháng', value: `${stats.totalSales.toLocaleString()}đ`, change: '+12.5% so với tháng trước', icon: '💰', iconColor: 'text-blue-400' },
    { title: 'Tổng đơn hàng', value: stats.totalOrders.toString(), change: '+8% hôm nay', icon: '📋', iconColor: 'text-purple-400' },
    { title: 'Robot hoạt động', value: `${stats.activeRobots}/5`, change: '2 Đang chờ, 3 Đang chạy', icon: '🤖', iconColor: 'text-emerald-400' },
    { title: 'Dung lượng kho', value: `${stats.capacity}%`, change: 'Còn trống 28% kệ hàng', icon: '📦', iconColor: 'text-orange-400' }
  ];

  const statusColors: Record<string, string> = STATUS_COLORS;

  const statusLabels: Record<string, string> = STATUS_LABELS;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>📊</span> Bảng điều khiển admin
        </h1>
        <p className="mt-1 text-sm text-slate-500">Giám sát hoạt động kho hàng, robot AMR và phân tích kinh doanh</p>
      </div>

      {/* Cards stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardConfig.map((c, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between transition-all hover:border-slate-300">
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{c.title}</p>
              <h3 className="text-2xl font-heading font-black text-slate-900">{c.value}</h3>
              <p className="text-[11px] text-slate-505 font-medium">{c.change}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-slate-50 border border-slate-200/60 ${c.iconColor}`}>
              {c.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main analytical status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2">
                <span>📈</span> Biểu đồ doanh thu tuần
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Đơn vị: VNĐ</span>
            </div>
            
            {/* SVG custom bar graph */}
            <div className="h-64 flex items-end justify-between pt-6 gap-2">
              {[
                { day: 'Th 2', val: 1200000, height: 'h-[40%] bg-brand-600/80' },
                { day: 'Th 3', val: 1800000, height: 'h-[60%] bg-brand-600/80' },
                { day: 'Th 4', val: 1500000, height: 'h-[50%] bg-brand-600/80' },
                { day: 'Th 5', val: 2400000, height: 'h-[80%] bg-brand-500' },
                { day: 'Th 6', val: 2900000, height: 'h-[90%] bg-brand-500' },
                { day: 'Th 7', val: 3400000, height: 'h-full bg-brand-400' },
                { day: 'CN', val: 2100000, height: 'h-[70%] bg-brand-600/80' }
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative flex justify-center h-48 items-end">
                    {/* Tooltip */}
                    <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg pointer-events-none z-10 whitespace-nowrap shadow-md">
                      {bar.val.toLocaleString()}đ
                    </span>
                    {/* Bar */}
                    <div className={`w-8 sm:w-12 rounded-t-lg transition-all duration-300 ${bar.height} group-hover:brightness-110 group-hover:shadow-lg group-hover:shadow-brand-500/10`}></div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="space-y-6">
          <div className="bg-white text-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-6">
            <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2">
              <span>🤖</span> Trạng thái Robot AMR
            </h3>
            <div className="space-y-4">
              {[
                { name: 'AMR-01 (Mantis)', status: 'Vận chuyển', bat: 84, color: 'border-orange-200 text-orange-700 bg-orange-50' },
                { name: 'AMR-02 (Scarab)', status: 'Rảnh (Idle)', bat: 95, color: 'border-emerald-200 text-emerald-700 bg-emerald-50' },
                { name: 'AMR-03 (Hornet)', status: 'Sạc pin', bat: 18, color: 'border-red-200 text-red-700 bg-red-50 animate-pulse' }
              ].map((r, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">{r.name}</h4>
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${r.color}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono text-xs font-bold ${r.bat < 20 ? 'text-red-600' : 'text-slate-500'}`}>
                      {r.bat}% Pin
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/admin/inventory"
              className="block text-center w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-brand-650 hover:text-brand-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
            >
              🗺️ Sơ đồ & điều phối AMR
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2">
            <span>📋</span> Đơn hàng mới đặt
          </h3>
          <Link to="/admin/orders" className="text-brand-650 text-xs font-bold hover:underline">
            Xem tất cả đơn hàng →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <th className="p-4">Mã đơn</th>
                <th className="p-4">Ngày tạo</th>
                <th className="p-4">Trạm giao</th>
                <th className="p-4">Tổng tiền</th>
                <th className="p-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
              {recentOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{o.id}</td>
                  <td className="p-4">{o.date}</td>
                  <td className="p-4 font-bold text-slate-700">{o.station || 'ST01'}</td>
                  <td className="p-4 text-slate-900 font-bold">{o.total.toLocaleString()}đ</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[o.status] || 'bg-slate-50 border-slate-200'}`}>
                      {statusLabels[o.status] || o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">Không có đơn đặt hàng gần đây</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
