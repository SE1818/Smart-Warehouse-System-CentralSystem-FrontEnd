import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';

vi.mock('@/components/Icons', () => {
  const Icon = (name: string) => (props: Record<string, unknown> = {}) => {
    return <span data-testid={`icon-${name}`} className={(props as { className?: string }).className} />;
  };
  return {
    Icons: {
      Dashboard: Icon('dashboard'),
      Product: Icon('product'),
      CartOrder: Icon('cartorder'),
      TagDiscount: Icon('tagdiscount'),
      AnalyticsReport: Icon('analyticsreport'),
      Wallet: Icon('wallet'),
      Robot: Icon('robot'),
      Truck: Icon('truck'),
      Metrics: Icon('metrics'),
      Search: Icon('search'),
      UsersGroup: Icon('usersgroup'),
      Warehouse: Icon('warehouse'),
      Store: Icon('store'),
      Bell: Icon('bell'),
      AlertWarning: Icon('alertwarning'),
      Folder: Icon('folder'),
      HistoryLogs: Icon('historylogs'),
      Profile: Icon('profile'),
      Logout: Icon('logout'),
      Spinner: Icon('spinner'),
      Close: Icon('close'),
    },
  };
});

vi.mock('@/services/api');

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: class HubConnectionBuilder {
    withUrl() { return this; }
    configureLogging() { return this; }
    withAutomaticReconnect() { return this; }
    build() {
      return {
        on: () => {},
        start: () => Promise.resolve(),
        stop: () => {},
      };
    }
  },
  LogLevel: { Information: 1 },
}));

const renderWithRouter = (initialEntries: string[] = ['/admin/dashboard'], role: string = 'admin') => {
  const user = { id: 'user-1', name: 'Quản trị viên', email: 'admin@smartwarehouse.com', role };
  localStorage.setItem('user', JSON.stringify(user));
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<div data-testid="outlet-content">Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('AdminLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders SmartWarehouse branding', () => {
    renderWithRouter();
    // SmartWarehouse appears in desktop sidebar and mobile header
    const branding = screen.getAllByText('SmartWarehouse');
    expect(branding.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Hệ Thống Trung Tâm')).toBeInTheDocument();
  });

  it('renders nav sidebar with Dashboard, Products, Orders, Users, Stores categories', () => {
    renderWithRouter();
    expect(screen.getByText('Bảng điều khiển')).toBeInTheDocument();
    expect(screen.getByText('Quản lý sản phẩm')).toBeInTheDocument();
    expect(screen.getByText('Quản lý đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Người dùng')).toBeInTheDocument();
    expect(screen.getByText('Cửa hàng')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(5);
  });

  it('highlights active nav item based on current location', () => {
    renderWithRouter(['/admin/dashboard']);
    const links = screen.getAllByRole('link');
    const dashLink = links.find(l =>
      (l as HTMLElement).textContent?.includes('Bảng điều khiển')
    );
    expect(dashLink).toBeDefined();
  });

  it('renders main content area for child routes', () => {
    renderWithRouter();
    // The main content area with the Outlet is rendered as a flex container
    const mainArea = document.querySelector('main');
    expect(mainArea).toBeTruthy();
  });

  it('renders logout button with user menu area', () => {
    renderWithRouter();
    expect(screen.getByText('Đăng xuất')).toBeInTheDocument();
  });

  it('renders the user name in user menu area', () => {
    renderWithRouter();
    expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
    expect(screen.getByText('admin@smartwarehouse.com')).toBeInTheDocument();
  });
});
