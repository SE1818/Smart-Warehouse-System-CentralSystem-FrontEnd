export const StockMovementType = {
  In: 0,
  Out: 1,
  Adjust: 2,
} as const;

export type StockMovementType = typeof StockMovementType[keyof typeof StockMovementType];

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stockQuantity: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockLevel {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number;
  updatedAt: string;
  product: Product;
  warehouse: Warehouse;
}

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number;
  referenceNo: string | null;
  note: string | null;
  createdAt: string;
  product: Product;
  warehouse: Warehouse;
}

export interface AdjustStockRequest {
  quantityChange: number;
  type: StockMovementType;
  referenceNo?: string | null;
  note?: string | null;
}
