export interface Product { id: string; sku?: string; name: string; description?: string; category: string; price: number; stockQuantity: number; unit: string; imageUrl?: string; createdAt: string; updatedAt: string; }
export interface CartItem { productId: string; product: Product; quantity: number; }
export interface OrderItem { productId: string; productName: string; quantity: number; unitPrice: number; totalPrice: number; }
export interface Order { id: string; userId: string; items: OrderItem[]; totalAmount: number; status: string; shippingAddress: string; note?: string; createdAt: string; updatedAt: string; }
