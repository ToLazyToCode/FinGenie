import { apiClient } from '../client';

export type FinPointMissionId = 'contributeToday' | 'viewPlan' | 'viewActivity';

export interface FinPointSummaryResponse {
  accountId: number;
  balance: number;
  todayEarned: number;
  lifetimeEarned: number;
}

export interface FinPointHistoryItem {
  id: number;
  amount: number;
  sourceType: string;
  sourceRefType?: string | null;
  sourceRefId?: string | null;
  reason: string;
  missionId?: FinPointMissionId | string | null;
  missionDay?: string | null;
  createdAt: string;
}

export interface FinPointHistoryPageResponse {
  items: FinPointHistoryItem[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
}

export interface FinPointMissionRewardState {
  missionId: FinPointMissionId;
  completed: boolean;
  xpReward: number;
  finPointReward: number;
  claimedAt?: string | null;
}

export interface FinPointTodayMissionStateResponse {
  dayKey: string;
  xpToday: number;
  finPointToday: number;
  missions: FinPointMissionRewardState[];
}

export interface FinPointMissionClaimResponse {
  missionId: FinPointMissionId;
  dayKey: string;
  granted: boolean;
  xpReward: number;
  finPointAwarded: number;
  balance: number;
  claimedAt?: string | null;
}

export const finPointApi = {
  getSummary: () =>
    apiClient.get<FinPointSummaryResponse>('/finpoints/summary'),

  getHistory: (params?: { page?: number; size?: number; limit?: number }) =>
    apiClient.get<FinPointHistoryPageResponse>('/finpoints/history', {
      params,
    }),

  getTodayMissionState: () =>
    apiClient.get<FinPointTodayMissionStateResponse>('/finpoints/missions/today'),

  claimMission: (missionId: FinPointMissionId) =>
    apiClient.post<FinPointMissionClaimResponse>(`/finpoints/missions/${missionId}/claim`),
};
