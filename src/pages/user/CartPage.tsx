import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '@/services';

interface CartItem {
  id: string;
  name: string;
  price: number;
  category: string;
  quantity: number;
  maxStock: number;
}

export function CartPage() {
  const [items, setItems] = useState<CartItem[]>(() => {
    const cartStr = localStorage.getItem('cart');
    if (cartStr) {
      try {
        return JSON.parse(cartStr);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [stationId, setStationId] = useState('ST01');
  const [paymentMethod, setPaymentMethod] = useState('VNPAY');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [loading] = useState(false);
  const navigate = useNavigate();

  const loadCart = () => {
    const cartStr = localStorage.getItem('cart');
    if (cartStr) {
      try {
        setItems(JSON.parse(cartStr));
      } catch {
        setItems([]);
      }
    } else {
      setItems([]);
    }
  };

  useEffect(() => {
    // Add event listener for updates from other tabs/components
    const handleUpdate = () => loadCart();
    window.addEventListener('cart-updated', handleUpdate);
    return () => window.removeEventListener('cart-updated', handleUpdate);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const newQty = Math.max(1, Math.min(item.maxStock, item.quantity + delta));
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setItems(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const removeItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const checkout = async () => {
    if (items.length === 0) return;

    const userStr = localStorage.getItem('user');
    if (!userStr) {
      alert("Vui lòng đăng nhập để thực hiện đặt hàng!");
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    setCheckoutLoading(true);

    const selectedStation = stations.find(s => s.id === stationId);
    const shippingAddress = selectedStation ? selectedStation.name : `Trạm ${stationId}`;

    const orderRequest = {
      userId: user.id,
      deliveryNodeId: stationId,
      shippingAddress: shippingAddress,
      paymentMethod: paymentMethod,
      items: items.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price
      }))
    };

    try {
      const response = await orderService.createOrder(orderRequest);

      // Clear cart
      localStorage.removeItem('cart');
      setItems([]);
      window.dispatchEvent(new Event('cart-updated'));

      if (response.paymentUrl) {
        // Redirect to VNPAY sandbox / Momo / ZaloPay payment page
        window.location.href = response.paymentUrl;
      } else {
        // Navigate to orders list with success message
        navigate('/orders', { state: { successMessage: `Đặt đơn hàng ${response.orderId.substring(0, 8)} thành công!` } });
      }
    } catch (err: any) {
      console.error('Error creating order:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Delivery stations mock list
  const stations = [
    { id: 'ST01', name: 'Trạm A - Khu Vực Lắp Ráp' },
    { id: 'ST02', name: 'Trạm B - Đóng Gói' },
    { id: 'ST03', name: 'Trạm C - Cửa Xuất Hàng' },
    { id: 'ST04', name: 'Trạm D - Kỹ Thuật' },
    { id: 'ST05', name: 'Trạm E - Văn Phòng' }
  ];

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">Đang tải giỏ hàng...</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>🛒</span> Giỏ hàng của tôi
        </h1>
        <p className="mt-1 text-sm text-slate-505">Quản lý các sản phẩm đã chọn và thiết lập vị trí nhận hàng</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center space-y-6 shadow-sm">
          <span className="text-6xl block">🛒</span>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Giỏ hàng trống</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">Bạn chưa thêm sản phẩm nào vào giỏ hàng. Hãy khám phá thực đơn/sản phẩm của chúng tôi.</p>
          </div>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-md transition-all"
          >
            Quay lại Sản phẩm
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart list */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between gap-4 shadow-sm hover:border-slate-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center text-3xl border border-slate-200/60 shrink-0 select-none">
                    {item.category === 'Đồ uống' ? '🥤' : '📦'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-brand-650 font-bold mt-0.5">{item.category}</p>
                    <p className="text-slate-900 font-bold text-sm mt-1">
                      {item.price.toLocaleString()}đ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Quantity adjustment */}
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold transition-all text-sm"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-slate-850 text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold transition-all text-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-xl transition-all"
                    title="Xóa khỏi giỏ"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout sidebar */}
          <div className="space-y-6">
            {/* Delivery configuration */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span>📍</span> Thông tin nhận hàng
              </h3>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Trạm nhận hàng
                </label>
                <select
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-700 font-medium"
                >
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 pt-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Phương thức thanh toán
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-700 font-medium"
                >
                  <option value="VNPAY">Thanh toán VNPAY (sandbox)</option>
                  <option value="Wallet">Ví điện tử (Hệ thống)</option>
                  <option value="Cash">Tiền mặt khi nhận hàng</option>
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 leading-relaxed pt-2 font-medium">
                  * Robot AMR sẽ tự động tìm đường tối ưu trong kho để vận chuyển đơn hàng này đến trạm bạn chọn.
                </p>
              </div>
            </div>

            {/* Price summary */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="font-heading font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span>💳</span> Chi tiết thanh toán
              </h3>
              <div className="space-y-2 text-sm text-slate-505 font-medium">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span className="font-bold text-slate-800">{total.toLocaleString()}đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển (AMR)</span>
                  <span className="text-emerald-700 font-bold">Miễn phí</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-extrabold text-slate-900">
                  <span>Tổng cộng</span>
                  <span className="text-brand-650 text-lg font-black">{total.toLocaleString()}đ</span>
                </div>
              </div>
              
              <button
                onClick={checkout}
                disabled={checkoutLoading}
                className="w-full mt-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white py-3 rounded-xl font-bold shadow-md shadow-brand-500/10 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>💳</span> {checkoutLoading ? 'Đang xử lý...' : 'Xác nhận & Đặt hàng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
