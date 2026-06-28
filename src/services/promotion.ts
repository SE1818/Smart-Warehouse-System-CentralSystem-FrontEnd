import apiClient from './api';
import type {
  PromotionDto,
  CreatePromotionRequest,
  CreateFlashSaleRequest,
  UpdatePromotionRequest,
  FlashSaleValidationResult,
  ValidateFlashSaleRequest,
  ValidatePromotionRequest,
  PromotionResultDto,
  ExpireFlashSalesResult,
} from '@/types/promotion';

// Admin endpoints
export const promotionService = {
  async createPromotion(request: CreatePromotionRequest): Promise<string> {
    const response = await apiClient.post<{ id: string }>('/v1/admin/promotions', request);
    return response.data.id;
  },

  // Flash Sales use a SEPARATE endpoint: POST /v1/public/flashsales
  async createFlashSale(request: CreateFlashSaleRequest): Promise<string> {
    const response = await apiClient.post<string>('/v1/public/flashsales', request);
    return response.data;
  },

  async listPromotions(params?: {
    status?: string;
    code?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PromotionDto[]> {
    const response = await apiClient.get<PromotionDto[]>('/v1/admin/promotions', { params });
    return response.data;
  },

  async getPromotion(id: string): Promise<PromotionDto> {
    const response = await apiClient.get<PromotionDto>(`/v1/admin/promotions/${id}`);
    return response.data;
  },

  async updatePromotion(id: string, request: UpdatePromotionRequest): Promise<void> {
    await apiClient.put(`/v1/admin/promotions/${id}`, request);
  },

  async deletePromotion(id: string): Promise<void> {
    await apiClient.delete(`/v1/admin/promotions/${id}`);
  },

  async expireFlashSales(): Promise<ExpireFlashSalesResult> {
    const response = await apiClient.post<ExpireFlashSalesResult>('/v1/public/flashsales/expire', {});
    return response.data;
  },
};

// Public endpoints (for checkout)
export const publicPromotionService = {
  async validateFlashSale(request: ValidateFlashSaleRequest): Promise<FlashSaleValidationResult> {
    const response = await apiClient.post<FlashSaleValidationResult>('/v1/public/flashsales/validate', request);
    return response.data;
  },

  async validatePromotion(request: ValidatePromotionRequest): Promise<PromotionResultDto> {
    const response = await apiClient.post<PromotionResultDto>('/v1/public/promotions/validate', request);
    return response.data;
  },
};
