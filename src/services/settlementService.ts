import apiClient from './api';

export interface SettlementDto {
  id: string;
  storeId: string;
  orderId: string;
  subtotal: number;
  platformFee: number;
  netAmount: number;
  deliveryFee: number;
  status: 'Pending' | 'Completed' | 'Failed';
  settledAt: string;
  createdAt: string;
  notes?: string;
}

export interface PendingSettlementsResponse {
  storeId: string;
  pendingSettlements: SettlementDto[];
  totalPendingAmount: number;
  count: number;
}

export interface PayoutTransactionDto {
  id: string;
  storeId: string;
  storeManagerId: string;
  totalAmount: number;
  settlementCount: number;
  status: 'Pending' | 'Completed' | 'Failed';
  processedAt?: string;
  createdAt: string;
}

export interface WithdrawRequest {
  storeManagerId: string;
  storeId: string;
  amount: number;
  notes?: string;
}

export interface WithdrawResponse {
  payoutTransactionId: string;
  message: string;
}

export interface StoreWalletBalanceResponse {
  storeManagerId: string;
  balance: number;
}

export const settlementService = {
  async getStoreSettlements(storeId: string, from?: string, to?: string): Promise<SettlementDto[]> {
    const params = { from, to };
    const response = await apiClient.get<SettlementDto[]>(`/v1/settlements/store/${storeId}`, { params });
    return response.data;
  },

  async getStorePendingSettlements(storeId: string): Promise<PendingSettlementsResponse> {
    const response = await apiClient.get<PendingSettlementsResponse>(`/v1/settlements/store/${storeId}/pending`);
    return response.data;
  },

  async getManagerPayoutHistory(managerId: string, page = 1, pageSize = 20): Promise<PayoutTransactionDto[]> {
    const params = { page, pageSize };
    const response = await apiClient.get<PayoutTransactionDto[]>(`/v1/payouts/manager/${managerId}`, { params });
    return response.data;
  },

  async getPayoutById(id: string): Promise<PayoutTransactionDto> {
    const response = await apiClient.get<PayoutTransactionDto>(`/v1/payouts/${id}`);
    return response.data;
  },

  async withdrawStoreFunds(request: WithdrawRequest): Promise<WithdrawResponse> {
    const response = await apiClient.post<WithdrawResponse>('/v1/payouts/withdraw', request);
    return response.data;
  },

  async getStoreWalletBalance(managerId: string): Promise<StoreWalletBalanceResponse> {
    const response = await apiClient.get<StoreWalletBalanceResponse>(`/v1/payouts/store-wallet/${managerId}`);
    return response.data;
  },
};
