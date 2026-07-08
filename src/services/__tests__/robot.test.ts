import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/services/api', () => {
  const m = { get: vi.fn(), put: vi.fn(), post: vi.fn() };
  return { __esModule: true, default: m };
});
import apiClient from '@/services/api';
const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;
beforeEach(() => vi.clearAllMocks());
import { robotService } from '@/services/robot';
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
