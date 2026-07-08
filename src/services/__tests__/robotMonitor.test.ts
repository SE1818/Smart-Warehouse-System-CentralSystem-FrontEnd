import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import apiClient from '@/services/api';
import { robotMonitorService } from '@/services/robotMonitorService';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('robotMonitorService', () => {
  it('getRobots returns list', async () => {
    get.mockResolvedValue({ data: [{ robotId: 'r1', name: 'Bot', status: 'idle', battery: 90, ip: '10.0.0.1', x: 0, y: 0, lastSeen: '2024-01-01T00:00:00Z' }] });
    const res = await robotMonitorService.getRobots();
    expect(res.data[0].robotId).toBe('r1');
  });

  it('getCommandLog', async () => {
    get.mockResolvedValue({ data: [{ commandId: 'c1', robotId: 'r1', commandType: 'move', status: 'done' }] });
    const res = await robotMonitorService.getCommandLog('r1');
    expect(res.data[0].commandType).toBe('move');
  });

  it('sendCommand', async () => {
    post.mockResolvedValue({ data: { commandId: 'cmd1' } });
    await robotMonitorService.sendCommand('r1', 'move', { x: 10, y: 20 });
    expect(post).toHaveBeenCalled();
  });

  it('emergencyStop', async () => {
    post.mockResolvedValue({ data: {} });
    await robotMonitorService.emergencyStop('r1');
    expect(post).toHaveBeenCalled();
  });
});
