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
}

export const storeService = {
  async registerStore(data: {
    storeName: string;
    ownerName: string;
    ownerEmail: string;
    phoneNumber: string;
    areaId: string;
    areaName: string;
    stationId: string;
    stationName: string;
  }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/v1/storeregistrations/register-store', data);
    return response.data;
  },

  async listPendingRegistrations(): Promise<StoreRegistrationDto[]> {
    const response = await apiClient.get<StoreRegistrationDto[]>('/v1/storeregistrations/pending');
    return response.data;
  },

  async approveRegistration(id: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/v1/storeregistrations/${id}/approve`);
    return response.data;
  },

  async rejectRegistration(id: string, reason: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/v1/storeregistrations/${id}/reject`, { reason });
    return response.data;
  }
};
