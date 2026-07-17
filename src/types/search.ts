export interface ProductIndex {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  storeId?: string;
  storeName?: string;
  imageUrl?: string;
}

export interface AskRequest {
  question: string;
}

export interface AskResponse {
  answer: string;
  contextProducts: ProductIndex[];
}

export interface ChatMessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contextProducts?: ProductIndex[];
  tokenCount?: number;
  responseTimeMs?: number;
  createdAt: string;
}

export interface ChatConversationDto {
  id: string;
  title?: string;
  userRole: string;
  isArchived: boolean;
  messageCount: number;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  content: string;
  conversationId?: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessageDto;
  assistantReply: ChatMessageDto;
  contextProducts: ProductIndex[];
}

export interface ProductStoreGroup {
  storeId: string;
  storeName: string;
  products: ProductIndex[];
}

export interface SearchResponseGrouped {
  products: ProductIndex[];
  groupedByStore?: ProductStoreGroup[];
  filteredByStore?: boolean;
  storeId?: string;
}
