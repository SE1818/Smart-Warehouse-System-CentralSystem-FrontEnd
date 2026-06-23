import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_PRODUCTS, STATUS_COLORS, STATUS_LABELS } from '@/constants';
import { orderService } from '@/services';
import { Icons } from '@/components/Icons';
import { toast } from 'react-toastify';

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
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const getProductName = (productId: string) => {
    const prod = DEFAULT_PRODUCTS.find(p => p.id === productId);
    return prod ? prod.name : `Sản phẩm (${productId.substring(0, 8)})`;
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const apiOrders = await orderService.getPendingOrders();
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
      const mapped: Order[] = (apiOrders as unknown as ApiOrder[]).map((o) => ({
        id: o.id,
        date: o.createdAt ? o.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        total: o.totalAmount,
        status: 'Pending',
        station: o.deliveryNodeId || 'Khu vực nhận',
        items: o.items ? o.items.map((item) => ({
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadOrders]);

  useEffect(() => {
    const handleRefresh = () => {
      loadOrders();
    };
    window.addEventListener('smartwarehouse-notification', handleRefresh);
    return () => window.removeEventListener('smartwarehouse-notification', handleRefresh);
  }, [loadOrders]);

  const handleConfirm = async (orderId: string) => {
    try {
      await orderService.confirmOrder(orderId);
      toast.success('Đã duyệt đơn và phát lệnh Robot AMR thành công!');
      loadOrders();
    } catch (err) {
      console.error('Error confirming order:', err);
      const apiError = err as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Có lỗi xảy ra khi duyệt đơn hàng.');
    }
  };

  const handleCancelClick = (orderId: string) => {
    setCancellingOrderId(orderId);
  };

  const confirmCancel = async (orderId: string) => {
    try {
      await orderService.refundOrder(orderId);
      setCancellingOrderId(null);
      toast.success('Đã hủy và hoàn tiền đơn hàng thành công!');
      loadOrders();
    } catch (err) {
      console.error('Error cancelling order:', err);
      const apiError = err as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Có lỗi xảy ra khi hủy đơn hàng.');
    }
  };

  const statusColors = STATUS_COLORS;
  const statusLabels = STATUS_LABELS;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filtered = orders.filter((o) => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    o.station.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filtered.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-500 flex flex-col items-center justify-center space-y-4">
        <Icons.Spinner className="h-10 w-10 text-brand-600 animate-spin" />
        <span className="text-sm font-semibold">Đang tải danh sách đơn hàng chờ duyệt...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8 relative overflow-hidden tech-grid">
      {/* Background glow circle */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Icons.CartOrder className="w-8 h-8 text-brand-600 glow-blue" />
            <span>Quản lý đơn hàng chờ duyệt</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi các đơn hàng chờ xác nhận và điều phối Robot AMR</p>
        </div>
        <button 
          onClick={loadOrders}
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-98 cursor-pointer"
        >
          <Icons.Refresh className="w-4 h-4 text-slate-500" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Tìm kiếm mã đơn hoặc trạm nhận..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-4 py-3 bg-slate-55 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 placeholder-slate-400 font-semibold"
          />
          <Icons.Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Order list */}
      <div className="space-y-4 animate-fadeIn">
        {paginatedOrders.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-slate-350 hover:shadow-xs transition-all duration-300 group">
            <div className="space-y-4 flex-1">
              {/* Top row */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-heading font-black text-slate-900 text-sm bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg tracking-wider">{o.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[o.status]}`}>
                  {statusLabels[o.status]}
                </span>
                <span className="text-xs text-slate-400 font-semibold">Đặt ngày: {o.date}</span>
              </div>
              
              {/* Product items description */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-600 text-sm">
                <span className="font-extrabold text-slate-400 uppercase text-[9px] tracking-wider block">Sản phẩm:</span>
                {o.items?.map((item, idx) => (
                  <span key={idx} className="bg-slate-50 border border-slate-200/60 px-3 py-1 rounded-xl text-xs font-semibold text-slate-700">
                    {item.name} <span className="text-brand-600 font-bold ml-1">x{item.quantity}</span>
                  </span>
                ))}
              </div>

              {/* Station location */}
              <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 flex-wrap">
                <Icons.Warehouse className="w-4 h-4 text-slate-400" />
                <span>Vị trí nhận:</span>
                <span className="text-slate-800 font-extrabold bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">Trạm {o.station}</span>
                <span className="text-slate-300 font-bold">•</span>
                <span>Trị giá:</span>
                <span className="text-brand-655 font-extrabold text-sm">{o.total.toLocaleString()}đ</span>
              </div>
            </div>

            {/* Actions workflow control */}
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0 shrink-0">
              <button
                onClick={() => handleCancelClick(o.id)}
                className="px-5 py-2.5 border border-red-200 hover:bg-red-50 hover:border-red-300 text-red-655 rounded-xl text-xs font-bold transition-all active:scale-98 cursor-pointer"
              >
                Hủy đơn
              </button>
              <button
                onClick={() => handleConfirm(o.id)}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10 transition-all duration-150 active:scale-98 cursor-pointer"
              >
                Duyệt & Gọi Robot
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center text-slate-450 shadow-sm">
            <Icons.CartOrder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-sm">Hiện không có đơn hàng nào chờ duyệt trong hệ thống</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-500 font-semibold">
              Hiển thị <span className="font-bold text-slate-800">{startIndex + 1}</span> -{" "}
              <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, filtered.length)}</span>{" "}
              trong <span className="font-bold text-slate-800">{filtered.length}</span> đơn hàng
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer"
              >
                <Icons.ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-extrabold transition-all active:scale-95 cursor-pointer ${
                    currentPage === page
                      ? "border-brand-500 bg-brand-600 text-white shadow-md shadow-brand-500/10"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 cursor-pointer"
              >
                <Icons.ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Order Confirmation Modal */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 w-full max-w-sm shadow-2xl relative">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-red-655 shadow-sm">
                <Icons.AlertWarning className="w-6 h-6 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-heading font-extrabold text-slate-900">Hủy đơn hàng</h3>
                <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                  Bạn có chắc chắn muốn hủy đơn hàng này và hoàn lại tiền? Hành động này sẽ dừng lệnh điều phối Robot AMR và không thể hoàn tác.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingOrderId(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => confirmCancel(cancellingOrderId)}
                className="flex-1 px-4 py-2.5 bg-red-655 hover:bg-red-550 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-red-550/10 transition-all cursor-pointer"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
