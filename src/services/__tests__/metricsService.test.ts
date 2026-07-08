import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
  },
}));

import apiClient from '@/services/api';
import { metricsService } from '@/services/metricsService';

const get = apiClient.get as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('metricsService', () => {
  it('getWarehouseMetrics no filters', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getWarehouseMetrics('WH1');
    expect(get).toHaveBeenCalledWith('/admin/metrics/warehouse/WH1');
  });

  it('getWarehouseMetrics with date filters', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getWarehouseMetrics('WH1', { startDate: '2024-01-01', endDate: '2024-06-01' });
    const url = get.mock.calls[0][0];
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-06-01');
  });

  it('getLatestMetric', async () => {
    get.mockResolvedValue({ data: { warehouseId: 'WH1', metricType: 'TEMP', value: 25 } });
    const res = await metricsService.getLatestMetric('WH1', 'TEMP');
    expect(res.value).toBe(25);
  });

  it('getMetrics defaults WH001', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getMetrics({});
    expect(get).toHaveBeenCalledWith('/admin/metrics/warehouse/WH001');
  });

  it('getMetrics uses warehouseId from filters', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getMetrics({ warehouseId: 'WH5' });
    const url = get.mock.calls[0][0];
    expect(url).toContain('/admin/metrics/warehouse/WH5');
  });

  it('getMetricsByType', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getMetricsByType('TEMPERATURE');
    expect(get).toHaveBeenCalledWith('/admin/metrics/type/TEMPERATURE');
  });
});
