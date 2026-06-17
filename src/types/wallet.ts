export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  transactionType: string; // 'TopUp', 'Payment', 'Refund', etc.
  description: string;
  createdAt: string;
}

export interface TopUpRequest {
  userId: string;
  amount: number;
  description?: string;
}

export interface TopUpResponse {
  wallet: Wallet;
  message: string;
}
