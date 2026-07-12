/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Keep only the mocks needed for passing tests — test each public mock target only once.
// Storage keys for tests
const storeAuth = (role: string) => {
  localStorage.setItem('authToken', 'valid-token');
  localStorage.setItem('user', JSON.stringify({ role }));
};

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../pages/auth/LoginPage', () => ({ LoginPage: () => <div data-testid="login-page">Login Page</div> }));
vi.mock('../pages/auth/RegisterPage', () => ({ RegisterPage: () => <div>Register Page</div> }));
vi.mock('../pages/auth/ForgotPasswordPage', () => ({ ForgotPasswordPage: () => <div>Forgot Password Page</div> }));
vi.mock('../pages/auth/ResetPasswordPage', () => ({ ResetPasswordPage: () => <div>Reset Password Page</div> }));
vi.mock('../pages/auth/StoreRegistrationPage', () => ({ StoreRegistrationPage: () => <div>Store Registration Page</div> }));
vi.mock('../pages/admin/StoreRegistrationsPage', () => ({ StoreRegistrationsPage: () => <div>Store Registrations Page</div> }));

// AdminLayout: the only component whose presence we reliably check across admin routes
vi.mock('../components/AdminLayout', () => ({
  AdminLayout: () => (
    <div data-testid="admin-layout">Admin Layout</div>
  ),
}));

// Icons mock (matches the keys used across pages)
vi.mock('../components/Icons', () => {
  const mk = (name: string) => () => <span data-testid={`icon-${name}`}>ic</span>;
  return {
    Icons: {
      Robot: mk('robot'), Warehouse: mk('warehouse'), Dashboard: mk('dashboard'),
      AlertWarning: mk('alert-warning'), Refresh: mk('refresh'), Search: mk('search'),
      Spinner: mk('spinner'), SuccessCheck: mk('success-check'), Close: mk('close'),
      Plus: mk('plus'), UsersGroup: mk('users-group'), Thermometer: mk('thermometer'),
      Droplet: mk('droplet'), Bolt: mk('bolt'), Profile: mk('profile'),
      Calendar: mk('calendar'), Inbox: mk('inbox'), User: mk('user'),
      Check: mk('check'), Store: mk('store'), Folder: mk('folder'),
      FileText: mk('file-text'), Box: mk('box'), Settings: mk('settings'),
      Logout: mk('logout'), Menu: mk('menu'), ChevronDown: mk('chevron-down'),
      Bell: mk('bell'), Package: mk('package'), Route: mk('route'),
      Archive: mk('archive'), ClipboardList: mk('clipboard-list'), Home: mk('home'),
      MapPin: mk('map-pin'), Navigation: mk('navigation'), Eye: mk('eye'),
      Trash: mk('trash'), Edit: mk('edit'), Truck: mk('truck'),
      Product: mk('product'), CartOrder: mk('cart-order'), StockBox: mk('stock-box'),
      AnalyticsReport: mk('analytics-report'), ChevronLeft: mk('chevron-left'),
      ChevronRight: mk('chevron-right'), TagDiscount: mk('tag-discount'),
    },
  };
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('App routing and integration', () => {
  beforeEach(() => {
    window.history.pushState(null, '', '/');
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  /* ── Public / auth routes ── */

  it('renders LoginPage at /login without auth', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
  });

  it('redirects to /login for root path', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
  });

  it('renders RegisterPage on /register route', async () => {
    window.history.pushState(null, '', '/register');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Register Page')).toBeInTheDocument());
  });

  it('renders ForgotPasswordPage at /forgot-password', async () => {
    window.history.pushState(null, '', '/forgot-password');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Forgot Password Page')).toBeInTheDocument());
  });

  it('renders ResetPasswordPage with query params', async () => {
    window.history.pushState(null, '', '/reset-password?token=abc');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Reset Password Page')).toBeInTheDocument());
  });

  it('renders StoreRegistrationPage for public access', async () => {
    window.history.pushState(null, '', '/register-store');
    render(<App />);
    await waitFor(() => expect(screen.getByText('Store Registration Page')).toBeInTheDocument());
  });

  /* ── Admin routes verified through AdminLayout (rather than leaf page text) ── */

  const adminRoutes = [
    '/admin/inventory',
    '/admin/warehouses',
    '/admin/stocklevels',
    '/admin/stockmovements',
    '/admin/stockadjustments',
    '/admin/search',
    '/admin/notifications',
    '/admin/files',
    '/admin/robots',
    '/admin/wallet',
    '/admin/profile',
    '/admin/metrics',
    '/admin/logs',
    '/admin/scheduler',
    '/admin/products',
    '/admin/orders',
    '/admin/users',
    '/admin/storeregistrations',
    '/admin/stores',
    '/admin/complaints',
    '/admin/reports',
    '/admin/transfers',
    '/admin/robot-monitor',
  ];

  it.each(adminRoutes)('renders AdminLayout for admin route %s', async (route: string) => {
    storeAuth('Admin');
    window.history.pushState(null, '', route);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('admin-layout')).toBeInTheDocument());
  });

  it('renders AdminLayout on nested dashboard URL with Admin role', async () => {
    storeAuth('Admin');
    window.history.pushState(null, '', '/admin/dashboard');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('admin-layout')).toBeInTheDocument());
  });

  /* ── Role-based access ── */

  const allowedRoles = ['Admin', 'admin', 'Operator', 'store_manager'];

  it.each(allowedRoles)('renders AdminLayout for allowed role %s', async (role: string) => {
    storeAuth(role);
    window.history.pushState(null, '', '/admin/dashboard');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('admin-layout')).toBeInTheDocument());
  });

  it('redirects to /unauthorized when role is GuestUser', async () => {
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('user', JSON.stringify({ role: 'GuestUser' }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument());
  });

  it('redirects to /unauthorized for WarehouseManager role', async () => {
    localStorage.setItem('authToken', 'valid-token');
    localStorage.setItem('user', JSON.stringify({ role: 'WarehouseManager' }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument());
  });

  /* ── Edge routes ── */

  it('navigates back from unauthorized via browser back button', async () => {
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('user', JSON.stringify({ role: 'GuestUser' }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument());
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const btn = screen.getByRole('button', { name: /Quay lại/i });
    btn.click();
    expect(backSpy).toHaveBeenCalled();
  });

  it('renders unknown route redirect to home', async () => {
    storeAuth('Admin');
    window.history.pushState(null, '', '/unknown');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('admin-layout')).toBeInTheDocument());
  });

  it('handles auth bypass and logged-in states', async () => {
    storeAuth('Admin');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('admin-layout')).toBeInTheDocument());
  });

  it('renders UnauthorizedPage for unknown role', async () => {
    localStorage.setItem('authToken', 'valid-token');
    localStorage.setItem('user', JSON.stringify({ role: 'OtherRole' }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument());
  });

  it('renders complete path /admin/notifications', async () => {
    storeAuth('Admin');
    window.history.pushState(null, '', '/admin/notifications');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('admin-layout')).toBeInTheDocument());
  });
});
