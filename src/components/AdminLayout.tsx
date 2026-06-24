import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { toast } from 'react-toastify';

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Retrieve user info
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { name: 'Quản trị viên', email: 'admin@smartwarehouse.com', role: 'warehouse_manager' };

  useEffect(() => {
    if (!user || !user.id) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`http://localhost:5000/api/notifications/hub?userId=${user.id}`)
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveNotification', (notification: { title: string; message: string }) => {
      toast.info(
        <div>
          <div className="font-bold text-slate-900 text-sm mb-0.5">{notification.title}</div>
          <div className="text-xs text-slate-600 font-semibold">{notification.message}</div>
        </div>
      );
      window.dispatchEvent(new CustomEvent('smartwarehouse-notification', { detail: notification }));
    });

    connection.start()
      .then(() => console.log('[SignalR] Connected to Notification Hub for user:', user.id))
      .catch((err) => console.error('[SignalR] Connection failed: ', err));

    return () => {
      connection.stop();
    };
  }, [user?.id]);

  const navItems = [
    { path: '/admin/dashboard', label: 'Bảng điều khiển', icon: <Icons.Dashboard className="w-5 h-5" /> },
    { path: '/admin/inventory', label: 'Sơ đồ robot', icon: <Icons.Dashboard className="w-5 h-5" /> },
    { path: '/admin/warehouses', label: 'Quản lý kho', icon: <Icons.Warehouse className="w-5 h-5" /> },
    { path: '/admin/stocklevels', label: 'Tồn kho hiện tại', icon: <Icons.StockBox className="w-5 h-5" /> },
    { path: '/admin/stockmovements', label: 'Lịch sử di chuyển', icon: <Icons.HistoryLogs className="w-5 h-5" /> },
    { path: '/admin/stockadjustments', label: 'Điều chỉnh tồn kho', icon: <Icons.AdjustmentSettings className="w-5 h-5" /> },
    { path: '/admin/search', label: 'Tìm kiếm & AI', icon: <Icons.Search className="w-5 h-5" /> },
    { path: '/admin/notifications', label: 'Thông báo', icon: <Icons.Bell className="w-5 h-5" /> },
    { path: '/admin/files', label: 'Quản lý File', icon: <Icons.Folder className="w-5 h-5" /> },
    { path: '/admin/promotions', label: 'Khuyến mãi', icon: <Icons.TagDiscount className="w-5 h-5" /> },
    { path: '/admin/robots', label: 'Robot AMR', icon: <Icons.Robot className="w-5 h-5" /> },
    { path: '/admin/wallet', label: 'Ví điện tử', icon: <Icons.Wallet className="w-5 h-5" /> },
    { path: '/admin/profile', label: 'Hồ sơ', icon: <Icons.Profile className="w-5 h-5" /> },
    { path: '/admin/metrics', label: 'Giám sát môi trường', icon: <Icons.Metrics className="w-5 h-5" /> },
    { path: '/admin/logs', label: 'Nhật ký hoạt động', icon: <Icons.HistoryLogs className="w-5 h-5" /> },
    { path: '/admin/scheduler', label: 'Quản lý Scheduler', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ) },
    { path: '/admin/products', label: 'Quản lý sản phẩm', icon: <Icons.Product className="w-5 h-5" /> },
    { path: '/admin/orders', label: 'Quản lý đơn hàng', icon: <Icons.CartOrder className="w-5 h-5" /> },
    { path: '/admin/users', label: 'Quản lý người dùng', icon: <Icons.UsersGroup className="w-5 h-5" /> },
    { path: '/admin/complaints', label: 'Quản lý khiếu nại', icon: <Icons.AlertWarning className="w-5 h-5" /> },
    { path: '/admin/reports', label: 'Báo cáo doanh số', icon: <Icons.AnalyticsReport className="w-5 h-5" /> },
  ];

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 shrink-0 h-screen shadow-sm">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 shrink-0 flex flex-col justify-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <Icons.Robot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-heading font-black text-slate-900 tracking-tight leading-none">
                SmartWarehouse
              </h1>
              <p className="text-[9px] font-bold text-brand-600 uppercase tracking-widest mt-1">Hệ Thống Trung Tâm</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group border ${isActive
                    ? 'bg-gradient-to-r from-brand-50 to-brand-100/20 text-brand-700 border-brand-100/50 font-bold shadow-xs'
                    : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-brand-650' : 'text-slate-400 group-hover:text-slate-650'}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl mb-3 hover:bg-slate-100/40 transition-all duration-150 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 border border-brand-300 text-brand-800 flex items-center justify-center font-bold font-heading text-lg shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-slate-900 truncate text-sm leading-tight">{user.name}</h4>
              <p className="text-xs text-slate-405 truncate mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 bg-red-50 hover:bg-red-100/80 text-red-650 rounded-xl text-sm font-bold transition-all border border-red-200/40 active:scale-98 shadow-xs cursor-pointer"
          >
            <Icons.Logout className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Sidebar for Mobile */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-900/60 backdrop-blur-xs">
          <div className="w-64 bg-white p-5 flex flex-col h-full border-r border-slate-200 animate-slide-in shadow-2xl">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
                  <Icons.Robot className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-heading font-black text-slate-900 leading-none">SmartWarehouse</h1>
                  <p className="text-[9px] text-brand-600 font-bold uppercase tracking-wider mt-0.5">Hệ Thống Trung Tâm</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm transition-colors border border-slate-200 cursor-pointer"
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
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border ${isActive
                        ? 'bg-gradient-to-r from-brand-50 to-brand-100/20 text-brand-700 border-brand-100/50 font-bold'
                        : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span className={isActive ? 'text-brand-650' : 'text-slate-400'}>{item.icon}</span>
                    <span className="text-sm font-semibold">{item.label}</span>
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

              <Link
                to="/"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full mb-2.5 py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-brand-650 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
              >
                🏠 Cổng Nhân Viên
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-50 text-red-650 rounded-xl text-sm font-bold border border-red-200/30 cursor-pointer"
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
        <header className="flex md:hidden items-center justify-between h-16 bg-white border-b border-slate-200 px-6 shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
              <Icons.Robot className="w-4 h-4" />
            </div>
            <h1 className="text-base font-heading font-black text-slate-900">SmartWarehouse</h1>
          </div>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
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
