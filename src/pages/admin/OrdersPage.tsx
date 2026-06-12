import { useState, useEffect } from 'react';
import { DEFAULT_PRODUCTS, STATUS_COLORS, STATUS_LABELS } from '@/constants';
import { orderService } from '@/services';

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const getProductName = (productId: string) => {
    const prod = DEFAULT_PRODUCTS.find(p => p.id === productId);
    return prod ? prod.name : `Sản phẩm (${productId.substring(0, 8)})`;
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const apiOrders = await orderService.getPendingOrders();
      const mapped: Order[] = apiOrders.map((o: any) => ({
        id: o.id,
        date: o.createdAt ? o.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        total: o.totalAmount,
        status: 'Pending', // pending list returns pending orders
        station: o.deliveryNodeId || 'Khu vực nhận',
        items: o.items ? o.items.map((item: any) => ({
          name: getProductName(item.productId),
          quantity: item.quantity,
          price: item.price
        })) : []
      }));
      setOrders(mapped);
    } catch (err) {
      console.error('Error loading pending orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleConfirm = async (orderId: string) => {
    try {
      await orderService.confirmOrder(orderId);
      alert('Đã duyệt đơn và phát lệnh Robot AMR thành công!');
      loadOrders();
    } catch (err: any) {
      console.error('Error confirming order:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi duyệt đơn hàng.');
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    try {
      await orderService.refundOrder(orderId);
      alert('Đã hủy và hoàn tiền đơn hàng thành công!');
      loadOrders();
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi hủy đơn hàng.');
    }
  };

  const statusColors = STATUS_COLORS;
  const statusLabels = STATUS_LABELS;

  const filtered = orders.filter((o) => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    o.station.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">Đang tải danh sách đơn hàng chờ duyệt...</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📋</span> Quản lý đơn hàng chờ duyệt
          </h1>
          <p className="mt-1 text-sm text-slate-505">Theo dõi các đơn hàng chờ xác nhận và điều phối Robot AMR</p>
        </div>
        <button 
          onClick={loadOrders}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors"
        >
          🔄 Làm mới
        </button>
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
      </div>

      {/* Log list */}
      <div className="space-y-4">
        {filtered.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-all">
            <div className="space-y-3 flex-1">
              {/* Top row */}
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-slate-900 text-sm">{o.id}</span>
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
              <button
                onClick={() => handleCancel(o.id)}
                className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-650 rounded-xl text-xs font-bold transition-all"
              >
                Hủy đơn
              </button>
              <button
                onClick={() => handleConfirm(o.id)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all duration-150 active:scale-98"
              >
                Duyệt & Gọi Robot
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400">
            <p className="font-semibold text-sm">Hiện không có đơn hàng nào chờ duyệt trong hệ thống</p>
          </div>
        )}
      </div>
    </div>
  );
}
