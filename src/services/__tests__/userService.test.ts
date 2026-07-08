import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiClient = { get: vi.fn() as any, put: vi.fn() as any };

vi.mock('@/services/api', () => ({ __esModule: true, default: apiClient }));

import { userService } from '@/services/userService';

const { get, put } = apiClient;

beforeEach(() => { vi.clearAllMocks(); });

describe('userService', () => {
  it('getUsers fetches list', async () => {
    get.mockResolvedValue({ data: [{ id: 'u1', name: 'A' }] });
    const res = await userService.getUsers();
    expect(get).toHaveBeenCalledWith('/admin/users');
    expect(res).toHaveLength(1);
  });

  it('updateUser puts data', async () => {
    put.mockResolvedValue({ data: { id: 'u1', name: 'B' } });
    const res = await userService.updateUser('u1', { name: 'B', role: 'STAFF' });
    expect(put).toHaveBeenCalledWith('/admin/users/u1', {
name: 'B',
role: 'STAFF',
    });
    expect(res.name).toBe('B');
  });

  it('getUserDetail returns user', async () => {
    get.mockResolvedValue({ data: { id: 'u1', name: 'C' } });
    await userService.getUserDetail('u1');
    expect(get).toHaveBeenCalledWith('/admin/users/u1');
  });
});
