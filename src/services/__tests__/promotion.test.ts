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

import { promotionService } from '@/services/promotion';
describe('promotionService', () => {
  it('getPromotions', async () => { get.mockResolvedValue({ data: [] }); await promotionService.getPromotions(); expect(get).toHaveBeenCalledWith('/v1/promotions'); });
  it('createPromotion', async () => { post.mockResolvedValue({ data: { id: 'p1' } }); await promotionService.createPromotion({ code: 'SALE', discount: 10 }); expect(post).toHaveBeenCalledWith('/v1/promotions', { code: 'SALE', discount: 10 }); });
});
