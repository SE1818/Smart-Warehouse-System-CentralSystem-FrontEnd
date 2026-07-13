import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import type { Robot } from '@/types/robot';
import { InventoryPage } from '../InventoryPage';


vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      Warehouse: mockIcon('warehouse'),
      Dashboard: mockIcon('dashboard'),
      Robot: mockIcon('robot'),
      Bolt: mockIcon('bolt'),
      Refresh: mockIcon('refresh'),
      Spinner: ({ className }: { className?: string }) => <span data-testid="icon-spinner" className={className}>SpinnerIcon</span>,
      Search: mockIcon('search'),
      AlertWarning: mockIcon('alert-warning'),
      Plus: mockIcon('plus'),
      UsersGroup: mockIcon('users-group'),
      Thermometer: mockIcon('thermometer'),
      Droplet: mockIcon('droplet'),
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

// Mock robotService
vi.mock('@/services/robot', () => ({
  robotService: {
    listRobots: vi.fn(),
    moveRobot: vi.fn().mockResolvedValue(undefined),
  },
}));

let mockOnReceiveRobotLocation: ((updatedRobot: Robot) => void) | undefined;
let mockSignalRStartShouldFail = false;

// Mock signalR to avoid WebSocket connection attempts
vi.mock('@microsoft/signalr', () => {
  const mockBuilder = {
    withUrl: () => mockBuilder,
    configureLogging: () => mockBuilder,
    withAutomaticReconnect: () => mockBuilder,
    build: () => ({
      start: () => mockSignalRStartShouldFail ? Promise.reject(new Error('SignalR mock error')) : Promise.resolve(),
      on: (event: string, callback: (...args: unknown[]) => void) => {
        if (event === 'ReceiveRobotLocation') {
          mockOnReceiveRobotLocation = callback;
        }
      },
      stop: () => Promise.resolve(),
      onreconnecting: () => {},
      onreconnected: () => {},
      onclose: () => {},
    }),
  };
  return {
    LogLevel: { Information: 1 },
    HubConnectionBuilder: function HubConnectionBuilder() {
      return mockBuilder;
    },
  };
});

import { robotService } from '@/services/robot';

const renderInventoryPage = () => {
  render(<BrowserRouter><InventoryPage /></BrowserRouter>);
};

describe('InventoryPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    mockSignalRStartShouldFail = false;
  });

  afterEach(() => {
    vi.mocked(robotService.listRobots).mockClear();
  });

  it('renders page heading "Giám sát Robot & Kho hàng"', async () => {
    vi.mocked(robotService.listRobots).mockResolvedValue([]);
    renderInventoryPage();

    await waitFor(() => expect(screen.getByText('Giám sát Robot & Kho hàng')).toBeInTheDocument());
  });

  it('renders grid map heading "Sơ đồ lưới nhà kho"', async () => {
    vi.mocked(robotService.listRobots).mockResolvedValue([]);
    renderInventoryPage();

    await waitFor(() => expect(screen.getByText('Sơ đồ lưới nhà kho (Grid Map 10x10)')).toBeInTheDocument());
  });

  it('renders robot cards when data loads', async () => {
    const mockRobots = [
      { id: 'AMR-01', name: 'AMR-01 (Mantis)', x: 2, y: 3, battery: 84, status: 'Moving' as const },
      { id: 'AMR-02', name: 'AMR-02 (Scarab)', x: 7, y: 1, battery: 95, status: 'Idle' as const },
    ];
    vi.mocked(robotService.listRobots).mockResolvedValue(mockRobots);
    renderInventoryPage();

    await waitFor(() => expect(screen.getByText('AMR-01 (Mantis)')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('AMR-02 (Scarab)')).toBeInTheDocument());
  });

  it('renders robot status badge for Di chuyển', async () => {
    const mockRobots = [
      { id: 'AMR-01', name: 'AMR-01 (Mantis)', x: 2, y: 3, battery: 84, status: 'Moving' as const },
    ];
    vi.mocked(robotService.listRobots).mockResolvedValue(mockRobots);
    renderInventoryPage();

    await waitFor(() => expect(screen.getByText('Di chuyển')).toBeInTheDocument());
  });

  it('renders robot status badge for Rảnh rỗi', async () => {
    const mockRobots = [
      { id: 'AMR-02', name: 'AMR-02 (Scarab)', x: 7, y: 1, battery: 95, status: 'Idle' as const },
    ];
    vi.mocked(robotService.listRobots).mockResolvedValue(mockRobots);
    renderInventoryPage();

    await waitFor(() => expect(screen.getByText('Rảnh rỗi')).toBeInTheDocument());
  });

  it('renders battery percentage on robot card', async () => {
    const mockRobots = [
      { id: 'AMR-01', name: 'AMR-01 (Mantis)', x: 2, y: 3, battery: 84, status: 'Idle' as const },
    ];
    vi.mocked(robotService.listRobots).mockResolvedValue(mockRobots);
    renderInventoryPage();

    await waitFor(() => expect(screen.getByText('84%', { selector: 'strong' })).toBeInTheDocument());
  });

  it('renders "Đội Robot AMR" section heading', async () => {
    vi.mocked(robotService.listRobots).mockResolvedValue([]);
    renderInventoryPage();

    await waitFor(() => expect(screen.getByText('Đội Robot AMR')).toBeInTheDocument());
  });

  it('can select an idle robot and shows station prompt', async () => {
    const mockRobots = [
      { id: 'AMR-02', name: 'AMR-02 (Scarab)', x: 7, y: 1, battery: 95, status: 'Idle' as const },
    ];
    vi.mocked(robotService.listRobots).mockResolvedValue(mockRobots);
    renderInventoryPage();

    await waitFor(() => expect(screen.getByText('AMR-02 (Scarab)')).toBeInTheDocument());

    const robotCard = screen.getByText('AMR-02 (Scarab)').closest('div')?.parentElement;
    if (robotCard) {
      await userEvent.click(robotCard);
      expect(screen.getByText('Hãy chọn một Trạm giao nhận (ST) trên sơ đồ lưới')).toBeInTheDocument();
    }
  });

  it('calls listRobots on mount', async () => {
    vi.mocked(robotService.listRobots).mockResolvedValue([]);
    renderInventoryPage();
    expect(robotService.listRobots).toHaveBeenCalled();
  });

  it('commands an idle robot to move to a delivery station', async () => {
    const mockRobots = [
      { id: 'AMR-02', name: 'AMR-02 (Scarab)', x: 7, y: 1, battery: 95, status: 'Idle' as const },
    ];
    vi.mocked(robotService.listRobots).mockResolvedValue(mockRobots);
    renderInventoryPage();

    await waitFor(() => expect(screen.getByText('AMR-02 (Scarab)')).toBeInTheDocument());

    const { fireEvent } = await import('@testing-library/react');
    const robotCard = screen.getByText('AMR-02 (Scarab)').closest('div')?.parentElement;
    if (robotCard) {
      fireEvent.click(robotCard);
    }

    await waitFor(() => {
      expect(screen.getByText('Hãy chọn một Trạm giao nhận (ST) trên sơ đồ lưới')).toBeInTheDocument();
    });

    const stationCell = screen.getByTitle('Trạm A');
    fireEvent.click(stationCell);

    await waitFor(() => {
      expect(screen.queryByText('Hãy chọn một Trạm giao nhận (ST) trên sơ đồ lưới')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Điểm đến:')).toBeInTheDocument();
    expect(screen.getByText('Trạm A')).toBeInTheDocument();
  });

  it('updates robot location on ReceiveRobotLocation SignalR event', async () => {
    vi.mocked(robotService.listRobots).mockResolvedValue([
      { id: 'AMR-01', name: 'AMR-01 (Mantis)', x: 2, y: 3, battery: 84, status: 'Idle' as const },
    ]);
    renderInventoryPage();

    await waitFor(() => expect(screen.getByText('AMR-01 (Mantis)')).toBeInTheDocument());
    expect(mockOnReceiveRobotLocation).toBeDefined();

    const { act } = await import('@testing-library/react');
    act(() => {
      if (mockOnReceiveRobotLocation) {
        mockOnReceiveRobotLocation({
          id: 'AMR-01',
          name: 'AMR-01 (Mantis)',
          x: 4,
          y: 4,
          battery: 83,
          status: 'Moving',
          destination: 'Trạm B',
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByText('(4, 4)')).toBeInTheDocument();
    });
    expect(screen.getByText('Điểm đến:')).toBeInTheDocument();
    expect(screen.getByText('Trạm B')).toBeInTheDocument();
  });

  it('simulates robot movement on timer interval', async () => {
    mockSignalRStartShouldFail = true;
    vi.mocked(robotService.listRobots).mockResolvedValue([
      { id: 'AMR-01', name: 'AMR-01 (Mantis)', x: 2, y: 3, battery: 84, status: 'Moving' as const, destination: 'Trạm A' },
      { id: 'AMR-02', name: 'AMR-02 (Scarab)', x: 7, y: 1, battery: 95, status: 'Charging' as const },
    ]);

    const originalSetInterval = window.setInterval;
    const setIntervalCalls: (() => void)[] = [];
    window.setInterval = vi.fn((cb: (...args: unknown[]) => void) => {
      setIntervalCalls.push(cb);
      return 123 as unknown as number;
    }) as unknown as typeof window.setInterval;

    try {
      renderInventoryPage();

      await waitFor(() => expect(screen.getByText('AMR-01 (Mantis)')).toBeInTheDocument());

      const { act } = await import('@testing-library/react');
      act(() => {
        setIntervalCalls.forEach(cb => cb());
      });

      await waitFor(() => {
        expect(screen.getAllByText('97%').length).toBeGreaterThan(0);
      });
    } finally {
      window.setInterval = originalSetInterval;
    }
  });
});
