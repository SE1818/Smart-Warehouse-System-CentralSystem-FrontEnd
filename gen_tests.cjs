const fs = require("fs");
const path = "src/services/__tests__/";

// Template: const variables inside factory (NOT external)
const tmpl = ({ service, importStmt, tests }) => `import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPut = vi.fn();
  const mockDelete = vi.fn();
  return {
    __esModule: true,
    default: {
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
    },
  };
});

import apiClient from '@/services/api';
${importStmt}

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('${service}', () => {
${tests}
});
`;

const files = {};

files["statistics.test.ts"] = tmpl({
  service: "statisticsService",
  importStmt: "import { statisticsService } from '@/services/statistics';",
  tests: `
  it('getStatistics returns stats', async () => {
    get.mockResolvedValue({ data: { totalOrders: 100, revenue: 5000 } });
    const res = await statisticsService.getStatistics();
    expect(res.totalOrders).toBe(100);
  });

  it('getStatisticsByWarehouse', async () => {
    get.mockResolvedValue({ data: { warehouseId: 'w1', count: 50 } });
    const res = await statisticsService.getStatisticsByWarehouse('w1');
    expect(res.warehouseId).toBe('w1');
  });
`,
});

files["promotion.test.ts"] = tmpl({
  service: "promotionService",
  importStmt: "import { promotionService } from '@/services/promotion';",
  tests: `
  it('getPromotions returns list', async () => {
    get.mockResolvedValue({ data: [{ id: 'p1', code: 'SAVE10' }] });
    const res = await promotionService.getPromotions();
    expect(res[0].code).toBe('SAVE10');
  });

  it('createPromotion posts', async () => {
    post.mockResolvedValue({ data: { id: 'p1', code: 'NEW' } });
    const res = await promotionService.createPromotion({ code: 'NEW', discount: 10 });
    expect(res.id).toBe('p1');
  });

  it('deletePromotion calls delete', async () => {
    del.mockResolvedValue({ data: {} });
    await promotionService.deletePromotion('p1');
    expect(del).toHaveBeenCalled();
  });

  it('applyPromotion posts apply', async () => {
    post.mockResolvedValue({ data: { applied: true } });
    const res = await promotionService.applyPromotion('SAVE10', 'o1');
    expect(res.applied).toBe(true);
  });
`,
});

files["wallet.test.ts"] = tmpl({
  service: "walletService",
  importStmt: "import { walletService } from '@/services/wallet';",
  tests: `
  it('getWallet returns wallet', async () => {
    get.mockResolvedValue({ data: { id: 'w1', balance: 1000 } });
    const res = await walletService.getWallet();
    expect(res.balance).toBe(1000);
  });

  it('deposit posts amount', async () => {
    post.mockResolvedValue({ data: { balance: 1500 } });
    const res = await walletService.deposit({ amount: 500 });
    expect(res.balance).toBe(1500);
  });

  it('withdraw posts amount', async () => {
    post.mockResolvedValue({ data: { balance: 500 } });
    const res = await walletService.withdraw({ amount: 500 });
    expect(res.balance).toBe(500);
  });

  it('getTransactions returns list', async () => {
    get.mockResolvedValue({ data: [{ id: 't1', type: 'DEPOSIT' }] });
    const res = await walletService.getTransactions();
    expect(res[0].type).toBe('DEPOSIT');
  });
`,
});

files["product.test.ts"] = tmpl({
  service: "productService",
  importStmt: "import { productService } from '@/services/productService';",
  tests: `
  it('getProducts returns list', async () => {
    get.mockResolvedValue({ data: [{ id: 'p1', name: 'Item' }] });
    const res = await productService.getProducts();
    expect(res[0].name).toBe('Item');
  });

  it('getProduct detail', async () => {
    get.mockResolvedValue({ data: { id: 'p1', name: 'Item', price: 100 } });
    const res = await productService.getProduct('p1');
    expect(res.name).toBe('Item');
  });

  it('createProduct posts', async () => {
    post.mockResolvedValue({ data: { id: 'p1', name: 'N' } });
    const res = await productService.createProduct({ name: 'N', price: 50 });
    expect(res.id).toBe('p1');
  });
`,
});

files["scheduler.test.ts"] = tmpl({
  service: "schedulerService",
  importStmt: "import { schedulerService } from '@/services/scheduler';",
  tests: `
  it('getSchedules returns list', async () => {
    get.mockResolvedValue({ data: [{ id: 's1', type: 'daily' }] });
    const res = await schedulerService.getSchedules();
    expect(res[0].type).toBe('daily');
  });

  it('createSchedule posts', async () => {
    post.mockResolvedValue({ data: { id: 's1' } });
    const res = await schedulerService.createSchedule({ type: 'hourly' });
    expect(res.id).toBe('s1');
  });

  it('deleteSchedule', async () => {
    del.mockResolvedValue({ data: {} });
    await schedulerService.deleteSchedule('s1');
    expect(del).toHaveBeenCalled();
  });
`,
});

files["search.test.ts"] = tmpl({
  service: "searchService",
  importStmt: "import { searchService } from '@/services/search';",
  tests: `
  it('searchProducts calls correct endpoint', async () => {
    get.mockResolvedValue({ data: [{ id: 'p1', name: 'found' }] });
    const res = await searchService.searchProducts('query');
    expect(res[0].name).toBe('found');
  });

  it('getSuggestions returns suggestions', async () => {
    get.mockResolvedValue({ data: ['suggestion1', 'suggestion2'] });
    const res = await searchService.getSuggestions('que');
    expect(res).toHaveLength(2);
  });
`,
});

let written = 0;
for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path + name, content);
  console.log("✓", name);
  written++;
}
console.log("Written", written, "test files");
