import apiClient from './api';
import type {
  Tenant,
  Subscription,
  Invoice,
  TenantDatabaseInfo,
  TenantFeatureFlag,
  SaaSMetrics,
} from '../types/saas';

export const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 't-001',
    name: 'Golden BBQ Restaurant',
    slug: 'goldenbbq',
    adminEmail: 'owner@goldenbbq.vn',
    contactPhone: '0901234567',
    status: 'Active',
    planId: 'plan-pro',
    planName: 'Professional WMS',
    databaseName: 'tenant_goldenbbq_db',
    createdAt: '2026-01-15T08:00:00Z',
    activatedAt: '2026-01-15T09:30:00Z',
    warehousesCount: 3,
    robotsCount: 4,
    monthlyOrdersCount: 4250,
    storageUsedGB: 4.8,
  },
  {
    id: 't-002',
    name: 'Kichi-Kichi Hotpot Chain',
    slug: 'kichikichi',
    adminEmail: 'it.lead@kichikichi.vn',
    contactPhone: '0912345678',
    status: 'Active',
    planId: 'plan-enterprise',
    planName: 'Enterprise Logistics',
    databaseName: 'tenant_kichikichi_db',
    createdAt: '2025-11-20T10:00:00Z',
    activatedAt: '2025-11-20T11:15:00Z',
    warehousesCount: 5,
    robotsCount: 6,
    monthlyOrdersCount: 12400,
    storageUsedGB: 16.4,
  },
  {
    id: 't-003',
    name: 'Sumo Yakiniku Central',
    slug: 'sumoyakiniku',
    adminEmail: 'manager@sumoyakiniku.vn',
    contactPhone: '0988776655',
    status: 'Active',
    planId: 'plan-pro',
    planName: 'Professional WMS',
    databaseName: 'tenant_sumoyakiniku_db',
    createdAt: '2026-02-01T14:20:00Z',
    activatedAt: '2026-02-01T15:00:00Z',
    warehousesCount: 2,
    robotsCount: 3,
    monthlyOrdersCount: 3100,
    storageUsedGB: 3.2,
  },
  {
    id: 't-004',
    name: 'Haidilao Landmark 81',
    slug: 'haidilao-l81',
    adminEmail: 'tech@haidilao.vn',
    contactPhone: '0933445566',
    status: 'Active',
    planId: 'plan-enterprise',
    planName: 'Enterprise Logistics',
    databaseName: 'tenant_haidilao_db',
    createdAt: '2025-10-10T09:00:00Z',
    activatedAt: '2025-10-10T10:00:00Z',
    warehousesCount: 2,
    robotsCount: 5,
    monthlyOrdersCount: 18900,
    storageUsedGB: 22.1,
  },
  {
    id: 't-005',
    name: 'Manwah Taiwanese Hotpot',
    slug: 'manwah-hcm',
    adminEmail: 'store.hcm@manwah.vn',
    contactPhone: '0944556677',
    status: 'Pending',
    planId: 'plan-starter',
    planName: 'Starter WMS',
    databaseName: 'tenant_manwah_db',
    createdAt: '2026-03-18T16:45:00Z',
    warehousesCount: 1,
    robotsCount: 2,
    monthlyOrdersCount: 0,
    storageUsedGB: 0.8,
  },
];

export const DEFAULT_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-01',
    tenantId: 't-001',
    tenantName: 'Golden BBQ Restaurant',
    planId: 'plan-pro',
    planName: 'Professional WMS',
    billingCycle: 'monthly',
    amount: 6500000,
    startDate: '2026-01-15',
    endDate: '2026-04-15',
    status: 'Active',
    autoRenew: true,
  },
  {
    id: 'sub-02',
    tenantId: 't-002',
    tenantName: 'Kichi-Kichi Hotpot Chain',
    planId: 'plan-enterprise',
    planName: 'Enterprise Logistics',
    billingCycle: 'annual',
    amount: 144000000,
    startDate: '2025-11-20',
    endDate: '2026-11-20',
    status: 'Active',
    autoRenew: true,
  },
  {
    id: 'sub-03',
    tenantId: 't-003',
    tenantName: 'Sumo Yakiniku Central',
    planId: 'plan-pro',
    planName: 'Professional WMS',
    billingCycle: 'monthly',
    amount: 6500000,
    startDate: '2026-02-01',
    endDate: '2026-04-01',
    status: 'Active',
    autoRenew: true,
  },
  {
    id: 'sub-04',
    tenantId: 't-004',
    tenantName: 'Haidilao Landmark 81',
    planId: 'plan-enterprise',
    planName: 'Enterprise Logistics',
    billingCycle: 'monthly',
    amount: 14500000,
    startDate: '2025-10-10',
    endDate: '2026-04-10',
    status: 'Active',
    autoRenew: true,
  },
  {
    id: 'sub-05',
    tenantId: 't-005',
    tenantName: 'Manwah Taiwanese Hotpot',
    planId: 'plan-starter',
    planName: 'Starter WMS',
    billingCycle: 'monthly',
    amount: 2500000,
    startDate: '2026-03-18',
    endDate: '2026-04-18',
    status: 'GracePeriod',
    autoRenew: false,
  },
];

export const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-0034',
    tenantId: 't-001',
    tenantName: 'Golden BBQ Restaurant',
    amount: 6500000,
    currency: 'VND',
    status: 'Paid',
    issuedAt: '2026-03-15',
    dueDate: '2026-03-22',
    paymentMethod: 'VietQR / PayOS',
    pdfUrl: '#',
  },
  {
    id: 'INV-2026-0031',
    tenantId: 't-004',
    tenantName: 'Haidilao Landmark 81',
    amount: 14500000,
    currency: 'VND',
    status: 'Paid',
    issuedAt: '2026-03-10',
    dueDate: '2026-03-17',
    paymentMethod: 'Chuyển khoản Doanh nghiệp',
    pdfUrl: '#',
  },
  {
    id: 'INV-2026-0028',
    tenantId: 't-003',
    tenantName: 'Sumo Yakiniku Central',
    amount: 6500000,
    currency: 'VND',
    status: 'Paid',
    issuedAt: '2026-03-01',
    dueDate: '2026-03-08',
    paymentMethod: 'VietQR / PayOS',
    pdfUrl: '#',
  },
  {
    id: 'INV-2026-0041',
    tenantId: 't-005',
    tenantName: 'Manwah Taiwanese Hotpot',
    amount: 2500000,
    currency: 'VND',
    status: 'Pending',
    issuedAt: '2026-03-18',
    dueDate: '2026-03-25',
    paymentMethod: 'VietQR / PayOS',
    pdfUrl: '#',
  },
];

export const DEFAULT_DATABASES: TenantDatabaseInfo[] = [
  {
    tenantId: 't-001',
    tenantName: 'Golden BBQ Restaurant',
    dbName: 'tenant_goldenbbq_db',
    host: 'db-cluster-01.smartwarehouse.internal',
    port: 5432,
    healthStatus: 'Healthy',
    schemaVersion: 'v2.4.1_amr',
    sizeMB: 420,
    activeConnections: 18,
    lastMigratedAt: '2026-03-10 04:12:00',
  },
  {
    tenantId: 't-002',
    tenantName: 'Kichi-Kichi Hotpot Chain',
    dbName: 'tenant_kichikichi_db',
    host: 'db-cluster-02.smartwarehouse.internal',
    port: 5432,
    healthStatus: 'Healthy',
    schemaVersion: 'v2.4.1_amr',
    sizeMB: 1820,
    activeConnections: 42,
    lastMigratedAt: '2026-03-10 04:15:00',
  },
  {
    tenantId: 't-003',
    tenantName: 'Sumo Yakiniku Central',
    dbName: 'tenant_sumoyakiniku_db',
    host: 'db-cluster-01.smartwarehouse.internal',
    port: 5432,
    healthStatus: 'Healthy',
    schemaVersion: 'v2.4.1_amr',
    sizeMB: 310,
    activeConnections: 12,
    lastMigratedAt: '2026-03-10 04:12:00',
  },
  {
    tenantId: 't-004',
    tenantName: 'Haidilao Landmark 81',
    dbName: 'tenant_haidilao_db',
    host: 'db-cluster-03.smartwarehouse.internal',
    port: 5432,
    healthStatus: 'Healthy',
    schemaVersion: 'v2.4.1_amr',
    sizeMB: 2450,
    activeConnections: 54,
    lastMigratedAt: '2026-03-10 04:18:00',
  },
  {
    tenantId: 't-005',
    tenantName: 'Manwah Taiwanese Hotpot',
    dbName: 'tenant_manwah_db',
    host: 'db-cluster-01.smartwarehouse.internal',
    port: 5432,
    healthStatus: 'Healthy',
    schemaVersion: 'v2.4.0_initial',
    sizeMB: 65,
    activeConnections: 3,
    lastMigratedAt: '2026-03-18 16:50:00',
  },
];

let localTenantsState: Tenant[] = [...DEFAULT_TENANTS];
let localFlagsState: TenantFeatureFlag[] = DEFAULT_TENANTS.map((t) => ({
  tenantId: t.id,
  tenantName: t.name,
  enableAMRIntegration: true,
  enableAIChatbot: t.planName !== 'Starter WMS',
  enableMultiWarehouseRouting: t.planName === 'Enterprise Logistics',
  enableAdvancedAnalytics: t.planName !== 'Starter WMS',
  enableCustomIntegrations: t.planName === 'Enterprise Logistics',
}));

export const saasService = {
  getTenants: async (): Promise<Tenant[]> => {
    try {
      const res = await apiClient.get('/admin/tenants');
      return res.data && res.data.length > 0 ? res.data : localTenantsState;
    } catch {
      return localTenantsState;
    }
  },

  toggleTenantStatus: async (tenantId: string, status: string): Promise<boolean> => {
    try {
      const res = await apiClient.post(`/admin/tenants/${tenantId}/status`, { status });
      localTenantsState = localTenantsState.map((t) =>
        t.id === tenantId ? { ...t, status: status as any } : t
      );
      return res.status === 200;
    } catch {
      localTenantsState = localTenantsState.map((t) =>
        t.id === tenantId ? { ...t, status: status as any } : t
      );
      return true;
    }
  },

  getMetrics: async (): Promise<SaaSMetrics> => {
    try {
      const res = await apiClient.get('/admin/metrics');
      if (res.data && res.data.totalTenants > 0) return res.data;
    } catch {
      // fallback
    }
    return {
      totalTenants: localTenantsState.length,
      activeTenants: localTenantsState.filter((t) => t.status === 'Active').length,
      mrr: 34500000,
      arr: 414000000,
      churnRate: 1.2,
      pendingProvisioningCount: localTenantsState.filter((t) => t.status === 'Pending').length,
      totalWarehousesManaged: 13,
      totalAMRRobotsActive: 20,
    };
  },

  getSubscriptions: async (): Promise<Subscription[]> => {
    try {
      const res = await apiClient.get('/admin/subscriptions');
      return res.data && res.data.length > 0 ? res.data : DEFAULT_SUBSCRIPTIONS;
    } catch {
      return DEFAULT_SUBSCRIPTIONS;
    }
  },

  getInvoices: async (): Promise<Invoice[]> => {
    try {
      const res = await apiClient.get('/admin/invoices');
      return res.data && res.data.length > 0 ? res.data : DEFAULT_INVOICES;
    } catch {
      return DEFAULT_INVOICES;
    }
  },

  getDatabases: async (): Promise<TenantDatabaseInfo[]> => {
    try {
      const res = await apiClient.get('/admin/databases');
      return res.data && res.data.length > 0 ? res.data : DEFAULT_DATABASES;
    } catch {
      return DEFAULT_DATABASES;
    }
  },

  getFeatureFlags: async (): Promise<TenantFeatureFlag[]> => {
    try {
      const res = await apiClient.get('/admin/feature-flags');
      return res.data && res.data.length > 0 ? res.data : localFlagsState;
    } catch {
      return localFlagsState;
    }
  },

  updateFeatureFlag: async (tenantId: string, flags: Partial<TenantFeatureFlag>): Promise<boolean> => {
    try {
      await apiClient.post(`/admin/feature-flags/${tenantId}`, flags);
    } catch {
      // local update
    }
    localFlagsState = localFlagsState.map((item) =>
      item.tenantId === tenantId ? { ...item, ...flags } : item
    );
    return true;
  },
};
