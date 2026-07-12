/** @vitest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Mock all lazy pages to avoid loading actual page bundles
vi.mock('../pages/auth/LoginPage', () => ({ LoginPage: () => <div data-testid="login-page">Login Page</div> }));
vi.mock('../pages/auth/RegisterPage', () => ({ RegisterPage: () => <div>Register Page</div> }));
vi.mock('../pages/auth/ForgotPasswordPage', () => ({ ForgotPasswordPage: () => <div>Forgot Password Page</div> }));
vi.mock('../pages/auth/ResetPasswordPage', () => ({ ResetPasswordPage: () => <div>Reset Password Page</div> }));
vi.mock('../pages/auth/StoreRegistrationPage', () => ({ StoreRegistrationPage: () => <div>Store Registration Page</div> }));
vi.mock('../pages/admin/StoreRegistrationsPage', () => ({ StoreRegistrationsPage: () => <div>Store Registrations Page</div> }));
vi.mock('../pages/admin/StoresPage', () => ({ StoresPage: () => <div>Stores Page</div> }));

vi.mock('../pages/admin/DashboardPage', () => ({ DashboardPage: () => <div data-testid="dashboard-page">Dashboard Page</div> }));
vi.mock('../pages/admin/InventoryPage', () => ({ InventoryPage: () => <div>Inventory Page</div> }));
vi.mock('../pages/admin/ProductsPage', () => ({ ProductsPage: () => <div>Products Page</div> }));
vi.mock('../pages/admin/OrdersPage', () => ({ OrdersPage: () => <div>Orders Page</div> }));
vi.mock('../pages/admin/UsersPage', () => ({ UsersPage: () => <div>Users Page</div> }));
vi.mock('../pages/admin/ComplaintsPage', () => ({ ComplaintsPage: () => <div>Complaints Page</div> }));
vi.mock('../pages/admin/ReportsPage', () => ({ ReportsPage: () => <div>Reports Page</div> }));

vi.mock('../pages/stock/WarehousesPage', () => ({ WarehousesPage: () => <div>Warehouses Page</div> }));
vi.mock('../pages/stock/StockLevelsPage', () => ({ StockLevelsPage: () => <div>Stock Levels Page</div> }));
vi.mock('../pages/stock/StockMovementsPage', () => ({ StockMovementsPage: () => <div>Stock Movements Page</div> }));
vi.mock('../pages/stock/StockAdjustmentsPage', () => ({ StockAdjustmentsPage: () => <div>Stock Adjustments Page</div> }));

vi.mock('../pages/search/SearchPage', () => ({ SearchPage: () => <div>Search Page</div> }));
vi.mock('../pages/NotificationsPage', () => ({ NotificationsPage: () => <div>Notifications Page</div> }));
vi.mock('../pages/admin/FileManagementPage', () => ({ FileManagementPage: () => <div>File Management Page</div> }));
vi.mock('../pages/PromotionsPage', () => ({ PromotionsPage: () => <div>Promotions Page</div> }));
vi.mock('../pages/RobotManagementPage', () => ({ RobotManagementPage: () => <div>Robot Management Page</div> }));
vi.mock('../pages/WalletPage', () => ({ WalletPage: () => <div>Wallet Page</div> }));
vi.mock('../pages/ProfilePage', () => ({ ProfilePage: () => <div>Profile Page</div> }));
vi.mock('../pages/MetricsPage', () => ({ MetricsPage: () => <div>Metrics Page</div> }));
vi.mock('../pages/AuditLogsPage', () => ({ AuditLogsPage: () => <div>Audit Logs Page</div> }));
vi.mock('../pages/admin/SchedulerPage', () => ({ SchedulerPage: () => <div>Scheduler Page</div> }));
vi.mock('../pages/admin/TransfersPage', () => ({ TransfersPage: () => <div>Transfers Page</div> }));
vi.mock('../pages/admin/RobotMonitorPage', () => ({ RobotMonitorPage: () => <div>Robot Monitor Page</div> }));

// Mock components used in App
vi.mock('../components/AdminLayout', () => ({
  AdminLayout: () => (
    <div data-testid="admin-layout">
      Admin Layout
    </div>
  ),
}));

vi.mock('../components/Icons', () => {
  const MockIcon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} className={props.className} />;
  return {
    Icons: {
      Robot: MockIcon('robot'),
    },
  };
});

describe('App', () => {
  beforeEach(() => {
    window.history.pushState(null, '', '/');
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('redirects to /login when not authenticated', async () => {
    render(<App />);

    // Wait for route loading/Suspense to resolve
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('renders admin layout when authenticated with valid role', async () => {
    localStorage.setItem('authToken', 'valid-token');
    localStorage.setItem('user', JSON.stringify({ role: 'Admin' }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    });
  });

  it('redirects to /unauthorized when user lacks correct role', async () => {
    localStorage.setItem('authToken', 'valid-token');
    localStorage.setItem('user', JSON.stringify({ role: 'GuestUser' }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument();
    });

    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const backBtn = screen.getByText('Quay lại trang trước');
    backBtn.click();
    expect(backSpy).toHaveBeenCalled();
  });
});
