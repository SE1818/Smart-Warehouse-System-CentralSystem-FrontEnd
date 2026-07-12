/** @vitest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransfersPage } from '../TransfersPage';
import { transferService } from '@/services/transferService';
import { toast } from 'react-toastify';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/Icons', () => {
  const MockIcon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} className={props.className} />;
  return {
    Icons: {
      Truck: MockIcon('truck'),
      Refresh: MockIcon('refresh'),
      Check: MockIcon('check'),
      AlertWarning: MockIcon('alert-warning'),
      Spinner: MockIcon('spinner'),
      Search: MockIcon('search'),
      Close: MockIcon('close'),
      HistoryLogs: MockIcon('historylogs'),
      Info: MockIcon('info'),
    },
  };
});

vi.mock('@/components/TransferDetailDrawer', () => ({
  TransferDetailDrawer: ({ transferId, onClose, onCancel }: any) => (
    <div data-testid="detail-drawer">
      <span>Detail Drawer for {transferId}</span>
      <button onClick={onClose}>Close Drawer</button>
      <button onClick={() => onCancel(transferId)}>Cancel From Drawer</button>
    </div>
  ),
}));

vi.mock('@/services/transferService', () => ({
  transferService: {
    listTransfers: vi.fn(),
    getTransferStats: vi.fn(),
    cancelTransfer: vi.fn(),
  },
}));

describe('TransfersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    vi.mocked(transferService.listTransfers).mockImplementation(() => new Promise(() => {}));
    vi.mocked(transferService.getTransferStats).mockImplementation(() => new Promise(() => {}));
    render(<TransfersPage />);
    expect(screen.getByText('Đang tải danh sách chuyến vận chuyển...')).toBeInTheDocument();
  });

  it('renders page layout, stats, and transfer list', async () => {
    const mockTransfers = [
      {
        id: 'TRANSFER-11112222',
        fromStationId: '5555-pickup',
        toStationId: '1111-st01',
        priority: 4,
        status: 'in_progress',
        createdAt: '2025-06-15T10:00:00Z',
      },
      {
        id: 'TRANSFER-33334444',
        fromStationId: 'station-x',
        toStationId: '2222-st02',
        priority: 1,
        status: 'completed',
        createdAt: '2025-06-15T11:00:00Z',
      },
    ];

    const mockStats = {
      totalToday: 10,
      active: 2,
      completed: 7,
      failed: 0,
      cancelled: 1,
    };

    vi.mocked(transferService.listTransfers).mockResolvedValue(mockTransfers as any);
    vi.mocked(transferService.getTransferStats).mockResolvedValue(mockStats as any);

    render(<TransfersPage />);

    await waitFor(() => {
      expect(screen.getByText('Chuyến vận chuyển')).toBeInTheDocument();
    });

    expect(screen.getByText('Tổng hôm nay')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('ST05 (Pickup)')).toBeInTheDocument();
    expect(screen.getByText('ST01')).toBeInTheDocument();
    expect(screen.getByText('ST02')).toBeInTheDocument();
  });

  it('shows empty state when no transfers found', async () => {
    vi.mocked(transferService.listTransfers).mockResolvedValue([]);
    vi.mocked(transferService.getTransferStats).mockResolvedValue({} as any);

    render(<TransfersPage />);

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy chuyến vận chuyển nào phù hợp.')).toBeInTheDocument();
    });
  });

  it('shows error toast when fetch fails', async () => {
    vi.mocked(transferService.listTransfers).mockRejectedValue(new Error('Fetch error'));
    render(<TransfersPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Không thể tải danh sách chuyến vận chuyển');
    });
  });

  it('opens details drawer on transfer row click', async () => {
    const mockTransfers = [
      {
        id: 'TRANSFER-11112222',
        fromStationId: '5555-pickup',
        toStationId: '1111-st01',
        priority: 4,
        status: 'in_progress',
        createdAt: '2025-06-15T10:00:00Z',
      },
    ];

    vi.mocked(transferService.listTransfers).mockResolvedValue(mockTransfers as any);
    vi.mocked(transferService.getTransferStats).mockResolvedValue({} as any);

    render(<TransfersPage />);

    await waitFor(() => {
      expect(screen.getByText('ST05 (Pickup)')).toBeInTheDocument();
    });

    const row = screen.getByText('ST05 (Pickup)').closest('tr')!;
    fireEvent.click(row);

    expect(screen.getByTestId('detail-drawer')).toBeInTheDocument();

    const closeBtn = screen.getByText('Close Drawer');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('detail-drawer')).not.toBeInTheDocument();
  });

  it('filters transfers on search input and status tabs', async () => {
    const user = userEvent.setup();
    const mockTransfers = [
      {
        id: 'TRANSFER-FIND-ME',
        fromStationId: '5555-pickup',
        toStationId: '1111-st01',
        priority: 4,
        status: 'in_progress',
        createdAt: '2025-06-15T10:00:00Z',
      },
      {
        id: 'TRANSFER-COMPLETED',
        fromStationId: '5555-pickup',
        toStationId: '1111-st01',
        priority: 1,
        status: 'completed',
        createdAt: '2025-06-15T11:00:00Z',
      },
    ];

    vi.mocked(transferService.listTransfers).mockResolvedValue(mockTransfers as any);
    vi.mocked(transferService.getTransferStats).mockResolvedValue({} as any);

    render(<TransfersPage />);

    await waitFor(() => {
      expect(screen.getByText('TRANSFER-FIND-ME'.substring(0, 8) + '...' + 'TRANSFER-FIND-ME'.substring('TRANSFER-FIND-ME'.length - 8))).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm kiếm ID, Trạm...');
    await user.type(searchInput, 'FIND-ME');

    expect(screen.queryByText('TRANSFER-COMPLETED'.substring(0, 8) + '...' + 'TRANSFER-COMPLETED'.substring('TRANSFER-COMPLETED'.length - 8))).not.toBeInTheDocument();

    // Clear search and filter by tab
    await user.clear(searchInput);
    const completedTab = screen.getByText('Completed');
    await user.click(completedTab);

    expect(screen.queryByText('TRANSFER-FIND-ME'.substring(0, 8) + '...' + 'TRANSFER-FIND-ME'.substring('TRANSFER-FIND-ME'.length - 8))).not.toBeInTheDocument();
  });

  it('cancels transfer on button click and confirms', async () => {
    const user = userEvent.setup();
    const mockTransfers = [
      {
        id: 'TRANSFER-11112222',
        fromStationId: '5555-pickup',
        toStationId: '1111-st01',
        priority: 4,
        status: 'in_progress',
        createdAt: '2025-06-15T10:00:00Z',
      },
    ];

    vi.mocked(transferService.listTransfers).mockResolvedValue(mockTransfers as any);
    vi.mocked(transferService.getTransferStats).mockResolvedValue({} as any);
    vi.mocked(transferService.cancelTransfer).mockResolvedValue({} as any);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<TransfersPage />);

    await waitFor(() => {
      expect(screen.getByTitle('Hủy chuyến')).toBeInTheDocument();
    });

    const cancelBtn = screen.getByTitle('Hủy chuyến');
    await user.click(cancelBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(transferService.cancelTransfer).toHaveBeenCalledWith('TRANSFER-11112222');
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Đã yêu cầu hủy chuyến vận chuyển thành công');
    });
  });

  it('subscribes to window event for live refresh', async () => {
    vi.mocked(transferService.listTransfers).mockResolvedValue([]);
    vi.mocked(transferService.getTransferStats).mockResolvedValue({} as any);

    render(<TransfersPage />);

    await waitFor(() => {
      expect(transferService.listTransfers).toHaveBeenCalledTimes(1);
    });

    // Fire window event
    fireEvent(window, new Event('smartwarehouse-notification'));

    await waitFor(() => {
      expect(transferService.listTransfers).toHaveBeenCalledTimes(2);
    });
  });
});
