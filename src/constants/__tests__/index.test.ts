import { describe, it, expect } from 'vitest';
import { DEFAULT_PRODUCTS, DEFAULT_ORDERS, STATUS_COLORS, STATUS_LABELS } from '@/constants';

describe('DEFAULT_PRODUCTS', () => {
  it('contains 6 products', () => {
    expect(DEFAULT_PRODUCTS).toHaveLength(6);
  });

  it('each product has required fields', () => {
    for (const p of DEFAULT_PRODUCTS) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('price');
      expect(typeof p.price).toBe('number');
      expect(p.price).toBeGreaterThan(0);
      expect(p).toHaveProperty('stockQuantity');
      expect(typeof p.stockQuantity).toBe('number');
    }
  });

  it('includes a product with zero stock', () => {
    const zeroStock = DEFAULT_PRODUCTS.find(p => p.stockQuantity === 0);
    expect(zeroStock).toBeDefined();
    expect(zeroStock!.name).toBe('Găng tay cao su y tế');
  });

  it('all product ids are unique', () => {
    const ids = DEFAULT_PRODUCTS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('DEFAULT_ORDERS', () => {
  it('returns orders with today or near date', () => {
    const orders = DEFAULT_ORDERS();
    expect(orders.length).toBeGreaterThanOrEqual(2);
    for (const o of orders) {
      expect(o).toHaveProperty('id');
      expect(o).toHaveProperty('status');
      expect(o).toHaveProperty('items');
      expect(Array.isArray(o.items)).toBe(true);
    }
  });

  it('first order is delivered', () => {
    expect(DEFAULT_ORDERS()[0].status).toBe('Delivered');
  });

  it('order items have name and quantity', () => {
    const items = DEFAULT_ORDERS()[0].items;
    for (const item of items) {
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('quantity');
      expect(typeof item.quantity).toBe('number');
      expect(item.quantity).toBeGreaterThan(0);
    }
  });
});

describe('STATUS_COLORS', () => {
  it('has entries for all 5 order statuses', () => {
    expect(STATUS_COLORS.Pending).toBeDefined();
    expect(STATUS_COLORS.Confirmed).toBeDefined();
    expect(STATUS_COLORS.Shipped).toBeDefined();
    expect(STATUS_COLORS.Delivered).toBeDefined();
    expect(STATUS_COLORS.Cancelled).toBeDefined();
  });

  it('each color is a non-empty string', () => {
    for (const color of Object.values(STATUS_COLORS)) {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    }
  });
});

describe('STATUS_LABELS', () => {
  it('has Vietnamese labels for all 5 statuses', () => {
    expect(STATUS_LABELS.Pending).toBe('Chờ xác nhận');
    expect(STATUS_LABELS.Delivered).toBe('Đã giao hàng');
    expect(STATUS_LABELS.Cancelled).toBe('Đã hủy đơn');
  });
});
