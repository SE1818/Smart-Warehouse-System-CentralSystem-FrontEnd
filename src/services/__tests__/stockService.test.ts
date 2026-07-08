import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import apiClient from '@/services/api';
import { stockService } from '@/services/stock';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('stockService', () => {
  it('getWarehouses', async () => {
    get.mockResolvedValue({ data: [{ id: 'w1' }] });
    const res = await stockService.getWarehouses();
    expect(Array.isArray(res)).toBe(true);
  });
  it('getWarehouse', async () => {
    get.mockResolvedValue({ data: { id: 'w1' } });
    const res = await stockService.getWarehouse('w1');
    expect(res.id).toBe('w1');
  });
  it('createWarehouse', async () => {
    post.mockResolvedValue({ data: { id: 'w1' } });
    const res = await stockService.createWarehouse({ name: 'NEw', location: 'loc', capacity: 100, currentStock: 0 });
    expect(res.id).toBe('w1');
  });
  it('updateWarehouse', async () => {
    put.mockResolvedValue({ data: { id: 'w1' } });
    const res = await stockService.updateWarehouse('w1', { name: 'UPD' });
    expect(res.id).toBe('w1');
  });
  it('deleteWarehouse', async () => {
    del.mockResolvedValue({ data: {} });
    await stockService.deleteWarehouse('w1');
    expect(del).toHaveBeenCalledWith('/v1/warehouses/w1');
  });
  it('getStockLevels', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getStockLevels();
    expect(get).toHaveBeenCalledWith('/v1/stocklevels');
  });
  it('getStockLevelsByWarehouse', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getStockLevelsByWarehouse('w1');
    expect(get).toHaveBeenCalledWith('/v1/stocklevels/warehouse/w1');
  });
  it('getStockLevelsByProduct', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getStockLevelsByProduct('p1');
    expect(get).toHaveBeenCalledWith('/v1/stocklevels/product/p1');
  });
  it('getStockMovements', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getStockMovements();
    expect(get).toHaveBeenCalledWith('/v1/stockmovements');
  });
  it('getStockMovementsByWarehouse', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getStockMovementsByWarehouse('w1');
    expect(get).toHaveBeenCalledWith('/v1/stockmovements/warehouse/w1');
  });
  it('getStockMovementsByProduct', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getStockMovementsByProduct('p1');
    expect(get).toHaveBeenCalledWith('/v1/stockmovements/product/p1');
  });
  it('adjustStock builds query string', async () => {
    post.mockResolvedValue({ data: { productId: 'p1', quantity: 105 } });
    await stockService.adjustStock('p1', 'w1', { quantityChange: 5, reason: 'add' });
    expect(post).toHaveBeenCalledWith('/v1/stockadjustments?productId=p1&warehouseId=w1', { quantityChange: 5, reason: 'add' });
  });
  it('getProducts', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getProducts();
    expect(get).toHaveBeenCalledWith('/v1/stock/products');
  });
});
