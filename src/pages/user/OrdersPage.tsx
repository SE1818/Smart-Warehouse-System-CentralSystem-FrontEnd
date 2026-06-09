import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_ORDERS, STATUS_COLORS, STATUS_LABELS } from '@/constants';

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
  const [orders, setOrders] = useState<Order[]>(() => {
    const ordersStr = localStorage.getItem('orders');
    if (ordersStr) {
      try {
        return JSON.parse(ordersStr);
      } catch {
        return [];
      }
    }
    const defaultOrders = DEFAULT_ORDERS();
    localStorage.setItem('orders', JSON.stringify(defaultOrders));
    return defaultOrders;
  });
  const [loading] = useState(false);
  const location = useLocation();
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const loadOrders = () => {
    const ordersStr = localStorage.getItem('orders');
    if (ordersStr) {
      try {
        setOrders(JSON.parse(ordersStr));
      } catch {
        setOrders([]);
      }
    } else {
      setOrders([]);
    }
  };

  useEffect(() => {
    // Check if redirect has success state message
    if (location.state) {
      const stateObj = location.state as { successMessage?: string };
      if (stateObj.successMessage) {
        setTimeout(() => {
          setBannerMessage(stateObj.successMessage || null);
          window.history.replaceState({}, document.title);
          setTimeout(() => setBannerMessage(null), 5000);
        }, 0);
      }
    }

    setTimeout(() => {
      loadOrders();
    }, 0);
  }, [location]);

  const statusColors = STATUS_COLORS;

  const statusLabels = STATUS_LABELS;

  const cancelOrder = (orderId: string) => {
    const updated = orders.map((o) => {
      if (o.id === orderId && o.status === 'Pending') {
        return { ...o, status: 'Cancelled' as const };
      }
      return o;
    });
    setOrders(updated);
    localStorage.setItem('orders', JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">Đang tải lịch sử đơn hàng...</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Toast alert banner */}
      {bannerMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-sm font-semibold shadow-sm animate-pulse">
          <span>✅</span>
          <span>{bannerMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>📋</span> Đơn hàng của tôi
        </h1>
        <p className="mt-1 text-sm text-slate-505">Theo dõi hành trình và trạng thái vận chuyển của Robot AMR</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center space-y-4 shadow-sm">
          <span className="text-5xl block">📋</span>
          <p className="text-slate-500 font-bold text-sm">Bạn chưa có đơn đặt hàng nào.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:border-slate-300 transition-all">
              {/* Top summary row */}
              <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-extrabold text-slate-900 text-base">{o.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[o.status]}`}>
                      {statusLabels[o.status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">Ngày đặt: {o.date} • Trạm nhận: <span className="font-bold text-slate-700">{o.station}</span></p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Tổng cộng</span>
                  <span className="text-base font-extrabold text-brand-650">{o.total.toLocaleString()}đ</span>
                </div>
              </div>

              {/* Items row */}
              <div className="p-5 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Danh mục sản phẩm</h4>
                <div className="divide-y divide-slate-100">
                  {o.items?.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        <span className="text-xs text-slate-400 font-bold">x{item.quantity}</span>
                      </div>
                      <span className="font-bold text-slate-655">{(item.price * item.quantity).toLocaleString()}đ</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps timeline */}
              {o.status !== 'Cancelled' && (
                <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100">
                  <div className="flex justify-between items-center max-w-lg mx-auto relative pt-6 pb-2">
                    {/* Progress Bar background */}
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0"></div>
                    {/* Active Progress line */}
                    <div 
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-500 z-0 transition-all duration-300"
                      style={{
                        width: o.status === 'Pending' ? '0%' :
                                o.status === 'Confirmed' ? '33%' :
                                o.status === 'Shipped' ? '66%' : '100%'
                      }}
                    ></div>

                    {[
                      { key: 'Pending', label: 'Khởi tạo' },
                      { key: 'Confirmed', label: 'Xác nhận' },
                      { key: 'Shipped', label: 'Đang vận chuyển' },
                      { key: 'Delivered', label: 'Hoàn tất' }
                    ].map((step, idx) => {
                      const stages = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];
                      const currentIdx = stages.indexOf(o.status);
                      const stepIdx = stages.indexOf(step.key);
                      const isCompleted = stepIdx <= currentIdx;
                      const isActive = step.key === o.status;

                      return (
                        <div key={step.key} className="flex flex-col items-center relative z-10">
                          <div 
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                              isCompleted 
                                ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/20' 
                                : 'bg-white border-slate-300 text-slate-400'
                            } ${isActive ? 'ring-4 ring-brand-500/20 scale-110' : ''}`}
                          >
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <span className={`text-[10px] font-bold mt-2 ${isCompleted ? 'text-brand-650' : 'text-slate-400'}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action row */}
              {o.status === 'Pending' && (
                <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => cancelOrder(o.id)}
                    className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-650 rounded-xl text-xs font-bold transition-all"
                  >
                    Hủy đơn hàng này
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
