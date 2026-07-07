import apiClient from './api';
import type { Product } from '@/types';

export const productService = {
	async getProducts(): Promise<Product[]> {
		const res = await apiClient.get<Product[]>('/v1/stock/products');
		return res.data;
	},

	async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
		const res = await apiClient.post<Product>('/v1/stock/products', product);
		return res.data;
	},

	async updateProduct(id: string, product: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product> {
		const res = await apiClient.put<Product>(`/v1/stock/products/${id}`, product);
		return res.data;
	},

	async deleteProduct(id: string): Promise<void> {
		await apiClient.delete(`/v1/stock/products/${id}`);
	},

	async uploadImage(productId: string, file: File): Promise<{ url: string }> {
		const formData = new FormData();
		formData.append('file', file);
		const res = await apiClient.post<{ url: string }>(`/v1/stock/products/${productId}/upload-image`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
		});
		return res.data;
	},
};
