
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
    const res = await promotionService.createPromotion({ code: 'SAVE10', discountType: 'PERCENT', discountValue: 10, startDate: '2024-01-01', endDate: '2024-12-31' });
    expect(res).toBe('promo1');
  });
  it('createFlashSale returns id', async () => {
    post.mockResolvedValue({ data: 'fs1' });
    const res = await promotionService.createFlashSale({ productId: 'p1', flashPrice: 50, maxQuantity: 100, startTime: '2024-01-01T00:00:00Z', endTime: '2024-01-02T00:00:00Z' });
    expect(res).toBe('fs1');
  });
  it('listPromotions returns filtered list', async () => {
    get.mockResolvedValue({ data: [{ id: 'p1', code: 'SAVE10' }] });
    const res = await promotionService.listPromotions({ status: 'ACTIVE', page: 1, pageSize: 10 });
    expect(res[0].code).toBe('SAVE10');
    expect(get).toHaveBeenCalledWith('/v1/admin/promotions', { params: { status: 'ACTIVE', page: 1, pageSize: 10 } });
  });
  it('getPromotion returns one', async () => {
    get.mockResolvedValue({ data: { id: 'p1', code: 'SAVE10' } });
    const res = await promotionService.getPromotion('p1');
    expect(res.id).toBe('p1');
  });
  it('updatePromotion puts data', async () => {
    put.mockResolvedValue({ data: {} });
    await promotionService.updatePromotion('p1', { discountValue: 20 });
    expect(put).toHaveBeenCalledWith('/v1/admin/promotions/p1', { discountValue: 20 });
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
  it('validateFlashSale posts and returns result', async () => {
    post.mockResolvedValue({ data: { valid: true, flashPrice: 50 } });
    const res = await publicPromotionService.validateFlashSale({ productId: 'p1', quantity: 2 });
    expect(res.valid).toBe(true);
    expect(res.flashPrice).toBe(50);
  });
  it('validatePromotion posts and returns result', async () => {
    post.mockResolvedValue({ data: { valid: true, discountedPrice: 90 } });
    const res = await publicPromotionService.validatePromotion({ code: 'SAVE10', orderAmount: 100 });
    expect(res.valid).toBe(true);
    expect(res.discountedPrice).toBe(90);
  });
});
