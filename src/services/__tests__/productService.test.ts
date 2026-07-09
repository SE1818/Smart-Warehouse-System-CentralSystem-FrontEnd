import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import apiClient from '@/services/api';
import { productService } from '@/services/productService';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;
const put = apiClient.put as ReturnType<typeof vi.fn>;
const del = apiClient.delete as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('productService', () => {
  it('getProducts returns array', async () => {
    get.mockResolvedValue({ data: [{ id: 'p1', name: 'X' }] });
    const res = await productService.getProducts();
    expect(res[0].name).toBe('X');
  });

  it('createProduct returns created (with stockQuantity)', async () => {
    post.mockResolvedValue({ data: { id: 'p1', name: 'New', category: 'cat', stockQuantity: 5 } });
    const res = await productService.createProduct({ name: 'New', price: 10, category: 'cat', image: 'img', description: 'desc', sku: 'SKU-001', stockQuantity: 5, unit: 'pcs' });
    expect(res.id).toBe('p1');
  });

  it('updateProduct returns updated', async () => {
    put.mockResolvedValue({ data: { id: 'p1', name: 'Upd' } });
    const res = await productService.updateProduct('p1', { name: 'Upd' });
    expect(res.name).toBe('Upd');
  });

  it('deleteProduct', async () => {
    del.mockResolvedValue({ data: {} });
    await productService.deleteProduct('p1');
    expect(del).toHaveBeenCalled();
  });

  it('uploadImage', async () => {
    post.mockResolvedValue({ data: { url: 'https://s3/x' } });
    const res = await productService.uploadImage('p1', new File(['x'], 't.png', { type: 'image/png' }));
    expect(res.url).toBe('https://s3/x');
  });
});
