export interface ProductIndex {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
}

export interface AskRequest {
  question: string;
}

export interface AskResponse {
  answer: string;
  contextProducts: ProductIndex[];
}
