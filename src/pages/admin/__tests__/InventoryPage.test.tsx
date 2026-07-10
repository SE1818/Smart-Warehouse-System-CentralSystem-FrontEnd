import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
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
  },
}));

// Mock signalR to avoid WebSocket connection attempts
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

import { robotService } from '@/services/robot';

const renderInventoryPage = () => {
  render(<BrowserRouter><InventoryPage /></BrowserRouter>);
};

describe('InventoryPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.mocked(robotService.listRobots).mockReset();
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
});
