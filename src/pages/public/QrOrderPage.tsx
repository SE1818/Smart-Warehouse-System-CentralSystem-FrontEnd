import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface ProductVariant {
  id: string;
  skuCode: string;
  variantName: string;
  price: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category?: string;
  variants?: ProductVariant[];
}

interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

export const QrOrderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId') || '';
  const tableNo = searchParams.get('tableNo') || searchParams.get('tableId') || 'Khách Tại Bàn';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('PAYOS');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchProducts();
  }, [storeId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/products?pageSize=50${storeId ? `&storeId=${storeId}` : ''}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product, variant?: ProductVariant) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.variant?.id === variant?.id
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.variant?.price || item.product.price;
      return sum + price * item.quantity;
    }, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    const payload = {
      storeId: storeId || undefined,
      tableNo: tableNo,
      paymentMethod: paymentMethod,
      platform: 'WebQR',
      deliveryNodeId: 'TABLE_PICKUP',
      shippingAddress: `Khách gọi món tại ${tableNo}`,
      items: cart.map((item) => ({
        productId: item.product.id,
        variantId: item.variant?.id,
        skuCode: item.variant?.skuCode || item.product.sku,
        variantName: item.variant?.variantName || 'Mặc định',
        quantity: item.quantity,
        price: item.variant?.price || item.product.price
      }))
    };

    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setOrderId(data.orderId || 'SUCCESS');
        setOrderSuccess(true);
        setCart([]);
        setIsCartOpen(false);
      } else {
        alert('Đặt món thất bại, vui lòng gọi nhân viên hỗ trợ.');
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi kết nối hệ thống.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30 animate-pulse">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold mb-2">Đặt Món Thành Công!</h1>
        <p className="text-slate-400 text-lg mb-4">Mã đơn hàng: <span className="text-emerald-400 font-mono">{orderId.slice(0, 8).toUpperCase()}</span></p>
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 mb-6 max-w-sm w-full">
          <p className="text-slate-300 font-medium">📍 Vị trí: <span className="text-white font-bold">{tableNo}</span></p>
          <p className="text-slate-400 text-sm mt-1">Đơn hàng của bạn đã được gửi trực tiếp tới bếp và nhân viên phục vụ.</p>
        </div>
        <button
          onClick={() => setOrderSuccess(false)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-8 rounded-xl transition"
        >
          Gọi Thêm Món
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Thực Đơn Đặt Món</h1>
            <p className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
              📍 {tableNo}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {cart.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 font-black text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>
      </header>

      {/* Menu Content */}
      <main className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {products.map((product) => {
              const hasVariants = product.variants && product.variants.length > 0;
              return (
                <div
                  key={product.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4 items-center hover:border-slate-700 transition"
                >
                  <img
                    src={product.imageUrl || 'https://via.placeholder.com/100'}
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded-xl bg-slate-800 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{product.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{product.description}</p>
                    <p className="text-emerald-400 font-bold mt-2">
                      {product.price.toLocaleString('vi-VN')} đ
                    </p>

                    {hasVariants && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {product.variants!.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => addToCart(product, v)}
                            className="text-xs bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-slate-700 px-2 py-1 rounded-lg transition text-slate-200"
                          >
                            + {v.variantName} ({v.price.toLocaleString('vi-VN')}đ)
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {!hasVariants && (
                    <button
                      onClick={() => addToCart(product)}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex-shrink-0"
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Bar if Cart Has Items */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-20">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl flex items-center justify-between hover:brightness-110 transition"
          >
            <div className="flex items-center gap-2">
              <span>{cart.reduce((s, i) => s + i.quantity, 0)} món</span>
            </div>
            <span>{calculateTotal().toLocaleString('vi-VN')} đ</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end flex-col">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-6 max-w-lg mx-auto w-full max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Giỏ Hàng ({tableNo})
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between items-center bg-slate-800/60 p-3 rounded-xl">
                  <div>
                    <p className="font-semibold text-white">{item.product.name}</p>
                    {item.variant && (
                      <p className="text-xs text-indigo-400">{item.variant.variantName}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {((item.variant?.price || item.product.price) * item.quantity).toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(index, -1)}
                      className="p-1 bg-slate-700 text-white rounded-lg hover:bg-slate-600 px-2"
                    >
                      -
                    </button>
                    <span className="font-bold w-6 text-center text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, 1)}
                      className="p-1 bg-slate-700 text-white rounded-lg hover:bg-slate-600 px-2"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Hình thức thanh toán:</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="PAYOS">📱 Chuyển khoản VietQR (PayOS)</option>
                  <option value="Cash">💵 Tiền mặt (Tại thu ngân / tại bàn)</option>
                  <option value="Wallet">💳 Tài khoản Ví cửa hàng</option>
                </select>
              </div>

              <div className="flex justify-between text-lg font-bold">
                <span className="text-slate-300">Tổng cộng:</span>
                <span className="text-emerald-400">{calculateTotal().toLocaleString('vi-VN')} đ</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition"
              >
                {isSubmitting ? 'Đang gửi đơn...' : 'Xác Nhận Đặt Món'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
