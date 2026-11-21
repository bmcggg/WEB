import { fetchAPI } from './api';

export async function getNotifications() {
  const response = await fetchAPI('/notifications');
  return {
    items: Array.isArray(response?.data) ? response.data : [],
    unreadCount: Number(response?.unread_count) || 0,
  };
}

export async function markNotificationRead(id) {
  return fetchAPI(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return fetchAPI('/notifications/read-all', { method: 'PATCH' });
}
