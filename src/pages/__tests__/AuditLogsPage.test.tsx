/** @vitest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogsPage } from '../AuditLogsPage';
import { auditLogService } from '@/services';

vi.mock('@/components/Icons', () => {
  const MockIcon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} className={props.className} />;
  return {
    Icons: {
      HistoryLogs: MockIcon('history-logs'),
      Refresh: MockIcon('refresh'),
      AlertWarning: MockIcon('alert-warning'),
      Spinner: MockIcon('spinner'),
      Search: MockIcon('search'),
      Clock: MockIcon('clock'),
      User: MockIcon('user'),
      Shield: MockIcon('shield'),
      Info: MockIcon('info'),
      Database: MockIcon('database'),
      Close: MockIcon('close'),
    },
  };
});

vi.mock('@/services', () => ({
  auditLogService: {
    getLogs: vi.fn(),
  },
}));

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    vi.mocked(auditLogService.getLogs).mockImplementation(() => new Promise(() => {}));
    render(<AuditLogsPage />);
    expect(screen.getByText('Đang tải lịch sử nhật ký...')).toBeInTheDocument();
  });

  it('renders title and filters', async () => {
    vi.mocked(auditLogService.getLogs).mockResolvedValue([]);
    render(<AuditLogsPage />);
    await waitFor(() => {
      expect(screen.getByText('Nhật ký hoạt động hệ thống')).toBeInTheDocument();
    });
  });

  it('renders log counters and row data after load', async () => {
    const mockLogs = [
      {
        id: '1',
        severity: 'Error',
        activity: 'LoginFailed',
        message: 'Mật khẩu không hợp lệ',
        userEmail: 'user@test.com',
        entityName: 'User',
        timestamp: '2025-06-15T10:00:00Z',
        ipAddress: '127.0.0.1',
      },
      {
        id: '2',
        severity: 'Warning',
        activity: 'StockLow',
        message: 'Tồn kho dưới ngưỡng',
        userEmail: 'system',
        entityName: 'Stock',
        timestamp: '2025-06-15T10:05:00Z',
        ipAddress: '127.0.0.1',
      },
    ];

    vi.mocked(auditLogService.getLogs).mockResolvedValue(mockLogs as any);
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu không hợp lệ')).toBeInTheDocument();
    });

    expect(screen.getByText('Tồn kho dưới ngưỡng')).toBeInTheDocument();
    expect(screen.getByText('Tổng số log')).toBeInTheDocument();
    // Severity error count stat
    expect(screen.getByText('Lỗi phát sinh')).toBeInTheDocument();
  });

  it('opens and closes details modal on row click', async () => {
    const mockLogs = [
      {
        id: '1',
        severity: 'Error',
        activity: 'LoginFailed',
        message: 'Mật khẩu không hợp lệ',
        userEmail: 'user@test.com',
        entityName: 'User',
        timestamp: '2025-06-15T10:00:00Z',
        ipAddress: '127.0.0.1',
      },
    ];

    vi.mocked(auditLogService.getLogs).mockResolvedValue(mockLogs as any);
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu không hợp lệ')).toBeInTheDocument();
    });

    // Click the log row or container
    const row = screen.getByText('Mật khẩu không hợp lệ').closest('tr');
    expect(row).toBeInTheDocument();
    fireEvent.click(row!);

    // Check detail modal shows up (details modal title or components)
    await waitFor(() => {
      expect(screen.getByText('Chi tiết nhật ký hoạt động')).toBeInTheDocument();
    });

    // Close the modal
    const closeBtn = screen.getByText('×');
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByText('Chi tiết nhật ký hoạt động')).not.toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    vi.mocked(auditLogService.getLogs).mockRejectedValue(new Error('API Error'));
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Không thể tải dữ liệu log. Vui lòng thử lại sau.')).toBeInTheDocument();
    });
  });

  it('calls API again when refresh button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(auditLogService.getLogs).mockResolvedValue([]);
    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Làm mới')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Làm mới'));
    expect(auditLogService.getLogs).toHaveBeenCalledTimes(2);
  });
});
