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
import { stockService } from '@/services/stock';
describe('stockService', () => {
  it('adjustStock with warehouseId', async () => {
    post.mockResolvedValue({ data: {} });
    await stockService.adjustStock('p1', 'w1', { quantityChange: 5, reason: 'add' });
    expect(post).toHaveBeenCalledWith('/v1/stockadjustments?productId=p1&warehouseId=w1', { quantityChange: 5, reason: 'add' });
  });
  it('getProducts', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getProducts();
    expect(get).toHaveBeenCalledWith('/v1/stock/products');
  });
  it('getWarehouseStock', async () => {
    get.mockResolvedValue({ data: [{ productId: 'p1', quantity: 100 }] });
    await stockService.getWarehouseStock('w1');
    expect(get).toHaveBeenCalledWith('/v1/warehouses/w1/stock');
  });
  it('getStockMovements', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getStockMovements('p1');
    expect(get).toHaveBeenCalledWith('/v1/stock/products/p1/movements');
  });
  it('getLowStockAlerts', async () => {
    get.mockResolvedValue({ data: [{ productId: 'p1', currentStock: 2 }] });
    const res = await stockService.getLowStockAlerts();
    expect(res[0].productId).toBe('p1');
  });
});
