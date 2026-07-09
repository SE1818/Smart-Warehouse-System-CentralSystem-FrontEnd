import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  return { __esModule: true, default: { get: mockGet, post: mockPost } };
});

import apiClient from '@/services/api';
import { complaintService } from '@/services/complaintService';
import { storeService } from '@/services/storeService';
import { robotService } from '@/services/robot';
import { metricsService } from '@/services/metricsService';
import { stockService } from '@/services/stock';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('complaintService', () => {
  it('getAllComplaints', async () => {
    get.mockResolvedValue({ data: [] });
    await complaintService.getAllComplaints();
    expect(get).toHaveBeenCalledWith('/admin/complaints');
  });

  it('respondToComplaint', async () => {
    post.mockResolvedValue({ data: { id: 'c1' } });
    await complaintService.respondToComplaint('c1', 'we will fix');
    expect(post).toHaveBeenCalledWith('/admin/complaints/c1/respond', { response: 'we will fix' });
  });
});

describe('storeService', () => {
  it('getAllRegistrations with status filter', async () => {
    get.mockResolvedValue({ data: [] });
    await storeService.getAllRegistrations('Pending');
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations', { params: { status: 'Pending' } });
  });

  it('approveRegistration', async () => {
    post.mockResolvedValue({ data: {} });
    await storeService.approveRegistration('r1');
    expect(post).toHaveBeenCalledWith('/v1/storeregistrations/r1/approve');
  });

  it('rejectRegistration', async () => {
    post.mockResolvedValue({ data: {} });
    await storeService.rejectRegistration('r1', 'incomplete');
    expect(post).toHaveBeenCalledWith('/v1/storeregistrations/r1/reject', { reason: 'incomplete' });
  });
});

describe('robotService', () => {
  it('listRobots maps currentX', async () => {
    get.mockResolvedValue({ data: [{ id: 'r1', name: 'Bot', currentX: 10, x: 5, currentY: 20, y: 25, batteryLevel: 80, battery: 60, status: 'idle' }] });
    const robots = await robotService.listRobots();
    expect(robots[0].x).toBe(10);
  });
});

describe('metricsService', () => {
  it('warehouse metrics', async () => {
    get.mockResolvedValue({ data: [{ id: 'm1', metricType: 'temperature', metricValue: 25, timestamp: '2024-01-01' }] });
    const res = await metricsService.getLatestMetric('WH1', 'temperature');
    expect(Array.isArray(res)).toBe(true);
  });
});

describe('stockService', () => {
  it('adjustStock with quantityChange and note', async () => {
    post.mockResolvedValue({ data: {} });
    await stockService.adjustStock('p1', 'w1', { quantityChange: 5, type: 2, note: 'add' });
    expect(post).toHaveBeenCalledWith('/v1/stockadjustments?productId=p1&warehouseId=w1', { quantityChange: 5, type: 2, note: 'add' });
  });

  it('getProducts calls correct URL', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getProducts();
    expect(get).toHaveBeenCalledWith('/v1/stock/products');
  });
});
