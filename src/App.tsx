import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  LoginPage,
  RegisterPage,
  AdminDashboard,
  AdminInventory,
  MetricsPage,
  AuditLogsPage,
  AdminProducts,
  AdminOrders,
  AdminUsers,
  AdminReports,
  WarehousesPage,
  StockLevelsPage,
  StockMovementsPage,
  StockAdjustmentsPage,
  SearchPage,
  NotificationsPage,
  FileManagementPage,
  PromotionsPage,
  RobotManagementPage,
  WalletPage,
  ProfilePage,
} from './pages';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

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
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Redirect Root to Admin */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['Operator', 'Admin', 'Warehouse_Admin', 'warehouse_manager']}>
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
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;