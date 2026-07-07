import apiClient from './api';
import type { Robot } from '@/types/robot';
import type { Order } from '@/types/product';

interface RobotRaw {
  id: string;
  name: string;
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
  async getAreas(): Promise<{ id: string; name: string }[]> {
    const response = await apiClient.get<{ id: string; name: string }[]>('/v1/robots/areas');
    return response.data;
  },

  // Get stations
  async getStations(): Promise<{ id: string; name: string; areaId: string }[]> {
    const response = await apiClient.get<{ id: string; name: string; areaId: string }[]>('/v1/robots/stations');
    return response.data;
  }
};
