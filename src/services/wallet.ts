import apiClient from './api';
import type { Wallet, WalletTransaction, TopUpRequest } from '@/types/wallet';

export const walletService = {
  async getBalance(userId: string): Promise<Wallet> {
    const response = await apiClient.get<Wallet>(`/api/v1/wallet/balance?userId=${userId}`);
    return response.data;
  },

  async getTransactions(userId: string): Promise<WalletTransaction[]> {
    const response = await apiClient.get<WalletTransaction[]>(`/api/v1/wallet/transactions?userId=${userId}`);
    return response.data;
  },

  async topUp(request: TopUpRequest): Promise<Wallet> {
    const response = await apiClient.post<Wallet>('/api/v1/wallet/topup', request);
    return response.data;
  },
};
