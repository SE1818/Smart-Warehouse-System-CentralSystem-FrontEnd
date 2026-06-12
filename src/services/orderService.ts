import apiClient from './api';
import type { Order } from '@/types';

export interface CreateOrderItemRequest {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  userId: string;
  deliveryNodeId: string;
  shippingAddress: string;
  paymentMethod: string;
  items: CreateOrderItemRequest[];
}

export interface CreateOrderResponse {
  orderId: string;
  paymentUrl?: string;
}

export const orderService = {
  /**
   * Create a new order (Checkout)
   * POST /api/orders
   */
  async createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
    const res = await apiClient.post<CreateOrderResponse>('/orders', data);
    return res.data;
  },

  /**
   * Get all orders for a specific user
   * GET /api/orders/user/{userId}
   */
  async getOrdersByUserId(userId: string): Promise<Order[]> {
    const res = await apiClient.get<Order[]>(`/orders/user/${userId}`);
    return res.data;
  },

  /**
   * Get order detail by ID
   * GET /api/orders/{id}
   */
  async getOrderById(id: string): Promise<Order> {
    const res = await apiClient.get<Order>(`/orders/${id}`);
    return res.data;
  },

  /**
   * Get all pending orders (for admin review)
   * GET /api/orders/pending
   */
  async getPendingOrders(): Promise<Order[]> {
    const res = await apiClient.get<Order[]>('/orders/pending');
    return res.data;
  },

  /**
   * Confirm an order (Admin approves and calls AMR robot)
   * POST /api/orders/{id}/confirm
   */
  async confirmOrder(id: string): Promise<void> {
    await apiClient.post(`/orders/${id}/confirm`);
  },

  /**
   * Refund / Cancel an order
   * POST /api/orders/{id}/refund
   */
  async refundOrder(id: string): Promise<void> {
    await apiClient.post(`/orders/${id}/refund`);
  },

  /**
   * Update order status manually
   * POST /api/orders/{id}/status?status={status}
   */
  async updateOrderStatus(id: string, status: string): Promise<void> {
    await apiClient.post(`/orders/${id}/status?status=${status}`);
  }
};
