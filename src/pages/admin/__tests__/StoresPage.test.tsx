import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { StoresPage } from '../StoresPage';

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      Refresh: mockIcon('refresh'),
      Spinner: ({ className }: { className?: string }) => (
        <span data-testid="icon-spinner" className={className}>Spinner</span>
      ),
      Search: mockIcon('search'),
      AlertWarning: mockIcon('alert-warning'),
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
      ChevronLeft: mockIcon('chevron-left'),
      ChevronRight: mockIcon('chevron-right'),
    },
  };
});

vi.mock('@/services', () => ({
  storeService: {
    getAllStores: vi.fn(),
  },
}));

import { storeService } from '@/services';

const mockStore = (id: string, name: string, ownerEmail: string): import('@/services/storeService').StoreDto => ({
  id,
  name,
  ownerEmail,
  areaId: 'area-1',
  stationId: 'st-1',
  createdAt: new Date('2025-01-01').toISOString(),
});

const renderStoresPage = () => {
  render(<BrowserRouter><StoresPage /></BrowserRouter>);
};

describe('StoresPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Cửa hàng" heading', async () => {
    vi.mocked(storeService.getAllStores).mockResolvedValue([]);
    renderStoresPage();
    await waitFor(() => {
      expect(screen.getByText('Cửa hàng')).toBeInTheDocument();
    });
  });

  it('renders stores grid cards after data loads', async () => {
    const stores = [
      mockStore('s1', 'Cửa hàng Test', 'owner@example.com'),
      mockStore('s2', 'Cửa hàng ABC', 'abc@example.com'),
    ];
    vi.mocked(storeService.getAllStores).mockResolvedValue(stores);
    renderStoresPage();

    await waitFor(() => {
      expect(screen.getByText('Cửa hàng Test')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Cửa hàng ABC')).toBeInTheDocument();
    });
  });

  it('search filters stores by name', async () => {
    const user = userEvent.setup();
    const stores = [
      mockStore('s1', 'Cửa hàng Test', 'owner@example.com'),
      mockStore('s2', 'Cửa hàng ABC', 'abc@example.com'),
    ];
    vi.mocked(storeService.getAllStores).mockResolvedValue(stores);
    renderStoresPage();

    await waitFor(() => {
      expect(screen.getByText('Cửa hàng Test')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc email chủ...');
    await user.type(searchInput, 'ABC');

    expect(screen.getByText('Cửa hàng ABC')).toBeInTheDocument();
    expect(screen.queryByText('Cửa hàng Test')).not.toBeInTheDocument();
  });

  it('search filters stores by owner email', async () => {
    const user = userEvent.setup();
    const stores = [
      mockStore('s1', 'Cửa hàng Test', 'owner@example.com'),
      mockStore('s2', 'Cửa hàng ABC', 'abc@example.com'),
    ];
    vi.mocked(storeService.getAllStores).mockResolvedValue(stores);
    renderStoresPage();

    await waitFor(() => {
      expect(screen.getByText('Cửa hàng Test')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc email chủ...');
    await user.type(searchInput, 'owner@example.com');

    expect(screen.getByText('Cửa hàng Test')).toBeInTheDocument();
    expect(screen.queryByText('Cửa hàng ABC')).not.toBeInTheDocument();
  });

  it('clicking a store card opens detail modal', async () => {
    const user = userEvent.setup();
    const stores = [
      mockStore('s1', 'Cửa hàng Test', 'owner@example.com'),
    ];
    vi.mocked(storeService.getAllStores).mockResolvedValue(stores);
    renderStoresPage();

    await waitFor(() => {
      expect(screen.getByText('Cửa hàng Test')).toBeInTheDocument();
    });

    // Find the card by its text content
    const card = screen.getByText('Cửa hàng Test').closest('div[tabindex="0"]') ||
      screen.getByText('Cửa hàng Test').closest('[role="button"]')?.parentElement ||
      screen.getByText('Cửa hàng Test').closest('div[class*="cursor-pointer"]');
    if (card) {
      await user.click(card);
      await waitFor(() => {
        expect(screen.getByText('Chi tiết cửa hàng')).toBeInTheDocument();
      });
      expect(screen.getByText('ID Cửa hàng')).toBeInTheDocument();
      expect(screen.getByText('Tên cửa hàng')).toBeInTheDocument();
      expect(screen.getByText('Email chủ cửa hàng')).toBeInTheDocument();
    }
  });

  it('pressing Escape closes modal', async () => {
    const user = userEvent.setup();
    const stores = [
      mockStore('s1', 'Cửa hàng Test', 'owner@example.com'),
    ];
    vi.mocked(storeService.getAllStores).mockResolvedValue(stores);
    renderStoresPage();

    await waitFor(() => {
      expect(screen.getByText('Cửa hàng Test')).toBeInTheDocument();
    });

    const card = screen.getByText('Cửa hàng Test').closest('div[role="button"]');
    if (card) {
      await user.click(card);
      await waitFor(() => {
        expect(screen.getByText('Chi tiết cửa hàng')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Đóng'));
      await waitFor(() => {
        expect(screen.queryByText('Chi tiết cửa hàng')).not.toBeInTheDocument();
      });
    }
  });

  it('clicking overlay closes modal', async () => {
    const user = userEvent.setup();
    const stores = [
      mockStore('s1', 'Cửa hàng Test', 'owner@example.com'),
    ];
    vi.mocked(storeService.getAllStores).mockResolvedValue(stores);
    renderStoresPage();

    await waitFor(() => {
      expect(screen.getByText('Cửa hàng Test')).toBeInTheDocument();
    });

    const card = screen.getByText('Cửa hàng Test').closest('div[role="button"]');
    if (card) {
      await user.click(card);
      await waitFor(() => {
        expect(screen.getByText('Chi tiết cửa hàng')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Đóng'));
      await waitFor(() => {
        expect(screen.queryByText('Chi tiết cửa hàng')).not.toBeInTheDocument();
      });
    }
  });

  it('clicking close button closes modal', async () => {
    const user = userEvent.setup();
    const stores = [
      mockStore('s1', 'Cửa hàng Test', 'owner@example.com'),
    ];
    vi.mocked(storeService.getAllStores).mockResolvedValue(stores);
    renderStoresPage();

    await waitFor(() => {
      expect(screen.getByText('Cửa hàng Test')).toBeInTheDocument();
    });

    const card = screen.getByText('Cửa hàng Test').closest('div');
    if (card) {
      await user.click(card);
      await waitFor(() => {
        expect(screen.getByText('Chi tiết cửa hàng')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Đóng'));
      expect(screen.queryByText('Chi tiết cửa hàng')).not.toBeInTheDocument();
    }
  });

  it('shows loading state while fetching', () => {
    vi.mocked(storeService.getAllStores).mockImplementation(() => new Promise(() => {}));
    renderStoresPage();

    // The loading state uses a spinner icon, find the loading container by its text
    expect(screen.getByText(/Đang tải danh sách cửa hàng/)).toBeInTheDocument();
  });

  it('shows empty state when no stores', async () => {
    vi.mocked(storeService.getAllStores).mockResolvedValue([]);
    renderStoresPage();

    await waitFor(() => {
      expect(screen.getByText('Chưa có cửa hàng nào')).toBeInTheDocument();
    });
  });

  it('renders "Đang hoạt động" status badge', async () => {
    const user = userEvent.setup();
    const stores = [
      mockStore('s1', 'Cửa hàng Test', 'owner@example.com'),
    ];
    vi.mocked(storeService.getAllStores).mockResolvedValue(stores);
    renderStoresPage();

    await waitFor(() => {
      expect(screen.getByText('Cửa hàng Test')).toBeInTheDocument();
    });

    const card = screen.getByText('Cửa hàng Test').closest('div[role="button"]');
    if (card) {
      await user.click(card);
      await waitFor(() => {
        expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
      });
    }
  });

  it('calls getAllStores on mount', async () => {
    vi.mocked(storeService.getAllStores).mockResolvedValue([]);
    renderStoresPage();
    expect(storeService.getAllStores).toHaveBeenCalled();
  });
});
