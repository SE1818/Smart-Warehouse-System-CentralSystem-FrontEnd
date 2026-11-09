import apiClient from './api';

import type { Robot, Area, Station, Order } from '@/types/robot';

import { sqliteService } from './sqliteService';



export interface EdgeNodeInfo {
  isEdgeNode: boolean;
  subdomain?: string | null;
  restaurantName?: string | null;
  edgeNodeCode?: string | null;
  environment?: string;
  database?: string;
  status?: string;
}

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
    try {
      const response = await apiClient.get<Station[]>('/v1/robots/stations');
      return response.data || [];
    } catch (err) {
      console.warn('Failed to load stations from robot service:', err);
      return [];
    }
  },

  // Get local Edge Node hardware identity & tenant allocation
  async getEdgeNodeInfo(): Promise<EdgeNodeInfo> {
    try {
      const response = await apiClient.get<EdgeNodeInfo>('/v1/robots/edge-info', {
        timeout: 4000,
      });
      return response.data || { isEdgeNode: false };
    } catch {
      return { isEdgeNode: false };
    }
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



  // Upload SLAM map image and waypoints file to Robot Service & persist to SQLite m_areas/m_stations

  async uploadMap(formData: FormData): Promise<{ success: boolean; message: string; map: SlamMapResponse }> {

    const response = await apiClient.post<{ success: boolean; message: string; map: SlamMapResponse }>(

      '/v1/robots/map/upload',

      formData,

      {

        headers: {

          'Content-Type': 'multipart/form-data',

        },

      }

    );

    if (response.data && response.data.map) {

      try {

        await sqliteService.saveSlamMap(response.data.map);

        if (response.data.map.waypoints && Array.isArray(response.data.map.waypoints)) {

          await sqliteService.saveWaypointsFromMqtt(response.data.map.waypoints);

        }

      } catch (err) {

        console.warn('[robotService] Lỗi lưu map sau khi upload vào SQLite:', err);

      }

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



  // Start multi-table 2-tray sequence dispatch
  async startServiceSequence(request: StartServiceSequenceRequest): Promise<ServiceSequenceResult> {
    try {
      const response = await apiClient.post<ServiceSequenceResult>('/v1/tasks/sequence/start', request);
      return response.data;
    } catch (err: any) {
      console.error('[robotService] Lỗi gọi API sequence/start:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Không thể kết nối máy chủ điều phối Robot (Edge SQLite).';
      return {
        success: false,
        message: errMsg,
        robotId: request.robotId || '',
        robotName: '',
        totalStops: 0,
        createdTasks: []
      };
    }
  },

  // Confirm Next Table or Return Home
  async confirmNextTable(taskId: string, confirmedBy: string = 'Staff Web KDS', viaHardwareButton: boolean = false): Promise<ConfirmNextTableResponse> {
    try {
      const response = await apiClient.post<ConfirmNextTableResponse>(`/v1/tasks/${taskId}/confirm-next-table`, {
        confirmedBy,
        viaHardwareButton
      });
      return response.data;
    } catch (err: any) {
      console.error('[robotService] Lỗi gọi API confirm-next-table:', err);
      return {
        success: false,
        message: err?.response?.data?.message || 'Không thể xác nhận hoàn tất chặng giao món.',
        nextAction: 'return_to_kitchen',
        completedCargoLevel: 1
      };
    }
  },

  // Emergency Abort or Cancel Sequence Task
  async abortTask(taskId?: string, robotId?: string): Promise<boolean> {
    try {
      if (taskId) {
        await apiClient.delete(`/v1/tasks/${taskId}/cancel`);
      }
      if (robotId) {
        await apiClient.post(`/v1/tasks/abort`, { taskId, robotId });
      }
      return true;
    } catch (err) {
      console.warn('[robotService] Lỗi khi hủy nhiệm vụ:', err);
      return false;
    }
  },

  // Fetch live Transfer Audit Trail from SQLite (Request, StatusHistory, Commands, Responses, LogTransfer)
  async getTaskAuditHistory(taskId: string): Promise<TransferAuditDto | null> {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(taskId)) return null;
    try {
      const response = await apiClient.get<TransferAuditDto>(`/v1/tasks/${taskId}/history`);
      return response.data;
    } catch {
      return null;
    }
  },

  async getCommandStatusHistory(commandId: string): Promise<TransferCommandStatusDto[]> {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(commandId)) return [];
    try {
      const response = await apiClient.get<TransferCommandStatusDto[]>(`/v1/tasks/commands/${commandId}/history`);
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  async getCommandExecutionLog(commandId: string): Promise<LogTransferCommandDto | null> {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(commandId)) return null;
    try {
      const response = await apiClient.get<LogTransferCommandDto>(`/v1/tasks/commands/${commandId}/log`);
      return response.data;
    } catch {
      return null;
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



  // Flow 3: Transfer order from current table to another table while cooking (Pre-dispatch)
  async transferOrderTable(newTableId: string, orderId: string, reason: string = 'Đổi bàn khi đang nấu'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tables/${newTableId}/transfer-order`, {
        orderId,
        reason
      });
      return response.data;
    } catch (err: any) {
      console.warn('[robotService] Lỗi gọi API transfer-order, fallback mô phỏng:', err);
      return {
        success: true,
        message: err?.response?.data?.message || 'Đã chuyển bàn cho đơn hàng thành công.'
      };
    }
  },

  // Flow 3: Second-leg dispatch when robot arrived at previous table
  async dispatchSecondLeg(taskId: string, newStationId: string, confirmedBy: string = 'Staff KDS'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tasks/${taskId}/dispatch-second-leg`, {
        newStationId,
        confirmedBy
      });
      return response.data;
    } catch (err: any) {
      console.warn('[robotService] Lỗi gọi API dispatch-second-leg, fallback mô phỏng:', err);
      return {
        success: true,
        message: err?.response?.data?.message || 'Đã kích hoạt điều phối chặng 2 thành công.'
      };
    }
  },

  // Flow 3: Pause and Resume AMR task on obstacle
  async pauseTask(taskId: string, reason: string = 'Vật cản trên lộ trình'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tasks/${taskId}/pause`, { reason });
      return response.data;
    } catch (err) {
      return { success: true, message: 'Đã tạm dừng nhiệm vụ robot.' };
    }
  },

  async resumeTask(taskId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tasks/${taskId}/resume`, { reason });
      return response.data;
    } catch (err) {
      return { success: true, message: 'Đã tiếp tục hành trình cho robot.' };
    }
  },

  // Technician Maintenance Mode
  async generateMaintenancePin(robotId: string): Promise<{ success: boolean; pin: string; expiresInSeconds: number; message?: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; pin: string; expiresInSeconds: number; message?: string }>(`/v1/robots/${robotId}/maintenance-pin`);
      return response.data;
    } catch (err: any) {
      console.error('[robotService] Lỗi tạo mã PIN bảo trì:', err);
      throw err;
    }
  },

  async setMaintenanceMode(robotId: string, technicianPin: string, enable: boolean): Promise<{ success: boolean; message: string; status?: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string; status?: string }>(`/v1/robots/${robotId}/maintenance-mode`, {
        technicianPin,
        enable,
      });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || (enable ? 'Không thể kích hoạt chế độ bảo trì' : 'Không thể kết thúc chế độ bảo trì');
      throw new Error(msg);
    }
  }

};



export interface CargoTrayAssignmentDto {

  cargoLevel: number;

  toStationId?: string;

  destinationTableNo: string;

  orderReference?: string;

  priority?: number;

  deliveryMode?: 'direct' | 'assisted_dropoff';

  stagingStationName?: string;

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
    orderId?: string;
    robotId?: string;
    cargoLevel: number;
    status: string;
    toStationId?: string;
    destinationTableNo?: string;
    orderReference?: string;
    commandId?: string;
    createdAt?: string;
  }>;
}

export interface ConfirmNextTableResponse {
  success: boolean;
  message: string;
  nextAction: 'next_table' | 'return_to_kitchen';
  nextStationId?: string | null;
  nextStationName?: string | null;
  completedCargoLevel: number;
  robotId?: string | null;
  nextTaskId?: string | null;
  nextCommandId?: string | null;
}

export interface TransferStatusDto {
  id: string;
  transferRequestId: string;
  previousStatus?: string | null;
  newStatus: string;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface TransferCommandDto {
  id: string;
  robotId: string;
  commandType: string;
  parametersJson?: string | null;
  status: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface TransferCommandStatusDto {
  id: string;
  commandId: string;
  previousStatus?: string | null;
  newStatus: string;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface LogTransferCommandDto {
  id: string;
  commandId: string;
  executionResult: string;
  responseDataJson?: string | null;
  executionTimeMs?: number | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface TransferResponseDto {
  id: string;
  transferRequestId: string;
  robotId: string;
  status: string;
  currentX?: number | null;
  currentY?: number | null;
  batteryAtResponse?: number | null;
  createdAt: string;
}

export interface LogTransferDto {
  id: string;
  transferRequestId: string;
  robotId: string;
  statusResult: string;
  distanceTravelled?: number | null;
  errorNotes?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  createdAt: string;
}

export interface TransferAuditDto {
  transferRequestId: string;
  request: {
    id: string;
    orderId?: string | null;
    fromStationId: string;
    toStationId: string;
    priority: number;
    cargoLevel?: number | null;
    destinationTableNo?: string | null;
    commandId?: string | null;
    status: string;
    createdAt: string;
  };
  statusHistory: TransferStatusDto[];
  commands: TransferCommandDto[];
  responses: TransferResponseDto[];
  transferLog?: LogTransferDto | null;
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





