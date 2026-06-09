import { useState, useEffect } from 'react';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  total: number;
  status: 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
  station: string;
  items: OrderItem[];
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    const ordersStr = localStorage.getItem('orders');
    if (ordersStr) {
      try {
        setOrders(JSON.parse(ordersStr));
      } catch {
        setOrders([]);
      }
    } else {
      const defaultOrders: Order[] = [
        {
          id: 'ORD-548903',
          date: '2025-06-05',
          total: 55000,
          status: 'Delivered',
          station: 'ST01',
          items: [
            { name: 'Đồ uống Coca Cola', quantity: 2, price: 15000 },
            { name: 'Khẩu trang y tế N95', quantity: 1, price: 25000 }
          ]
        },
        {
          id: 'ORD-894201',
          date: '2025-06-05',
          total: 35000,
          status: 'Shipped',
          station: 'ST02',
          items: [
            { name: 'Cồn sát khuẩn 70 độ', quantity: 1, price: 35000 }
          ]
        }
      ];
      localStorage.setItem('orders', JSON.stringify(defaultOrders));
      setOrders(defaultOrders);
    }
  };

  const updateOrderStatus = (orderId: string, nextStatus: Order['status']) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return { ...o, status: nextStatus };
      }
      return o;
    });
    setOrders(updated);
    localStorage.setItem('orders', JSON.stringify(updated));
  };

  const statusColors = {
    Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    Confirmed: 'bg-blue-50 text-blue-700 border border-blue-200',
    Shipped: 'bg-purple-50 text-purple-700 border border-purple-200',
    Delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Cancelled: 'bg-red-50 text-red-700 border border-red-200',
  };

  const statusLabels = {
    Pending: 'Chờ duyệt',
    Confirmed: 'Đã duyệt',
    Shipped: 'Đang giao hàng (AMR)',
    Delivered: 'Hoàn tất',
    Cancelled: 'Đã hủy',
  };

  const filtered = orders.filter((o) => {
    const ms = o.id.toLowerCase().includes(search.toLowerCase()) || o.station.toLowerCase().includes(search.toLowerCase());
    const mc = !statusFilter || o.status === statusFilter;
    return ms && mc;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>📋</span> Quản lý đơn hàng
        </h1>
        <p className="mt-1 text-sm text-slate-505">Theo dõi các đơn hàng trên toàn hệ thống và điều phối Robot AMR</p>
      </div>

      {/* Filter panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm mã đơn hoặc trạm nhận..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-750 font-medium"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Log list */}
      <div className="space-y-4">
        {filtered.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-all">
            <div className="space-y-3 flex-1">
              {/* Top row */}
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-slate-900 text-base">{o.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[o.status]}`}>
                  {statusLabels[o.status]}
                </span>
                <span className="text-xs text-slate-400 font-semibold">Đặt ngày: {o.date}</span>
              </div>
              
              {/* Product items description */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-650 text-sm">
                <span className="font-bold text-slate-405 uppercase text-[9px] tracking-wider block">Sản phẩm:</span>
                {o.items?.map((item, idx) => (
                  <span key={idx} className="bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 rounded-lg text-xs font-semibold text-slate-700">
                    {item.name} <span className="text-brand-650 font-bold">x{item.quantity}</span>
                  </span>
                ))}
              </div>

              {/* Station location */}
              <div className="text-xs text-slate-500 font-medium">
                📍 Vị trí nhận: Trạm <span className="font-bold text-slate-900">{o.station}</span> • Trị giá: <span className="font-bold text-brand-650">{o.total.toLocaleString()}đ</span>
              </div>
            </div>

            {/* Actions workflow control */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 md:border-t-0 md:pt-0 shrink-0">
              {o.status === 'Pending' && (
                <>
                  <button
                    onClick={() => updateOrderStatus(o.id, 'Cancelled')}
                    className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-all"
                  >
                    Hủy đơn
                  </button>
                  <button
                    onClick={() => updateOrderStatus(o.id, 'Confirmed')}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all duration-150 active:scale-98"
                  >
                    Duyệt & Gọi Robot
                  </button>
                </>
              )}

              {o.status === 'Confirmed' && (
                <button
                  onClick={() => updateOrderStatus(o.id, 'Shipped')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/10 transition-all duration-150 active:scale-98"
                >
                  🚚 Gửi lệnh Robot đi giao
                </button>
              )}

              {o.status === 'Shipped' && (
                <button
                  onClick={() => updateOrderStatus(o.id, 'Delivered')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-all duration-150 active:scale-98"
                >
                  ✓ Xác nhận Đã giao
                </button>
              )}

              {o.status === 'Delivered' && (
                <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                  <span>✓</span> Đơn hàng hoàn tất
                </span>
              )}

              {o.status === 'Cancelled' && (
                <span className="text-red-700 text-xs font-bold">
                  ✖ Đã hủy bỏ
                </span>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400">
            <p className="font-semibold text-sm">Không tìm thấy đơn hàng nào khớp điều kiện lọc</p>
          </div>
        )}
      </div>
    </div>
  );
}
