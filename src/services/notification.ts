import apiClient from './api';
import type { NotificationDto, SendNotificationRequest } from '@/types/notification';

export const notificationService = {
  async getUserNotifications(userId: string): Promise<NotificationDto[]> {
    const response = await apiClient.get<NotificationDto[]>(`/api/v1/notifications/user/${userId}`);
    return response.data;
  },

  async sendNotification(data: SendNotificationRequest): Promise<NotificationDto> {
    const response = await apiClient.post<NotificationDto>('/api/v1/notifications', data);
    return response.data;
  },
};
