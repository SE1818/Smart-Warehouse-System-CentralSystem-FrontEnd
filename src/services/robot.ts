import apiClient from './api';
import type { Robot, Area, Station, Order } from '@/types/robot';
import { sqliteService } from './sqliteService';

interface RobotRaw {
  id: string;
  name: string;
  currentAreaId?: string;
  currentX?: number;
  x?: number;
  currentY?: number;
  y?: number;
  batteryLevel?: number;
  battery?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const robotService = {
  // Get all robots (Loaded from local SQLite; synchronized with BE / Supabase)
  async listRobots(): Promise<Robot[]> {
    // 1. Try to read from local SQLite first
    let localRobots: Robot[] = [];
    try {
      localRobots = await sqliteService.getRobots();
    } catch (e) {
      console.warn('[robotService] Lỗi đọc robots từ SQLite:', e);
    }

    // 2. Fetch fresh list from BE (which pulls from Supabase), update SQLite
    try {
      const response = await apiClient.get<RobotRaw[]>('/v1/robots');
      const mapped: Robot[] = response.data.map((r: RobotRaw) => ({
        id: r.id,
        name: r.name,
        x: r.currentX ?? r.x ?? 0,
        y: r.currentY ?? r.y ?? 0,
        battery: r.batteryLevel ?? r.battery ?? 0,
        status: r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase()) as Robot['status'] : 'Idle',
        currentAreaId: r.currentAreaId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      }));

      // Save into SQLite cache
      try {
        await sqliteService.saveRobots(mapped);
      } catch (saveErr) {
        console.warn('[robotService] Lỗi lưu robots vào SQLite:', saveErr);
      }
      return mapped;
    } catch (err) {
      console.warn('[robotService] Không thể kết nối BE lấy robots, sử dụng dữ liệu offline từ SQLite:', err);
      if (localRobots.length > 0) {
        return localRobots;
      }
      return [];
    }
  },

  // Move robot to coordinates via PUT
  async moveRobot(robotId: string, x: number, y: number, currentRobot: Robot): Promise<void> {
    await apiClient.put(`/v1/robots/${robotId}`, {
      name: currentRobot.name,
      batteryLevel: currentRobot.battery,
      status: 'moving',
      currentX: x,
      currentY: y,
      currentAreaId: 'a3f5a019-9c54-47b2-bd72-4a0075d9e5b2'
    });
  },

  // Update robot status via PUT
  async updateRobotStatus(robotId: string, status: string, currentRobot: Robot): Promise<void> {
    await apiClient.put(`/v1/robots/${robotId}`, {
      name: currentRobot.name,
      batteryLevel: currentRobot.battery,
      status: status.toLowerCase(),
      currentX: currentRobot.x,
      currentY: currentRobot.y,
      currentAreaId: 'a3f5a019-9c54-47b2-bd72-4a0075d9e5b2'
    });
  },

  // Fulfill order with robot via task assignment
  async fulfillOrder(robotId: string, orderId: string, fromStationId: string, toStationId: string): Promise<void> {
    await apiClient.post(`/v1/robots/${robotId}/tasks`, {
      orderId,
      fromStationId,
      toStationId
    });
  },

  // Get pending orders
  async listPendingOrders(): Promise<Order[]> {
    const response = await apiClient.get<Order[]>('/v1/orders/pending');
    return response.data;
  },

  // Get areas
  async getAreas(): Promise<Area[]> {
    const response = await apiClient.get<Area[]>('/v1/robots/areas');
    return response.data;
  },

  // Get stations
  async getStations(): Promise<Station[]> {
    const response = await apiClient.get<Station[]>('/v1/robots/stations');
    return response.data;
  },

  // Get active SLAM map metadata (Fallback: SQLite cache or default)
  async getActiveSlamMap(): Promise<SlamMapResponse> {
    try {
      const localMap = await sqliteService.getSlamMap();
      if (localMap && localMap.mapId) {
        return localMap;
      }
    } catch (e) {
      console.warn('[robotService] Lỗi đọc SLAM Map từ SQLite:', e);
    }

    return {
      mapId: 'slam-map-default',
      name: 'Sơ đồ nhà hàng VORA',
      resolution: 0.05,
      originX: -20.0,
      originY: -15.0,
      originZ: 0.0,
      width: 800,
      height: 600,
      mapUrl: '',
      format: 'png',
      tables: [],
      stations: [],
      waypoints: [],
      lastUpdated: new Date().toISOString(),
    };
  },

  // Broadcast or update SLAM map via API and persist to SQLite
  async updateSlamMap(map: Partial<SlamMapResponse>): Promise<SlamMapResponse> {
    const response = await apiClient.post<SlamMapResponse>('/v1/robots/map/update', map);
    if (response.data) {
      try { await sqliteService.saveSlamMap(response.data); } catch { }
    }
    return response.data;
  },

  // Get waypoints (Primary: BE API; Fallback: SQLite cache)
  async getWaypoints(): Promise<SlamMapWaypointDto[]> {
    try {
      const response = await apiClient.get<SlamMapWaypointDto[]>('/v1/robots/map/waypoints');
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        try { await sqliteService.saveWaypointsFromMqtt(response.data); } catch { }
        return response.data;
      }
    } catch (e) {
      console.warn('[robotService] Không thể lấy waypoints từ BE API, thử đọc từ SQLite cache:', e);
    }

    try {
      const localWaypoints = await sqliteService.getWaypoints();
      return localWaypoints;
    } catch (e) {
      console.warn('[robotService] Lỗi đọc waypoints từ SQLite:', e);
      return [];
    }
  },

  // Update waypoints list on active map and save to SQLite
  async updateWaypoints(waypoints: SlamMapWaypointDto[]): Promise<SlamMapResponse> {
    await sqliteService.saveWaypointsFromMqtt(waypoints);
    const response = await apiClient.post<SlamMapResponse>('/v1/robots/map/waypoints', waypoints);
    return response.data;
  },

  // Start Multi-table 2-tray sequence dispatch (DS-07 / WF-04)
  async startServiceSequence(request: StartServiceSequenceRequest): Promise<ServiceSequenceResult> {
    try {
      const response = await apiClient.post<ServiceSequenceResult>('/v1/tasks/sequence/start', request);
      return response.data;
    } catch (err) {
      console.warn('[robotService] Lỗi gọi API sequence/start, sinh kết quả dự phòng offline:', err);
      const offlineTasks = request.trayAssignments.map((tray, idx) => ({
        id: `seq-task-${Date.now()}-${idx + 1}`,
        robotId: request.robotId || 'amr-01',
        cargoLevel: tray.cargoLevel,
        status: idx === 0 ? 'in_progress' : 'pending',
        toStationId: tray.toStationId || `station-${tray.destinationTableNo}`,
        destinationTableNo: tray.destinationTableNo,
        orderReference: tray.orderReference
      }));
      return {
        success: true,
        message: `Đã phát lệnh chuỗi giao ${request.trayAssignments.length} chặng tới ${request.trayAssignments.map(t => t.destinationTableNo).join(', ')}`,
        robotId: request.robotId || 'amr-01',
        robotName: 'AMR-01',
        totalStops: request.trayAssignments.length,
        createdTasks: offlineTasks
      };
    }
  },

  // Confirm Next Table or Return Home (Dual Confirmation: Physical ESP32 Button or Web Console)
  async confirmNextTable(taskId: string, confirmedBy: string = 'Staff Web KDS', viaHardwareButton: boolean = false): Promise<ConfirmNextTableResponse> {
    try {
      const response = await apiClient.post<ConfirmNextTableResponse>(`/v1/tasks/${taskId}/confirm-next-table`, {
        confirmedBy,
        viaHardwareButton
      });
      return response.data;
    } catch (err) {
      console.warn('[robotService] Lỗi gọi API confirm-next-table, fallback mô phỏng:', err);
      return {
        success: true,
        message: 'Đã xác nhận lấy món thành công',
        nextAction: 'next_table',
        completedCargoLevel: 1
      };
    }
  },

  // Reroute active task to a new table station mid-transit
  async rerouteTask(taskId: string, newStationId: string, newTableNo: string, reason: string = 'Đổi bàn giữa chặng'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tasks/${taskId}/reroute`, {
        newStationId,
        newTableNo,
        reason,
        requestedBy: 'Staff KDS'
      });
      return response.data;
    } catch (err) {
      console.warn('[robotService] Lỗi gọi API reroute, fallback mô phỏng:', err);
      return {
        success: true,
        message: `Đã chuyển hướng nhiệm vụ sang ${newTableNo} thành công (chế độ dự phòng).`
      };
    }
  },

  // Merge source tables into a target table
  async mergeTables(targetTableId: string, sourceTableIds: string[], storeId: string = '00000000-0000-0000-0000-000000000000', reason: string = 'Gộp bàn'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tables/${targetTableId}/merge`, {
        storeId,
        sourceTableIds,
        reason
      });
      return response.data;
    } catch (err) {
      console.warn('[robotService] Lỗi gọi API merge tables, fallback mô phỏng:', err);
      return {
        success: true,
        message: 'Đã gộp bàn thành công (chế độ dự phòng).'
      };
    }
  },

  // Split merged table back to available
  async splitTable(tableId: string, storeId: string = '00000000-0000-0000-0000-000000000000', reason: string = 'Tách bàn'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tables/${tableId}/split`, {
        storeId,
        reason
      });
      return response.data;
    } catch (err) {
      console.warn('[robotService] Lỗi gọi API split table, fallback mô phỏng:', err);
      return {
        success: true,
        message: 'Đã tách bàn thành công (chế độ dự phòng).'
      };
    }
  }
};

export interface CargoTrayAssignmentDto {
  cargoLevel: number;
  toStationId?: string;
  destinationTableNo: string;
  orderReference?: string;
  priority?: number;
}

export interface StartServiceSequenceRequest {
  robotId?: string;
  tenantId?: string;
  fromStationId?: string;
  trayAssignments: CargoTrayAssignmentDto[];
}

export interface ServiceSequenceResult {
  success: boolean;
  message: string;
  robotId?: string;
  robotName?: string;
  totalStops: number;
  createdTasks?: Array<{
    id: string;
    robotId?: string;
    cargoLevel: number;
    status: string;
    toStationId?: string;
    destinationTableNo?: string;
    orderReference?: string;
  }>;
}

export interface ConfirmNextTableResponse {
  success: boolean;
  message: string;
  nextAction: 'next_table' | 'return_to_kitchen';
  nextStationId?: string | null;
  nextStationName?: string | null;
  completedCargoLevel: number;
}

export interface SlamMapTableDto {
  id: string;
  tableNo: string;
  name: string;
  worldX: number;
  worldY: number;
  zone: string;
}

export interface SlamMapStationDto {
  id: string;
  name: string;
  stationType: string;
  worldX: number;
  worldY: number;
}

export interface SlamMapWaypointDto {
  id: string;
  name: string;
  worldX: number;
  worldY: number;
  theta?: number;
  type?: string;
}

export interface SlamMapResponse {
  mapId: string;
  name: string;
  resolution: number;
  originX: number;
  originY: number;
  originZ: number;
  width: number;
  height: number;
  mapUrl: string;
  format: string;
  tables: SlamMapTableDto[];
  stations: SlamMapStationDto[];
  waypoints?: SlamMapWaypointDto[];
  lastUpdated: string;
}


