export interface Subscription {
  id: string;
  userId?: string;
  tenantId?: string;
  planId?: string;
  subscriptionCode?: string;
  billingCycle?: 'monthly' | 'annual';
  totalAmount: number;
  status: string;
  paymentStatus?: string;
  autoRenew?: boolean;
  nextBillingDate?: string;
  gracePeriodEndsAt?: string;
  currentMonthOrderCount?: number;
  failedPaymentAttempts?: number;
  lastPaymentAttemptAt?: string;
  tableId?: string;
  tableNo?: string;
  storeId?: string;
  deliveryNodeId?: string;
  shippingAddress?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  userId?: string;
  planId?: string;
  provider: string; // 'PAYOS'
  paymentMethod: string;
  amount: number;
  currency?: string;
  billingCycle?: string;
  status: string; // 'PENDING', 'PAID', 'FAILED'
  payosOrderCode?: number;
  paidAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SubscriptionPaymentTransaction {
  id: string;
  paymentId: string;
  transactionNo: string;
  amount: number;
  provider: string;
  status: string;
  isSuccess: boolean;
  payosTransactionRef?: string;
  timestamp: string;
  createdAt: string;
}

export interface DiningTable {
  id: string;
  tenantId?: string;
  storeId: string;
  tableNo: string;
  tableName?: string;
  capacity: number;
  status: 'Available' | 'Occupied' | 'Reserved';
  qrCodeUrl?: string;
  stationId?: string;
}

// Backward-compatible type alias so existing services (orderService, robotService) continue working seamlessly
export type Order = Subscription;
