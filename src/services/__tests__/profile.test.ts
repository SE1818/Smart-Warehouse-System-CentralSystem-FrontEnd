import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), put: vi.fn() },
}));

import apiClient from '@/services/api';
import { profileService } from '@/services/profile';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockPut = apiClient.put as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('profileService', () => {
  it('getProfile calls correct URL', async () => {
    mockGet.mockResolvedValue({ data: { id: 'u1', username: 'U', email: 'u@t.com', role: 'Admin', isActive: true } });
    const res = await profileService.getProfile();
    expect(mockGet).toHaveBeenCalledWith('/v1/account/me');
    expect(res.username).toBe('U');
  });

  it('updateProfile calls correct URL with body', async () => {
    mockPut.mockResolvedValue({ data: { id: 'u1', username: 'Updated' } });
    const res = await profileService.updateProfile({ firstName: 'New' });
    expect(mockPut).toHaveBeenCalledWith('/v1/account/profile', { firstName: 'New' });
    expect(res.username).toBe('Updated');
  });
});
