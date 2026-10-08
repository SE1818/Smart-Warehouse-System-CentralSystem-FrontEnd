import apiClient from './api';
import type { Robot, Area, Station } from '@/types/robot';
import type { Order } from '@/types/product';

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
  // Get all robots
  async listRobots(): Promise<Robot[]> {
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

  // Get active SLAM map metadata from Robot Service (real MQTT / ROS 2 data)
  async getActiveSlamMap(): Promise<SlamMapResponse> {
    const response = await apiClient.get<SlamMapResponse>('/v1/robots/map/active');
    return response.data;
  },

  // Broadcast or update SLAM map via API
  async updateSlamMap(map: Partial<SlamMapResponse>): Promise<SlamMapResponse> {
    const response = await apiClient.post<SlamMapResponse>('/v1/robots/map/update', map);
    return response.data;
  },

  // Get waypoints from active map
  async getWaypoints(): Promise<SlamMapWaypointDto[]> {
    const response = await apiClient.get<SlamMapWaypointDto[]>('/v1/robots/map/waypoints');
    return response.data;
  },

  // Update waypoints list on active map
  async updateWaypoints(waypoints: SlamMapWaypointDto[]): Promise<SlamMapResponse> {
    const response = await apiClient.post<SlamMapResponse>('/v1/robots/map/waypoints', waypoints);
    return response.data;
  }
};

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

