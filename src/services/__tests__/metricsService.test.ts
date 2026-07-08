import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/services/api', () => {
  const m = { get: vi.fn() };
  return { __esModule: true, default: m };
});
import apiClient from '@/services/api';
const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;
beforeEach(() => vi.clearAllMocks());
import { metricsService } from '@/services/metricsService';
describe('metricsService', () => {
  it('getWarehouseMetrics no filters', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getWarehouseMetrics('WH1');
    expect(get).toHaveBeenCalledWith('/admin/metrics/warehouse/WH1');
  });
  it('getWarehouseMetrics with dates', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getWarehouseMetrics('WH1', { startDate: '2024-01-01', endDate: '2024-06-01' });
    const url = get.mock.calls[0][0];
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-06-01');
  });
  it('getWarehouseMetrics empty dates = no query', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getWarehouseMetrics('WH1', { startDate: '', endDate: '' });
    expect(get).toHaveBeenCalledWith('/admin/metrics/warehouse/WH1');
  });
  it('getMetricsByType with filter', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getMetricsByType('TEMPERATURE', { startDate: '2024-01-01' });
    const url = get.mock.calls[0][0];
    expect(url).toContain('/admin/metrics/type/TEMPERATURE?startDate=2024-01-01');
  });
  it('getMetricsByType no filter', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getMetricsByType('HUMIDITY');
    expect(get).toHaveBeenCalledWith('/admin/metrics/type/HUMIDITY');
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
  it('getMetrics with warehouseId', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getMetrics({ warehouseId: 'WH5' });
    const url = get.mock.calls[0][0];
    expect(url).toContain('warehouseId=WH5');
  });
});
