import apiClient from './api';
import type { Robot, MoveRequest, StatusRequest, FulfillmentRequest } from '@/types/robot';
import type { Order } from '@/types/product';

export const robotService = {
  // Get all robots
  async listRobots(): Promise<Robot[]> {
    const response = await apiClient.get<Robot[]>('/v1/robots');
    return response.data;
  },

  // Move robot to coordinates
  async moveRobot(robotId: string, request: MoveRequest): Promise<void> {
    await apiClient.post(`/v1/robots/${robotId}/move`, request);
  },

  // Update robot status
  async updateRobotStatus(robotId: string, request: StatusRequest): Promise<void> {
    await apiClient.put(`/v1/robots/${robotId}/status`, request);
  },

  // Fulfill order with robot
  async fulfillOrder(request: FulfillmentRequest): Promise<void> {
    await apiClient.post('/v1/robots/fulfill', request);
  },

  // Get pending orders
  async listPendingOrders(): Promise<Order[]> {
    const response = await apiClient.get<Order[]>('/v1/orders/pending');
    return response.data;
  },
};
