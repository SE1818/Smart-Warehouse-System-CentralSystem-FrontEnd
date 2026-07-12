/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { RobotManagementPage } from '../RobotManagementPage';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
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
      Warehouse: mockIcon('warehouse'),
      Dashboard: mockIcon('dashboard'),
    },
  };
});

vi.mock('@/components/CustomSelect', () => ({
  CustomSelect: function CustomSelect(props: Record<string, unknown>) {
    return (
      <select data-testid="custom-select" value={props.value as string} onChange={(e) => (props.onChange as (v: string) => void)(e.target.value)}>
        <option value="">{props.placeholder as string}</option>
        {(props.options as { value: string; label: string }[] | undefined)?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  },
}));

vi.mock('@/services/robot', () => ({
  robotService: {
    listRobots: vi.fn(),
    listPendingOrders: vi.fn(),
    moveRobot: vi.fn(),
    updateRobotStatus: vi.fn(),
    fulfillOrder: vi.fn(),
    getAreas: vi.fn().mockResolvedValue([]),
    getStations: vi.fn().mockResolvedValue([]),
  },
}));

import type { Robot } from '@/types/robot';
import { robotService } from '@/services/robot';

const mockListRobots = vi.mocked(robotService.listRobots);
const mockListPendingOrders = vi.mocked(robotService.listPendingOrders);


const mockRobot = (overrides: Partial<Robot> = {}): Robot => ({
  id: overrides.id ?? 'robot-1',
  name: overrides.name ?? 'RBT-001',
  status: overrides.status ?? 'Idle',
  battery: overrides.battery ?? 80,
  x: overrides.x ?? 0,
  y: overrides.y ?? 0,
  currentAreaId: overrides.currentAreaId,
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
    let resolve: (value: Robot[]) => void;
    const pending = new Promise<Robot[]>((r) => {
      resolve = r;
    });
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
      { id: 'order-1', totalAmount: 50000, deliveryNodeId: 'ST01' } as any,
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
      { id: 'order-1', totalAmount: 50000, deliveryNodeId: 'ST01' } as any,
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

  it('shows Ngoại tuyến for unknown status', async () => {
    mockListRobots.mockResolvedValue([
      mockRobot({ status: 'Offline' as Robot['status'], name: 'GhostBot' }),
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

  it('shows Di chuyển button on each robot card and opens move modal', async () => {
    const user = userEvent.setup();
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'move-robot-id', name: 'MoveBot', status: 'Idle' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    renderRobotManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Di chuyển')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Di chuyển'));
    expect(screen.getByText('Di chuyển MoveBot')).toBeInTheDocument();
  });

  it('handles clicking sạc pin and dừng sạc status updates', async () => {
    const user = userEvent.setup();
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'charge-robot-id', name: 'ChargeBot', status: 'Idle' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    vi.mocked(robotService.updateRobotStatus).mockResolvedValue({} as any);

    renderRobotManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Sạc Pin')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Sạc Pin'));
    expect(robotService.updateRobotStatus).toHaveBeenCalledWith('charge-robot-id', 'Charging', expect.any(Object));
  });

  it('handles clicking báo lỗi with confirmation', async () => {
    const user = userEvent.setup();
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'err-robot-id', name: 'ErrorBot', status: 'Idle' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    vi.mocked(robotService.updateRobotStatus).mockResolvedValue({} as any);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderRobotManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Báo lỗi')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Báo lỗi'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(robotService.updateRobotStatus).toHaveBeenCalledWith('err-robot-id', 'Error', expect.any(Object));
  });

  it('handles copying robot ID to clipboard', async () => {
    const user = userEvent.setup();
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'long-robot-id-to-copy', name: 'CopyBot' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    renderRobotManagementPage();

    await waitFor(() => {
      expect(screen.getByTitle('Sao chép ID')).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Sao chép ID'));
    expect(clipboardSpy).toHaveBeenCalledWith('long-robot-id-to-copy');
  });

  it('handles selecting area and rendering map stations/robots', async () => {
    const user = userEvent.setup();
    vi.mocked(robotService.getAreas).mockResolvedValue([
      { id: 'area-1', name: 'Khu A', level: 1 },
    ]);
    vi.mocked(robotService.getStations).mockResolvedValue([
      { id: 'station-1', name: 'Trạm A', xCoord: 2, yCoord: 3, areaId: 'area-1', stationType: 'pickup' },
    ]);
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'r-1', name: 'Bot A', currentAreaId: 'area-1', x: 4, y: 5 }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);

    renderRobotManagementPage();

    await waitFor(() => {
      expect(screen.getByTestId('custom-select')).toBeInTheDocument();
    });

    const select = screen.getByTestId('custom-select');
    await user.selectOptions(select, 'area-1');

    await waitFor(() => {
      expect(screen.getByLabelText('Chọn robot Bot A')).toBeInTheDocument();
      expect(screen.getByLabelText('Trạm Trạm A')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Chọn robot Bot A'));

    expect(screen.getByText(/Đang chọn:/)).toBeInTheDocument();

    const map = screen.getByLabelText('Bản đồ vận hành kho. Chọn tọa độ để di chuyển robot.');
    await user.click(map);

    expect(screen.getByText('Di chuyển Bot A')).toBeInTheDocument();
  });

  it('submits MoveModal form and calls moveRobot', async () => {
    const user = userEvent.setup();
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'r-1', name: 'Bot A', status: 'Idle' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);
    vi.mocked(robotService.moveRobot).mockResolvedValue({} as any);

    renderRobotManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Di chuyển')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Di chuyển'));

    // Verify modal is open
    expect(screen.getByText('Di chuyển Bot A')).toBeInTheDocument();

    // Fill coordinates
    const inputs = screen.getAllByRole('spinbutton');
    await user.clear(inputs[0]);
    await user.type(inputs[0], '8.2');
    await user.clear(inputs[1]);
    await user.type(inputs[1], '9.1');

    // Click Confirm
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));

    // Verify moveRobot was called
    expect(robotService.moveRobot).toHaveBeenCalledWith('r-1', 8.2, 9.1, expect.any(Object));
  });

  it('submits FulfillmentModal form and calls fulfillOrder', async () => {
    const user = userEvent.setup();
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'r-1', name: 'Bot A', status: 'Idle' }),
    ]);
    mockListPendingOrders.mockResolvedValue([
      { id: 'order-1', totalAmount: 50000, deliveryNodeId: 'ST01' } as any,
    ]);
    vi.mocked(robotService.fulfillOrder).mockResolvedValue({} as any);

    renderRobotManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Xử lý đơn hàng chờ')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Xử lý đơn hàng chờ'));

    // Wait for modal to render
    await waitFor(() => {
      expect(screen.getByText('Phân công giao hàng')).toBeInTheDocument();
    });

    // Select order and robot
    const selects = screen.getAllByTestId('custom-select');
    const orderSelect = selects.find(s => s.querySelector('option[value=""]')?.textContent === '-- Chọn đơn hàng --')!;
    const robotSelect = selects.find(s => s.querySelector('option[value=""]')?.textContent === '-- Chọn robot rảnh --')!;
    await user.selectOptions(orderSelect, 'order-1');
    await user.selectOptions(robotSelect, 'r-1');

    // Click Start Delivery
    await user.click(screen.getByRole('button', { name: 'Bắt đầu giao' }));

    // Verify fulfillOrder was called
    expect(robotService.fulfillOrder).toHaveBeenCalledWith('r-1', 'order-1', expect.any(String), expect.any(String));
  });

  it('triggers validation error in FulfillmentModal when order or robot not selected', async () => {
    const user = userEvent.setup();
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'r-1', name: 'Bot A', status: 'Idle' }),
    ]);
    mockListPendingOrders.mockResolvedValue([
      { id: 'order-1', totalAmount: 50000, deliveryNodeId: 'ST01' } as any,
    ]);

    renderRobotManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Xử lý đơn hàng chờ')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Xử lý đơn hàng chờ'));

    await waitFor(() => {
      expect(screen.getByText('Phân công giao hàng')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Bắt đầu giao' }));

    const { toast } = await import('react-toastify');
    expect(toast.error).toHaveBeenCalledWith('Vui lòng điền đầy đủ thông tin phân công');
  });

  it('closes FulfillmentModal when close button is clicked', async () => {
    const user = userEvent.setup();
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'r-1', name: 'Bot A', status: 'Idle' }),
    ]);
    mockListPendingOrders.mockResolvedValue([
      { id: 'order-1', totalAmount: 50000, deliveryNodeId: 'ST01' } as any,
    ]);

    renderRobotManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Xử lý đơn hàng chờ')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Xử lý đơn hàng chờ'));

    await waitFor(() => {
      expect(screen.getByText('Phân công giao hàng')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Hủy' }));

    await waitFor(() => {
      expect(screen.queryByText('Phân công giao hàng')).not.toBeInTheDocument();
    });
  });

  it('closes MoveModal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    mockListRobots.mockResolvedValue([
      mockRobot({ id: 'r-1', name: 'Bot A', status: 'Idle' }),
    ]);
    mockListPendingOrders.mockResolvedValue([]);

    renderRobotManagementPage();

    await waitFor(() => {
      expect(screen.getByText('Di chuyển')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Di chuyển'));

    expect(screen.getByText('Di chuyển Bot A')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hủy' }));

    await waitFor(() => {
      expect(screen.queryByText('Di chuyển Bot A')).not.toBeInTheDocument();
    });
  });
});
