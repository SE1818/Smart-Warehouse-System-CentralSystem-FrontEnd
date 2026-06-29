import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const StoreRegistrationPage = lazy(() => import('./pages/auth/StoreRegistrationPage').then(m => ({ default: m.StoreRegistrationPage })));
const StoreRegistrationsPage = lazy(() => import('./pages/admin/StoreRegistrationsPage').then(m => ({ default: m.StoreRegistrationsPage })));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AdminInventory = lazy(() => import('./pages/admin/InventoryPage').then(m => ({ default: m.InventoryPage })));
const AdminProducts = lazy(() => import('./pages/admin/ProductsPage').then(m => ({ default: m.ProductsPage })));
const AdminOrders = lazy(() => import('./pages/admin/OrdersPage').then(m => ({ default: m.OrdersPage })));
const AdminUsers = lazy(() => import('./pages/admin/UsersPage').then(m => ({ default: m.UsersPage })));
const AdminComplaints = lazy(() => import('./pages/admin/ComplaintsPage').then(m => ({ default: m.ComplaintsPage })));
const AdminReports = lazy(() => import('./pages/admin/ReportsPage').then(m => ({ default: m.ReportsPage })));

// Stock pages
const WarehousesPage = lazy(() => import('./pages/stock/WarehousesPage').then(m => ({ default: m.WarehousesPage })));
const StockLevelsPage = lazy(() => import('./pages/stock/StockLevelsPage').then(m => ({ default: m.StockLevelsPage })));
const StockMovementsPage = lazy(() => import('./pages/stock/StockMovementsPage').then(m => ({ default: m.StockMovementsPage })));
const StockAdjustmentsPage = lazy(() => import('./pages/stock/StockAdjustmentsPage').then(m => ({ default: m.StockAdjustmentsPage })));

// Other pages
const SearchPage = lazy(() => import('./pages/search/SearchPage').then(m => ({ default: m.SearchPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const FileManagementPage = lazy(() => import('./pages/admin/FileManagementPage').then(m => ({ default: m.FileManagementPage })));
const PromotionsPage = lazy(() => import('./pages/PromotionsPage').then(m => ({ default: m.PromotionsPage })));
const RobotManagementPage = lazy(() => import('./pages/RobotManagementPage').then(m => ({ default: m.RobotManagementPage })));
const WalletPage = lazy(() => import('./pages/WalletPage').then(m => ({ default: m.WalletPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const MetricsPage = lazy(() => import('./pages/MetricsPage').then(m => ({ default: m.MetricsPage })));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const SchedulerPage = lazy(() => import('./pages/admin/SchedulerPage').then(m => ({ default: m.SchedulerPage })));

function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4 text-slate-800">
      <span className="text-6xl">🚫</span>
      <h1 className="text-2xl font-heading font-bold text-slate-900">Không có quyền truy cập</h1>
      <p className="text-slate-500 max-w-sm">Tài khoản của bạn không được phân quyền để xem trang này.</p>
      <button 
        onClick={() => window.history.back()}
        className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold transition-all active:scale-98 shadow-md shadow-brand-500/10"
      >
        Quay lại trang trước
      </button>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-800">
          <div className="w-10 h-10 border-4 border-slate-300 border-t-brand-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 text-sm font-semibold">Đang tải trang...</p>
        </div>
      }>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register-store" element={<StoreRegistrationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Redirect Root to Admin */}
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Operator', 'Admin', 'Warehouse_Admin', 'warehouse_manager', 'store_manager']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="warehouses" element={<WarehousesPage />} />
            <Route path="stocklevels" element={<StockLevelsPage />} />
            <Route path="stockmovements" element={<StockMovementsPage />} />
            <Route path="stockadjustments" element={<StockAdjustmentsPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="files" element={<FileManagementPage />} />
            <Route path="promotions" element={<PromotionsPage />} />
            <Route path="robots" element={<RobotManagementPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="logs" element={<AuditLogsPage />} />
            <Route path="scheduler" element={<SchedulerPage />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="storeregistrations" element={<StoreRegistrationsPage />} />
            <Route path="complaints" element={<AdminComplaints />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;