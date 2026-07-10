import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { UsersPage } from '../UsersPage';

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      UsersGroup: mockIcon('users-group'),
      Refresh: mockIcon('refresh'),
      Spinner: ({ className }: { className?: string }) => (
        <span data-testid="icon-spinner" className={className}>Spinner</span>
      ),
      Search: mockIcon('search'),
      AlertWarning: mockIcon('alert-warning'),
      Plus: mockIcon('plus'),
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
      CartOrder: mockIcon('cart-order'),
      Dashboard: mockIcon('dashboard'),
      Truck: mockIcon('truck'),
      StockBox: mockIcon('stock-box'),
      AnalyticsReport: mockIcon('analytics-report'),
      ChevronLeft: mockIcon('chevron-left'),
      ChevronRight: mockIcon('chevron-right'),
    },
  };
});

vi.mock('@/services', () => ({
  userService: {
    getAllUsers: vi.fn(),
    updateUserRole: vi.fn(),
    updateUserStatus: vi.fn(),
  },
}));

import { userService } from '@/services';

const renderUsersPage = () => {
  render(<BrowserRouter><UsersPage /></BrowserRouter>);
};

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a table with 5 header columns', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValue([]);
    renderUsersPage();

    await waitFor(() => {
      const table = document.querySelector('table');
      expect(table).toBeTruthy();
      expect(table!.querySelectorAll('th')).toHaveLength(5);
      expect(table!.querySelectorAll('th')[0].textContent).toBe('Tên');
      expect(table!.querySelectorAll('th')[1].textContent).toBe('Email');
    });
  });

  it('renders user rows after data loads', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'a@example.com', role: 'admin', isActive: true },
      { id: '2', username: 'Tran Thi B', email: 'b@example.com', role: 'Customer', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Tran Thi B')).toBeInTheDocument();
    });
  });

  it('filters users by search input', async () => {
    const user = userEvent.setup();
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'nguyen@example.com', role: 'Customer', isActive: true },
      { id: '2', username: 'Tran Thi B', email: 'tran@example.com', role: 'Customer', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm kiếm theo tên hoặc email...');
    await user.type(searchInput, 'nguyen');

    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    expect(screen.queryByText('Tran Thi B')).not.toBeInTheDocument();
  });

  it('shows empty state when no users match', async () => {
    const user = userEvent.setup();
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'nguyen@example.com', role: 'Customer', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm kiếm theo tên hoặc email...');
    await user.type(searchInput, 'nonexistent');

    expect(screen.getByText('Không tìm thấy người dùng')).toBeInTheDocument();
  });

  it('renders edit and toggle buttons for each user row', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'a@example.com', role: 'admin', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Sửa vai trò')).toBeInTheDocument();
    });
    expect(screen.getByText('Khóa')).toBeInTheDocument();
  });

  it('opens edit modal with "Lưu thay đổi" button when "Sửa vai trò" is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'a@example.com', role: 'admin', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Sửa vai trò')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Sửa vai trò'));

    await waitFor(() => {
      expect(screen.getByText('Sửa thông tin tài khoản')).toBeInTheDocument();
    });
    expect(screen.getByText('Lưu thay đổi')).toBeInTheDocument();
  });

  it('calls updateUserStatus when toggle button on action column is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'a@example.com', role: 'admin', isActive: true },
    ]);
    vi.mocked(userService.updateUserStatus).mockResolvedValue({} as never);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Sửa vai trò')).toBeInTheDocument();
    });

    // The action column shows the toggle button (not the status badge)
    const actionButtons = screen.getAllByRole('button', { name: 'Khóa' });
    await user.click(actionButtons[0]);
    expect(userService.updateUserStatus).toHaveBeenCalledWith('1', false);
  });

  it('shows refresh button and fetches on click', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValue([]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Làm mới')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Làm mới'));
    expect(userService.getAllUsers).toHaveBeenCalled();
  });

  it('renders a paginated table with a user count', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Alice', email: 'a@example.com', role: 'admin', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const table = document.querySelector('table');
    expect(table).toBeTruthy();
    expect(table!.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('filters users by search input using email', async () => {
    const user = userEvent.setup();
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'nguyen@example.com', role: 'Customer', isActive: true },
      { id: '2', username: 'Tran Thi B', email: 'tran@example.com', role: 'Customer', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm kiếm theo tên hoặc email...');
    await user.type(searchInput, 'tran@example.com');

    expect(screen.queryByText('Nguyen Van A')).not.toBeInTheDocument();
    expect(screen.getByText('Tran Thi B')).toBeInTheDocument();
  });

  it('renders Customer role badge for customer users', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'a@example.com', role: 'Customer', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    });

    expect(screen.getByText('Customer')).toBeInTheDocument();
  });

  it('renders admin role badge for admin users', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Admin User', email: 'admin@example.com', role: 'admin', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('renders Hoạt động status label for active users', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'a@example.com', role: 'Customer', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Hoạt động')).toBeInTheDocument();
    });
  });

  it('renders Khóa status label and Mở khóa action button for suspended users', async () => {
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'a@example.com', role: 'Customer', isActive: false },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    });

    expect(screen.getByText('Khóa')).toBeInTheDocument();
    expect(screen.getByText('Mở khóa')).toBeInTheDocument();
  });

  it('opens edit modal with pre-filled user name when Sửa vai trò is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'a@example.com', role: 'admin', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Sửa vai trò')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Sửa vai trò'));

    await waitFor(() => {
      expect(screen.getByText('Sửa thông tin tài khoản')).toBeInTheDocument();
    });

    const nameInput = document.getElementById('username-input-field');
    expect(nameInput).toHaveValue('Nguyen Van A');
  });

  it('shows "Không tìm thấy người dùng" message after search yields no results', async () => {
    const user = userEvent.setup();
    vi.mocked(userService.getAllUsers).mockResolvedValue([
      { id: '1', username: 'Nguyen Van A', email: 'nguyen@example.com', role: 'Customer', isActive: true },
    ]);
    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm kiếm theo tên hoặc email...');
    await user.type(searchInput, 'zzz_not_a_real_user');

    expect(screen.queryByText('Nguyen Van A')).not.toBeInTheDocument();
    expect(screen.getByText(/Không tìm thấy người dùng/)).toBeInTheDocument();
  });
});
