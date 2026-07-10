import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrdersPage } from '../OrdersPage';

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      CartOrder: mockIcon('cartorder'),
      Refresh: mockIcon('refresh'),
      Spinner: ({ className }: { className?: string }) => (
        <span data-testid="icon-spinner" className={className}>Spinner</span>
      ),
      Search: mockIcon('search'),
      AlertWarning: mockIcon('alert-warning'),
      ChevronLeft: mockIcon('chevron-left'),
      ChevronRight: mockIcon('chevron-right'),
      Warehouse: mockIcon('warehouse'),
      Dashboard: mockIcon('dashboard'),
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
      Product: mockIcon('product'),
      Truck: mockIcon('truck'),
      StockBox: mockIcon('stockbox'),
      AnalyticsReport: mockIcon('analytics-report'),
      Robot: mockIcon('robot'),
    },
  };
});

vi.mock('@/services', () => ({
  orderService: {
    getPendingOrders: vi.fn(),
    confirmOrder: vi.fn(),
    refundOrder: vi.fn(),
  },
}));

import { orderService } from '@/services';

const renderOrdersPage = () => {
  render(<OrdersPage />);
};

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(orderService.getPendingOrders).mockResolvedValue([]);
  });

  it('shows loading state while fetching', () => {
    vi.mocked(orderService.getPendingOrders).mockImplementation(
      () => new Promise(() => {})
    );
    renderOrdersPage();
    expect(screen.getByText('Đang tải danh sách đơn hàng chờ duyệt...')).toBeInTheDocument();
  });

  it('renders page heading "Quản lý đơn hàng chờ duyệt"', async () => {
    renderOrdersPage();
    await waitFor(() => {
      expect(screen.getByText('Quản lý đơn hàng chờ duyệt')).toBeInTheDocument();
    });
  });

  it('renders search input "Tìm kiếm mã đơn hoặc trạm nhận..."', async () => {
    renderOrdersPage();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tìm kiếm mã đơn hoặc trạm nhận...')).toBeInTheDocument();
    });
  });

  it('renders "Làm mới" (refresh) button', async () => {
    renderOrdersPage();
    await waitFor(() => {
      expect(screen.getByText('Làm mới')).toBeInTheDocument();
    });
  });

  it('renders order cards after data loads', async () => {
    const mockOrders = [
      {
        id: 'ORD-001',
        createdAt: '2025-06-15T10:00:00Z',
        totalAmount: 55000,
        deliveryNodeId: 'ST01',
        items: [
          { productId: 'p1', quantity: 2, price: 15000 },
          { productId: 'p2', quantity: 1, price: 25000 },
        ],
      },
      {
        id: 'ORD-002',
        createdAt: '2025-06-15T11:00:00Z',
        totalAmount: 10000,
        deliveryNodeId: 'ST02',
        items: [{ productId: 'p3', quantity: 1, price: 10000 }],
      },
    ];
    vi.mocked(orderService.getPendingOrders).mockResolvedValue(mockOrders);
    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
    });
  });

  it('renders "Duyệt & Gọi Robot" and "Hủy đơn" action buttons', async () => {
    const mockOrders = [
      {
        id: 'ORD-001',
        createdAt: '2025-06-15T10:00:00Z',
        totalAmount: 55000,
        deliveryNodeId: 'ST01',
        items: [{ productId: 'p1', quantity: 1, price: 55000 }],
      },
    ];
    vi.mocked(orderService.getPendingOrders).mockResolvedValue(mockOrders);
    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText('Duyệt & Gọi Robot')).toBeInTheDocument();
    });
    expect(screen.getByText('Hủy đơn')).toBeInTheDocument();
  });

  it('shows empty state when no orders', async () => {
    vi.mocked(orderService.getPendingOrders).mockResolvedValue([]);
    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText('Hiện không có đơn hàng nào chờ duyệt trong hệ thống')).toBeInTheDocument();
    });
  });

  it('filters orders on search input', async () => {
    const user = userEvent.setup();
    const mockOrders = [
      {
        id: 'ORD-ABC-001',
        createdAt: '2025-06-15T10:00:00Z',
        totalAmount: 55000,
        deliveryNodeId: 'ST01',
        items: [{ productId: 'p1', quantity: 1, price: 55000 }],
      },
      {
        id: 'ORD-XYZ-002',
        createdAt: '2025-06-15T11:00:00Z',
        totalAmount: 10000,
        deliveryNodeId: 'ST02',
        items: [{ productId: 'p3', quantity: 1, price: 10000 }],
      },
    ];
    vi.mocked(orderService.getPendingOrders).mockResolvedValue(mockOrders);
    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText('ORD-ABC-001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm kiếm mã đơn hoặc trạm nhận...');
    await user.type(searchInput, 'XYZ');

    expect(screen.getByText('ORD-XYZ-002')).toBeInTheDocument();
    expect(screen.queryByText('ORD-ABC-001')).not.toBeInTheDocument();
  });

  it('renders pagination controls with prev and next buttons', async () => {
    const mockOrders = Array.from({ length: 12 }, (_, i) => ({
      id: `ORD-${String(i + 1).padStart(3, '0')}`,
      createdAt: '2025-06-15T10:00:00Z',
      totalAmount: 10000,
      deliveryNodeId: 'ST01',
      items: [{ productId: 'p1', quantity: 1, price: 10000 }],
    }));
    vi.mocked(orderService.getPendingOrders).mockResolvedValue(mockOrders);
    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByTestId('icon-chevron-left')).toBeInTheDocument();
    });

    const prevButton = screen.getByTestId('icon-chevron-left').closest('button')!;
    const nextButton = screen.getByTestId('icon-chevron-right').closest('button')!;
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('next pagination button is disabled on last page', async () => {
    // Use 6 orders to get 2 pages (itemsPerPage=5), then navigate to page 2 (last)
    const mockOrders = Array.from({ length: 6 }, (_, i) => ({
      id: `ORD-${String(i + 1).padStart(3, '0')}`,
      createdAt: '2025-06-15T10:00:00Z',
      totalAmount: 10000,
      deliveryNodeId: 'ST01',
      items: [{ productId: 'p1', quantity: 1, price: 10000 }],
    }));
    vi.mocked(orderService.getPendingOrders).mockResolvedValue(mockOrders);
    renderOrdersPage();

    // Page 1 shows ORD-001 through ORD-005
    await waitFor(() => {
      expect(screen.getByText('ORD-005')).toBeInTheDocument();
    });

    // Click page 2 to go to last page
    const page2Button = screen.getByText('2');
    const user = userEvent.setup();
    await user.click(page2Button);

    await waitFor(() => {
      expect(screen.getByText('ORD-006')).toBeInTheDocument();
    });

    const nextButton = screen.getByTestId('icon-chevron-right').closest('button')!;
    expect(nextButton).toBeDisabled();
  });

  it('prev pagination button is disabled on first page', async () => {
    // Use 6 orders to get 2 pages (itemsPerPage=5); prev button should be disabled on page 1
    const mockOrders = Array.from({ length: 6 }, (_, i) => ({
      id: `ORD-${String(i + 1).padStart(3, '0')}`,
      createdAt: '2025-06-15T10:00:00Z',
      totalAmount: 10000,
      deliveryNodeId: 'ST01',
      items: [{ productId: 'p1', quantity: 1, price: 10000 }],
    }));
    vi.mocked(orderService.getPendingOrders).mockResolvedValue(mockOrders);
    renderOrdersPage();

    // Page 1 shows ORD-001 through ORD-005; pagination is visible
    await waitFor(() => {
      expect(screen.getByText('ORD-005')).toBeInTheDocument();
    });

    const prevButton = screen.getByTestId('icon-chevron-left').closest('button')!;
    expect(prevButton).toBeDisabled();
  });

  it('calls confirmOrder when "Duyệt & Gọi Robot" is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(orderService.confirmOrder).mockResolvedValue({} as never);
    const mockOrders = [
      {
        id: 'ORD-001',
        createdAt: '2025-06-15T10:00:00Z',
        totalAmount: 55000,
        deliveryNodeId: 'ST01',
        items: [{ productId: 'p1', quantity: 1, price: 55000 }],
      },
    ];
    vi.mocked(orderService.getPendingOrders).mockResolvedValue(mockOrders);
    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText('Duyệt & Gọi Robot')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Duyệt & Gọi Robot'));
    expect(orderService.confirmOrder).toHaveBeenCalledWith('ORD-001');
  });

  it('calls refundOrder when cancel confirmation is submitted', async () => {
    vi.mocked(orderService.refundOrder).mockResolvedValue({} as never);
    const mockOrders = [
      {
        id: 'ORD-001',
        createdAt: '2025-06-15T10:00:00Z',
        totalAmount: 55000,
        deliveryNodeId: 'ST01',
        items: [{ productId: 'p1', quantity: 1, price: 55000 }],
      },
    ];
    vi.mocked(orderService.getPendingOrders).mockResolvedValue(mockOrders);
    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText('Hủy đơn')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Hủy đơn'));

    await waitFor(() => {
      expect(screen.getByText('Xác nhận hủy')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Xác nhận hủy'));
    expect(orderService.refundOrder).toHaveBeenCalledWith('ORD-001');
  });
});
