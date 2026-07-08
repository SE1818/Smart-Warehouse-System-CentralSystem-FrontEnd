import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import apiClient from '@/services/api';
import { schedulerService } from '@/services/scheduler';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('schedulerService', () => {
  it('getJobs', async () => {
    get.mockResolvedValue({ data: { schedulerName: 'TS', schedulerInstanceId: 'i1', isStarted: true, jobCount: 0, jobs: [] } });
    const res = await schedulerService.getJobs();
    expect(res.schedulerName).toBe('TS');
  });

  it('triggerJob default group', async () => {
    post.mockResolvedValue({ data: {} });
    await schedulerService.triggerJob('MyJob');
    expect(post).toHaveBeenCalledWith('/scheduler/jobs/MyJob/trigger?group=DEFAULT');
  });

  it('triggerJob custom group', async () => {
    post.mockResolvedValue({ data: {} });
    await schedulerService.triggerJob('MyJob', 'CUSTOM');
    expect(post).toHaveBeenCalledWith('/scheduler/jobs/MyJob/trigger?group=CUSTOM');
  });

  it('pauseJob', async () => {
    post.mockResolvedValue({ data: {} });
    await schedulerService.pauseJob('MyJob');
    expect(post).toHaveBeenCalled();
  });

  it('resumeJob', async () => {
    post.mockResolvedValue({ data: {} });
    await schedulerService.resumeJob('MyJob');
    expect(post).toHaveBeenCalled();
  });
});
