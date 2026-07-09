import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/services/api';
import { searchService } from '@/services/search';

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockPost = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('searchService', () => {
  it('searchProducts calls query endpoint', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await searchService.searchProducts('phone');
    expect(mockGet).toHaveBeenCalledWith('/v1/search/products', { params: { q: 'phone' } });
  });

  it('indexProduct posts product data', async () => {
    mockPost.mockResolvedValue({ data: { success: true, message: 'Indexed' } });
    await searchService.indexProduct({ id: 'p1', name: 'Phone', description: 'Smart' });
    expect(mockPost).toHaveBeenCalledWith('/v1/search/products/index', { id: 'p1', name: 'Phone', description: 'Smart' });
  });

  it('askWarehouseAssistant posts question', async () => {
    mockPost.mockResolvedValue({ data: { answer: 'Use rack A-3', sourceReferences: [] } });
    const res = await searchService.askWarehouseAssistant('where is phone?');
    expect(res.answer).toBe('Use rack A-3');
  });

  it('suggestProducts with default max', async () => {
    mockGet.mockResolvedValue({ data: { suggestions: ['Phone 11', 'Phone 12'] } });
    const res = await searchService.suggestProducts('phon');
    expect(res).toEqual(['Phone 11', 'Phone 12']);
    expect(mockGet).toHaveBeenCalledWith('/v1/search/suggest', { params: { q: 'phon', max: 10 } });
  });

  it('suggestProducts with custom max', async () => {
    mockGet.mockResolvedValue({ data: { suggestions: ['P'] } });
    await searchService.suggestProducts('p', 5);
    expect(mockGet).toHaveBeenCalledWith('/v1/search/suggest', { params: { q: 'p', max: 5 } });
  });
});
