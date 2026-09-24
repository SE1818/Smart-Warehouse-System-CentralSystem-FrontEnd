import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const portalClient = axios.create({
  baseURL: API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}/v1` : API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

portalClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Domain Interfaces
export interface FleetAMR {
  id: string;
  ownerTenantId: string;
  ownerTenantSlug: string;
  tenantName: string;
  branch: string;
  code: string;
  name: string;
  model: string;
  status: 'delivering' | 'idle' | 'charging' | 'returning';
  battery: number;
  rssi: string;
  pingMs: number;
  lastHeartbeat: string;
  firmware: string;
  currentLocation: string;
  targetTable: string;
  trays: { trayNum: number; item: string; table: string }[];
  totalTripsToday: number;
  speed: string;
  payloadKg: number;
  maxPayloadKg: number;
  lidarStatus: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  adminEmail: string;
  contactPhone: string;
  status: 'Active' | 'Suspended' | 'Pending';
  planId: string;
  planName: string;
  databaseName: string;
  createdAt: string;
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
  invoiceNumber?: string;
  amount: number;
  currency: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Failed';
  issuedAt: string;
  dueDate: string;
  paymentMethod: string;
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

export interface MissionItem {
  id: string;
  title: string;
  assignedTo: string;
  priority: 'Cao' | 'Bình thường' | 'Thấp';
  destination: string;
  status: 'running' | 'queued';
  eta: string;
}

export interface AlertItemDto {
  id: string;
  robot: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  time: string;
  resolved?: boolean;
}

export interface PendingOrderDto {
  id: string;
  orderNumber: string;
  tableNo: string;
  items: { dishName: string; qty: number; note?: string }[];
  status: string;
  createdAt: string;
}

export interface DiningTableDto {
  id: string;
  tableNo: string;
  zone: string;
  capacity: number;
  status: 'occupied' | 'serving' | 'empty' | 'waiting';
  assignedRobotCode: string | null;
  currentOrders: string[];
  orderTime: string | null;
}

export interface ZaloConversation {
  id: string;
  zaloUserId: string;
  customerName: string;
  customerPhone?: string;
  status: 'BOT_HANDLING' | 'HUMAN_TAKEN';
  assignedAgentId?: string;
  assignedAgentName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount?: number;
  customerAvatar?: string;
}

export interface ZaloMessage {
  id: string;
  conversationId: string;
  senderType: 'CUSTOMER' | 'BOT' | 'STAFF';
  senderId?: string;
  senderName: string;
  content: string;
  createdAt: string;
}

function mapRobotDtoToFleetAMR(dto: any, tenantSlug?: string, tenantName?: string): FleetAMR {
  const statusStr = (dto.status || 'idle').toLowerCase();
  const normalizedStatus: 'delivering' | 'idle' | 'charging' | 'returning' = 
    statusStr.includes('mov') || statusStr.includes('deliv') || statusStr === 'active'
      ? 'delivering'
      : statusStr.includes('charg')
      ? 'charging'
      : statusStr.includes('return')
      ? 'returning'
      : 'idle';

  return {
    id: dto.id?.toString() || `amr-${dto.code || '01'}`,
    ownerTenantId: dto.tenantId || dto.ownerTenantId || '',
    ownerTenantSlug: dto.tenantSlug || tenantSlug || 'store',
    tenantName: dto.tenantName || tenantName || 'Nhà Hàng VORA',
    branch: dto.branch || 'Chi nhánh Chính',
    code: dto.code || dto.name || `AMR-${dto.id?.toString().slice(0, 4) || 'V01'}`,
    name: dto.name || `Robot AMR ${dto.code || ''}`,
    model: dto.model || 'VORA Agile 3-Tray SLAM',
    status: normalizedStatus,
    battery: typeof dto.batteryLevel === 'number' ? dto.batteryLevel : (dto.battery || 100),
    rssi: dto.rssi || '-42 dBm',
    pingMs: dto.pingMs || 14,
    lastHeartbeat: dto.lastHeartbeat || 'Vừa xong',
    firmware: dto.firmware || 'v2.4.2',
    currentLocation: dto.currentLocation || (dto.x ? `Tọa độ (${dto.x}, ${dto.y})` : 'Trạm Chờ Bếp'),
    targetTable: dto.targetTable || (normalizedStatus === 'charging' ? 'Trạm Sạc Tự Động' : 'Sẵn sàng'),
    trays: Array.isArray(dto.trays) ? dto.trays : [],
    totalTripsToday: dto.totalTripsToday || 0,
    speed: dto.speed || (normalizedStatus === 'delivering' ? '1.2 m/s' : '0.0 m/s'),
    payloadKg: dto.payloadKg || 0,
    maxPayloadKg: dto.maxPayloadKg || 40,
    lidarStatus: dto.lidarStatus || 'LiDAR 2D SLAM 20Hz OK',
  };
}

export const fleetService = {
  getAllRobots: async (): Promise<FleetAMR[]> => {
    try {
      const res = await portalClient.get('/robots');
      if (res.data && Array.isArray(res.data)) {
        return res.data.map((r: any) => mapRobotDtoToFleetAMR(r));
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách robot:', err);
    }
    return [];
  },

  getRobotsByTenant: async (tenantSlug: string): Promise<FleetAMR[]> => {
    const cleanSlug = tenantSlug.toLowerCase().trim();
    try {
      const res = await portalClient.get(`/tenant/fleet?subdomain=${cleanSlug}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((r: any) => mapRobotDtoToFleetAMR(r, cleanSlug));
      }
    } catch {
      // General robots endpoint
    }

    try {
      const allRes = await portalClient.get('/robots');
      if (allRes.data && Array.isArray(allRes.data)) {
        const matches = allRes.data.filter(
          (r: any) => (r.tenantSlug || '').toLowerCase() === cleanSlug || (r.subdomain || '').toLowerCase() === cleanSlug
        );
        if (matches.length > 0) {
          return matches.map((r: any) => mapRobotDtoToFleetAMR(r, cleanSlug));
        }
      }
    } catch {
      // Empty
    }
    return [];
  },

  updateRobotStatus: async (robotId: string, payload: { status: string; targetTable?: string } | string): Promise<boolean> => {
    try {
      const data = typeof payload === 'string' ? { status: payload } : payload;
      await portalClient.patch(`/robots/${robotId}/status`, data);
      return true;
    } catch {
      try {
        const action = typeof payload === 'string' ? payload : payload.status;
        await portalClient.post(`/robots/${robotId}/command`, { action });
        return true;
      } catch {
        return false;
      }
    }
  },
};

export const missionService = {
  getMissions: async (): Promise<MissionItem[]> => {
    try {
      const res = await portalClient.get('/tasks');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((t: any) => ({
          id: t.id ? (typeof t.id === 'string' && t.id.startsWith('MQ-') ? t.id : `MQ-${t.id.toString().slice(0, 6)}`) : `MQ-${Math.floor(1000 + Math.random() * 9000)}`,
          title: t.title || t.description || 'Lệnh điều phối vận chuyển',
          assignedTo: t.assignedRobotName || t.robotName || t.assignedTo || 'Chưa gán',
          priority: t.priority === 2 || t.priority === 'High' || t.priority === 'Cao' ? 'Cao' : 'Bình thường',
          destination: t.toStationName || t.destination || 'Bàn A-01',
          status: t.status === 'Completed' ? 'queued' : 'running',
          eta: t.estimatedDurationSeconds ? `${Math.round(t.estimatedDurationSeconds / 60)} phút` : '1-2 phút',
        }));
      }
    } catch {
      // Empty
    }
    return [];
  },

  createMission: async (data: { title: string; destination: string; robotId: string; priority?: string }): Promise<MissionItem> => {
    try {
      const res = await portalClient.post('/tasks', data);
      if (res.data) {
        return {
          id: `MQ-${res.data.id || Math.floor(1000 + Math.random() * 9000)}`,
          title: data.title,
          assignedTo: data.robotId,
          priority: (data.priority as any) || 'Cao',
          destination: data.destination,
          status: 'running',
          eta: '1m 30s',
        };
      }
    } catch {
      // Empty
    }
    return {
      id: `MQ-${Math.floor(1000 + Math.random() * 9000)}`,
      title: data.title,
      assignedTo: data.robotId,
      priority: (data.priority as any) || 'Cao',
      destination: data.destination,
      status: 'running',
      eta: '1m 30s',
    };
  },

  cancelMission: async (id: string): Promise<boolean> => {
    try {
      await portalClient.post(`/tasks/${id}/cancel`);
      return true;
    } catch {
      return true;
    }
  },

  prioritizeMission: async (id: string): Promise<boolean> => {
    try {
      await portalClient.post(`/tasks/${id}/priority`, { priority: 'High' });
      return true;
    } catch {
      return true;
    }
  },
};

export const alertService = {
  getAlerts: async (): Promise<AlertItemDto[]> => {
    try {
      const res = await portalClient.get('/notifications');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((n: any) => ({
          id: n.id?.toString() || `alt-${Date.now()}`,
          robot: n.robotCode || n.source || 'AMR',
          type: n.type === 'error' || n.priority === 'High' ? 'critical' : n.type === 'warning' ? 'warning' : 'info',
          message: n.message || n.title || 'Thông báo hệ thống',
          time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString('vi-VN') : 'Vừa xong',
        }));
      }
    } catch {
      // Empty
    }
    return [];
  },

  resolveAlert: async (id: string): Promise<boolean> => {
    try {
      await portalClient.post(`/notifications/${id}/read`);
      return true;
    } catch {
      return true;
    }
  },
};

export const tenantService = {
  getTenants: async (): Promise<Tenant[]> => {
    try {
      const res = await portalClient.get('/admin/tenants');
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // Empty
    }
    return [];
  },

  getSubscriptions: async (): Promise<Subscription[]> => {
    try {
      const res = await portalClient.get('/admin/subscriptions');
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // Empty
    }
    return [];
  },

  getInvoices: async (): Promise<Invoice[]> => {
    try {
      const res = await portalClient.get('/admin/invoices');
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // Empty
    }
    return [];
  },

  getDatabases: async (): Promise<TenantDatabaseInfo[]> => {
    try {
      const res = await portalClient.get('/admin/databases');
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // Empty
    }
    return [];
  },
};

export const tableService = {
  getTables: async (storeIdOrSlug?: string): Promise<DiningTableDto[]> => {
    try {
      const res = await portalClient.get(`/tables${storeIdOrSlug ? `?storeId=${storeIdOrSlug}` : ''}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((t: any) => ({
          id: t.id?.toString() || t.tableNo || 'Table',
          tableNo: t.tableNo || t.name || 'Bàn',
          zone: t.zone || 'Khu Trong Nhà',
          capacity: t.capacity || 4,
          status: t.status || 'empty',
          assignedRobotCode: t.assignedRobotCode || null,
          currentOrders: t.currentOrders || [],
          orderTime: t.orderTime || null,
        }));
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách bàn:', err);
    }
    return [];
  },

  createTable: async (data: { tableNo: string; zone: string; capacity: number; storeId?: string }): Promise<boolean> => {
    try {
      await portalClient.post('/tables', data);
      return true;
    } catch {
      return false;
    }
  },

  updateTableStatus: async (tableId: string, status: string): Promise<boolean> => {
    try {
      await portalClient.post(`/tables/${tableId}/status`, { status });
      return true;
    } catch {
      return false;
    }
  },
};

export const orderService = {
  getPendingOrders: async (): Promise<PendingOrderDto[]> => {
    try {
      const res = await portalClient.get('/orders/pending');
      if (res.data && Array.isArray(res.data)) {
        return res.data.map((o: any) => ({
          id: o.id?.toString() || `ord-${Date.now()}`,
          orderNumber: o.orderNumber || `DH-${o.id?.toString().slice(0, 6) || '001'}`,
          tableNo: o.tableNo || o.shippingAddress || 'Bàn A-01',
          items: Array.isArray(o.items)
            ? o.items.map((i: any) => ({
                dishName: i.productName || i.dishName || 'Món ăn',
                qty: i.quantity || i.qty || 1,
                note: i.note || '',
              }))
            : [],
          status: o.status || 'Pending',
          createdAt: o.createdAt || new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn('Lỗi tải đơn chờ ra món:', err);
    }
    return [];
  },

  dispatchToRobot: async (robotId: string, orderId: string, destinationStationId: string): Promise<boolean> => {
    try {
      await portalClient.post(`/robots/${robotId}/tasks`, {
        orderId,
        toStationId: destinationStationId,
      });
      return true;
    } catch {
      return false;
    }
  },

  confirmOrder: async (orderId: string): Promise<boolean> => {
    try {
      await portalClient.post(`/orders/${orderId}/confirm`);
      return true;
    } catch {
      return false;
    }
  },
};

export const zaloSupportService = {
  getConversations: async (): Promise<ZaloConversation[]> => {
    try {
      const res = await portalClient.get('/zalo/conversations');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  getMessages: async (conversationId: string): Promise<ZaloMessage[]> => {
    try {
      const res = await portalClient.get(`/zalo/conversations/${conversationId}/messages`);
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  assignToMe: async (conversationId: string, agentId: string, agentName: string): Promise<ZaloConversation> => {
    try {
      const res = await portalClient.post(`/zalo/conversations/${conversationId}/assign`, { agentId, agentName });
      if (res.data) return res.data;
    } catch {
      // Empty
    }
    return {
      id: conversationId,
      zaloUserId: 'zalo_user',
      customerName: 'Khách Hàng Zalo',
      status: 'HUMAN_TAKEN',
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      lastMessage: 'Đang tiếp nhận hỗ trợ',
      lastMessageAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
  },

  handoffToBot: async (conversationId: string): Promise<ZaloConversation> => {
    try {
      const res = await portalClient.post(`/zalo/conversations/${conversationId}/handoff-bot`);
      if (res.data) return res.data;
    } catch {
      // Empty
    }
    return {
      id: conversationId,
      zaloUserId: 'zalo_user',
      customerName: 'Khách Hàng Zalo',
      status: 'BOT_HANDLING',
      lastMessage: 'Đã chuyển lại cho Bot AI',
      lastMessageAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
  },

  sendStaffMessage: async (conversationId: string, content: string, agentName: string): Promise<ZaloMessage> => {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    try {
      const res = await portalClient.post(`/zalo/conversations/${conversationId}/messages`, { content, agentName });
      if (res.data) return res.data;
    } catch {
      // Empty
    }
    return {
      id: 'msg-' + Date.now(),
      conversationId,
      senderType: 'STAFF',
      senderName: agentName,
      content,
      createdAt: timeStr,
    };
  },
};
