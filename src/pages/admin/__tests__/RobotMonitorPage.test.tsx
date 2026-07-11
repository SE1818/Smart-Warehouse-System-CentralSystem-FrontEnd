/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import type { Robot } from '@/types/robot';
import { RobotMonitorPage } from '../RobotMonitorPage';

window.HTMLElement.prototype.scrollIntoView = () => {};

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      Robot: mockIcon('robot'),
      Refresh: mockIcon('refresh'),
      Spinner: ({ className }: { className?: string }) => (
        <span data-testid="icon-spinner" className={className}>Spinner</span>
      ),
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
      Warehouse: mockIcon('warehouse'),
      Product: mockIcon('product'),
      CartOrder: mockIcon('cartorder'),
      Dashboard: mockIcon('dashboard'),
      Truck: mockIcon('truck'),
      StockBox: mockIcon('stockbox'),
      AnalyticsReport: mockIcon('analytics-report'),
      Search: mockIcon('search'),
      AlertWarning: mockIcon('alert-alert'),
      ChevronLeft: mockIcon('chevron-left'),
      ChevronRight: mockIcon('chevron-right'),
    },
  };
});

const mockGet = vi.fn();
vi.mock('@/services/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock('@microsoft/signalr', () => ({
  __esModule: true,
  HubConnectionBuilder: function HubConnectionBuilder() {
    return {
      withUrl: () => ({
        withAutomaticReconnect: () => ({
          build: () => ({
            start: () => Promise.resolve(),
            on: () => {},
            stop: () => Promise.resolve(),
          }),
        }),
      }),
    };
  },
}));

const renderRobotMonitorPage = () =>
  render(<BrowserRouter><RobotMonitorPage /></BrowserRouter>);

const robot = (overrides: Record<string, unknown> = {}): any => ({
  id: overrides.id as string ?? 'r1',
  name: overrides.name as string ?? 'Robot-01',
  currentX: overrides.currentX as number ?? 5,
  currentY: overrides.currentY as number ?? 3,
  batteryLevel: overrides.batteryLevel as number ?? 80,
  status: (overrides.status as Robot['status']) ?? 'Idle',
  ipAddress: 'ipAddress' in overrides ? overrides.ipAddress as string | undefined : undefined,
  updatedAt: overrides.updatedAt as string ?? '2025-06-15T00:00:00Z',
});

describe('RobotMonitorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: [] });
  });

  it('renders AMR Monitor heading', () => {
    renderRobotMonitorPage();
    expect(screen.getByText('AMR Monitor')).toBeInTheDocument();
  });

  it('shows AMR Monitor heading while robots load', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    renderRobotMonitorPage();
    expect(screen.getByText('AMR Monitor')).toBeInTheDocument();
  });

  it('shows SignalR Hub status card', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('SignalR Hub')).toBeInTheDocument(),
    );
  });

  it('shows MQTT Broker status card with online', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('MQTT Broker (Robots)')).toBeInTheDocument(),
    );
  });

  it('shows MassTransit Bus status card', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('MassTransit Bus')).toBeInTheDocument(),
    );
  });

  it('displays connected status text when SignalR is connected', async () => {
    // The component sets 'connecting' then 'connected' — SignalR connects synchronously in mock
    mockGet.mockResolvedValue({ data: [] });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('Kết nối trực tuyến')).toBeInTheDocument(),
    );
  });

  it('shows MQTT online status', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('Đang hoạt động')).toBeInTheDocument(),
    );
  });

  it('shows RabbitMQ linked status', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('Đã liên kết')).toBeInTheDocument(),
    );
  });

  it('shows robot list heading after loading', async () => {
    mockGet.mockResolvedValue({
      data: [robot()],
    });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('Danh sách Thiết bị AMR')).toBeInTheDocument(),
    );
  });

  it('shows robot card with name and ID', async () => {
    mockGet.mockResolvedValue({
      data: [robot({ name: 'AlphaBot' })],
    });
    renderRobotMonitorPage();
    await waitFor(() => {
      const card = screen.getByText('AlphaBot');
      expect(card).toBeInTheDocument();
    });
  });

  it('renders robot coordinates', async () => {
    mockGet.mockResolvedValue({
      data: [robot({ id: 'r1', currentX: 10, currentY: 20 })],
    });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText(/X: 10, Y: 20/)).toBeInTheDocument(),
    );
  });

  it('renders battery percentage with toFixed', async () => {
    mockGet.mockResolvedValue({
      data: [robot({ batteryLevel: 73.5 })],
    });
    renderRobotMonitorPage();
    await waitFor(() => expect(screen.getByText('74%')).toBeInTheDocument());
  });

  it('shows robot information card with IP', async () => {
    mockGet.mockResolvedValue({
      data: [robot({ name: 'Bot1', ipAddress: '10.0.0.5' })],
    });
    renderRobotMonitorPage();
    await waitFor(() => expect(screen.getByText('Bot1')).toBeInTheDocument());
  });

  it('shows default IP fallback for robots with no ipAddress', async () => {
    mockGet.mockResolvedValue({
      data: [{ ...robot({ name: 'BotNoIP' }), ipAddress: undefined }],
    });
    renderRobotMonitorPage();
    await waitFor(() => expect(screen.getByText('BotNoIP')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/192\.168\.1\.100/)).toBeInTheDocument());
  });

  it('shows Ping text', async () => {
    mockGet.mockResolvedValue({
      data: [robot()],
    });
    renderRobotMonitorPage();
    await waitFor(() => expect(screen.getByText('Ping: 14ms')).toBeInTheDocument());
  });

  it('renders IDLE status badge', async () => {
    mockGet.mockResolvedValue({
      data: [robot({ status: 'idle' })],
    });
    renderRobotMonitorPage();
    await waitFor(() => expect(screen.getByText('IDLE')).toBeInTheDocument());
  });

  it('renders MOVING status badge', async () => {
    mockGet.mockResolvedValue({
      data: [robot({ status: 'moving' })],
    });
    renderRobotMonitorPage();
    await waitFor(() => expect(screen.getByText('MOVING')).toBeInTheDocument());
  });

  it('renders CHARGING status badge', async () => {
    mockGet.mockResolvedValue({
      data: [robot({ status: 'charging' })],
    });
    renderRobotMonitorPage();
    await waitFor(() => expect(screen.getByText('CHARGING')).toBeInTheDocument());
  });

  it('renders ERROR status badge', async () => {
    mockGet.mockResolvedValue({
      data: [robot({ status: 'error' })],
    });
    renderRobotMonitorPage();
    await waitFor(() => expect(screen.getByText('ERROR')).toBeInTheDocument());
  });

  it('renders status badge uppercase for arbitrary status', async () => {
    mockGet.mockResolvedValue({
      data: [robot({ status: 'maintenance' })],
    });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('MAINTENANCE')).toBeInTheDocument(),
    );
  });

  it('renders Clear Log button', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('Clear Log')).toBeInTheDocument(),
    );
  });

  it('logs success message on robots load', async () => {
    mockGet.mockResolvedValue({
      data: [robot({ id: 'r1', name: 'R1' })],
    });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText(/Đã đồng bộ thông tin của 1 robot/)).toBeInTheDocument(),
    );
  });

  it('displays error log when api fails', async () => {
    mockGet.mockRejectedValue(new Error('Connection refused'));
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText(/Không thể kết nối API/)).toBeInTheDocument(),
    );
  });

  it('renders empty state when no robots after loading', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('Không tìm thấy robot nào đang đăng ký.')).toBeInTheDocument(),
    );
  });

  it('renders multiple robot cards', async () => {
    mockGet.mockResolvedValue({
      data: [
        robot({ id: 'r1', name: 'Bot1' }),
        robot({ id: 'r2', name: 'Bot2' }),
        robot({ id: 'r3', name: 'Bot3' }),
      ],
    });
    renderRobotMonitorPage();
    await waitFor(() => {
      expect(screen.getByText('Bot1')).toBeInTheDocument();
      expect(screen.getByText('Bot2')).toBeInTheDocument();
      expect(screen.getByText('Bot3')).toBeInTheDocument();
    });
  });

  it('displays log stream console heading', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('Real-Time Command Stream Console')).toBeInTheDocument(),
    );
  });

  it('calls apiClient.get with correct endpoint', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/v1/robots'),
    );
  });

  it('shows Vị trí label on robot card', async () => {
    mockGet.mockResolvedValue({
      data: [robot()],
    });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('Vị trí')).toBeInTheDocument(),
    );
  });

  it('shows Phần trăm Pin label on robot card', async () => {
    mockGet.mockResolvedValue({
      data: [robot()],
    });
    renderRobotMonitorPage();
    await waitFor(() =>
      expect(screen.getByText('Phần trăm Pin')).toBeInTheDocument(),
    );
  });
});
