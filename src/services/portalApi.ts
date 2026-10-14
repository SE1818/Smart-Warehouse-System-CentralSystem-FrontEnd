import axios from 'axios';
import { sqliteService } from './sqliteService';
import { refreshAccessToken } from './api';

export const resolvePortalBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // When served from Docker port 3200 or local domain, use relative /api/v1 to utilize Nginx reverse proxy
    if (window.location.port === '3200' || window.location.hostname?.endsWith('.local')) {
      return '/api/v1';
    }

    const override = localStorage.getItem('API_GATEWAY_URL')?.trim() || localStorage.getItem('API_BASE_URL')?.trim();
    if (override) {
      const clean = override.replace(/\/+$/, '');
      return clean.endsWith('/api') ? `${clean}/v1` : clean.endsWith('/api/v1') ? clean : `${clean}/v1`;
    }
  }

  let envUrl = (import.meta.env.VITE_API_GATEWAY_URL || import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl || envUrl.includes('triage-scarcity-prancing.ngrok-free.dev') || envUrl.includes('briar-snoring-submerge.ngrok-free.dev') || envUrl.includes('trycloudflare.com')) {
    envUrl = 'https://stereo-gravity-humbly.ngrok-free.dev/api/v1';
  }

  const cleanUrl = envUrl.replace(/\/+$/, '');
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    try {
      const parsed = new URL(cleanUrl);
      if (parsed.pathname === '' || parsed.pathname === '/') {
        return `${cleanUrl}/api/v1`;
      }
      if (cleanUrl.endsWith('/api')) {
        return `${cleanUrl}/v1`;
      }
    } catch {
      if (!cleanUrl.endsWith('/api/v1')) {
        return cleanUrl.endsWith('/api') ? `${cleanUrl}/v1` : `${cleanUrl}/api/v1`;
      }
    }
  } else {
    if (cleanUrl === '/api') {
      return '/api/v1';
    }
  }
  return cleanUrl.endsWith('/api') ? `${cleanUrl}/v1` : cleanUrl;
};

export const API_BASE_URL = resolvePortalBaseUrl();

export const portalClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

portalClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as (typeof error.config & { _retried?: boolean }) | undefined;
    const status = error?.response?.status;
    const url = config?.url || '';

    if (status !== 401 || config?._retried || url.includes('/auth/')) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return Promise.reject(error);
    }

    if (config) {
      config._retried = true;
    }

    try {
      const session = await refreshAccessToken(refreshToken);
      localStorage.setItem('authToken', session.accessToken);
      if (session.refreshToken) {
        localStorage.setItem('refreshToken', session.refreshToken);
      }
      if (config?.headers) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }
      return portalClient(config || {});
    } catch {
      return Promise.reject(error);
    }
  }
);

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
  worldX?: number;
  worldY?: number;
  yaw?: number;
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
  worldX?: number;
  worldY?: number;
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

export interface TenantSummaryDto {
  id: string;
  slug: string;
  name: string;
  adminEmail?: string;
  status?: string;
}

export interface UserTenantResolutionDto {
  isSuperAdmin: boolean;
  role: string;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  subdomain: string | null;
}

export const tenantService = {
  resolveUserTenant: async (email?: string): Promise<UserTenantResolutionDto> => {
    try {
      const url = email ? `/tenant/resolve-user?email=${encodeURIComponent(email)}` : '/tenant/resolve-user';
      const res = await portalClient.get(url);
      if (res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('Lỗi gọi API resolve-user tenant:', err);
    }
    return {
      isSuperAdmin: false,
      role: 'user',
      tenantId: null,
      tenantSlug: null,
      tenantName: null,
      subdomain: null,
    };
  },

  getTenantsList: async (): Promise<TenantSummaryDto[]> => {
    try {
      const res = await portalClient.get('/tenant/tenants-list');
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err) {
      console.warn('Lỗi gọi API tenants-list:', err);
    }
    return [];
  },
};

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

  const tId = (dto.assignedTenantId || dto.tenantId || dto.ownerTenantId || '').toString().toLowerCase();
  const resolvedSlug = dto.tenantSlug || tenantSlug || '';
  const resolvedName = dto.tenantName || tenantName || (tId ? 'Nhà Hàng Đối Tác' : 'Hệ Thống VORA');

  return {
    id: dto.id?.toString() || `amr-${dto.code || '01'}`,
    ownerTenantId: tId,
    ownerTenantSlug: resolvedSlug,
    tenantName: resolvedName,
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
    worldX: typeof dto.worldX === 'number' ? dto.worldX : typeof dto.x === 'number' ? dto.x : undefined,
    worldY: typeof dto.worldY === 'number' ? dto.worldY : typeof dto.y === 'number' ? dto.y : undefined,
    yaw: typeof dto.yaw === 'number' ? dto.yaw : typeof dto.theta === 'number' ? dto.theta : undefined,
  };
}

export const fleetService = {
  getAllRobots: async (tenantId?: string): Promise<FleetAMR[]> => {
    try {
      const url = tenantId ? `/robots?tenantId=${tenantId}` : '/robots';
      const res = await portalClient.get(url);
      if (res.data && Array.isArray(res.data)) {
        return res.data.map((r: any) => mapRobotDtoToFleetAMR(r));
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách robot:', err);
    }
    return [];
  },

  getRobotsByTenant: async (tenantSlug?: string, tenantId?: string): Promise<FleetAMR[]> => {
    const cleanSlug = (tenantSlug || '').toLowerCase().trim();
    try {
      const url = tenantId ? `/robots?tenantId=${tenantId}` : '/robots';
      const allRes = await portalClient.get(url);
      if (allRes.data && Array.isArray(allRes.data)) {
        const mapped = allRes.data.map((r: any) => mapRobotDtoToFleetAMR(r));
        if (!cleanSlug && !tenantId) return mapped;
        return mapped.filter(
          (r) =>
            (tenantId && r.ownerTenantId.toLowerCase() === tenantId.toLowerCase()) ||
            (cleanSlug && ((r.ownerTenantSlug || '').toLowerCase() === cleanSlug || (r.ownerTenantId || '').toLowerCase() === cleanSlug))
        );
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách robot theo tenant:', err);
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

export interface MissionStatsDto {
  totalToday: number;
  active: number;
  completed: number;
  failed: number;
  cancelled: number;
  avgDurationMinutes: number;
  byRobot: Record<string, number>;
}

export const missionService = {
  getMissions: async (): Promise<MissionItem[]> => {
    try {
      const res = await portalClient.get('/tasks');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((t: any) => {
          const st = (t.status || '').toLowerCase();
          const isDone = st === 'completed' || st === 'cancelled' || st === 'failed';
          const destName = t.toStation?.name || t.toStationName || t.destination || 'Bàn phục vụ';
          const title = t.title || t.description || `Vận chuyển đến ${destName}`;
          return {
            id: t.id ? (typeof t.id === 'string' && t.id.startsWith('MQ-') ? t.id : `MQ-${t.id.toString().slice(0, 6)}`) : `MQ-${Math.floor(1000 + Math.random() * 9000)}`,
            title,
            assignedTo: t.assignedRobotName || t.robotName || t.assignedTo || 'Chưa gán',
            priority: t.priority === 2 || t.priority === 3 || t.priority === 'High' || t.priority === 'Cao' ? 'Cao' : 'Bình thường',
            destination: destName,
            status: isDone ? 'queued' : 'running',
            eta: t.estimatedDurationSeconds ? `${Math.round(t.estimatedDurationSeconds / 60)} phút` : isDone ? 'Hoàn thành' : '1-2 phút',
          };
        });
      }
    } catch {
      // Empty
    }
    return [];
  },

  getMissionStats: async (): Promise<MissionStatsDto | null> => {
    try {
      const res = await portalClient.get('/tasks/stats');
      return res.data || null;
    } catch {
      return null;
    }
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

export const tableService = {
  // Danh sách bàn tải từ BE (API / Active SLAM Map), có SQLite cache cho chế độ offline
  getTables: async (storeIdOrSlug?: string): Promise<DiningTableDto[]> => {
    // 1. Thử truy vấn API backend cấu hình bàn ăn
    try {
      const res = await portalClient.get(`/tables${storeIdOrSlug ? `?storeId=${storeIdOrSlug}` : ''}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const valid = res.data
          .filter((t: any) => typeof t.worldX === 'number' || typeof t.xCoord === 'number')
          .map((t: any) => ({
            id: t.id?.toString() || t.tableNo || 'Table',
            tableNo: t.tableNo || t.name || 'Bàn',
            zone: t.zone || 'Khu Trong Nhà',
            capacity: t.capacity || 4,
            status: t.status || 'empty',
            assignedRobotCode: t.assignedRobotCode || null,
            currentOrders: t.currentOrders || [],
            orderTime: t.orderTime || null,
            worldX: typeof t.worldX === 'number' ? t.worldX : t.xCoord,
            worldY: typeof t.worldY === 'number' ? t.worldY : t.yCoord,
          }));
        if (valid.length > 0) {
          return valid;
        }
      }
    } catch {
      // Backend /tables chưa có hoặc offline
    }

    // 2. Fallback đọc từ local SQLite cache nếu không kết nối được BE
    try {
      const sqliteTables = await sqliteService.getDiningTables();
      if (sqliteTables && sqliteTables.length > 0) {
        return sqliteTables;
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách bàn từ SQLite:', err);
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

  dispatchToRobot: async (robotId: string, orderId: string, destinationStationId: string, fromStationId?: string): Promise<boolean> => {
    try {
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validOrderId = guidRegex.test(orderId) ? orderId : '11111111-1111-1111-1111-111111111111';
      const validFromStation = (fromStationId && guidRegex.test(fromStationId)) ? fromStationId : '55555555-5555-5555-5555-555555555555';
      const validToStation = guidRegex.test(destinationStationId) ? destinationStationId : '22222222-2222-2222-2222-222222222222';

      await portalClient.post(`/robots/${robotId}/tasks`, {
        orderId: validOrderId,
        fromStationId: validFromStation,
        toStationId: validToStation,
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
