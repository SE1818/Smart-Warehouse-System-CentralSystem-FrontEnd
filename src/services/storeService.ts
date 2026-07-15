import apiClient from './api';

export interface StoreRegistrationDto {
  id: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  phoneNumber: string;
  areaId: string;
  areaName: string;
  stationId: string;
  stationName: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreDto {
  id: string;
  name: string;
  ownerEmail: string;
  areaId: string;
  stationId: string;
  imageUrl?: string;
  warehouseId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface StoreRegistrationStatusDto {
  id: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  imageUrl?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const storeService = {
  async uploadStoreImage(file: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post('/v1/storeregistrations/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async registerStore(data: {
    storeName: string;
    ownerName: string;
    ownerEmail: string;
    phoneNumber: string;
    areaId: string;
    areaName: string;
    stationId: string;
    stationName: string;
    imageUrl: string;
  }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/v1/storeregistrations/register-store', data);
    return response.data;
  },

  async listPendingRegistrations(): Promise<StoreRegistrationDto[]> {
    const response = await apiClient.get<StoreRegistrationDto[]>('/v1/storeregistrations/pending');
    return response.data;
  },

  async getAllRegistrations(status?: string): Promise<StoreRegistrationDto[]> {
    const params = status ? { status } : {};
    const response = await apiClient.get<StoreRegistrationDto[]>('/v1/storeregistrations', { params });
    return response.data;
  },

  async getMyRegistrationStatus(email: string): Promise<StoreRegistrationStatusDto> {
    const response = await apiClient.get<StoreRegistrationStatusDto>('/v1/storeregistrations/my-status', { params: { email } });
    return response.data;
  },

  async getAllStores(): Promise<StoreDto[]> {
    const response = await apiClient.get<StoreDto[]>('/v1/storeregistrations/stores');
    return response.data;
  },

  async getStoreById(id: string): Promise<StoreDto> {
    const response = await apiClient.get<StoreDto>(`/v1/storeregistrations/stores/${id}`);
    return response.data;
  },

  async approveRegistration(id: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/v1/storeregistrations/${id}/approve`);
    return response.data;
  },

  async rejectRegistration(id: string, reason: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/v1/storeregistrations/${id}/reject`, { reason });
    return response.data;
  },
};
