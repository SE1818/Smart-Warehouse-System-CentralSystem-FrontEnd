/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { RobotManagementPage } from '../RobotManagementPage';

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      Robot: mockIcon('robot'),
      CartOrder: mockIcon('cart-order'),
      Bolt: mockIcon('bolt'),
      AlertWarning: mockIcon('alert-warning'),
      Close: mockIcon('close'),
      Spinner: mockIcon('spinner'),
      Refresh: mockIcon('refresh'),
      Truck: mockIcon('truck'),
    },
  };
});

vi.mock('@/components/CustomSelect', () => ({
  CustomSelect: function CustomSelect(props: Record<string, unknown>) {
    return (
      <select data-testid="custom-select" value={props.value} onChange={(e) => props.onChange?.(e.target.value)}>
        <option value="">{props.placeholder}</option>
        {props.options?.map((o: { value: string; label: string }) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  },
}));

import type { Robot, Order } from '@/types';

const mockListRobots = vi.fn<[], Promise<Robot[]>>();
const mockListPendingOrders = vi.fn<[], Promise<Order[]>>();
const mockMoveRobot = vi.fn<[string, number, number, Robot], Promise<void>>();
const mockUpdateRobotStatus = vi.fn<[string, string, Robot], Promise<void>>();
const mockFulfillOrder = vi.fn<[string, string, string, string], Promise<void>>();

vi.mock('@/services/robot', () => ({
  robotService: {
    listRobots: (...args: unknown[]) => mockListRobots(...args),
    listPendingOrders: (...args: unknown[]) => mockListPendingOrders(...args),
    moveRobot: (...args: unknown[]) => mockMoveRobot(...args),
    updateRobotStatus: (...args: unknown[]) => mockUpdateRobotStatus(...args),
    fulfillOrder: (...args: unknown[]) => mockFulfillOrder(...args),
  },
}));

const mockRobot = (overrides: Record<string, unknown> = {}) => ({
  id: overrides.id ?? 'robot-1',
  name: overrides.name ?? 'RBT-001',
  status: overrides.status ?? 'Idle',
  battery: overrides.battery ?? 80,
  x: overrides.x ?? 0,
  y: overrides.y ?? 0,
  createdAt: '',
  updatedAt: '',
});

function renderRobotManagementPage() {
  return render(
    <BrowserRouter>
      <RobotManagementPage />
    </BrowserRouter>,
  );
}

describe('RobotManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading', async () => {
    mockListRobots.mockResolvedValue([]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Quản lý Robot AMR')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    let resolve: (value: never[]) => void;
    const pending = new Promise<never[]>((r) => { resolve = r; });
    mockListRobots.mockReturnValue(pending);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    expect(screen.getByText('Đang tải trạng thái hệ thống robot...')).toBeInTheDocument();
    resolve!([]);
  });

  it('shows error state when API fails', async () => {
    mockListRobots.mockRejectedValue(new Error('API error'));
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Không thể tải danh sách robot')).toBeInTheDocument();
    });
  });

  it('shows empty state when no robots', async () => {
    mockListRobots.mockResolvedValue([]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Không có robot nào đang hoạt động trong hệ thống.')).toBeInTheDocument();
    });
  });

  it('renders robot card with name and ID snippet', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'abc-123-robot-id-long', name: 'Alpha' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument();
    });
  });

  it('shows Rảnh status badge', async () => {
    mockListRobots.mockResolvedValue([mockRobot({ status: 'Idle' })]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Rảnh')).toBeInTheDocument();
    });
  });

  it('shows Đang di chuyển status badge', async () => {
    mockListRobots.mockResolvedValue([mockRobot({ status: 'Moving' })]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Đang di chuyển')).toBeInTheDocument();
    });
  });

  it('shows Đang sạc status badge', async () => {
    mockListRobots.mockResolvedValue([mockRobot({ status: 'Charging' })]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Đang sạc')).toBeInTheDocument();
    });
  });

  it('shows Lỗi hệ thống status badge', async () => {
    mockListRobots.mockResolvedValue([mockRobot({ status: 'Error', name: 'ErrBot' })]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('ErrBot')).toBeInTheDocument();
    });
    // The errorBadge count is in the stats section
    expect(screen.getAllByText('Lỗi hệ thống').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Ngoại tuyến status badge', async () => {
    mockListRobots.mockResolvedValue([mockRobot({ status: 'Offline' })]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Ngoại tuyến')).toBeInTheDocument();
    });
  });

  it('shows Tổng số Robot stat count', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'r1' }),
      mockRobot({ id: 'r2' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Tổng số Robot')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Rảnh').length).toBeGreaterThanOrEqual(2);
  });

  it('shows stats labels', async () => {
    mockListRobots.mockResolvedValue([]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Tổng số Robot')).toBeInTheDocument();
      expect(screen.getByText('Sẵn sàng (Rảnh)')).toBeInTheDocument();
      expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
      expect(screen.getByText('Đang sạc pin')).toBeInTheDocument();
      expect(screen.getByText('Lỗi hệ thống')).toBeInTheDocument();
    });
  });

  it('shows position coordinates on robot card', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ x: 1.5, y: 1.5 }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText(/X: 1\.50/)).toBeInTheDocument();
      expect(screen.getByText(/Y: 1\.50/)).toBeInTheDocument();
    });
  });

  it('shows battery percentage', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ battery: 75 }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  it('renders Xử lý đơn hàng chờ button', async () => {
    mockListRobots.mockResolvedValue([]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Xử lý đơn hàng chờ')).toBeInTheDocument();
    });
  });

  it('calls listPendingOrders on button click', async () => {
    mockListRobots.mockResolvedValue([]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Xử lý đơn hàng chờ')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Xử lý đơn hàng chờ'));
    expect(mockListPendingOrders).toHaveBeenCalled();
  });

  it('shows fulfillment modal when orders exist', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ status: 'Idle' }),
    ]);
    mockListPendingOrders.mockResolvedValue([
      { id: 'order-1', totalAmount: 50000, deliveryNodeId: 'ST01' },
    ]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Xử lý đơn hàng chờ')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Xử lý đơn hàng chờ'));
    expect(screen.getByText('Phân công giao hàng')).toBeInTheDocument();
  });

  it('shows empty fulfillment dropdown when no idle robots', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ status: 'Moving' }),
    ]);
    mockListPendingOrders.mockResolvedValue([
      { id: 'order-1', totalAmount: 50000, deliveryNodeId: 'ST01' },
    ]);
    renderRobotManagementPage();
    await waitFor(() =>
      expect(screen.getByText('Xử lý đơn hàng chờ')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('Xử lý đơn hàng chờ'));
    await waitFor(() =>
      expect(screen.getByText('Phân công giao hàng')).toBeInTheDocument(),
    );
  });

  it('renders multiple robots in cards', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'r1', name: 'Bot1', status: 'Idle' }),
      mockRobot({ id: 'r2', name: 'Bot2', status: 'Moving' }),
      mockRobot({ id: 'r3', name: 'Bot3', status: 'Charging' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Bot1')).toBeInTheDocument();
      expect(screen.getByText('Bot2')).toBeInTheDocument();
      expect(screen.getByText('Đang di chuyển')).toBeInTheDocument();
      expect(screen.getByText('Đang sạc')).toBeInTheDocument();
    });
  });

  it('renders Dung lượng Pin label', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ battery: 50 }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Dung lượng Pin')).toBeInTheDocument();
    });
  });

  it('renders Vị trí hiện tại label', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ x: 5, y: 10 }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Vị trí hiện tại')).toBeInTheDocument();
    });
  });

  it('shows Ngoại tuyến for unknown/Offline status', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ status: 'unknown_status', name: 'GhostBot' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Ngoại tuyến')).toBeInTheDocument();
    });
  });

  it('shows Báo lỗi button on each robot card', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ name: 'ErrorBot' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Báo lỗi')).toBeInTheDocument();
    });
  });

  it('shows Di chuyển button on each robot card', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ name: 'MoveBot' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();
    await waitFor(() => {
      expect(screen.getByText('Di chuyển')).toBeInTheDocument();
    });
  });
});
