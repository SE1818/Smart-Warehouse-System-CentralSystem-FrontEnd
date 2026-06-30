import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { orderService, metricsService, productService, userService } from '@/services';
import { MetricType } from '@/types';
import { STATUS_COLORS, STATUS_LABELS, DEFAULT_PRODUCTS } from '@/constants';
import { Icons } from '@/components/Icons';


interface Robot {
  id: string;
  name: string;
  x: number;
  y: number;
  battery: number;
  status: 'Idle' | 'Moving' | 'Error' | 'Charging';
}

interface DashboardOrder {
  id: string;
  date: string;
  total: number;
  status: 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
  station: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

const getRobotStatusStyle = (status: string) => {
  switch (status) {
    case 'Idle':
      return 'border-emerald-250 text-emerald-700 bg-emerald-50';
    case 'Moving':
      return 'border-brand-200 text-brand-700 bg-brand-50';
    case 'Charging':
      return 'border-amber-200 text-amber-700 bg-amber-50';
    default:
      return 'border-red-200 text-red-700 bg-red-50';
  }
};

const getRobotStatusLabel = (status: string) => {
  switch (status) {
    case 'Idle':
      return 'Rảnh (Idle)';
    case 'Moving':
      return 'Đang chạy';
    case 'Charging':
      return 'Đang sạc';
    default:
      return 'Lỗi';
  }
};

const getProductName = (productId: string) => {
  const prod = DEFAULT_PRODUCTS.find(p => p.id === productId);
  return prod ? prod.name : `Sản phẩm (${productId.substring(0, 8)})`;
};

export function DashboardPage() {
  const [robots, setRobots] = useState<Robot[]>([
    { id: 'AMR-01', name: 'AMR-01 (Mantis)', x: 2, y: 3, battery: 84, status: 'Moving' },
    { id: 'AMR-02', name: 'AMR-02 (Scarab)', x: 7, y: 1, battery: 95, status: 'Idle' },
    { id: 'AMR-03', name: 'AMR-03 (Hornet)', x: 0, y: 9, battery: 18, status: 'Charging' }
  ]);
  const [signalRConnected, setSignalRConnected] = useState(false);

  const [loading, setLoading] = useState(true);
  const [productsCount, setProductsCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState<DashboardOrder[]>([]);
  const [totalStock, setTotalStock] = useState(0);
  const [usersCount, setUsersCount] = useState(0);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch products
      const prods = await productService.getProducts().catch(() => []);
      setProductsCount(prods.length);
      const stockSum = (prods as { stockQuantity?: number }[]).reduce((sum: number, p) => sum + (p.stockQuantity || 0), 0);
      
      // Fetch pending orders
      const apiOrders = await orderService.getPendingOrders().catch(() => []);
      interface ApiOrderItem {
        productId: string;
        quantity: number;
        price: number;
      }
      interface ApiOrder {
        id: string;
        createdAt?: string;
        totalAmount: number;
        deliveryNodeId?: string;
        items?: ApiOrderItem[];
      }
      const mapped: DashboardOrder[] = (apiOrders as unknown as ApiOrder[]).map((o) => ({
        id: o.id,
        date: o.createdAt ? o.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        total: o.totalAmount,
        status: 'Pending' as const,
        station: o.deliveryNodeId || 'Khu vực nhận',
        items: o.items ? o.items.map((item) => ({
          name: getProductName(item.productId),
          quantity: item.quantity,
          price: item.price
        })) : []
      }));
      setPendingOrders(mapped.slice(0, 5));

      // Fetch users
      const usersList = await userService.getAllUsers().catch(() => []);
      setUsersCount(usersList.length);

      // Fetch InventoryCount metric from service
      try {
        const metric = await metricsService.getLatestMetric('WH001', MetricType.InventoryCount);
        setTotalStock(metric.metricValue);
      } catch {
        setTotalStock(stockSum || 489);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRobotLocationUpdate = useCallback((updatedRobot: Robot) => {
    setRobots(prev => {
      const idx = prev.findIndex(r => r.id === updatedRobot.id);
      if (idx > -1) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], ...updatedRobot };
        return clone;
      }
      return [...prev, updatedRobot];
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 0);

    // SignalR Connection to Gateway
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/robots/hub`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      })
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => {
        setSignalRConnected(true);
        connection.on('ReceiveRobotLocation', handleRobotLocationUpdate);
      })
      .catch((err: unknown) => {
        console.warn('SignalR offline on Dashboard. Running with static fleet representation.', err);
      });

    const handleRefresh = () => {
      loadDashboardData();
    };
    window.addEventListener('smartwarehouse-notification', handleRefresh);

    return () => {
      clearTimeout(timer);
      connection.stop().catch(() => {});
      window.removeEventListener('smartwarehouse-notification', handleRefresh);
    };
  }, [loadDashboardData, handleRobotLocationUpdate]);

  const cardConfig = [
    { title: 'Sản phẩm trong kho', value: productsCount.toString(), change: 'Danh mục sản phẩm hiện có', icon: <Icons.Product className="w-6 h-6" />, iconColor: 'text-blue-500 bg-blue-50/80 border-blue-100/50' },
    { title: 'Đơn hàng chờ duyệt', value: pendingOrders.length.toString(), change: 'Cần phê duyệt từ quản lý', icon: <Icons.CartOrder className="w-6 h-6" />, iconColor: 'text-purple-500 bg-purple-50/80 border-purple-100/50' },
    { title: 'Robot AMR hoạt động', value: `${robots.filter(r => r.status !== 'Error').length}/${robots.length}`, change: 'Đội robot tự hành', icon: <Icons.Robot className="w-6 h-6" />, iconColor: 'text-emerald-500 bg-emerald-50/80 border-emerald-100/50' },
    { title: 'Tổng số lượng tồn kho', value: totalStock.toLocaleString(), change: `Số lượng từ ${usersCount} tài khoản`, icon: <Icons.StockBox className="w-6 h-6" />, iconColor: 'text-orange-500 bg-orange-50/80 border-orange-100/50' }
  ];

  const statusColors = STATUS_COLORS;
  const statusLabels = STATUS_LABELS;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.Dashboard className="w-8 h-8 text-brand-600" />
            <span>Bảng điều khiển quản lý</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Giám sát hoạt động kho hàng, robot AMR và phân tích kinh doanh</p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-55 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
        >
          <Icons.Refresh className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
          <p className="text-slate-550 text-sm font-semibold">Đang tải bảng điều khiển...</p>
        </div>
      ) : (
        <>
          {/* Cards stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardConfig.map((c) => (
          <div key={c.title} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300/80">
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{c.title}</p>
              <h3 className="text-2xl font-heading font-black text-slate-900">{c.value}</h3>
              <p className="text-[11px] text-slate-500 font-medium">{c.change}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${c.iconColor}`}>
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
                <Icons.AnalyticsReport className="w-5 h-5 text-brand-600" />
                <span>Biểu đồ hoạt động tuần này</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Đơn vị: Đơn hàng</span>
            </div>
            
            {/* SVG custom bar graph */}
            <div className="h-64 flex items-end justify-between pt-6 gap-2">
              {[
                { day: 'Th 2', val: 5, pct: 40 },
                { day: 'Th 3', val: 8, pct: 60 },
                { day: 'Th 4', val: 7, pct: 50 },
                { day: 'Th 5', val: 12, pct: 80 },
                { day: 'Th 6', val: 15, pct: 100 },
                { day: 'Th 7', val: 9, pct: 70 },
                { day: 'CN', val: 4, pct: 30 }
              ].map((bar) => (
                <div key={bar.day} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative flex justify-center h-48 items-end">
                    {/* Tooltip */}
                    <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg pointer-events-none z-10 whitespace-nowrap shadow-md">
                      {bar.val} đơn
                    </span>
                    {/* Bar */}
                    <div 
                      style={{ height: `${bar.pct}%` }}
                      className="w-8 sm:w-12 rounded-t-lg bg-brand-500/85 transition-all duration-300 group-hover:bg-brand-600 group-hover:shadow-lg group-hover:shadow-brand-500/20"
                    ></div>
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
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2">
                <Icons.Robot className="w-5 h-5 text-brand-600" />
                <span>Trạng thái Robot AMR</span>
              </h3>
              <span className={`w-2.5 h-2.5 rounded-full ${signalRConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            </div>
            <div className="space-y-4">
              {robots.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">{r.name}</h4>
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${getRobotStatusStyle(r.status)}`}>
                      {getRobotStatusLabel(r.status)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono text-xs font-bold ${r.battery < 20 ? 'text-red-600' : 'text-slate-500'}`}>
                      {Math.round(r.battery)}% Pin
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/admin/inventory"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-brand-600 hover:text-brand-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer"
            >
              <Icons.Dashboard className="w-4 h-4" />
              <span>Sơ đồ & điều phối AMR</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2">
            <Icons.CartOrder className="w-5 h-5 text-brand-600" />
            <span>Đơn hàng mới đặt chờ duyệt</span>
          </h3>
          <Link to="/admin/orders" className="text-brand-600 text-xs font-bold hover:text-brand-700 hover:underline transition-all">
            Xem tất cả đơn hàng chờ duyệt →
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
            <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
              {pendingOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{o.id}</td>
                  <td className="p-4">{o.date}</td>
                  <td className="p-4 font-bold text-slate-755">{o.station}</td>
                  <td className="p-4 text-slate-900 font-bold">{o.total.toLocaleString()}đ</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[o.status] || 'bg-slate-50 border-slate-200'}`}>
                      {statusLabels[o.status] || o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {pendingOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">Không có đơn đặt hàng nào gần đây</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}
</div>
);
}

