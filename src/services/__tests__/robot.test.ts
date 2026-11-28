import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/services/api';
import { robotService, normalizeRobotStatus } from '@/services/robot';
import type { Robot } from '@/types/robot';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('robotService', () => {
  it('listRobots maps currentX/x and preserves canonical RobotStatus', async () => {
    get.mockResolvedValue({ data: [{ id: 'r1', name: 'Bot', currentX: 10, x: 5, currentY: 20, y: 25, batteryLevel: 80, battery: 60, status: 'IDLE', createdAt: '', updatedAt: '' }] });
    const res = await robotService.listRobots();
    expect(res[0].x).toBe(10);
    expect(res[0].status).toBe('Idle');
  });

  it('listRobots maps Moving and SwappingBattery statuses accurately', async () => {
    get.mockResolvedValue({
      data: [
        { id: 'r2', name: 'B2', x: 3, y: 7, battery: 50, status: 'MOVING', createdAt: '', updatedAt: '' },
        { id: 'r3', name: 'B3', x: 4, y: 8, battery: 18, status: 'SWAPPING_BATTERY', createdAt: '', updatedAt: '' },
      ],
    });
    const res = await robotService.listRobots();
    expect(res[0].status).toBe('Moving');
    expect(res[1].status).toBe('SwappingBattery');
  });

  it('normalizeRobotStatus preserves SwappingBattery and maps Error/Offline', () => {
    expect(normalizeRobotStatus('SwappingBattery')).toBe('SwappingBattery');
    expect(normalizeRobotStatus('SWAPPING_BATTERY')).toBe('SwappingBattery');
    expect(normalizeRobotStatus('swappingbattery')).toBe('SwappingBattery');
    expect(normalizeRobotStatus('OFFLINE')).toBe('Offline');
    expect(normalizeRobotStatus('ERROR')).toBe('Error');
  });

  it('moveRobot sends payload without hardcoded currentAreaId when unset', async () => {
    put.mockResolvedValue({ data: {} });
    const cur: Robot = { id: 'r1', name: 'Bot', status: 'Idle', x: 0, y: 0, battery: 50 };
    await robotService.moveRobot('r1', 10, 20, cur);
    expect(put).toHaveBeenCalledWith('/v1/robots/r1', {
      name: 'Bot',
      batteryLevel: 50,
      status: 'moving',
      currentX: 10,
      currentY: 20,
    });
  });

  it('moveRobot forwards real currentAreaId when present', async () => {
    put.mockResolvedValue({ data: {} });
    const cur: Robot = { id: 'r1', name: 'Bot', status: 'Idle', x: 0, y: 0, battery: 50, currentAreaId: 'area-real-01' };
    await robotService.moveRobot('r1', 10, 20, cur);
    expect(put).toHaveBeenCalledWith('/v1/robots/r1', {
      name: 'Bot',
      batteryLevel: 50,
      status: 'moving',
      currentX: 10,
      currentY: 20,
      currentAreaId: 'area-real-01',
    });
  });

  it('updateRobotStatus sends payload without hardcoded currentAreaId and forwards real one', async () => {
    put.mockResolvedValue({ data: {} });
    const curWithoutArea: Robot = { id: 'r1', name: 'Bot', status: 'Idle', x: 5, y: 8, battery: 70 };
    await robotService.updateRobotStatus('r1', 'SwappingBattery', curWithoutArea);
    expect(put).toHaveBeenLastCalledWith('/v1/robots/r1', {
      name: 'Bot',
      batteryLevel: 70,
      status: 'swappingbattery',
      currentX: 5,
      currentY: 8,
    });

    const curWithArea: Robot = { ...curWithoutArea, currentAreaId: 'area-real-02' };
    await robotService.updateRobotStatus('r1', 'Idle', curWithArea);
    expect(put).toHaveBeenLastCalledWith('/v1/robots/r1', {
      name: 'Bot',
      batteryLevel: 70,
      status: 'idle',
      currentX: 5,
      currentY: 8,
      currentAreaId: 'area-real-02',
    });
  });

  it('fulfillOrder posts task', async () => {
    post.mockResolvedValue({ data: {} });
    await robotService.fulfillOrder('r1', 'o1', 'from-s1', 'to-s2');
    expect(post).toHaveBeenCalledWith('/v1/robots/r1/tasks', { orderId: 'o1', fromStationId: 'from-s1', toStationId: 'to-s2' });
  });

  it('getAreas', async () => {
    get.mockResolvedValue({ data: [{ id: 'a1', name: 'WH-A' }] });
    const res = await robotService.getAreas();
    expect(res[0].name).toBe('WH-A');
  });

  it('getStations', async () => {
    get.mockResolvedValue({ data: [{ id: 's1', name: 'St1', areaId: 'a1' }] });
    const res = await robotService.getStations();
    expect(res[0].areaId).toBe('a1');
  });

  it('listPendingOrders returns pending orders', async () => {
    get.mockResolvedValue({ data: [{ id: 'o1', status: 'Pending' }] });
    const res = await robotService.listPendingOrders();
    expect(res[0].id).toBe('o1');
    expect(get).toHaveBeenCalledWith('/v1/orders/pending');
  });
});
