import apiClient from './api';
import type { WarehouseMetric, WarehouseMetricFilters } from '@/types';

export const metricsService = {
  async getWarehouseMetrics(
    warehouseId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<WarehouseMetric[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const url = `/admin/metrics/warehouse/${warehouseId}`;
    const queryString = params.toString();
    const response = await apiClient.get<WarehouseMetric[]>(
      `${url}${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },

  async getMetricsByType(
    metricType: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<WarehouseMetric[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const url = `/admin/metrics/type/${metricType}`;
    const queryString = params.toString();
    const response = await apiClient.get<WarehouseMetric[]>(
      `${url}${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },

  async getLatestMetric(
    warehouseId: string,
    metricType: string
  ): Promise<WarehouseMetric> {
    const response = await apiClient.get<WarehouseMetric>(
      `/admin/metrics/latest/${warehouseId}/${metricType}`
    );
    return response.data;
  },

  async getMetrics(filters?: WarehouseMetricFilters): Promise<WarehouseMetric[]> {
    const params = new URLSearchParams();
    if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId);
    if (filters?.metricType) params.append('metricType', filters.metricType);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const response = await apiClient.get<WarehouseMetric[]>(
      `/admin/metrics${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },
};