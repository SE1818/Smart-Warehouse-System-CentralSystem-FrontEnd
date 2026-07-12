import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { StoreRegistrationsPage } from '../StoreRegistrationsPage';

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      Warehouse: mockIcon('warehouse'),
      Refresh: mockIcon('refresh'),
      Spinner: ({ className }: { className?: string }) => (
        <span data-testid="icon-spinner" className={className}>Spinner</span>
      ),
      Search: mockIcon('search'),
      AlertWarning: mockIcon('alert-warning'),
      Plus: mockIcon('plus'),
      Inbox: mockIcon('inbox'),
      Check: mockIcon('check'),
      Close: mockIcon('close'),
      Thermometer: mockIcon('thermometer'),
      Droplet: mockIcon('droplet'),
      Bolt: mockIcon('bolt'),
      Profile: mockIcon('profile'),
      Calendar: mockIcon('calendar'),
      SuccessCheck: mockIcon('success-check'),
      User: mockIcon('user'),
      Store: mockIcon('store'),
      Folder: mockIcon('folder'),
      UsersGroup: mockIcon('users-group'),
      Product: mockIcon('product'),
      CartOrder: mockIcon('cartorder'),
      Dashboard: mockIcon('dashboard'),
      Truck: mockIcon('truck'),
      StockBox: mockIcon('stockbox'),
      AnalyticsReport: mockIcon('analytics-report'),
      ChevronLeft: mockIcon('chevron-left'),
      ChevronRight: mockIcon('chevron-right'),
    },
  };
});

vi.mock('@/services', () => ({
  storeService: {
    getAllRegistrations: vi.fn(),
    approveRegistration: vi.fn(),
    rejectRegistration: vi.fn(),
  },
}));

import { storeService } from '@/services';

const renderStoreRegistrationsPage = () => {
  render(<BrowserRouter><StoreRegistrationsPage /></BrowserRouter>);
};

describe('StoreRegistrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Yêu cầu mở cửa hàng" heading', () => {
    vi.mocked(storeService.getAllRegistrations).mockResolvedValue([]);
    renderStoreRegistrationsPage();
    expect(screen.getByText('Yêu cầu mở cửa hàng')).toBeInTheDocument();
  });

  it('renders tab buttons: Chờ duyệt, Đã duyệt, Từ chối', async () => {
    vi.mocked(storeService.getAllRegistrations).mockResolvedValue([]);
    renderStoreRegistrationsPage();

    await waitFor(() => {
      expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
    });
    expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
    expect(screen.getByText('Từ chối')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(storeService.getAllRegistrations).mockImplementation(() => new Promise(() => {}));
    renderStoreRegistrationsPage();
    expect(screen.getByText('Đang tải danh sách...')).toBeInTheDocument();
  });

  it('shows empty state for pending tab', async () => {
    vi.mocked(storeService.getAllRegistrations).mockResolvedValue([]);
    renderStoreRegistrationsPage();

    await waitFor(() => {
      expect(screen.getByText('Không có đơn đăng ký')).toBeInTheDocument();
    });
  });

  it('renders registration table rows for pending', async () => {
    const mockRegistrations = [
      {
        id: 'reg-1',
        storeName: 'Cửa hàng A',
        ownerName: 'Nguyen Van A',
        ownerEmail: 'a@example.com',
        phoneNumber: '0123456789',
        areaId: 'area-1',
        areaName: 'Khu vực 1',
        stationId: 'ST01',
        stationName: 'Trạm A',
        status: 'Pending',
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-06-15T10:00:00Z',
      },
    ];
    vi.mocked(storeService.getAllRegistrations).mockResolvedValue(mockRegistrations);
    renderStoreRegistrationsPage();

    await waitFor(() => {
      expect(screen.getByText('Cửa hàng A')).toBeInTheDocument();
    });
    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
  });

  it('shows action buttons Duyệt and Từ chối for pending registrations', async () => {
    const mockRegistrations = [
      {
        id: 'reg-1',
        storeName: 'Cửa hàng A',
        ownerName: 'Nguyen Van A',
        ownerEmail: 'a@example.com',
        phoneNumber: '0123456789',
        areaId: 'area-1',
        areaName: 'Khu vực 1',
        stationId: 'ST01',
        stationName: 'Trạm A',
        status: 'Pending',
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-06-15T10:00:00Z',
      },
    ];
    vi.mocked(storeService.getAllRegistrations).mockResolvedValue(mockRegistrations);
    renderStoreRegistrationsPage();

    await waitFor(() => {
      expect(screen.getByText('Cửa hàng A')).toBeInTheDocument();
    });
    const row = screen.getByText('Cửa hàng A').closest('tr');
    expect(row).toBeTruthy();
    if (row) {
      const rowContent = within(row);
      expect(rowContent.getByText('Duyệt')).toBeInTheDocument();
      expect(rowContent.getByText('Từ chối')).toBeInTheDocument();
    }
  });

  it('calls approveRegistration when approve button clicked (with window.confirm mocked)', async () => {
    vi.mocked(storeService.approveRegistration).mockResolvedValue({ message: 'Approved' });
    const mockRegistrations = [
      {
        id: 'reg-1',
        storeName: 'Test Store',
        ownerName: 'Test Owner',
        ownerEmail: 'test@example.com',
        phoneNumber: '0123456789',
        areaId: 'area-1',
        areaName: 'Khu vực 1',
        stationId: 'ST01',
        stationName: 'Trạm A',
        status: 'Pending',
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-06-15T10:00:00Z',
      },
    ];
    vi.mocked(storeService.getAllRegistrations).mockResolvedValue(mockRegistrations);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderStoreRegistrationsPage();

    await waitFor(() => {
      expect(screen.getByText('Duyệt')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Duyệt'));

    expect(storeService.approveRegistration).toHaveBeenCalledWith('reg-1');
    confirmSpy.mockRestore();
  });

  it('does NOT call approveRegistration when window.confirm returns false', async () => {
    vi.mocked(storeService.approveRegistration).mockResolvedValue({ message: 'Approved' });
    const mockRegistrations = [
      {
        id: 'reg-1',
        storeName: 'Test Store',
        ownerName: 'Test Owner',
        ownerEmail: 'test@example.com',
        phoneNumber: '0123456789',
        areaId: 'area-1',
        areaName: 'Khu vực 1',
        stationId: 'ST01',
        stationName: 'Trạm A',
        status: 'Pending',
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-06-15T10:00:00Z',
      },
    ];
    vi.mocked(storeService.getAllRegistrations).mockResolvedValue(mockRegistrations);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderStoreRegistrationsPage();

    await waitFor(() => {
      expect(screen.getByText('Duyệt')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Duyệt'));

    expect(storeService.approveRegistration).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('opens reject modal when "Từ chối" button clicked', async () => {
    const mockRegistrations = [
      {
        id: 'reg-1',
        storeName: 'Test Store',
        ownerName: 'Test Owner',
        ownerEmail: 'test@example.com',
        phoneNumber: '0123456789',
        areaId: 'area-1',
        areaName: 'Khu vực 1',
        stationId: 'ST01',
        stationName: 'Trạm A',
        status: 'Pending',
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-06-15T10:00:00Z',
      },
    ];
    vi.mocked(storeService.getAllRegistrations).mockResolvedValue(mockRegistrations);
    renderStoreRegistrationsPage();

    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument();
    });

    const row = screen.getByText('Test Store').closest('tr');
    expect(row).toBeTruthy();

    const user = userEvent.setup();
    if (row) {
      await user.click(within(row).getByText('Từ chối'));
    }

    await waitFor(() => {
      expect(screen.getByText('Từ chối yêu cầu')).toBeInTheDocument();
    });
    expect(screen.getByText('Lý do từ chối')).toBeInTheDocument();
  });

  it('shows count badges in summary cards', async () => {
    const mockRegistrations = [
      {
        id: 'reg-1', storeName: 'Pending Store', ownerName: 'A',
        ownerEmail: 'a@example.com', phoneNumber: '', areaId: 'a1',
        areaName: 'Area 1', stationId: 'ST01', stationName: 'Station 1',
        status: 'Pending', createdAt: '2025-06-15T10:00:00Z', updatedAt: '2025-06-15T10:00:00Z',
      },
    ];
    vi.mocked(storeService.getAllRegistrations).mockResolvedValue(mockRegistrations);
    renderStoreRegistrationsPage();

    await waitFor(() => {
      // Verify the summary card shows the count via its badge/marker
      expect(screen.getByText('Yêu cầu mở cửa hàng')).toBeInTheDocument();
    });
    // Tab button accessible name includes the badge count, e.g. "Chờ duyệt1"
    const pendingTab = screen.getByRole('button', { name: /Chờ duyệt/ });
    expect(pendingTab).toBeInTheDocument();
    expect(within(pendingTab).getByText('1')).toBeInTheDocument();
  });

  it('submits rejection successfully', async () => {
    vi.mocked(storeService.rejectRegistration).mockResolvedValue({ message: 'Rejected' });
    const mockRegistrations = [
      {
        id: 'reg-1',
        storeName: 'Test Store',
        ownerName: 'Test Owner',
        ownerEmail: 'test@example.com',
        phoneNumber: '0123456789',
        areaId: 'area-1',
        areaName: 'Khu vực 1',
        stationId: 'ST01',
        stationName: 'Trạm A',
        status: 'Pending',
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-06-15T10:00:00Z',
      },
    ];
    vi.mocked(storeService.getAllRegistrations).mockResolvedValue(mockRegistrations);
    renderStoreRegistrationsPage();

    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument();
    });

    const { fireEvent } = await import('@testing-library/react');
    const row = screen.getByText('Test Store').closest('tr');
    expect(row).toBeTruthy();
    if (row) {
      fireEvent.click(within(row).getByText('Từ chối'));
    }

    await waitFor(() => {
      expect(screen.getByText('Từ chối yêu cầu')).toBeInTheDocument();
    });

    const reasonInput = screen.getByPlaceholderText('Vui lòng nêu rõ lý do tại sao từ chối yêu cầu này...');
    fireEvent.change(reasonInput, { target: { value: 'Reason detail here' } });

    const submitBtn = screen.getByText('Xác nhận từ chối');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(storeService.rejectRegistration).toHaveBeenCalledWith('reg-1', 'Reason detail here');
    });
  });

  it('closes reject modal when Hủy bỏ is clicked', async () => {
    const mockRegistrations = [
      {
        id: 'reg-1',
        storeName: 'Test Store',
        ownerName: 'Test Owner',
        ownerEmail: 'test@example.com',
        phoneNumber: '0123456789',
        areaId: 'area-1',
        areaName: 'Khu vực 1',
        stationId: 'ST01',
        stationName: 'Trạm A',
        status: 'Pending',
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-06-15T10:00:00Z',
      },
    ];
    vi.mocked(storeService.getAllRegistrations).mockResolvedValue(mockRegistrations);
    renderStoreRegistrationsPage();

    await waitFor(() => {
      expect(screen.getByText('Test Store')).toBeInTheDocument();
    });

    const { fireEvent } = await import('@testing-library/react');
    const row = screen.getByText('Test Store').closest('tr');
    if (row) {
      fireEvent.click(within(row).getByText('Từ chối'));
    }

    await waitFor(() => {
      expect(screen.getByText('Từ chối yêu cầu')).toBeInTheDocument();
    });

    const cancelBtn = screen.getByText('Hủy bỏ');
    fireEvent.click(cancelBtn);
    expect(screen.queryByText('Từ chối yêu cầu')).not.toBeInTheDocument();
  });

  it('switches tabs and displays registrations accordingly', async () => {
    const mockPending = [
      {
        id: 'reg-1', storeName: 'Pending Store', ownerName: 'A',
        ownerEmail: 'a@example.com', phoneNumber: '', areaId: 'a1',
        areaName: 'Area 1', stationId: 'ST01', stationName: 'Station 1',
        status: 'Pending', createdAt: '2025-06-15T10:00:00Z', updatedAt: '2025-06-15T10:00:00Z',
      },
    ];
    const mockApproved = [
      {
        id: 'reg-2', storeName: 'Approved Store', ownerName: 'B',
        ownerEmail: 'b@example.com', phoneNumber: '', areaId: 'a2',
        areaName: 'Area 2', stationId: 'ST02', stationName: 'Station 2',
        status: 'Approved', createdAt: '2025-06-15T10:00:00Z', updatedAt: '2025-06-15T10:00:00Z',
      },
    ];

    vi.mocked(storeService.getAllRegistrations).mockImplementation(async (status) => {
      if (status === 'Approved') return mockApproved;
      return mockPending;
    });

    renderStoreRegistrationsPage();

    await waitFor(() => {
      expect(screen.getByText('Pending Store')).toBeInTheDocument();
    });

    const { fireEvent } = await import('@testing-library/react');
    const approvedTab = screen.getByRole('button', { name: /Đã duyệt/ });
    fireEvent.click(approvedTab);

    await waitFor(() => {
      expect(screen.getByText('Approved Store')).toBeInTheDocument();
    });
    expect(screen.queryByText('Pending Store')).not.toBeInTheDocument();
  });
});
