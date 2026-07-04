import apiClient from './api';
import type { NotificationDto, SendNotificationRequest } from '@/types/notification';

export const notificationService = {
  async getUserNotifications(userId: string): Promise<NotificationDto[]> {
    const response = await apiClient.get<NotificationDto[]>(`/v1/notifications/user/${userId}`);
    return response.data;
  },

  async getAllNotifications(page = 1, pageSize = 50): Promise<NotificationDto[]> {
    const response = await apiClient.get<NotificationDto[]>(`/v1/notifications?page=${page}&pageSize=${pageSize}`);
    return response.data;
  },

  async sendNotification(data: SendNotificationRequest): Promise<NotificationDto> {
    const response = await apiClient.post<NotificationDto>('/v1/notifications', data);
    return response.data;
  },
};
