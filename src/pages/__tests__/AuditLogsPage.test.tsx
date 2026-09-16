/** @vitest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogsPage } from '../AuditLogsPage';
import { transferService } from '@/services';

vi.mock('@/services', () => ({
  transferService: {
    listTransfers: vi.fn(),
    getTransferHistory: vi.fn(),
    getCommandStatusHistory: vi.fn(),
    getCommandLog: vi.fn(),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

const mockTransferRequests = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    orderId: '22222222-2222-2222-2222-222222222222',
    fromStationId: 'station-a',
    toStationId: 'station-b',
    priority: 1,
    status: 'processing',
    createdAt: '2026-06-15T10:00:00Z',
    updatedAt: '2026-06-15T10:05:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    orderId: '44444444-4444-4444-4444-444444444444',
    fromStationId: 'station-c',
    toStationId: 'station-d',
    priority: 2,
    status: 'completed',
    createdAt: '2026-06-15T11:00:00Z',
    updatedAt: '2026-06-15T11:30:00Z',
  },
];

const mockHistory = {
  statusHistory: [
    {
      id: 'stat-1',
      transferRequestId: '11111111-1111-1111-1111-111111111111',
      previousStatus: 'pending',
      newStatus: 'processing',
      notes: 'Bắt đầu di chuyển',
      createdBy: 'robot-1',
      createdAt: '2026-06-15T10:00:00Z',
    },
  ],
  commands: [],
  responses: [],
  transferLog: null,
};

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(transferService.listTransfers).mockResolvedValue(mockTransferRequests as any);
    vi.mocked(transferService.getTransferHistory).mockResolvedValue(mockHistory as any);
  });

  it('shows loading spinner initially', () => {
    vi.mocked(transferService.listTransfers).mockImplementation(() => new Promise(() => {}));
    render(<AuditLogsPage />);
    expect(screen.getByText('Đang tải danh sách...')).toBeInTheDocument();
  });

  it('renders title and filters', async () => {
    render(<AuditLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('Nhật ký vận chuyển AMR')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Tìm theo ID, Trạm gửi, Trạm nhận...')).toBeInTheDocument();
    expect(screen.getByText('Làm mới danh sách')).toBeInTheDocument();
  });

  it('renders request list items after data loads', async () => {
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/REQ-11111111/).length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/REQ-33333333/)).toBeInTheDocument();
  });

  it('selects request on click and loads detail history', async () => {
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText(/REQ-33333333/)).toBeInTheDocument();
    });

    const item = screen.getByText(/REQ-33333333/).closest('button');
    expect(item).toBeInTheDocument();
    fireEvent.click(item!);

    await waitFor(() => {
      expect(transferService.getTransferHistory).toHaveBeenCalledWith('33333333-3333-3333-3333-333333333333');
    });
  });

  it('shows empty placeholder when list is empty', async () => {
    vi.mocked(transferService.listTransfers).mockResolvedValue([]);
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy yêu cầu vận chuyển nào.')).toBeInTheDocument();
    });
  });

  it('calls API again when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Làm mới danh sách')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Làm mới danh sách'));
    expect(transferService.listTransfers).toHaveBeenCalledTimes(2);
  });
});
