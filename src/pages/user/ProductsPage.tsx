import { useState, useEffect } from 'react';
import apiClient from '@/services/api';
import type { Product } from '@/types';

interface LocalCartItem {
  id: string;
  name: string;
  price: number;
  category: string;
  quantity: number;
  maxStock: number;
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/products')
      .then((res) => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching products:', err);
        // Fallback mock data if API is down
        setProducts([
          { id: '1', name: 'Đồ uống Coca Cola', category: 'Đồ uống', price: 15000, stockQuantity: 50, description: 'Coca Cola lon 330ml', unit: 'lon', createdAt: '', updatedAt: '' },
          { id: '2', name: 'Nước suối Aquafina', category: 'Đồ uống', price: 10000, stockQuantity: 100, description: 'Chai 500ml', unit: 'chai', createdAt: '', updatedAt: '' },
          { id: '3', name: 'Khẩu trang y tế N95', category: 'Vật tư y tế', price: 25000, stockQuantity: 200, description: 'Hộp 10 chiếc', unit: 'hộp', createdAt: '', updatedAt: '' },
          { id: '4', name: 'Cồn sát khuẩn 70 độ', category: 'Vật tư y tế', price: 35000, stockQuantity: 15, description: 'Chai 500ml cồn y tế', unit: 'chai', createdAt: '', updatedAt: '' },
          { id: '5', name: 'Găng tay cao su y tế', category: 'Vật tư y tế', price: 85000, stockQuantity: 0, description: 'Hộp 100 chiếc', unit: 'hộp', createdAt: '', updatedAt: '' },
          { id: '6', name: 'Băng cá nhân Urgo', category: 'Vật tư y tế', price: 20000, stockQuantity: 150, description: 'Hộp 100 miếng', unit: 'hộp', createdAt: '', updatedAt: '' }
        ]);
        setLoading(false);
      });
  }, []);

  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) return;
    
    const cartStr = localStorage.getItem('cart');
    const cart: LocalCartItem[] = cartStr ? JSON.parse(cartStr) : [];
    
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        quantity: 1,
        maxStock: product.stockQuantity
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Trigger window event to notify other components (e.g. badge update)
    window.dispatchEvent(new Event('cart-updated'));
    
    setNotification(`Đã thêm "${product.name}" vào giỏ hàng!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const filtered = products.filter((p) => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase());
    const mc = !category || p.category === category;
    return ms && mc;
  });
  
  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10 space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-white text-slate-900 px-5 py-3 rounded-xl shadow-xl border border-slate-200 flex items-center gap-3 animate-bounce">
          <span>🛒</span>
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>🛍️</span> Danh mục sản phẩm
        </h1>
        <p className="mt-1 text-sm text-slate-505">Duyệt và đặt hàng vật tư, đồ dùng được giao tự động bằng AMR</p>
      </div>

      {/* Filters Search/Select */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Tìm tên sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-sm text-slate-800 font-medium"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-700 font-medium"
          >
            <option value="">Tất cả phân loại</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 animate-pulse">
              <div className="h-40 bg-slate-100 rounded-xl"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => {
            const isOutOfStock = p.stockQuantity <= 0;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full group">
                {/* Product image block placeholder */}
                <div className="relative h-44 bg-slate-50 border-b border-slate-100 flex items-center justify-center text-7xl select-none group-hover:scale-[1.02] transition-transform duration-200">
                  {p.category === 'Đồ uống' ? '🥤' : '📦'}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-slate-100/70 backdrop-blur-xs flex items-center justify-center">
                      <span className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg text-xs tracking-wider uppercase shadow-md">
                        Hết hàng
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-100/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {p.category}
                    </span>
                    <h3 className="font-heading font-bold text-slate-900 text-base line-clamp-1 group-hover:text-brand-650 transition-colors">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-extrabold text-slate-900">
                        {p.price.toLocaleString()}đ
                      </span>
                      <span className={`text-xs font-semibold ${!isOutOfStock ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {!isOutOfStock ? `Còn lại: ${p.stockQuantity}` : 'Liên hệ quản kho'}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => addToCart(p)}
                      disabled={isOutOfStock}
                      className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                        isOutOfStock
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : 'bg-brand-600 hover:bg-brand-500 active:scale-98 text-white shadow-md shadow-brand-600/10'
                      }`}
                    >
                      <span>🛒</span> Thêm vào giỏ
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filtered.length === 0 && (
            <div className="col-span-full bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <span className="text-4xl block">🔍</span>
              <p className="font-bold">Không tìm thấy sản phẩm nào khớp với bộ lọc</p>
              <button onClick={() => { setSearch(''); setCategory(''); }} className="text-brand-650 text-sm font-semibold hover:underline">
                Đặt lại bộ lọc
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
