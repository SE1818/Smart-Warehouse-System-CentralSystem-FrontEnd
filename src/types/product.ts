export interface Product {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  stockQuantity: number;
  unit: string;
  imageUrl?: string;
  storeId?: string;
  storeName?: string;
  createdAt: string;
  updatedAt: string;
}
export type { Order } from './subscription';
