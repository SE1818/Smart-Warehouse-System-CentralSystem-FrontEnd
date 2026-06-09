import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function UserLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState<number>(() => {
    const cartStr = localStorage.getItem('cart');
    if (cartStr) {
      try {
        const cart = JSON.parse(cartStr);
        return cart.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
      } catch {
        return 0;
      }
    }
    return 0;
  });

  // Retrieve user info
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { name: 'Nhân viên', email: 'user@smartwarehouse.com', role: 'User' };

  const updateCartCount = () => {
    const cartStr = localStorage.getItem('cart');
    if (cartStr) {
      try {
        const cart = JSON.parse(cartStr);
        const count = cart.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
        setCartCount(count);
      } catch {
        setCartCount(0);
      }
    } else {
      setCartCount(0);
    }
  };

  useEffect(() => {
    window.addEventListener('cart-updated', updateCartCount);
    return () => {
      window.removeEventListener('cart-updated', updateCartCount);
    };
  }, []);

  const navItems = [
    { path: '/', label: 'Trang chủ', icon: '🏠' },
    { path: '/products', label: 'Sản phẩm', icon: '📦' },
    { path: '/cart', label: 'Giỏ hàng', icon: '🛒', isCart: true },
    { path: '/orders', label: 'Đơn hàng', icon: '📋' },
    { path: '/profile', label: 'Tài khoản', icon: '👤' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 h-screen">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 shrink-0">
          <h1 className="text-xl font-heading font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>⚙️</span> SmartWarehouse
          </h1>
          <p className="text-[10px] font-bold text-brand-650 uppercase tracking-widest mt-1">Cổng Nhân Viên</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 group ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 border border-brand-100/40 shadow-xs'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg transition-transform duration-150 group-hover:scale-110">
                    {item.icon}
                  </span>
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                {item.isCart && cartCount > 0 && (
                  <span className="bg-brand-600 text-white font-bold text-xs px-2 py-0.5 rounded-full shadow-md">
                    {cartCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3 px-2 py-3 rounded-xl mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 border border-brand-200 text-brand-750 flex items-center justify-center font-bold font-heading text-lg shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-slate-900 truncate text-sm">{user.name}</h4>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          
          {(user.role === 'Admin' || user.role === 'Warehouse_Admin') && (
            <Link
              to="/admin/dashboard"
              className="flex items-center justify-center gap-2 w-full mb-2 py-2 px-4 bg-white hover:bg-slate-50 text-brand-650 hover:text-brand-700 rounded-xl text-xs font-bold transition-all border border-slate-200"
            >
              ⚙️ Bảng điều khiển Admin
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-red-50 hover:bg-red-100/80 text-red-600 hover:text-red-750 rounded-xl text-sm font-bold transition-all border border-red-200/30"
          >
            <span>🚪</span> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Sidebar for Mobile */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-900/40 backdrop-blur-xs">
          <div className="w-64 bg-white p-5 flex flex-col h-full border-r border-slate-200 animate-slide-in">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-5">
              <div>
                <h1 className="text-lg font-heading font-black text-slate-900">SmartWarehouse</h1>
                <p className="text-xs text-brand-600 font-bold uppercase tracking-wider">Cổng Nhân Viên</p>
              </div>
              <button 
                onClick={() => setIsMobileOpen(false)} 
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm transition-colors border border-slate-250/40"
              >
                ✕
              </button>
            </div>
            
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 border border-brand-100/40 shadow-xs'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>{item.icon}</span>
                      <span className="font-bold text-sm">{item.label}</span>
                    </div>
                    {item.isCart && cartCount > 0 && (
                      <span className="bg-brand-600 text-white font-bold text-xs px-2 py-0.5 rounded-full">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            
            <div className="border-t border-slate-100 pt-4 mt-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-100 border border-brand-200 text-brand-750 flex items-center justify-center font-bold text-lg shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-slate-900 truncate text-sm">{user.name}</h4>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>

              {(user.role === 'Admin' || user.role === 'Warehouse_Admin') && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full mb-2 py-2 px-4 bg-slate-50 text-brand-650 rounded-xl text-xs font-bold border border-slate-200"
                >
                  ⚙️ Bảng điều khiển Admin
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200/30"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header bar for mobile */}
        <header className="flex md:hidden items-center justify-between h-16 bg-white border-b border-slate-200 px-6 shrink-0">
          <h1 className="text-lg font-heading font-black text-slate-900">SmartWarehouse</h1>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          >
            ☰
          </button>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto tech-grid bg-slate-50 text-slate-800">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
