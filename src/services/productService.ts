import apiClient from './api';
import type { Product } from '@/types/stock';

export const productService = {
  async getProducts(): Promise<Product[]> {
    const res = await apiClient.get<Product[]>('/api/v1/products');
    return res.data;
  }
};
