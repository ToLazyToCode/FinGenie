/**
 * Gamification Store
 * 
 * This store caches gamification data from the backend.
 * All XP additions and achievement claims should go through gamificationApi.
 * 
 * Usage:
 * - Use gamificationApi.getProfile() with React Query to fetch profile
 * - On success, call syncProfile(response.data) to update store
 * - Use gamificationApi.claimAchievement() for claims
 * - XP is granted by backend automatically (on transactions, predictions, etc.)
 * 
 * DO NOT:
 * - Use addXp() locally - XP must come from backend
 * - Use claimReward() without calling the API first
 * - Calculate levels locally - server is source of truth
 */

import { create } from 'zustand';
import { gamificationApi } from '../api/modules/gamification.api';
import type { 
  GamificationProfileDto, 
  Achievement, 
  LeaderboardEntry 
} from '../api/modules/gamification.api';

interface GamificationState {
  // Profile (synced from API)
  profile: GamificationProfileDto | null;
  isLoading: boolean;
  error: string | null;

  // Achievements (synced from API)
  achievements: Achievement[];
  unlockedAchievements: Achievement[];
  pendingRewards: Achievement[];

  // Leaderboard cache
  leaderboardCache: {
    global: LeaderboardEntry[];
    friends: LeaderboardEntry[];
    lastUpdated: number | null;
  };

  // XP animation queue (for UI effects)
  xpAnimationQueue: Array<{
    id: string;
    amount: number;
    reason: string;
  }>;

  // Sync from API (preferred methods)
  syncProfile: (profile: GamificationProfileDto) => void;
  syncAchievements: (achievements: Achievement[]) => void;

  // Legacy setters (for backwards compatibility)
  setProfile: (profile: GamificationProfileDto | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAchievements: (achievements: Achievement[]) => void;

  // XP animation (UI only - does NOT add XP)
  queueXpAnimation: (amount: number, reason: string) => void;
  processXpAnimation: () => { id: string; amount: number; reason: string } | null;

  /** @deprecated Use gamificationApi.addXp() then syncProfile() instead */
  addXp: (amount: number, reason: string) => void;

  // Achievement actions
  /** @deprecated Use gamificationApi.claimAchievement() then syncAchievements() */
  unlockAchievement: (achievement: Achievement) => void;
  addPendingReward: (achievement: Achievement) => void;
  
  // Claim reward through API (proper implementation)
  claimRewardAsync: (achievementId: number) => Promise<void>;
  /** @deprecated Use claimRewardAsync instead */
  claimReward: (achievementId: number) => void;

  // Leaderboard
  setLeaderboard: (type: 'global' | 'friends', entries: LeaderboardEntry[]) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  profile: null,
  isLoading: false,
  error: null,
  achievements: [],
  unlockedAchievements: [],
  pendingRewards: [],
  leaderboardCache: {
    global: [],
    friends: [],
    lastUpdated: null,
  },
  xpAnimationQueue: [],
};

export const gamificationStore = create<GamificationState>((set, get) => ({
  ...initialState,

  // Sync from API response (preferred)
  syncProfile: (profile) => set({ profile, error: null }),

  syncAchievements: (achievements) => {
    const unlocked = achievements.filter(a => a.isUnlocked);
    const pending = achievements.filter(a => a.isUnlocked && !a.isClaimed);
    set({ 
      achievements, 
      unlockedAchievements: unlocked,
      pendingRewards: pending,
    });
  },

  // Legacy setters
  setProfile: (profile) => set({ profile, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  setAchievements: (achievements) => {
    const unlocked = achievements.filter(a => a.isUnlocked);
    set({ achievements, unlockedAchievements: unlocked });
  },

  // Queue XP animation for UI effects (does NOT actually add XP)
  queueXpAnimation: (amount, reason) => {
    const { xpAnimationQueue } = get();
    const id = `xp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set({
      xpAnimationQueue: [...xpAnimationQueue, { id, amount, reason }],
    });
  },

  // DEPRECATED: XP should come from backend API response
  addXp: (amount, reason) => {
    console.warn(
      '[gamificationStore.addXp] DEPRECATED: XP must come from backend. ' +
      'Use gamificationApi.addXp() and syncProfile() with the response instead.'
    );
    
    // Only queue animation, don't fake update profile
    const { xpAnimationQueue } = get();
    const id = `xp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set({
      xpAnimationQueue: [...xpAnimationQueue, { id, amount, reason }],
    });
    
    // DO NOT update profile locally - this causes state divergence
    // The old fake level-up calculation has been removed
  },

  processXpAnimation: () => {
    const { xpAnimationQueue } = get();
    if (xpAnimationQueue.length === 0) return null;
    
    const [next, ...rest] = xpAnimationQueue;
    set({ xpAnimationQueue: rest });
    return next;
  },

  // DEPRECATED: Use syncAchievements after API call
  unlockAchievement: (achievement) => {
    console.warn(
      '[gamificationStore.unlockAchievement] DEPRECATED: ' +
      'Achievements are unlocked by backend. Use syncAchievements() with API response.'
    );
    const { achievements, unlockedAchievements, pendingRewards } = get();
    
    const updated = achievements.map(a => 
      a.id === achievement.id ? { ...a, isUnlocked: true, unlockedAt: new Date().toISOString() } : a
    );
    
    set({
      achievements: updated,
      unlockedAchievements: [...unlockedAchievements, achievement],
      pendingRewards: [...pendingRewards, achievement],
    });
  },

  addPendingReward: (achievement) => {
    const { pendingRewards } = get();
    set({ pendingRewards: [...pendingRewards, achievement] });
  },

  // Proper async claim with API
  claimRewardAsync: async (achievementId) => {
    try {
      set({ isLoading: true });
      await gamificationApi.claimAchievement(achievementId);
      
      // Update local state after successful API call
      const { pendingRewards, achievements } = get();
      set({
        pendingRewards: pendingRewards.filter(r => r.id !== achievementId),
        achievements: achievements.map(a => 
          a.id === achievementId ? { ...a, isClaimed: true } : a
        ),
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to claim reward' });
      throw error;
    }
  },

  // DEPRECATED: Use claimRewardAsync instead
  claimReward: (achievementId) => {
    console.warn(
      '[gamificationStore.claimReward] DEPRECATED: ' +
      'Use claimRewardAsync() to ensure API is called.'
    );
    // Still update local state for backwards compatibility
    const { pendingRewards } = get();
    set({
      pendingRewards: pendingRewards.filter(r => r.id !== achievementId),
    });
  },

  setLeaderboard: (type, entries) => {
    const { leaderboardCache } = get();
    set({
      leaderboardCache: {
        ...leaderboardCache,
        [type]: entries,
        lastUpdated: Date.now(),
      },
    });
  },

  reset: () => set(initialState),
}));

// Hook for consuming the store with selector
export const useGamification = gamificationStore;
