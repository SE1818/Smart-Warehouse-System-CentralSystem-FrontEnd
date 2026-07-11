/** @vitest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsPage } from '../NotificationsPage';
import { notificationService } from '@/services/notification';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/components/Icons', () => {
  const MockIcon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} className={props.className} />;
  return {
    Icons: {
      Bell: MockIcon('bell'),
      Refresh: MockIcon('refresh'),
      Plus: MockIcon('plus'),
      Check: MockIcon('check'),
      AlertWarning: MockIcon('alert-warning'),
      Inbox: MockIcon('inbox'),
      Spinner: MockIcon('spinner'),
      Search: MockIcon('search'),
      Close: MockIcon('close'),
    },
  };
});

vi.mock('@/services/notification', () => ({
  notificationService: {
    getAllNotifications: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    vi.mocked(notificationService.getAllNotifications).mockImplementation(() => new Promise(() => {}));
    render(<NotificationsPage />);
    expect(screen.getByText('Đang tải lịch sử thông báo hệ thống...')).toBeInTheDocument();
  });

  it('renders page layout, stats, and empty state after data loads', async () => {
    vi.mocked(notificationService.getAllNotifications).mockResolvedValue([]);
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Quản lý Thông báo')).toBeInTheDocument();
    });

    expect(screen.getByText('Tổng thông báo')).toBeInTheDocument();
    expect(screen.getByText('Không có thông báo nào được lưu trữ')).toBeInTheDocument();
  });

  it('renders notification list on successful fetch', async () => {
    const mockNotifications = [
      {
        id: 'n1',
        title: 'Khuyến mãi hè',
        message: 'Giảm giá 20%',
        type: 'Email',
        status: 'Sent',
        createdAt: '2025-06-15T10:00:00Z',
        userId: 'u1',
      },
      {
        id: 'n2',
        title: 'Bảo trì hệ thống',
        message: 'Hệ thống bảo trì vào tối nay',
        type: 'InApp',
        status: 'Failed',
        createdAt: '2025-06-15T11:00:00Z',
        userId: null,
      },
    ];

    vi.mocked(notificationService.getAllNotifications).mockResolvedValue(mockNotifications as any);
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Khuyến mãi hè')).toBeInTheDocument();
    });

    expect(screen.getByText('Giảm giá 20%')).toBeInTheDocument();
    expect(screen.getByText('Bảo trì hệ thống')).toBeInTheDocument();
    expect(screen.getByText('Tất cả (Broadcast)')).toBeInTheDocument();
    expect(screen.getByText('Người dùng cụ thể')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    vi.mocked(notificationService.getAllNotifications).mockRejectedValue(new Error('Fetch failed'));
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Không thể tải lịch sử thông báo hệ thống.')).toBeInTheDocument();
    });
  });

  it('opens modal, validates input and submits new notification successfully', async () => {
    const user = userEvent.setup();
    vi.mocked(notificationService.getAllNotifications).mockResolvedValue([]);
    vi.mocked(notificationService.sendNotification).mockResolvedValue({} as any);

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Gửi thông báo mới')).toBeInTheDocument();
    });

    // Open modal
    await user.click(screen.getByText('Gửi thông báo mới'));
    expect(screen.getByText('Soạn thảo và gửi thông báo trực tiếp đến người dùng')).toBeInTheDocument();

    // Trigger validation error (empty fields)
    const titleInput = screen.getByPlaceholderText('Nhập tiêu đề...');
    const messageInput = screen.getByPlaceholderText('Nhập nội dung thông báo cụ thể...');
    await user.type(titleInput, ' ');
    await user.type(messageInput, ' ');

    const submitBtn = screen.getByText('Gửi ngay');
    await user.click(submitBtn);
    expect(screen.getByText('Vui lòng điền đầy đủ tiêu đề và nội dung.')).toBeInTheDocument();

    // Fill form for broadcast notification
    await user.clear(titleInput);
    await user.clear(messageInput);
    await user.type(titleInput, 'Test Broadcast');
    await user.type(messageInput, 'Test message content');

    // Click submit
    await user.click(submitBtn);

    expect(notificationService.sendNotification).toHaveBeenCalledWith({
      title: 'Test Broadcast',
      message: 'Test message content',
      type: 'InApp',
      userId: undefined,
    });

    await waitFor(() => {
      expect(screen.getByText('Gửi thông báo thành công!')).toBeInTheDocument();
    });
  });

  it('submits specific user notification', async () => {
    const user = userEvent.setup();
    vi.mocked(notificationService.getAllNotifications).mockResolvedValue([]);
    vi.mocked(notificationService.sendNotification).mockResolvedValue({} as any);

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Gửi thông báo mới')).toBeInTheDocument();
    });

    // Open modal
    await user.click(screen.getByText('Gửi thông báo mới'));

    // Select target specific user
    const specificTargetBtn = screen.getByText('Gửi cá nhân');
    await user.click(specificTargetBtn);

    // Fill spaces to bypass required validation
    const titleInput = screen.getByPlaceholderText('Nhập tiêu đề...');
    const messageInput = screen.getByPlaceholderText('Nhập nội dung thông báo cụ thể...');
    const userIdInput = screen.getByPlaceholderText('e.g. 4bad629d-c1cd-485e-b248-ee17f165c7be');
    await user.type(titleInput, ' ');
    await user.type(messageInput, ' ');
    await user.type(userIdInput, ' ');

    const submitBtn = screen.getByText('Gửi ngay');
    await user.click(submitBtn);
    expect(screen.getByText('Vui lòng điền đầy đủ tiêu đề và nội dung.')).toBeInTheDocument();

    // Enter valid title/message
    await user.clear(titleInput);
    await user.clear(messageInput);
    await user.clear(userIdInput);
    await user.type(titleInput, 'Specific Title');
    await user.type(messageInput, 'Specific message body');

    // Try submit again (still missing user id, type space to bypass HTML5 validation)
    await user.type(userIdInput, ' ');
    await user.click(submitBtn);
    expect(screen.getByText('Vui lòng nhập ID người dùng nhận thông báo.')).toBeInTheDocument();

    // Enter user ID
    await user.clear(userIdInput);
    await user.type(userIdInput, 'some-user-uuid');

    // Select channel SMS
    const smsChannelBtn = screen.getByText('SMS');
    await user.click(smsChannelBtn);

    // Submit
    await user.click(submitBtn);

    expect(notificationService.sendNotification).toHaveBeenCalledWith({
      title: 'Specific Title',
      message: 'Specific message body',
      type: 'SMS',
      userId: 'some-user-uuid',
    });
  });

  it('shows error on send notification failure', async () => {
    const user = userEvent.setup();
    vi.mocked(notificationService.getAllNotifications).mockResolvedValue([]);
    vi.mocked(notificationService.sendNotification).mockRejectedValue({
      response: { data: { message: 'Không tìm thấy người dùng.' } },
    });

    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Gửi thông báo mới')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Gửi thông báo mới'));

    const titleInput = screen.getByPlaceholderText('Nhập tiêu đề...');
    const messageInput = screen.getByPlaceholderText('Nhập nội dung thông báo cụ thể...');
    await user.type(titleInput, 'Title');
    await user.type(messageInput, 'Message');

    const submitBtn = screen.getByText('Gửi ngay');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy người dùng.')).toBeInTheDocument();
    });
  });
});
