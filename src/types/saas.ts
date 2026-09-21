export type TenantStatus = 'Pending' | 'Provisioning' | 'Active' | 'Suspended' | 'Expired' | 'Terminated';

export interface Plan {
  id: string;
  code: 'starter' | 'pro' | 'enterprise';
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  maxWarehouses: number;
  maxRobots: number;
  maxOrdersPerMonth: number;
  maxUsers: number;
  storageLimitGB: number;
  features: string[];
  isPopular?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  adminEmail: string;
  contactPhone: string;
  status: TenantStatus;
  planId: string;
  planName: string;
  databaseName: string;
  createdAt: string;
  activatedAt?: string;
  warehousesCount: number;
  robotsCount: number;
  monthlyOrdersCount: number;
  storageUsedGB: number;
}

export interface Subscription {
  id: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  planName: string;
  billingCycle: 'monthly' | 'annual';
  amount: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'GracePeriod' | 'Cancelled' | 'Expired';
  autoRenew: boolean;
}

export interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  currency: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Failed';
  issuedAt: string;
  dueDate: string;
  paymentMethod: string;
  pdfUrl?: string;
}

export interface TenantDatabaseInfo {
  tenantId: string;
  tenantName: string;
  dbName: string;
  host: string;
  port: number;
  healthStatus: 'Healthy' | 'Degraded' | 'Unreachable';
  schemaVersion: string;
  sizeMB: number;
  activeConnections: number;
  lastMigratedAt: string;
}

export interface TenantFeatureFlag {
  tenantId: string;
  tenantName: string;
  enableAMRIntegration: boolean;
  enableAIChatbot: boolean;
  enableMultiWarehouseRouting: boolean;
  enableAdvancedAnalytics: boolean;
  enableCustomIntegrations: boolean;
}

export interface SaaSMetrics {
  totalTenants: number;
  activeTenants: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churnRate: number; // Percentage
  pendingProvisioningCount: number;
  totalWarehousesManaged: number;
  totalAMRRobotsActive: number;
}
