import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from './Icons';
import { useNotificationStore } from '../stores/notificationStore';
import { useRobotStore } from '../stores/robotStore';

// Route → module mapping for hover prefetch
const ROUTE_MODULES: Record<string, string> = {
  '/admin/dashboard': 'src/pages/admin/DashboardPage',
    '/admin/products': 'src/pages/admin/ProductsPage',
  '/admin/orders': 'src/pages/admin/OrdersPage',
  '/admin/promotions': 'src/pages/PromotionsPage',
  '/admin/reports': 'src/pages/admin/ReportsPage',
  '/admin/wallet': 'src/pages/WalletPage',
  '/admin/settlement': 'src/pages/admin/SettlementPage',
  '/admin/robots': 'src/pages/RobotManagementPage',
  '/admin/transfers': 'src/pages/admin/TransfersPage',
  '/admin/robot-monitor': 'src/pages/admin/RobotMonitorPage',
  '/admin/scheduler': 'src/pages/admin/SchedulerPage',
  '/admin/metrics': 'src/pages/MetricsPage',
  '/admin/search': 'src/pages/search/SearchPage',
  '/admin/users': 'src/pages/admin/UsersPage',
  '/admin/storeregistrations': 'src/pages/admin/StoreRegistrationsPage',
  '/admin/stores': 'src/pages/admin/StoresPage',
  '/admin/notifications': 'src/pages/NotificationsPage',
  '/admin/complaints': 'src/pages/admin/ComplaintsPage',
  '/admin/files': 'src/pages/admin/FileManagementPage',
  '/admin/logs': 'src/pages/AuditLogsPage',
  '/admin/profile': 'src/pages/ProfilePage',
};

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Track already-prefetched routes to avoid duplicate dynamic imports
  const prefetchedRef = useRef<Set<string>>(new Set());

  // Hover prefetch: dynamically import the target route module so the browser
  // has the chunk ready by the time the user clicks.
  const handleLinkHover = useCallback((path: string) => {
    const modulePath = ROUTE_MODULES[path];
    if (modulePath && !prefetchedRef.current.has(path)) {
      prefetchedRef.current.add(path);
      import(/* @vite-ignore */ modulePath).catch(() => {
        // Swallow prefetch errors - the real import will happen on navigation
        prefetchedRef.current.delete(path);
      });
    }
  }, []);

  // Retrieve user info once on mount
  const [user] = useState(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : { name: 'Quản trị viên', email: 'admin@smartwarehouse.com', role: 'admin' };
  });

  const userId = user?.id;

  const { connect, disconnect, status } = useNotificationStore();
  const { status: robotStatus } = useRobotStore();

  // Connection-loss banner: shown when BOTH hubs are disconnected
  const bothDisconnected = status === 'disconnected' && robotStatus === 'disconnected';

  useEffect(() => {
    if (!userId) return;
    connect(userId);
    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  const isStoreManager = user?.role === 'store_manager';

  const rawNavGroups = [
  {
    label: 'Tổng quan',
    items: [
      { path: '/admin/dashboard', label: 'Bảng điều khiển', icon: <Icons.Dashboard className="w-5 h-5" />, visible: true },
          ],
  },
  {
    label: 'Kho hàng',
    items: [
      { path: '/admin/products', label: 'Quản lý sản phẩm', icon: <Icons.Product className="w-5 h-5" />, visible: true },
    ],
  },
  {
    label: 'Kinh doanh',
    items: [
      { path: '/admin/orders', label: 'Quản lý đơn hàng', icon: <Icons.CartOrder className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/promotions', label: 'Khuyến mãi', icon: <Icons.TagDiscount className="w-5 h-5" />, visible: true },
      { path: '/admin/reports', label: 'Báo cáo doanh số', icon: <Icons.AnalyticsReport className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/wallet', label: 'Ví điện tử', icon: <Icons.Wallet className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/settlement', label: 'Đối soát & Payout', icon: <Icons.Wallet className="w-5 h-5" />, visible: !isStoreManager },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { path: '/admin/robots', label: 'Robot AMR', icon: <Icons.Robot className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/transfers', label: 'Chuyến vận chuyển', icon: <Icons.Truck className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/robot-monitor', label: 'AMR Monitor', icon: <Icons.Metrics className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/scheduler', label: 'Quản lý Scheduler', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ), visible: !isStoreManager },
      { path: '/admin/metrics', label: 'Giám sát môi trường', icon: <Icons.Metrics className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/search', label: 'Tìm kiếm & AI', icon: <Icons.Search className="w-5 h-5" />, visible: !isStoreManager },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { path: '/admin/users', label: 'Người dùng', icon: <Icons.UsersGroup className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/storeregistrations', label: 'Yêu cầu mở cửa hàng', icon: <Icons.Warehouse className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/stores', label: 'Cửa hàng', icon: <Icons.Store className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/notifications', label: 'Thông báo', icon: <Icons.Bell className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/complaints', label: 'Khiếu nại', icon: <Icons.AlertWarning className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/files', label: 'Quản lý File', icon: <Icons.Folder className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/logs', label: 'Nhật ký hoạt động', icon: <Icons.HistoryLogs className="w-5 h-5" />, visible: !isStoreManager },
      { path: '/admin/profile', label: 'Hồ sơ cá nhân', icon: <Icons.Profile className="w-5 h-5" />, visible: true },
    ],
  },
  ];

  const navGroups = rawNavGroups
  .map(g => ({
    ...g,
    items: g.items.filter(item => item.visible)
  }))
  .filter(g => g.items.length > 0);

  // Flatten for mobile (reuse same structure)
  const allNavItems = navGroups.flatMap(g => g.items);

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
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                status === 'connected' ? 'bg-emerald-500 animate-pulse' :
                status === 'connecting' ? 'bg-amber-500 animate-pulse' :
                'bg-rose-500'
              }`} />
              <span className="text-[10px] font-semibold text-slate-500">
                {status === 'connected' ? 'Hệ thống trực tuyến' :
                 status === 'connecting' ? 'Đang kết nối...' :
                 'Mất kết nối'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {navGroups.map((group, gi) => (
          <div key={group.label}>
            {/* Group separator + label */}
            {gi > 0 && <div className="mx-1 my-3 h-px bg-slate-100" />}
            <p className="px-3 mb-1.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.12em] select-none">
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onMouseEnter={() => handleLinkHover(item.path)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group border mb-0.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-50 to-brand-100/20 text-brand-700 border-brand-100/50 font-bold shadow-xs'
                      : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className={`transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                    isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-semibold truncate">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User profile & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl mb-3 hover:bg-slate-100/40 transition-all duration-150 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 border border-brand-300 text-brand-800 flex items-center justify-center font-bold font-heading text-lg shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-xs">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-bold text-slate-900 truncate text-sm leading-tight">{user.name}</h4>
            <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl text-sm font-bold transition-all border border-red-200/40 active:scale-98 shadow-xs cursor-pointer"
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

          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            {allNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-50 to-brand-100/20 text-brand-700 border-brand-100/50 font-bold'
                      : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className={isActive ? 'text-brand-600' : 'text-slate-400'}>{item.icon}</span>
                  <span className="text-sm font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 pt-4 mt-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 border border-brand-200 text-brand-800 flex items-center justify-center font-bold text-lg shrink-0">
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
              className="flex items-center justify-center gap-2 w-full mb-2.5 py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-brand-600 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
            >
              🏠 Cổng Nhân Viên
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200/30 cursor-pointer"
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
      {/* Connection-loss banner */}
      {bothDisconnected && (
        <div className="flex items-center gap-3 px-6 py-2.5 bg-rose-600 text-white text-sm font-semibold animate-pulse shrink-0">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>Mất kết nối với hệ thống thời gian thực — dữ liệu có thể không được cập nhật</span>
        </div>
      )}
      {/* Content Outlet */}
      <main className="flex-1 overflow-y-auto tech-grid bg-slate-50 text-slate-800">
        <Outlet />
      </main>
    </div>
  </div>
  );
}
