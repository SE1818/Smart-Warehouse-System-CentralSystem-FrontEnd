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

import { schedulerService } from '@/services/scheduler';
describe('schedulerService', () => {
  it('getSchedules', async () => { get.mockResolvedValue({ data: [] }); await schedulerService.getSchedules(); expect(get).toHaveBeenCalledWith('/admin/schedules'); });
  it('updateStatus', async () => { put.mockResolvedValue({ data: {} }); await schedulerService.updateStatus('s1', 'ACTIVE'); expect(put).toHaveBeenCalledWith('/admin/schedules/s1/status', { status: 'ACTIVE' }); });
});
