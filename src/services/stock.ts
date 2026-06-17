import apiClient from './api';
import type { Warehouse, Product, StockLevel, StockMovement, AdjustStockRequest } from '@/types/stock';

export const stockService = {
  async getWarehouses(): Promise<Warehouse[]> {
    const res = await apiClient.get<Warehouse[]>('/api/v1/warehouses');
    return res.data;
  },

  async getWarehouse(id: string): Promise<Warehouse> {
    const res = await apiClient.get<Warehouse>(`/api/v1/warehouses/${id}`);
    return res.data;
  },

  async createWarehouse(data: Omit<Warehouse, 'id' | 'createdAt'>): Promise<Warehouse> {
    const res = await apiClient.post<Warehouse>('/api/v1/warehouses', data);
    return res.data;
  },

  async updateWarehouse(
    id: string,
    data: Partial<Omit<Warehouse, 'id' | 'createdAt'>>
  ): Promise<Warehouse> {
    const res = await apiClient.put<Warehouse>(`/api/v1/warehouses/${id}`, data);
    return res.data;
  },

  async deleteWarehouse(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/warehouses/${id}`);
  },

  async getStockLevels(): Promise<StockLevel[]> {
    const res = await apiClient.get<StockLevel[]>('/api/v1/stocklevels');
    return res.data;
  },

  async getStockLevelsByWarehouse(warehouseId: string): Promise<StockLevel[]> {
    const res = await apiClient.get<StockLevel[]>(
      `/api/v1/stocklevels/warehouse/${warehouseId}`
    );
    return res.data;
  },

  async getStockLevelsByProduct(productId: string): Promise<StockLevel[]> {
    const res = await apiClient.get<StockLevel[]>(
      `/api/v1/stocklevels/product/${productId}`
    );
    return res.data;
  },

  async getStockMovements(): Promise<StockMovement[]> {
    const res = await apiClient.get<StockMovement[]>('/api/v1/stockmovements');
    return res.data;
  },

  async getStockMovementsByWarehouse(warehouseId: string): Promise<StockMovement[]> {
    const res = await apiClient.get<StockMovement[]>(
      `/api/v1/stockmovements/warehouse/${warehouseId}`
    );
    return res.data;
  },

  async getStockMovementsByProduct(productId: string): Promise<StockMovement[]> {
    const res = await apiClient.get<StockMovement[]>(
      `/api/v1/stockmovements/product/${productId}`
    );
    return res.data;
  },

  async adjustStock(
    productId: string,
    warehouseId: string,
    data: AdjustStockRequest
  ): Promise<StockLevel> {
    const res = await apiClient.post<StockLevel>(
      `/api/v1/stockadjustments?productId=${productId}&warehouseId=${warehouseId}`,
      data
    );
    return res.data;
  },

  async getProducts(): Promise<Product[]> {
    const res = await apiClient.get<Product[]>('/api/v1/products');
    return res.data;
  },
};
