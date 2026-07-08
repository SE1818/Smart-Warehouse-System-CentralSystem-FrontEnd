import fs from 'fs';

function write(name, body) {
  fs.writeFileSync(`src/services/__tests__/${name}`, body.trim() + '\n');
  console.log('✓ ' + name);
}

const header = (methods) => `import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/services/api', () => {
  const m = { ${methods} };
  return { __esModule: true, default: m };
});
import apiClient from '@/services/api';
const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;
beforeEach(() => vi.clearAllMocks());
`;

// ── complaintService ──
write('complaintService.test.ts',
  header('get: vi.fn(), post: vi.fn()') +
  `import { complaintService } from '@/services/complaintService';
describe('complaintService', () => {
  it('getAllComplaints returns list', async () => {
    get.mockResolvedValue({ data: [{ id: 'c1', userId: 'u1', userEmail: 't@t.com', title: 'T', content: 'C', status: 'Pending', createdAt: '2024-01-01' }] });
    const res = await complaintService.getAllComplaints();
    expect(get).toHaveBeenCalledWith('/admin/complaints');
    expect(res[0].status).toBe('Pending');
  });
  it('respondToComplaint posts response and returns updated', async () => {
    post.mockResolvedValue({ data: { id: 'c1', status: 'Resolved', adminResponse: 'Fixed', resolvedAt: '2024-01-02', createdAt: '2024-01-01' } });
    const res = await complaintService.respondToComplaint('c1', 'We fixed it');
    expect(post).toHaveBeenCalledWith('/admin/complaints/c1/respond', { response: 'We fixed it' });
    expect(res.status).toBe('Resolved');
    expect(res.adminResponse).toBe('Fixed');
  });
});
`);

// ── storeService ──
write('storeService.test.ts',
  header('get: vi.fn(), post: vi.fn()') +
  `import { storeService } from '@/services/storeService';
describe('storeService', () => {
  it('registerStore', async () => {
    post.mockResolvedValue({ data: { message: 'OK' } });
    const res = await storeService.registerStore({ storeName: 'S', ownerName: 'O', ownerEmail: 'e@t.com', phoneNumber: '09', areaId: 'a1', areaName: 'A', stationId: 's1', stationName: 'S1' });
    expect(res.message).toBe('OK');
  });
  it('listPendingRegistrations', async () => {
    get.mockResolvedValue({ data: [] });
    await storeService.listPendingRegistrations();
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations/pending');
  });
  it('getAllRegistrations no filter', async () => {
    get.mockResolvedValue({ data: [] });
    await storeService.getAllRegistrations();
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations', { params: {} });
  });
  it('getAllRegistrations with status', async () => {
    get.mockResolvedValue({ data: [] });
    await storeService.getAllRegistrations('Pending');
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations', { params: { status: 'Pending' } });
  });
  it('getMyRegistrationStatus', async () => {
    get.mockResolvedValue({ data: { id: 'r1', storeName: 'MyStore', status: 'Pending' } });
    const res = await storeService.getMyRegistrationStatus('e@t.com');
    expect(res.storeName).toBe('MyStore');
  });
  it('getAllStores', async () => {
    get.mockResolvedValue({ data: [] });
    await storeService.getAllStores();
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations/stores');
  });
  it('getStoreById', async () => {
    get.mockResolvedValue({ data: { id: 's1', name: 'Store1' } });
    const res = await storeService.getStoreById('s1');
    expect(get).toHaveBeenCalledWith('/v1/storeregistrations/stores/s1');
    expect(res.name).toBe('Store1');
  });
  it('approveRegistration', async () => {
    post.mockResolvedValue({ data: { message: 'Approved' } });
    const res = await storeService.approveRegistration('r1');
    expect(post).toHaveBeenCalledWith('/v1/storeregistrations/r1/approve');
    expect(res.message).toBe('Approved');
  });
  it('rejectRegistration', async () => {
    post.mockResolvedValue({ data: { message: 'Rejected' } });
    const res = await storeService.rejectRegistration('r1', 'Bad info');
    expect(post).toHaveBeenCalledWith('/v1/storeregistrations/r1/reject', { reason: 'Bad info' });
  });
});
`);

// ── robot.ts ──
write('robot.test.ts',
  header('get: vi.fn(), put: vi.fn(), post: vi.fn()') +
  `import { robotService } from '@/services/robot';
describe('robotService', () => {
  it('listRobots maps currentX and title-cases status', async () => {
    get.mockResolvedValue({ data: [{ id: 'r1', name: 'Bot', currentX: 10, x: 5, currentY: 20, y: 25, batteryLevel: 80, battery: 60, status: 'IDLE', createdAt: '', updatedAt: '' }] });
    const res = await robotService.listRobots();
    expect(res[0].x).toBe(10);
    expect(res[0].y).toBe(20);
    expect(res[0].battery).toBe(80);
    expect(res[0].status).toBe('Idle');
  });
  it('listRobots falls back to x/y and Running', async () => {
    get.mockResolvedValue({ data: [{ id: 'r2', name: 'B2', x: 3, y: 7, battery: 50, status: 'RUNNING', createdAt: '', updatedAt: '' }] });
    const res = await robotService.listRobots();
    expect(res[0].x).toBe(3);
    expect(res[0].status).toBe('Running');
  });
  it('listRobots defaults missing to 0/Idle', async () => {
    get.mockResolvedValue({ data: [{ id: 'r3', name: 'B3', status: 'CHARGING', createdAt: '', updatedAt: '' }] });
    const res = await robotService.listRobots();
    expect(res[0].x).toBe(0);
    expect(res[0].status).toBe('Charging');
  });
  it('moveRobot', async () => {
    put.mockResolvedValue({ data: {} });
    const cur = { id: 'r1', name: 'Bot', status: 'IDLE', x: 0, y: 0, battery: 50, createdAt: '', updatedAt: '' };
    await robotService.moveRobot('r1', 10, 20, cur);
    expect(put).toHaveBeenCalledWith('/v1/robots/r1', { name: 'Bot', batteryLevel: 50, status: 'moving', currentX: 10, currentY: 20, currentAreaId: 'a3f5a019-9c54-47b2-bd72-4a0075d9e5b2' });
  });
  it('updateRobotStatus', async () => {
    put.mockResolvedValue({ data: {} });
    const cur = { id: 'r1', name: 'Bot', status: 'IDLE', x: 5, y: 8, battery: 70, createdAt: '', updatedAt: '' };
    await robotService.updateRobotStatus('r1', 'PAUSED', cur);
    expect(put).toHaveBeenCalledWith('/v1/robots/r1', { name: 'Bot', batteryLevel: 70, status: 'paused', currentX: 5, currentY: 8, currentAreaId: 'a3f5a019-9c54-47b2-bd72-4a0075d9e5b2' });
  });
  it('fulfillOrder', async () => {
    post.mockResolvedValue({ data: {} });
    await robotService.fulfillOrder('r1', 'o1', 'from-s1', 'to-s2');
    expect(post).toHaveBeenCalledWith('/v1/robots/r1/tasks', { orderId: 'o1', fromStationId: 'from-s1', toStationId: 'to-s2' });
  });
  it('getAreas', async () => {
    get.mockResolvedValue({ data: [{ id: 'a1', name: 'WH-A' }] });
    const res = await robotService.getAreas();
    expect(get).toHaveBeenCalledWith('/v1/robots/areas');
    expect(res[0].name).toBe('WH-A');
  });
  it('getStations', async () => {
    get.mockResolvedValue({ data: [{ id: 's1', name: 'St1', areaId: 'a1' }] });
    const res = await robotService.getStations();
    expect(get).toHaveBeenCalledWith('/v1/robots/stations');
    expect(res[0].areaId).toBe('a1');
  });
});
`);

// ── metricsService ──
write('metricsService.test.ts',
  header('get: vi.fn()') +
  `import { metricsService } from '@/services/metricsService';
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
`);

// ── stockService ──
write('stockMore.test.ts',
  header('get: vi.fn(), post: vi.fn()') +
  `import { stockService } from '@/services/stock';
describe('stockService', () => {
  it('adjustStock with warehouseId', async () => {
    post.mockResolvedValue({ data: {} });
    await stockService.adjustStock('p1', 'w1', { quantityChange: 5, reason: 'add' });
    expect(post).toHaveBeenCalledWith('/v1/stockadjustments?productId=p1&warehouseId=w1', { quantityChange: 5, reason: 'add' });
  });
  it('getProducts', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getProducts();
    expect(get).toHaveBeenCalledWith('/v1/stock/products');
  });
  it('getWarehouseStock', async () => {
    get.mockResolvedValue({ data: [{ productId: 'p1', quantity: 100 }] });
    await stockService.getWarehouseStock('w1');
    expect(get).toHaveBeenCalledWith('/v1/warehouses/w1/stock');
  });
  it('getStockMovements', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getStockMovements('p1');
    expect(get).toHaveBeenCalledWith('/v1/stock/products/p1/movements');
  });
  it('getLowStockAlerts', async () => {
    get.mockResolvedValue({ data: [{ productId: 'p1', currentStock: 2 }] });
    const res = await stockService.getLowStockAlerts();
    expect(res[0].productId).toBe('p1');
  });
});
`);
