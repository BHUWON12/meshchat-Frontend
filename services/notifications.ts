import axiosClient from './axiosClient';
import { Notification } from '../context/NotificationContext';

export async function getNotifications(): Promise<Notification[]> {
  const { data } = await axiosClient.get('/api/v1/notifications');
  return data;
}

export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
  const { data } = await axiosClient.patch<{ success: boolean }>(`/api/v1/notifications/${notificationId}/read`);
  return data;
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  const { data } = await axiosClient.patch<{ success: boolean }>('/api/v1/notifications/read-all');
  return data;
}

export async function deleteNotification(notificationId: string): Promise<{ success: boolean }> {
  const { data } = await axiosClient.delete<{ success: boolean }>(`/api/v1/notifications/${notificationId}`);
  return data;
}

export default {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
};