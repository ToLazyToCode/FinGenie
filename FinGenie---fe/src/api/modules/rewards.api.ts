import { apiClient } from '../client';

export type RewardCategory =
  | 'TRAVEL'
  | 'ELECTRONICS'
  | 'ESSENTIALS'
  | 'EDUCATION'
  | 'LIFESTYLE'
  | string;

export type RewardStatus = 'LOCKED' | 'AVAILABLE' | 'CLAIMED' | 'REDEEMED' | 'EXPIRED' | string;

export interface PersonalRewardCatalogItemResponse {
  rewardId: number;
  code: string;
  title: string;
  description?: string | null;
  category: RewardCategory;
  pointCost: number;
  goalThemeTags?: string | null;
  partnerName?: string | null;
  partnerMetadata?: string | null;
  imageUrl?: string | null;
  termsUrl?: string | null;
  expiresAt?: string | null;
  owned: boolean;
  ownedStatus?: RewardStatus | null;
  canRedeem: boolean;
}

export interface PersonalRewardOwnedResponse {
  redemptionId: number;
  rewardId: number;
  code: string;
  title: string;
  description?: string | null;
  category: RewardCategory;
  status: RewardStatus;
  finPointCost: number;
  claimedAt?: string | null;
  redeemedAt?: string | null;
  expiresAt?: string | null;
}

export interface PersonalRewardRedeemResponse {
  rewardId: number;
  code: string;
  title: string;
  category: RewardCategory;
  granted: boolean;
  status: RewardStatus;
  finPointCost: number;
  balanceAfter: number;
  redemptionId: number;
  claimedAt?: string | null;
}

export interface SharedPiggyRewardResponse {
  unlockId: number;
  piggyId: number;
  milestoneKey: string;
  status: RewardStatus;
  goalBondProgressAtUnlock: number;
  goalBondTargetAtUnlock: number;
  unlockedAt: string;
  expiresAt?: string | null;
  rewardId: number;
  code: string;
  title: string;
  description?: string | null;
  category: RewardCategory;
  goalThemeTags?: string | null;
  partnerName?: string | null;
  partnerMetadata?: string | null;
  imageUrl?: string | null;
  termsUrl?: string | null;
}

export const rewardsApi = {
  getPersonalCatalog: () =>
    apiClient.get<PersonalRewardCatalogItemResponse[]>('/rewards/personal/catalog'),

  getPersonalOwned: (limit?: number) =>
    apiClient.get<PersonalRewardOwnedResponse[]>('/rewards/personal/owned', {
      params: limit ? { limit } : undefined,
    }),

  redeemPersonalReward: (rewardId: number) =>
    apiClient.post<PersonalRewardRedeemResponse>(`/rewards/personal/catalog/${rewardId}/redeem`),

  getSharedPiggyRewards: (piggyId: number, limit?: number) =>
    apiClient.get<SharedPiggyRewardResponse[]>(`/piggies/${piggyId}/rewards`, {
      params: limit ? { limit } : undefined,
    }),
};
