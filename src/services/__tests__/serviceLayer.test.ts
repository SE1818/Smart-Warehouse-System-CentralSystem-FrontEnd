import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks declared inside factory - vitest hoists the call, but no external refs
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
  it('getAllComplaints calls correct URL', async () => {
    get.mockResolvedValue({ data: [] });
    await complaintService.getAllComplaints();
    expect(get).toHaveBeenCalledWith('/admin/complaints');
  });

  it('respondToComplaint posts response', async () => {
    post.mockResolvedValue({ data: { id: 'c1' } });
    await complaintService.respondToComplaint('c1', 'we will fix it');
    expect(post).toHaveBeenCalledWith('/admin/complaints/c1/respond', { response: 'we will fix it' });
  });
});

describe('storeService', () => {
  it('getAllRegistrations with status filter', async () => {
    get.mockResolvedValue({ data: [] });
    await storeService.getAllRegistrations('Pending');
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations', { params: { status: 'Pending' } });
  });

  it('getAllRegistrations without filter uses empty params', async () => {
    get.mockResolvedValue({ data: [] });
    await storeService.getAllRegistrations();
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations', { params: {} });
  });

  it('getMyRegistrationStatus sends email', async () => {
    get.mockResolvedValue({ data: {} });
    await storeService.getMyRegistrationStatus('e@t.co');
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations/my-status', { params: { email: 'e@t.co' } });
  });

  it('approveRegistration POSTs', async () => {
    post.mockResolvedValue({ data: {} });
    await storeService.approveRegistration('r1');
    expect(post).toHaveBeenCalledWith('/v1/storeregistrations/r1/approve');
  });

  it('rejectRegistration POSTs reason', async () => {
    post.mockResolvedValue({ data: {} });
    await storeService.rejectRegistration('r1', 'incomplete');
    expect(post).toHaveBeenCalledWith('/v1/storeregistrations/r1/reject', { reason: 'incomplete' });
  });
});

describe('robotService', () => {
  it('listRobots maps currentX to x and title-cases status', async () => {
    get.mockResolvedValue({ data: [{
      id: 'r1', name: 'Bot', currentX: 10, x: 5, currentY: 20, y: 25,
      batteryLevel: 80, battery: 60, status: 'IDLE',
    }] });
    const robots = await robotService.listRobots();
    expect(robots[0].x).toBe(10);
    expect(robots[0].y).toBe(20);
    expect(robots[0].battery).toBe(80);
    expect(robots[0].status).toBe('Idle');
  });

  it('getAreas calls robots/areas', async () => {
    get.mockResolvedValue({ data: [] });
    await robotService.getAreas();
    expect(get).toHaveBeenCalledWith('/v1/robots/areas');
  });

  it('getStations calls robots/stations', async () => {
    get.mockResolvedValue({ data: [] });
    await robotService.getStations();
    expect(get).toHaveBeenCalledWith('/v1/robots/stations');
  });
});

describe('metricsService', () => {
  it('warehouse metrics with date filters', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getWarehouseMetrics('WH1', { startDate: '2024-01-01', endDate: '2024-06-01' });
    expect(get).toHaveBeenCalledWith('/admin/metrics/warehouse/WH1?startDate=2024-01-01&endDate=2024-06-01');
  });

  it('getMetrics defaults WH001', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getMetrics({});
    expect(get).toHaveBeenCalledWith('/admin/metrics/warehouse/WH001');
  });

  it('getMetrics uses provided warehouseId', async () => {
    get.mockResolvedValue({ data: [] });
    await metricsService.getMetrics({ warehouseId: 'WH5' });
    expect(get).toHaveBeenCalledWith('/admin/metrics/warehouse/WH5');
  });
});

describe('stockService', () => {
  it('adjustStock with warehouseId sends query params', async () => {
    post.mockResolvedValue({ data: {} });
    await stockService.adjustStock('p1', 'w1', { quantityChange: 5, reason: 'add' });
    expect(post).toHaveBeenCalledWith('/v1/stockadjustments?productId=p1&warehouseId=w1', { quantityChange: 5, reason: 'add' });
  });

  it('getProducts calls correct URL', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getProducts();
    expect(get).toHaveBeenCalledWith('/v1/stock/products');
  });
});
