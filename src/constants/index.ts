import type { Product } from '@/types';

export interface PortalOrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface PortalOrder {
  id: string;
  date: string;
  total: number;
  status: 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
  station: string;
  items: PortalOrderItem[];
}

export const DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: 'Đồ uống Coca Cola', category: 'Đồ uống', price: 15000, stockQuantity: 50, description: 'Coca Cola lon 330ml', unit: 'lon', createdAt: '', updatedAt: '' },
  { id: '2', name: 'Nước suối Aquafina', category: 'Đồ uống', price: 10000, stockQuantity: 100, description: 'Chai 500ml', unit: 'chai', createdAt: '', updatedAt: '' },
  { id: '3', name: 'Khẩu trang y tế N95', category: 'Vật tư y tế', price: 25000, stockQuantity: 200, description: 'Hộp 10 chiếc', unit: 'hộp', createdAt: '', updatedAt: '' },
  { id: '4', name: 'Cồn sát khuẩn 70 độ', category: 'Vật tư y tế', price: 35000, stockQuantity: 15, description: 'Chai 500ml cồn y tế', unit: 'chai', createdAt: '', updatedAt: '' },
  { id: '5', name: 'Găng tay cao su y tế', category: 'Vật tư y tế', price: 85000, stockQuantity: 0, description: 'Hộp 100 chiếc', unit: 'hộp', createdAt: '', updatedAt: '' },
  { id: '6', name: 'Băng cá nhân Urgo', category: 'Vật tư y tế', price: 20000, stockQuantity: 150, description: 'Hộp 100 miếng', unit: 'hộp', createdAt: '', updatedAt: '' }
];

export const DEFAULT_ORDERS = (): PortalOrder[] => [
  {
    id: 'ORD-548903',
    date: new Date().toISOString().split('T')[0],
    total: 55000,
    status: 'Delivered',
    station: 'ST01',
    items: [
      { name: 'Đồ uống Coca Cola', quantity: 2, price: 15000 },
      { name: 'Khẩu trang y tế N95', quantity: 1, price: 25000 }
    ]
  },
  {
    id: 'ORD-894201',
    date: '2025-06-05',
    total: 35000,
    status: 'Shipped',
    station: 'ST02',
    items: [
      { name: 'Cồn sát khuẩn 70 độ', quantity: 1, price: 35000 }
    ]
  }
];

export const STATUS_COLORS = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  Confirmed: 'bg-blue-50 text-blue-700 border border-blue-200/60',
  Shipped: 'bg-purple-50 text-purple-700 border border-purple-200/60',
  Delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  Cancelled: 'bg-red-50 text-red-700 border border-red-200/60',
};

export const STATUS_LABELS = {
  Pending: 'Chờ xác nhận',
  Confirmed: 'Đã xác nhận',
  Shipped: 'Đang vận chuyển (AMR)',
  Delivered: 'Đã giao hàng',
  Cancelled: 'Đã hủy đơn',
};
