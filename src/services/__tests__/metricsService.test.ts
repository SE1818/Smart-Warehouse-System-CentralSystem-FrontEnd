import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn() },
}));

import apiClient from '@/services/api';
import { metricsService } from '@/services/metricsService';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('metricsService', () => {
  it('warehouse metrics with date filters', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await metricsService.getWarehouseMetrics('WH1', { startDate: '2024-01-01', endDate: '2024-06-01' });
    expect(mockGet).toHaveBeenCalledWith('/admin/metrics/warehouse/WH1?startDate=2024-01-01&endDate=2024-06-01');
  });

  it('getWarehouseMetrics without filters', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await metricsService.getWarehouseMetrics('WH1');
    expect(mockGet).toHaveBeenCalledWith('/admin/metrics/warehouse/WH1');
  });

  it('getMetricsByType without filters', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await metricsService.getMetricsByType('temperature');
    expect(mockGet).toHaveBeenCalledWith('/admin/metrics/type/temperature');
  });

  it('getMetricsByType with filters', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await metricsService.getMetricsByType('humidity', { startDate: '2024-01-01' });
    expect(mockGet).toHaveBeenCalledWith('/admin/metrics/type/humidity?startDate=2024-01-01');
  });

  it('getLatestMetric returns typed object', async () => {
    mockGet.mockResolvedValue({ data: { id: 'm1', warehouseId: 'WH001', metricType: 'temperature', metricValue: 25, timestamp: '2024-01-01', createdAt: '2024-01-01' } });
    const res = await metricsService.getLatestMetric('WH001', 'temperature');
    expect(res.metricValue).toBe(25);
  });

  it('getMetrics without filters defaults to WH001', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await metricsService.getMetrics();
    expect(mockGet).toHaveBeenCalledWith('/admin/metrics/warehouse/WH001');
  });

  it('getMetrics with warehouseId filter', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await metricsService.getMetrics({ warehouseId: 'WH2' });
    expect(mockGet).toHaveBeenCalledWith('/admin/metrics/warehouse/WH2');
  });

  it('getMetrics with all filters', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await metricsService.getMetrics({ warehouseId: 'WH3', startDate: '2024-01-01', endDate: '2024-12-31' });
    expect(mockGet).toHaveBeenCalledWith('/admin/metrics/warehouse/WH3?startDate=2024-01-01&endDate=2024-12-31');
  });
});
