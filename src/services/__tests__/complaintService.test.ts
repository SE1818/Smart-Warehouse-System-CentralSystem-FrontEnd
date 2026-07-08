import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import apiClient from '@/services/api';
import { complaintService } from '@/services/complaintService';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('complaintService', () => {
  it('getAllComplaints returns list', async () => {
    const data = [{ id: 'c1', userId: 'u1', userEmail: 't@t.com', title: 'T', content: 'C', status: 'Pending', createdAt: '2024-01-01' }];
    get.mockResolvedValue({ data });
    const res = await complaintService.getAllComplaints();
    expect(res[0].status).toBe('Pending');
  });

  it('getAllComplaints returns empty array', async () => {
    get.mockResolvedValue({ data: [] });
    const res = await complaintService.getAllComplaints();
    expect(res).toEqual([]);
  });

  it('respondToComplaint posts response', async () => {
    post.mockResolvedValue({ data: { id: 'c1', status: 'Resolved', adminResponse: 'Fixed', resolvedAt: '2024-01-02', createdAt: '2024-01-01' } });
    const res = await complaintService.respondToComplaint('c1', 'We fixed it');
    expect(res.status).toBe('Resolved');
    expect(res.adminResponse).toBe('Fixed');
  });
});
