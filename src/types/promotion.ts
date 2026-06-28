export type PromotionType = 'percentage' | 'fixed' | 'flashSale';
export type PromotionStatus = 'active' | 'inactive' | 'expired' | 'upcoming';

export interface FlashSaleProductItem {
  productId: string;
  flashSalePrice: number;
  stockLimit: number;
}

export interface FlashSaleProductDto {
  id: string;
  productId: string;
  flashSalePrice: number;
  stockLimit: number;
  soldCount: number;
}

export interface PromotionDto {
  id: string;
  code: string;
  description: string;
  type: PromotionType;
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  status: PromotionStatus;
  createdAt: string;
  updatedAt?: string;
  flashSaleProducts: FlashSaleProductDto[];
}

// Used for creating percentage / fixed promotions -- maps to CreatePromotionCommand
export interface CreatePromotionRequest {
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  startDate: string;
  endDate: string;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit: number;
}

// Used for creating Flash Sales -- maps to CreateFlashSaleCommand (separate endpoint)
export interface CreateFlashSaleRequest {
  code: string;
  description: string;
  startDate: string;
  endDate: string;
  flashSaleProducts?: FlashSaleProductItem[];
}

export interface UpdatePromotionRequest {
  id?: string;
  description?: string;
  type?: PromotionType;
  value?: number;
  startDate?: string;
  endDate?: string;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  status?: number;
}

export interface ValidateFlashSaleRequest {
  productId: string;
  originalPrice: number;
  userId: string;
}

export interface FlashSaleValidationResult {
  isValid: boolean;
  discountAmount?: number;
  flashSalePrice?: number;
  errorMessage?: string;
  promotionCode?: string;
  description?: string;
}

export interface ValidatePromotionRequest {
  code: string;
  userId: string;
  orderId: string;
  orderAmount: number;
}

export interface PromotionResultDto {
  isValid: boolean;
  discountAmount?: number;
  errorMessage: string;
  promotionCode?: string;
  description?: string;
}

export interface ExpireFlashSalesResult {
  expiredCount: number;
}
