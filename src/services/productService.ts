import apiClient from './api';
import type { Product } from '@/types';

export const productService = {
  /**
   * Fetch all products
   * GET /api/products
   */
  async getProducts(): Promise<Product[]> {
    const res = await apiClient.get<Product[]>('/products');
    return res.data;
  }
};
