import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/services/api', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPut = vi.fn();
  const mockDelete = vi.fn();
  return { __esModule: true, default: { get: mockGet, post: mockPost, put: mockPut, delete: mockDelete } };
});
import apiClient from '@/services/api';
const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;
beforeEach(() => { vi.clearAllMocks(); });

import { robotMonitorService } from '@/services/robotMonitorService';
describe('robotMonitorService', () => {
  it('getRobotStatus', async () => { get.mockResolvedValue({ data: { status: 'Moving' } }); await robotMonitorService.getRobotStatus('r1'); expect(get).toHaveBeenCalledWith('/v1/robots/r1/status'); });
  it('getTaskLogs', async () => { get.mockResolvedValue({ data: [] }); await robotMonitorService.getTaskLogs('t1'); expect(get).toHaveBeenCalledWith('/v1/tasks/t1/logs'); });
  it('reactivateRobot', async () => { put.mockResolvedValue({ data: {} }); await robotMonitorService.reactivateRobot('r1'); expect(put).toHaveBeenCalledWith('/v1/robots/r1/reactivate'); });
});
