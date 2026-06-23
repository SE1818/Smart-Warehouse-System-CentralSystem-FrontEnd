import apiClient from './api';
import type { Wallet, WalletTransaction, TopUpRequest } from '@/types/wallet';

export const walletService = {
  async getBalance(userId: string): Promise<Wallet> {
    const response = await apiClient.get<Wallet>(`/v1/wallets/balance/${userId}`);
    return response.data;
  },

  async getTransactions(userId: string): Promise<WalletTransaction[]> {
    const response = await apiClient.get<WalletTransaction[]>(`/v1/wallets/transactions/${userId}`);
    return response.data;
  },

  async topUp(request: TopUpRequest): Promise<Wallet> {
    const response = await apiClient.post<Wallet>('/v1/wallets/topup', request);
    return response.data;
  },
};
