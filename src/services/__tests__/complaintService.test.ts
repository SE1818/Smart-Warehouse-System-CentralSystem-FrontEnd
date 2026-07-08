import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/services/api', () => {
  const m = { get: vi.fn(), post: vi.fn() };
  return { __esModule: true, default: m };
});
import apiClient from '@/services/api';
const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;
beforeEach(() => vi.clearAllMocks());
import { complaintService } from '@/services/complaintService';
describe('complaintService', () => {
  it('getAllComplaints returns list', async () => {
    get.mockResolvedValue({ data: [{ id: 'c1', userId: 'u1', userEmail: 't@t.com', title: 'T', content: 'C', status: 'Pending', createdAt: '2024-01-01' }] });
    const res = await complaintService.getAllComplaints();
    expect(get).toHaveBeenCalledWith('/admin/complaints');
    expect(res[0].status).toBe('Pending');
  });
  it('respondToComplaint posts response and returns updated', async () => {
    post.mockResolvedValue({ data: { id: 'c1', status: 'Resolved', adminResponse: 'Fixed', resolvedAt: '2024-01-02', createdAt: '2024-01-01' } });
    const res = await complaintService.respondToComplaint('c1', 'We fixed it');
    expect(post).toHaveBeenCalledWith('/admin/complaints/c1/respond', { response: 'We fixed it' });
    expect(res.status).toBe('Resolved');
    expect(res.adminResponse).toBe('Fixed');
  });
});
