import { apiClient } from '../client';

// ============ User Profile Types ============

export interface UserProfileResponse {
  userId: number;
  accountId: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  bio?: string;
  phone?: string;
  memberSince: string;
}

export interface UserProfileRequest {
  fullName?: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
}

// ============ User Search Types ============

export interface UserSearchResult {
  userId: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  isFriend: boolean;
  hasPendingRequest: boolean;
}

// ============ Profile Types ============

export interface GamificationStats {
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  totalXpEarned: number;
  currentStreak: number;
  longestStreak: number;
}

export interface FinancialSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  savingsProgress: number;
}

export interface RecentAchievement {
  id: number;
  name: string;
  description: string;
  unlockedAt: string;
}

export interface CompleteProfileResponse {
  accountId: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  memberSince: string;
  gamification: GamificationStats;
  financial: FinancialSummary;
  recentAchievements: RecentAchievement[];
  petMood: string;
  friendCount: number;
  activeGoalsCount: number;
}

// ============ Settings Types ============

export interface UserSettingsResponse {
  accountId: number;
  notificationsEnabled: boolean;
  budgetAlertsEnabled: boolean;
  achievementAlertsEnabled: boolean;
  friendRequestAlertsEnabled: boolean;
  darkModeEnabled: boolean;
  language: string;
  currency: string;
  timezone: string;
}

export interface UserSettingsRequest {
  notificationsEnabled?: boolean;
  budgetAlertsEnabled?: boolean;
  achievementAlertsEnabled?: boolean;
  friendRequestAlertsEnabled?: boolean;
  darkModeEnabled?: boolean;
  language?: string;
  currency?: string;
  timezone?: string;
}

// ============ User Profile API ============

export const userProfileApi = {
  search: (query: string, page = 0, size = 20) => 
    apiClient.get<UserSearchResult[]>('/user-profile/search', {
      params: { q: query, page, size },
    }),

  createOrUpdate: (data: UserProfileRequest) => 
    apiClient.post<UserProfileResponse>('/user-profile', data),

  getMe: () => 
    apiClient.get<UserProfileResponse>('/user-profile/me'),

  getByAccountId: (accountId: number) => 
    apiClient.get<UserProfileResponse>(`/user-profile/account/${accountId}`),

  deleteMe: () => 
    apiClient.delete('/user-profile/me'),
};

// ============ Profile API (Dashboard) ============

export const profileApi = {
  getCompleteProfile: () => 
    apiClient.get<CompleteProfileResponse>('/profile/complete'),

  getSettings: () => 
    apiClient.get<UserSettingsResponse>('/profile/settings'),

  updateSettings: (data: UserSettingsRequest) =>
    apiClient.put<UserSettingsResponse>('/profile/settings', data),
};
