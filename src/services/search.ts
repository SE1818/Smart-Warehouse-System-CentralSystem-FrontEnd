import apiClient from './api';
import type { ProductIndex, AskResponse, SearchResponseGrouped } from '@/types/search';

export const searchService = {
	async searchProducts(query: string, storeId?: string): Promise<ProductIndex[]> {
		const params: Record<string, string> = { q: query };
		if (storeId) params.storeId = storeId;
		const response = await apiClient.get<SearchResponseGrouped | ProductIndex[]>('/v1/search/products', { params });
		const data = response.data;
		if (Array.isArray(data)) return data;
		return data.products ?? [];
	},

	async indexProduct(product: ProductIndex): Promise<{ success: boolean; message: string }> {
		const response = await apiClient.post<{ success: boolean; message: string }>('/v1/search/products/index', product);
		return response.data;
	},

	async askWarehouseAssistant(question: string): Promise<AskResponse | null> {
		const response = await apiClient.post<AskResponse>('/v1/search/ask', { question });
		return response.data;
	},

	async suggestProducts(prefix: string, max: number = 10, storeId?: string): Promise<string[]> {
		const params: Record<string, string | number> = { q: prefix, max };
		if (storeId) params.storeId = storeId;
		const response = await apiClient.get<{ suggestions: string[] }>('/v1/search/suggest', { params });
		return response.data.suggestions;
	},
};
