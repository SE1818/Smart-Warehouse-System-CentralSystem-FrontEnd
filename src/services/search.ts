import apiClient from './api';
import type {
  ProductIndex, AskResponse, SearchResponseGrouped,
  ChatConversationDto, SendMessageRequest, SendMessageResponse
} from '@/types/search';

export const searchService = {
  async searchProducts(query: string, storeId?: string): Promise<ProductIndex[]> {
    const params: Record<string, string> = { q: query };
    if (storeId) params.storeId = storeId;
    const response = await apiClient.get<SearchResponseGrouped | ProductIndex[]>('/v1/search/products', { params });
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data.products ?? [];
  },

  async indexProduct(product: ProductIndex): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/v1/search/products/index', product);
    return response.data;
  },

  async askWarehouseAssistant(question: string): Promise<AskResponse | null> {
    const response = await apiClient.post<AskResponse>('/v1/search/ask', { question });
    return response.data;
  },

  async suggestProducts(prefix: string, max: number = 10, storeId?: string): Promise<string[]> {
    const params: Record<string, string | number> = { q: prefix, max };
    if (storeId) params.storeId = storeId;
    const response = await apiClient.get<{ suggestions: string[] }>('/v1/search/suggest', { params });
    return response.data.suggestions;
  },

  // --- Chat History ---

  async getConversations(page: number = 1, pageSize: number = 20): Promise<ChatConversationDto[]> {
    const response = await apiClient.get<ChatConversationDto[]>('/v1/chat/conversations', { params: { page, pageSize } });
    return response.data;
  },

  async getConversationDetail(id: string) {
    const response = await apiClient.get(`/v1/chat/conversations/${id}`);
    return response.data;
  },

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>('/v1/chat/messages', request);
    return response.data;
  },

  // --- Voice ---

  async transcribeVoice(audioBase64: string, mimeType: string = 'audio/webm'): Promise<{ text: string }> {
    const response = await apiClient.post<{ text: string }>('/v1/chat/voice/transcribe', {
      audioBase64,
      mimeType
    });
    return response.data;
  },
};
