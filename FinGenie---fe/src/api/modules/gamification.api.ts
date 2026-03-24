import { apiClient } from '../client';

// ============ Gamification Profile Types (matches BE GamificationController) ============

export interface GamificationProfileDto {
  accountId: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  lifetimeXp: number;
  currentStreak: number;
  longestStreak: number;
  title: string;
  // Computed helper for UI
  nextLevelXp?: number;
  currentXp?: number;
}

// ============ Achievement Types (matches BE AchievementController) ============

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
export type AchievementCategory = 'TRANSACTIONS' | 'SAVINGS' | 'STREAKS' | 'AI_GUESS' | 'SOCIAL' | 'PET' | 'MILESTONES';

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  category: AchievementCategory;
  xpReward: number;
  targetValue: number;
  isHidden: boolean;
  progressValue: number;
  progressPercentage: number;
  isUnlocked: boolean;
  isClaimed: boolean;
  unlockedAt?: string;
  claimedAt?: string;
  // Compatibility aliases for UI
  unlocked?: boolean;
  claimed?: boolean;
  rarity?: AchievementTier;
}

export interface AchievementSummary {
  totalAchievements: number;
  unlockedCount: number;
  claimableCount: number;
  completionPercentage: number;
}

export interface ClaimResponse {
  xpAwarded: number;
  newTotalXp: number;
  newLevel: number;
  achievement: Achievement;
}

// ============ Leaderboard Types (matches BE LeaderboardController) ============

export type LeaderboardType = 'XP' | 'STREAK' | 'LEVEL' | 'SAVINGS';
export type LeaderboardPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';

export interface LeaderboardEntry {
  rank: number;
  accountId: number;
  accountName: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  lifetimeXp: number;
  currentStreak: number;
  badge: string | null;
  isCurrentUser: boolean;
  // Compatibility alias
  displayName?: string;
  totalXp?: number;
}

export interface UserRankInfo {
  rank: number;
  level: number;
  xp: number;
  lifetimeXp: number;
  percentile: number;
  pointsToNextRank: number;
  nextRankPlayerName: string | null;
}

export interface LeaderboardResponse {
  type: LeaderboardType;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  currentUserRank: UserRankInfo | null;
  totalParticipants: number;
  // Compatibility alias
  currentUserEntry?: LeaderboardEntry | null;
}

// ============ Gamification API ============

export const gamificationApi = {
  getProfile: () => 
    apiClient.get<GamificationProfileDto>('/gamification/profile'),

  addXp: (xp: number, reason?: string) => 
    apiClient.post<GamificationProfileDto>('/gamification/add-xp', null, {
      params: {
        xp,
        ...(reason ? { reason } : {}),
      },
    }),

  // Achievement endpoints
  getAchievements: () => 
    apiClient.get<Achievement[]>('/achievements'),

  getAchievementsByCategory: (category: AchievementCategory) => 
    apiClient.get<Achievement[]>(`/achievements/category/${category}`),

  getClaimableAchievements: () => 
    apiClient.get<Achievement[]>('/achievements/claimable'),

  claimAchievement: (achievementId: number) => 
    apiClient.post<ClaimResponse>(`/achievements/${achievementId}/claim`),

  getAchievementSummary: () => 
    apiClient.get<AchievementSummary>('/achievements/summary'),
};

// ============ Leaderboard API ============

export const leaderboardApi = {
  getGlobal: async (type: LeaderboardType = 'XP', period: LeaderboardPeriod = 'WEEKLY') => {
    try {
      return await apiClient.get<LeaderboardResponse>('/leaderboard', {
        params: { type, period },
      });
    } catch (error) {
      console.error('[leaderboardApi.getGlobal] Request failed', { type, period, error });
      throw error;
    }
  },

  getTopTen: () => 
    apiClient.get<LeaderboardResponse>('/leaderboard/top10'),

  getFriends: async (type: LeaderboardType = 'XP', period: LeaderboardPeriod = 'WEEKLY') => {
    try {
      return await apiClient.get<LeaderboardResponse>('/leaderboard/friends', {
        params: { type, period },
      });
    } catch (error) {
      console.error('[leaderboardApi.getFriends] Request failed', { type, period, error });
      throw error;
    }
  },

  getMyRank: (type: LeaderboardType = 'XP') => 
    apiClient.get<UserRankInfo>('/leaderboard/me', {
      params: { type },
    }),
};
