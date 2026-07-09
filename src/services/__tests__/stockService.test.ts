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
  it('getWarehouses returns array', async () => {
    get.mockResolvedValue({ data: [{ id: 'w1', name: 'WH1' }] });
    const res = await stockService.getWarehouses();
    expect(res[0].name).toBe('WH1');
  });

  it('getWarehouse returns one', async () => {
    get.mockResolvedValue({ data: { id: 'w1', code: 'WH1', name: 'WH1', address: 'Addr', isActive: true } });
    const res = await stockService.getWarehouse('w1');
    expect(res.code).toBe('WH1');
  });

  it('getStockLevels calls correct URL', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getStockLevels();
    expect(get).toHaveBeenCalledWith('/v1/stocklevels');
  });

  it('getStockMovements calls correct URL', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getStockMovements();
    expect(get).toHaveBeenCalledWith('/v1/stockmovements');
  });

  it('adjustStock creates response with all fields', async () => {
    post.mockResolvedValue({ data: { id: 'sl1', productId: 'p1', warehouseId: 'w1', quantity: 105, stockMovementId: 'sm1', note: 'added', stockMovementType: 'IMPORT', createdAt: '2024-01-01T00:00:00Z' } });
    const res = await stockService.adjustStock('p1', 'w1', { quantityChange: 5, type: 1, note: 'added' });
    expect(res.id).toBe('sl1');
    expect(res.quantity).toBe(105);
  });

  it('createWarehouse with correct fields', async () => {
    post.mockResolvedValue({ data: { id: 'w1', code: 'WH-NEW', name: 'NEW', address: '123 St', isActive: true } });
    const res = await stockService.createWarehouse({ code: 'WH-NEW', name: 'NEW', address: '123 St', isActive: true });
    expect(res.id).toBe('w1');
  });

  it('updateWarehouse', async () => {
    put.mockResolvedValue({ data: { id: 'w1', name: 'UPD' } });
    const res = await stockService.updateWarehouse('w1', { name: 'UPD' });
    expect(res.name).toBe('UPD');
  });

  it('deleteWarehouse', async () => {
    del.mockResolvedValue({ data: {} });
    await stockService.deleteWarehouse('w1');
    expect(del).toHaveBeenCalledWith('/v1/warehouses/w1');
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

  it('adjustStock with quantityChange and note', async () => {
    post.mockResolvedValue({ data: { productId: 'p1', quantity: 105 } });
    await stockService.adjustStock('p1', 'w1', { quantityChange: 5, type: 2, note: 'add' });
    expect(post).toHaveBeenCalledWith('/v1/stockadjustments?productId=p1&warehouseId=w1', { quantityChange: 5, type: 2, note: 'add' });
  });

  it('getProducts calls correct URL', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getProducts();
    expect(get).toHaveBeenCalledWith('/v1/stock/products');
  });

  it('getStockLevels returns array', async () => {
    get.mockResolvedValue({ data: [{ id: 'sl1', productId: 'p1', warehouseId: 'w1', quantity: 100 }] });
    const res = await stockService.getStockLevels();
    expect(res[0].productId).toBe('p1');
  });

  it('getStockMovements returns array', async () => {
    get.mockResolvedValue({ data: [{ id: 'sm1', productId: 'p1', warehouseId: 'w1', quantity: -5, type: 1, createdAt: '2024-01-01' }] });
    const res = await stockService.getStockMovements();
    expect(res[0].quantity).toBe(-5);
  });
});
