import apiClient from './api';
import type { ProductIndex, AskResponse } from '@/types/search';

export const searchService = {
  async searchProducts(query: string): Promise<ProductIndex[]> {
    const response = await apiClient.get<ProductIndex[]>('/v1/search/products', {
      params: { q: query },
    });
    return response.data;
  },

  async indexProduct(product: ProductIndex): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/v1/search/products/index', product);
    return response.data;
  },

  async askWarehouseAssistant(question: string): Promise<AskResponse> {
    const response = await apiClient.post<AskResponse>('/v1/search/ask', { question });
    return response.data;
  },

  async suggestProducts(prefix: string, max: number = 10): Promise<string[]> {
    const response = await apiClient.get<{ suggestions: string[] }>('/v1/search/suggest', {
      params: { q: prefix, max },
    });
    return response.data.suggestions;
  },
};
