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
vi.mock('../pages/AdminTechnicalPage', () => ({ AdminTechnicalPage: () => <div data-testid="technical-page">Technical Page</div> }));
vi.mock('../pages/StaffKdsPage', () => ({ StaffKdsPage: () => <div data-testid="staff-page">Staff Page</div> }));
vi.mock('../pages/technical/StoreEdgeSetupPage', () => ({ StoreEdgeSetupPage: () => <div data-testid="edge-setup-page">Store Edge Setup Page</div> }));
vi.mock('../pages/technical/RobotMonitorPage', () => ({ RobotMonitorPage: () => <div data-testid="robot-monitor-page">Robot Monitor Page</div> }));

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

  /* ── Technical Engineer & Staff KDS routes ── */

  it('renders AdminTechnicalPage on /technical', async () => {
    window.history.pushState(null, '', '/technical');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('technical-page')).toBeInTheDocument());
  });

  it('renders StaffKdsPage on /staff', async () => {
    window.history.pushState(null, '', '/staff');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('staff-page')).toBeInTheDocument());
  });

  it('renders StoreEdgeSetupPage on /edge-setup', async () => {
    window.history.pushState(null, '', '/edge-setup');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('edge-setup-page')).toBeInTheDocument());
  });

  it('renders RobotMonitorPage on /robot-monitor', async () => {
    window.history.pushState(null, '', '/robot-monitor');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('robot-monitor-page')).toBeInTheDocument());
  });

  /* ── Admin route redirects to /technical ── */

  it('redirects /admin to /technical', async () => {
    window.history.pushState(null, '', '/admin');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('technical-page')).toBeInTheDocument());
  });

  it('redirects /admin/dashboard to /technical', async () => {
    window.history.pushState(null, '', '/admin/dashboard');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('technical-page')).toBeInTheDocument());
  });

  /* ── Fallback ── */

  it('redirects unknown route to home / login', async () => {
    window.history.pushState(null, '', '/unknown');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('login-page')).toBeInTheDocument());
  });
});
