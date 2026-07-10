import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';

// Mock services used by DashboardPage
vi.mock('@/services', () => ({
  productService: {
    getProducts: vi.fn(),
  },
  orderService: {
    getPendingOrders: vi.fn(),
  },
  stockService: {
    getStockLevels: vi.fn(),
  },
  transferService: {
    getTransferStats: vi.fn(),
  },
  metricsService: {
    getMetrics: vi.fn(),
  },
}));

// Mock signalR to avoid WebSocket connection attempts
// HubConnectionBuilder is called as `new signalR.HubConnectionBuilder()` so it must be a constructor
vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: function HubConnectionBuilder() {
    return {
      withUrl: () => ({
        withAutomaticReconnect: () => ({
          build: () => ({
            start: () => Promise.reject(new Error('SignalR not available in test')),
            on: () => {},
            stop: () => Promise.resolve(),
          }),
        }),
      }),
    };
  },
}));

// Mock Icons component
vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      Dashboard: mockIcon('dashboard'),
      Refresh: mockIcon('refresh'),
      Spinner: ({ className }: { className?: string }) => (
        <span data-testid="icon-spinner" className={className}>Spinner</span>
      ),
      Product: mockIcon('product'),
      CartOrder: mockIcon('cartorder'),
      Robot: mockIcon('robot'),
      Truck: mockIcon('truck'),
      StockBox: mockIcon('stockbox'),
      AnalyticsReport: mockIcon('analytics-report'),
      Warehouse: mockIcon('warehouse'),
      ChevronLeft: mockIcon('chevron-left'),
      ChevronRight: mockIcon('chevron-right'),
      Search: mockIcon('search'),
      AlertWarning: mockIcon('alert-warning'),
      Plus: mockIcon('plus'),
      UsersGroup: mockIcon('users-group'),
      Thermometer: mockIcon('thermometer'),
      Droplet: mockIcon('droplet'),
      Bolt: mockIcon('bolt'),
      Profile: mockIcon('profile'),
      Close: mockIcon('close'),
      Calendar: mockIcon('calendar'),
      Inbox: mockIcon('inbox'),
      SuccessCheck: mockIcon('success-check'),
      User: mockIcon('user'),
      Check: mockIcon('check'),
      Store: mockIcon('store'),
      Folder: mockIcon('folder'),
    },
  };
});

import { productService, orderService, stockService, transferService } from '@/services';

const renderDashboardPage = () => {
  render(<BrowserRouter><DashboardPage /></BrowserRouter>);
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productService.getProducts).mockResolvedValue([]);
    vi.mocked(orderService.getPendingOrders).mockResolvedValue([]);
    vi.mocked(stockService.getStockLevels).mockResolvedValue([]);
    vi.mocked(transferService.getTransferStats).mockResolvedValue({ active: 0 });
  });

  it('renders page title "Bảng điều khiển quản lý"', () => {
    renderDashboardPage();
    expect(screen.getByText('Bảng điều khiển quản lý')).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    vi.mocked(productService.getProducts).mockImplementation(
      () => new Promise(() => {})
    );
    renderDashboardPage();
    expect(screen.getByText('Đang tải bảng điều khiển...')).toBeInTheDocument();
  });

  it('renders stat cards after data loads', async () => {
    vi.mocked(productService.getProducts).mockResolvedValue([
      { id: '1', name: 'Test', category: 'Đồ uống', price: 10000, stockQuantity: 50, description: '', unit: 'lon', createdAt: '', updatedAt: '' },
    ]);
    vi.mocked(orderService.getPendingOrders).mockResolvedValue([
      { id: 'ORD-1', createdAt: '2025-01-01T00:00:00Z', totalAmount: 50000, deliveryNodeId: 'ST01' },
    ]);
    vi.mocked(stockService.getStockLevels).mockResolvedValue([{ productId: '1', quantity: 50 }]);
    vi.mocked(transferService.getTransferStats).mockResolvedValue({ active: 2 });

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Sản phẩm trong kho')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Đơn hàng chờ duyệt')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Vận chuyển đang chạy')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Tổng số lượng tồn kho')).toBeInTheDocument();
    });
  });

  it('renders activity table rows after data loads', async () => {
    vi.mocked(productService.getProducts).mockResolvedValue([]);
    vi.mocked(orderService.getPendingOrders).mockResolvedValue([
      { id: 'ORD-999', createdAt: '2025-06-15T10:30:00Z', totalAmount: 75000, deliveryNodeId: 'ST03' },
    ]);
    vi.mocked(stockService.getStockLevels).mockResolvedValue([]);
    vi.mocked(transferService.getTransferStats).mockResolvedValue({ active: 0 });

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Đơn hàng mới đặt chờ duyệt')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('ORD-999')).toBeInTheDocument();
    });
  });

  it('shows empty state when no recent orders', async () => {
    vi.mocked(productService.getProducts).mockResolvedValue([]);
    vi.mocked(orderService.getPendingOrders).mockResolvedValue([]);
    vi.mocked(stockService.getStockLevels).mockResolvedValue([]);
    vi.mocked(transferService.getTransferStats).mockResolvedValue({ active: 0 });

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Không có đơn đặt hàng nào gần đây')).toBeInTheDocument();
    });
  });

  it('calls loadDashboardData when refresh button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(productService.getProducts).mockResolvedValue([]);
    vi.mocked(orderService.getPendingOrders).mockResolvedValue([]);
    vi.mocked(stockService.getStockLevels).mockResolvedValue([]);
    vi.mocked(transferService.getTransferStats).mockResolvedValue({ active: 0 });

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.queryByText('Đang tải bảng điều khiển...')).not.toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Làm mới');
    await user.click(refreshButton);

    expect(productService.getProducts).toHaveBeenCalled();
  });
});
