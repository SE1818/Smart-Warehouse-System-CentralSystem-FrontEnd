
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import apiClient from '@/services/api';
import { userService } from '@/services/userService';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('userService', () => {
  it('getAllUsers returns array', async () => {
    get.mockResolvedValue({ data: [{ id: 'u1', username: 'A', email: 'a@t.com', role: 'STAFF', isActive: true }] });
    const res = await userService.getAllUsers();
    expect(get).toHaveBeenCalledWith('/admin/users');
    expect(Array.isArray(res)).toBe(true);
  });
  it('updateUserRole updates role', async () => {
    put.mockResolvedValue({ data: { id: 'u1', username: 'B', role: 'ADMIN', isActive: true } });
    const res = await userService.updateUserRole('u1', 'ADMIN');
    expect(res.role).toBe('ADMIN');
    expect(put).toHaveBeenCalledWith('/admin/users/u1/role', { role: 'ADMIN' });
  });
  it('updateUserStatus updates status', async () => {
    put.mockResolvedValue({ data: { id: 'u1', username: 'B', isActive: false } });
    const res = await userService.updateUserStatus('u1', false);
    expect(res.isActive).toBe(false);
    expect(put).toHaveBeenCalledWith('/admin/users/u1/status', { isActive: false });
  });
  it('deleteUser calls delete', async () => {
    del.mockResolvedValue({ data: {} });
    await userService.deleteUser('u1');
    expect(del).toHaveBeenCalledWith('/admin/users/u1');
  });
});
