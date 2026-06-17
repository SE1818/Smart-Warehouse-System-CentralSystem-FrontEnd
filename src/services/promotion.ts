import apiClient from './api';
import type {
  PromotionDto,
  CreatePromotionRequest,
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
    const response = await apiClient.post<{ id: string }>('/api/v1/admin/promotions', request);
    return response.data.id;
  },

  async listPromotions(params?: {
    type?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PromotionDto[]> {
    const response = await apiClient.get<PromotionDto[]>('/api/v1/admin/promotions', { params });
    return response.data;
  },

  async getPromotion(id: string): Promise<PromotionDto> {
    const response = await apiClient.get<PromotionDto>(`/api/v1/admin/promotions/${id}`);
    return response.data;
  },

  async updatePromotion(id: string, request: UpdatePromotionRequest): Promise<void> {
    await apiClient.put(`/api/v1/admin/promotions/${id}`, request);
  },

  async deletePromotion(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/admin/promotions/${id}`);
  },

  async expireFlashSales(): Promise<ExpireFlashSalesResult> {
    const response = await apiClient.post<ExpireFlashSalesResult>('/api/v1/public/flashsales/expire', {});
    return response.data;
  },
};

// Public endpoints (for checkout)
export const publicPromotionService = {
  async validateFlashSale(request: ValidateFlashSaleRequest): Promise<FlashSaleValidationResult> {
    const response = await apiClient.post<FlashSaleValidationResult>('/api/v1/public/flashsales/validate', request);
    return response.data;
  },

  async validatePromotion(request: ValidatePromotionRequest): Promise<PromotionResultDto> {
    const response = await apiClient.post<PromotionResultDto>('/api/v1/public/promotions/validate', request);
    return response.data;
  },
};
