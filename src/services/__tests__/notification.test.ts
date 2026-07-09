import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/services/api';
import { notificationService } from '@/services/notification';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('notificationService', () => {
  it('getUserNotifications calls correct URL', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await notificationService.getUserNotifications('u1');
    expect(mockGet).toHaveBeenCalledWith('/v1/notifications/user/u1');
  });

  it('getAllNotifications with pagination', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await notificationService.getAllNotifications(2, 20);
    expect(mockGet).toHaveBeenCalledWith('/v1/notifications?page=2&pageSize=20');
  });

  it('getAllNotifications defaults page 1 size 50', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await notificationService.getAllNotifications();
    expect(mockGet).toHaveBeenCalledWith('/v1/notifications?page=1&pageSize=50');
  });

  it('sendNotification posts data', async () => {
    mockPost.mockResolvedValue({ data: { id: 'n1', message: 'Hello' } });
    const res = await notificationService.sendNotification({ userId: 'u1', title: 'Hi', message: 'Hello' });
    expect(res.id).toBe('n1');
    expect(mockPost).toHaveBeenCalledWith('/v1/notifications', { userId: 'u1', title: 'Hi', message: 'Hello' });
  });
});
