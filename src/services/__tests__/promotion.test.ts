import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import apiClient from '@/services/api';
import { promotionService, publicPromotionService } from '@/services/promotion';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('promotionService', () => {
  it('createPromotion returns id', async () => {
    post.mockResolvedValue({ data: { id: 'promo1' } });
    const res = await promotionService.createPromotion({ code: 'SAVE10', description: '10% off', type: 'percentage', value: 10, startDate: '2024-01-01', endDate: '2024-12-31', minOrderAmount: 100, maxDiscount: 50, usageLimit: 100 });
    expect(res).toBe('promo1');
  });

  it('createFlashSale returns id', async () => {
    post.mockResolvedValue({ data: 'fs1' });
    const res = await promotionService.createFlashSale({ code: 'FLASH', description: 'Flash', startDate: '2024-01-01', endDate: '2024-01-02', flashSaleProducts: [{ productId: 'p1', flashSalePrice: 50, stockLimit: 100 }] });
    expect(res).toBe('fs1');
  });

  it('listPromotions returns list', async () => {
    get.mockResolvedValue({ data: [] });
    const res = await promotionService.listPromotions({ status: 'active', page: 1, pageSize: 10 });
    expect(Array.isArray(res)).toBe(true);
  });

  it('getPromotion returns one', async () => {
    get.mockResolvedValue({ data: { id: 'p1', code: 'SAVE10' } });
    const res = await promotionService.getPromotion('p1');
    expect(res.id).toBe('p1');
  });

  it('updatePromotion puts data', async () => {
    put.mockResolvedValue({ data: {} });
    await promotionService.updatePromotion('p1', { description: 'Updated', value: 20 });
    expect(put).toHaveBeenCalledWith('/v1/admin/promotions/p1', { description: 'Updated', value: 20 });
  });

  it('deletePromotion calls delete', async () => {
    del.mockResolvedValue({ data: {} });
    await promotionService.deletePromotion('p1');
    expect(del).toHaveBeenCalledWith('/v1/admin/promotions/p1');
  });

  it('expireFlashSales posts and returns result', async () => {
    post.mockResolvedValue({ data: { expiredCount: 3 } });
    const res = await promotionService.expireFlashSales();
    expect(res.expiredCount).toBe(3);
  });
});

describe('publicPromotionService', () => {
  it('validateFlashSale posts and returns isValid', async () => {
    post.mockResolvedValue({ data: { isValid: true, discountAmount: 50 } });
    const res = await publicPromotionService.validateFlashSale({ productId: 'p1', originalPrice: 100, userId: 'u1' });
    expect(res.isValid).toBe(true);
  });

  it('validatePromotion posts and returns isValid', async () => {
    post.mockResolvedValue({ data: { isValid: true, discountAmount: 10 } });
    const res = await publicPromotionService.validatePromotion({ code: 'SAVE10', userId: 'u1', orderId: 'o1', orderAmount: 100 });
    expect(res.isValid).toBe(true);
  });
});
