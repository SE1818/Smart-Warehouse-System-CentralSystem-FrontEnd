/** @vitest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MetricsPage } from '../MetricsPage';
import { metricsService } from '@/services';

vi.mock('@/components/Icons', () => {
  const MockIcon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} className={props.className} />;
  return {
    Icons: {
      Metrics: MockIcon('metrics'),
      Spinner: MockIcon('spinner'),
      Thermometer: MockIcon('thermometer'),
      Droplet: MockIcon('droplet'),
      Gauge: MockIcon('gauge'),
      LightBulb: MockIcon('lightbulb'),
      Bolt: MockIcon('bolt'),
      StockBox: MockIcon('stockbox'),
      AnalyticsReport: MockIcon('analytics-report'),
    },
  };
});

vi.mock('@/components/CustomSelect', () => ({
  CustomSelect: ({ value, onChange, options }: any) => (
    <select
      data-testid="warehouse-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
}));

vi.mock('@/services', () => ({
  metricsService: {
    getLatestMetric: vi.fn(),
  },
}));

describe('MetricsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    vi.mocked(metricsService.getLatestMetric).mockImplementation(() => new Promise(() => {}));
    render(<MetricsPage />);
    expect(screen.getByText('Đang tải chỉ số môi trường...')).toBeInTheDocument();
  });

  it('renders metric cards with values on successful API load', async () => {
    vi.mocked(metricsService.getLatestMetric).mockResolvedValue({
      id: '1',
      metricType: 'Temperature',
      metricValue: 28.5,
      warehouseId: 'WH001',
      timestamp: '2025-06-01T00:00:00Z',
      createdAt: '2025-06-01T00:00:00Z',
    } as any);

    render(<MetricsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('28.5')[0]).toBeInTheDocument();
    });

    expect(screen.getByText('Giám sát chỉ số môi trường')).toBeInTheDocument();
    expect(screen.getAllByText('28.5').length).toBe(6); // 6 metric configuration types all mocked to 28.5
  });

  it('falls back to seeded values on API failure', async () => {
    vi.mocked(metricsService.getLatestMetric).mockRejectedValue(new Error('API failure'));

    render(<MetricsPage />);

    // Fallbacks: temperature=24.5, humidity=58.2, pressure=1013, lightLevel=320, powerConsumption=142.6, inventoryCount=489
    await waitFor(() => {
      expect(screen.getByText('24.5')).toBeInTheDocument();
    });

    expect(screen.getByText('58.2')).toBeInTheDocument();
    expect(screen.getByText('1013.0')).toBeInTheDocument();
    expect(screen.getByText('320.0')).toBeInTheDocument();
    expect(screen.getByText('142.6')).toBeInTheDocument();
    expect(screen.getByText('489.0')).toBeInTheDocument();
  });

  it('changes warehouse selection and triggers re-fetch', async () => {
    vi.mocked(metricsService.getLatestMetric).mockResolvedValue({
      id: '1',
      metricType: 'Temperature',
      metricValue: 20.0,
      warehouseId: 'WH001',
      timestamp: '2025-06-01T00:00:00Z',
      createdAt: '2025-06-01T00:00:00Z',
    } as any);

    render(<MetricsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('20.0')[0]).toBeInTheDocument();
    });

    const select = screen.getByTestId('warehouse-select');
    fireEvent.change(select, { target: { value: 'WH002' } });

    // Expect loading state after select change
    expect(screen.getByText('Đang tải chỉ số môi trường...')).toBeInTheDocument();
  });
});
