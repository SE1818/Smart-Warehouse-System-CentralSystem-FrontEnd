export type NotificationType = 'Email' | 'SMS' | 'InApp' | 'Push';

export type NotificationStatus = 'Pending' | 'Sent' | 'Failed' | 'Read';

export interface NotificationDto {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  createdAt: string;
  sentAt?: string;
}

export interface SendNotificationRequest {
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  destinationEmail?: string;
}
