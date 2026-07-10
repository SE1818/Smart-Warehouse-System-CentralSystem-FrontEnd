import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ReportsPage } from '../ReportsPage';
import { MetricType } from '@/types';

vi.mock('@/components/Icons', () => {
  const mockIcon = (name: string) => () => <span data-testid={`icon-${name}`}>{name}Icon</span>;
  return {
    Icons: {
      AnalyticsReport: mockIcon('analytics-report'),
      Refresh: mockIcon('refresh'),
      Spinner: ({ className }: { className?: string }) => (
        <span data-testid="icon-spinner" className={className}>Spinner</span>
      ),
      Thermometer: mockIcon('thermometer'),
      Droplet: mockIcon('droplet'),
      Bolt: mockIcon('bolt'),
      StockBox: mockIcon('stockbox'),
      Plus: mockIcon('plus'),
      UsersGroup: mockIcon('users-group'),
      Search: mockIcon('search'),
      AlertWarning: mockIcon('alert-warning'),
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
      ChevronLeft: mockIcon('chevron-left'),
      ChevronRight: mockIcon('chevron-right'),
    },
  };
});

vi.mock('@/components/CustomSelect', () => ({
  CustomSelect: ({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string }) => (
    <select data-testid="custom-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
}));

vi.mock('@/services', () => ({
  metricsService: {
    getMetrics: vi.fn(),
  },
  productService: {
    getProducts: vi.fn(),
  },
}));

import { metricsService, productService } from '@/services';

const renderReportsPage = () => {
  render(<BrowserRouter><ReportsPage /></BrowserRouter>);
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(metricsService.getMetrics).mockResolvedValue([]);
    vi.mocked(productService.getProducts).mockResolvedValue([]);
  });

  it('renders "Báo cáo hiệu suất kho" heading', () => {
    renderReportsPage();
    expect(screen.getByText('Báo cáo hiệu suất kho')).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    vi.mocked(metricsService.getMetrics).mockImplementation(() => new Promise(() => {}));
    renderReportsPage();
    expect(screen.getByText('Đang tạo báo cáo hoạt động...')).toBeInTheDocument();
  });

  it('renders stat cards with metrics after data loads', async () => {
    vi.mocked(metricsService.getMetrics).mockResolvedValue([
      { id: '1', metricType: MetricType.Temperature, metricValue: 25.5, warehouseId: 'wh1', recordedAt: '2025-06-01T00:00:00Z' },
      { id: '2', metricType: MetricType.Humidity, metricValue: 60.0, warehouseId: 'wh1', recordedAt: '2025-06-01T00:00:00Z' },
      { id: '3', metricType: MetricType.PowerConsumption, metricValue: 150.0, warehouseId: 'wh1', recordedAt: '2025-06-01T00:00:00Z' },
      { id: '4', metricType: MetricType.InventoryCount, metricValue: 500, warehouseId: 'wh1', recordedAt: '2025-06-01T00:00:00Z' },
    ]);
    renderReportsPage();

    await waitFor(() => {
      expect(screen.getByText('Nhiệt độ trung bình')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('25.5°C')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Độ ẩm trung bình')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Tiêu thụ điện năng')).toBeInTheDocument();
    });
  });

  it('renders products data table after load', async () => {
    vi.mocked(metricsService.getMetrics).mockResolvedValue([]);
    vi.mocked(productService.getProducts).mockResolvedValue([
      { id: '1', name: 'Test Product', category: 'Đồ uống', price: 15000, stockQuantity: 50, description: '', unit: 'lon', createdAt: '', updatedAt: '' },
    ]);
    renderReportsPage();

    await waitFor(() => {
      expect(screen.getByText('Chi tiết tồn kho sản phẩm hiện tại')).toBeInTheDocument();
    });
  });

  it('shows "Không có dữ liệu hàng hóa" when no products', async () => {
    vi.mocked(metricsService.getMetrics).mockResolvedValue([]);
    vi.mocked(productService.getProducts).mockResolvedValue([]);
    renderReportsPage();

    await waitFor(() => {
      expect(screen.getByText('Không có dữ liệu hàng hóa')).toBeInTheDocument();
    });
  });

  it('renders time period selector', async () => {
    renderReportsPage();

    await waitFor(() => {
      expect(screen.getByText('Chọn khoảng thời gian...')).toBeInTheDocument();
    });
  });

  it('clicking refresh calls getMetrics and getProducts again', async () => {
    renderReportsPage();

    await waitFor(() => {
      expect(screen.getByText('Làm mới')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Làm mới'));
    expect(metricsService.getMetrics).toHaveBeenCalled();
    expect(productService.getProducts).toHaveBeenCalled();
  });
});
