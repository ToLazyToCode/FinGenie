import { apiClient } from '../client';

// ============ Notification Types (matches BE NotificationController) ============

export type NotificationType = 
  | 'BUDGET_WARNING' 
  | 'STREAK_REMINDER' 
  | 'ACHIEVEMENT' 
  | 'GOAL_PROGRESS' 
  | 'FRIEND_REQUEST' 
  | 'AI_GUESS'
  | 'SYSTEM';

export type NotificationActionType = 'NAVIGATE_TO' | 'OPEN_MODAL' | 'DEEP_LINK';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface NotificationResponse {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  actionType?: NotificationActionType;
  actionData?: Record<string, unknown>;
  priority: NotificationPriority;
  createdAt: string;
  expiresAt?: string;
  // Compatibility alias
  message?: string;
  accountId?: number;
  actionUrl?: string;
}

export interface NotificationPreferenceResponse {
  accountId: number;
  budgetWarnings: boolean;
  streakReminders: boolean;
  achievements: boolean;
  goalProgress: boolean;
  friendRequests: boolean;
  aiGuess: boolean;
  systemNotifications: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface UpdatePreferenceRequest {
  budgetWarnings?: boolean;
  streakReminders?: boolean;
  achievements?: boolean;
  goalProgress?: boolean;
  friendRequests?: boolean;
  aiGuess?: boolean;
  systemNotifications?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface NotificationDeviceTokenRequest {
  deviceToken: string;
  platform?: string;
  enabled?: boolean;
}

export interface NotificationDeviceTokenResponse {
  id: number;
  accountId: number;
  deviceToken: string;
  platform?: string;
  enabled: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PagedNotifications {
  content: NotificationResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const notificationsApi = {
  getAll: (page = 0, size = 20) => 
    apiClient.get<PagedNotifications>('/notifications', {
      params: { page, size },
    }),

  getRecent: () => 
    apiClient.get<NotificationResponse[]>('/notifications/recent'),

  getUnread: () => 
    apiClient.get<NotificationResponse[]>('/notifications/unread'),

  countUnread: () => 
    apiClient.get<{ count: number }>('/notifications/unread/count'),

  markAsRead: (notificationId: number) => 
    apiClient.post(`/notifications/${notificationId}/read`),

  markAllAsRead: () => 
    apiClient.post<{ markedCount: number }>('/notifications/read-all'),

  delete: (notificationId: number) => 
    apiClient.delete(`/notifications/${notificationId}`),

  getPreferences: () => 
    apiClient.get<NotificationPreferenceResponse>('/notifications/preferences'),

  updatePreferences: (data: UpdatePreferenceRequest) =>
    apiClient.put<NotificationPreferenceResponse>('/notifications/preferences', data),

  registerDeviceToken: (data: NotificationDeviceTokenRequest) =>
    apiClient.post<NotificationDeviceTokenResponse>('/notifications/device-token', data),

  disableDeviceToken: (deviceToken: string) =>
    apiClient.delete('/notifications/device-token', {
      params: { deviceToken },
    }),
};
