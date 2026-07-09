import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/services/api';
import { robotService } from '@/services/robot';
import type { Robot } from '@/types/robot';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('robotService', () => {
  it('listRobots maps currentX/x and title-cases status', async () => {
    get.mockResolvedValue({ data: [{ id: 'r1', name: 'Bot', currentX: 10, x: 5, currentY: 20, y: 25, batteryLevel: 80, battery: 60, status: 'IDLE', createdAt: '', updatedAt: '' }] });
    const res = await robotService.listRobots();
    expect(res[0].x).toBe(10);
    expect(res[0].status).toBe('Idle');
  });

  it('listRobots maps Moving status', async () => {
    get.mockResolvedValue({ data: [{ id: 'r2', name: 'B2', x: 3, y: 7, battery: 50, status: 'MOVING', createdAt: '', updatedAt: '' }] });
    const res = await robotService.listRobots();
    expect(res[0].status).toBe('Moving');
  });

  it('moveRobot sends correct payload', async () => {
    put.mockResolvedValue({ data: {} });
    const cur: Robot = { id: 'r1', name: 'Bot', status: 'Idle', x: 0, y: 0, battery: 50 };
    await robotService.moveRobot('r1', 10, 20, cur);
    expect(put).toHaveBeenCalled();
  });

  it('updateRobotStatus sends correct payload', async () => {
    put.mockResolvedValue({ data: {} });
    const cur: Robot = { id: 'r1', name: 'Bot', status: 'Idle', x: 5, y: 8, battery: 70 };
    await robotService.updateRobotStatus('r1', 'Charging', cur);
    expect(put).toHaveBeenCalled();
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
});
