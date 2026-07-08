import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: vi.fn(), post: vi.fn() },
}));

import apiClient from '@/services/api';
import { orderService } from '@/services/orderService';

const get = apiClient.get as ReturnType<typeof vi.fn>;
const post = apiClient.post as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

describe('orderService', () => {
  it('createOrder posts data and returns orderId', async () => {
    post.mockResolvedValue({ data: { orderId: 'o1', paymentUrl: 'https://pay/x' } });
    const res = await orderService.createOrder({
      userId: 'u1', deliveryNodeId: 'd1', shippingAddress: 'addr',
      paymentMethod: 'COD', items: [{ productId: 'p1', quantity: 2, price: 100 }]
    });
    expect(res.orderId).toBe('o1');
    expect(res.paymentUrl).toBe('https://pay/x');
  });
  it('getOrdersByUserId returns array', async () => {
    get.mockResolvedValue({ data: [{ id: 'o1', userId: 'u1' }] });
    const res = await orderService.getOrdersByUserId('u1');
    expect(res[0].id).toBe('o1');
  });
  it('getOrderById returns one order', async () => {
    get.mockResolvedValue({ data: { id: 'o1', userId: 'u1' } });
    const res = await orderService.getOrderById('o1');
    expect(res.id).toBe('o1');
  });
  it('getPendingOrders returns array', async () => {
    get.mockResolvedValue({ data: [{ id: 'o1', status: 'PENDING' }] });
    const res = await orderService.getPendingOrders();
    expect(res[0].status).toBe('PENDING');
  });
  it('confirmOrder calls post', async () => {
    post.mockResolvedValue({ data: {} });
    await orderService.confirmOrder('o1');
    expect(post).toHaveBeenCalledWith('/orders/o1/confirm');
  });
  it('refundOrder calls post', async () => {
    post.mockResolvedValue({ data: {} });
    await orderService.refundOrder('o1');
    expect(post).toHaveBeenCalledWith('/orders/o1/refund');
  });
  it('updateOrderStatus calls post with query', async () => {
    post.mockResolvedValue({ data: {} });
    await orderService.updateOrderStatus('o1', 'DELIVERED');
    expect(post).toHaveBeenCalledWith('/orders/o1/status?status=DELIVERED');
  });
});
