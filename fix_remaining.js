import fs from 'fs';

// Fix stockMore with actual method names from stock.ts
fs.writeFileSync('src/services/__tests__/stockMore.test.ts', `import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/services/api', () => {
  const m = { get: vi.fn(), post: vi.fn() };
  return { __esModule: true, default: m };
});
import apiClient from '@/services/api';
import { stockService } from '@/services/stock';
const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
beforeEach(() => vi.clearAllMocks());
describe('stockService', () => {
  it('getStockLevels', async () => {
    get.mockResolvedValue({ data: [{ productId: 'p1', warehouseId: 'w1', quantity: 100 }] });
    const res = await stockService.getStockLevels();
    expect(get).toHaveBeenCalledWith('/v1/stock');
    expect(res[0].quantity).toBe(100);
  });
  it('getStockLevelsByWarehouse', async () => {
    get.mockResolvedValue({ data: [{ productId: 'p1', quantity: 50 }] });
    const res = await stockService.getStockLevelsByWarehouse('w1');
    expect(get).toHaveBeenCalledWith('/v1/warehouses/w1/stock-levels');
    expect(res[0].quantity).toBe(50);
  });
  it('getStockLevelsByProduct', async () => {
    get.mockResolvedValue({ data: [{ warehouseId: 'w1', quantity: 30 }] });
    const res = await stockService.getStockLevelsByProduct('p1');
    expect(get).toHaveBeenCalledWith('/v1/products/p1/stock-levels');
    expect(res[0].warehouseId).toBe('w1');
  });
  it('adjustStock', async () => {
    post.mockResolvedValue({ data: {} });
    await stockService.adjustStock('p1', 'w1', { quantityChange: 5, reason: 'add' });
    expect(post).toHaveBeenCalledWith('/v1/stockadjustments?productId=p1&warehouseId=w1', { quantityChange: 5, reason: 'add' });
  });
  it('getProducts', async () => {
    get.mockResolvedValue({ data: [] });
    await stockService.getProducts();
    expect(get).toHaveBeenCalledWith('/v1/stock/products');
  });
});
`);

// Also update serviceLayer.test.ts robotService methods (uses correct names already)
// Fix robot.test.ts - needs getAreas, getStations, moveRobot, updateRobotStatus, fulfillOrder
// Robot service already correct - just verify file
console.log('stockMore rewritten');
console.log('');

// Check what authService actually exports to fix authService.test.ts
const authSrc = fs.readFileSync('src/services/auth.ts', 'utf8');
console.log('auth.ts methods found:', [...authSrc.matchAll(/async (\w+)\(/g)].map(m => m[1]).join(', '));
