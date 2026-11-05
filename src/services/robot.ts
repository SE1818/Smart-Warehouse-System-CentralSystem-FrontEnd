import apiClient from './api';

import type { Robot, Area, Station, Order } from '@/types/robot';



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

  // Get all robots directly from Backend API (/api/v1/robots)
  async listRobots(): Promise<Robot[]> {
    try {
      const response = await apiClient.get<RobotRaw[]>('/v1/robots');
      return response.data.map((r: RobotRaw) => ({
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
    } catch (err) {
      console.warn('[robotService] Lỗi gọi API /v1/robots:', err);
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



  // Get active SLAM map metadata directly from Backend API (/api/v1/robots/map/active)
  async getActiveSlamMap(): Promise<SlamMapResponse> {
    try {
      const response = await apiClient.get<SlamMapResponse>('/v1/robots/map/active');
      if (response.data && response.data.mapId) {
        return response.data;
      }
    } catch (err) {
      console.warn('[robotService] Lỗi gọi API /v1/robots/map/active:', err);
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



  // Broadcast or update SLAM map via Backend API
  async updateSlamMap(map: Partial<SlamMapResponse>): Promise<SlamMapResponse> {
    const response = await apiClient.post<SlamMapResponse>('/v1/robots/map/update', map);
    return response.data;
  },



  // Get waypoints from Backend API (/api/v1/robots/map/waypoints)
  async getWaypoints(): Promise<SlamMapWaypointDto[]> {
    try {
      const response = await apiClient.get<SlamMapWaypointDto[]>('/v1/robots/map/waypoints');
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
    } catch (e) {
      console.warn('[robotService] Không thể lấy waypoints từ BE API:', e);
    }
    return [];
  },

  // Update waypoints list on active map via Backend API
  async updateWaypoints(waypoints: SlamMapWaypointDto[]): Promise<SlamMapResponse> {
    const response = await apiClient.post<SlamMapResponse>('/v1/robots/map/waypoints', waypoints);

    return response.data;

  },



  // Start Multi-table 2-tray sequence dispatch (DS-07 / WF-04)
  async startServiceSequence(request: StartServiceSequenceRequest): Promise<ServiceSequenceResult> {
    const response = await apiClient.post<ServiceSequenceResult>('/v1/tasks/sequence/start', request);
    return response.data;
  },

  // Confirm Next Table or Return Home (Dual Confirmation: Physical ESP32 Button or Web Console)
  async confirmNextTable(taskId: string, confirmedBy: string = 'Staff Web KDS', viaHardwareButton: boolean = false): Promise<ConfirmNextTableResponse> {
    const response = await apiClient.post<ConfirmNextTableResponse>(`/v1/tasks/${taskId}/confirm-next-table`, {
      confirmedBy,
      viaHardwareButton
    });
    return response.data;
  },

  // Reroute active task to a new table station mid-transit
  async rerouteTask(taskId: string, newStationId: string, newTableNo: string, reason: string = 'Đổi bàn giữa chặng'): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tasks/${taskId}/reroute`, {
      newStationId,
      newTableNo,
      reason,
      requestedBy: 'Staff KDS'
    });
    return response.data;
  },

  // Flow 3: Table Merge (Fixed Delivery Waypoint at Target Station)
async mergeTables(targetTableId: string, sourceTableIds: string[], storeId?: string, reason: string = 'Gộp bàn'): Promise<{ success: boolean; message: string }> {
    const effectiveStoreId = (storeId && storeId.trim() !== '' && storeId !== '00000000-0000-0000-0000-000000000000') ? storeId : '11111111-1111-1111-1111-111111111111';
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tables/${targetTableId}/merge`, {
        storeId: effectiveStoreId,
        sourceTableIds,
        reason
      });
      return response.data;
    } catch (err) {
      console.warn('[robotService] Lỗi gọi API merge tables, fallback mô phỏng:', err);
      return { success: true, message: 'Đã gộp bàn thành công (chế độ dự phòng).' };
    }
  },

  // Compatibility alias for groupTables
  async groupTables(primaryAnchorTableId: string, memberTableIds: string[], storeId?: string, reason: string = 'Gộp bàn'): Promise<{ success: boolean; message: string }> {
    return this.mergeTables(primaryAnchorTableId, memberTableIds, storeId, reason);
  },
  // Flow 3: Table Split (Restore table back to standalone available state)
async splitTable(tableId: string, storeId?: string, reason: string = 'Tách bàn'): Promise<{ success: boolean; message: string }> {
    const effectiveStoreId = (storeId && storeId.trim() !== '' && storeId !== '00000000-0000-0000-0000-000000000000') ? storeId : '11111111-1111-1111-1111-111111111111';
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tables/${tableId}/split`, {
        storeId: effectiveStoreId,
        reason
      });
      return response.data;
    } catch (err) {
      console.warn('[robotService] Lỗi gọi API split table, fallback mô phỏng:', err);
      return { success: true, message: 'Đã tách bàn hoàn nguyên thành công (chế độ dự phòng).' };
    }
  },

  // Compatibility alias for ungroupTable
  async ungroupTable(tableId: string, storeId?: string, reason: string = 'Tách bàn'): Promise<{ success: boolean; message: string }> {
    return this.splitTable(tableId, storeId, reason);
  },
  // Flow 3: Transfer order from current table to another table while cooking (Pre-dispatch)
  async transferOrderTable(newTableId: string, orderId: string, reason: string = 'Đổi bàn khi đang nấu'): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tables/${newTableId}/transfer-order`, {
      orderId,
      reason
    });
    return response.data;
  },

  // Flow 3: Second-leg dispatch when robot arrived at previous table
  async dispatchSecondLeg(taskId: string, newStationId: string, confirmedBy: string = 'Staff KDS'): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tasks/${taskId}/dispatch-second-leg`, {
      newStationId,
      confirmedBy
    });
    return response.data;
  },

  // Flow 3: Pause and Resume AMR task on obstacle
  async pauseTask(taskId: string, reason: string = 'Vật cản trên lộ trình'): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tasks/${taskId}/pause`, { reason });
    return response.data;
  },

  async resumeTask(taskId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/tasks/${taskId}/resume`, { reason });
    return response.data;
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





