import { apiClient } from '../client';
import { walletsApi } from './wallets.api';

export type PiggyMemberRole = 'OWNER' | 'CONTRIBUTOR' | string;

export interface PiggyMemberResponse {
  id: number;
  accountId: number;
  displayName: string;
  role: PiggyMemberRole;
  shareWeight: number;
  monthlyCommitment: number | null;
}

export interface PiggyDetailResponse {
  id: number;
  piggyName?: string | null;
  name?: string | null;
  isShared?: boolean | null;
  lockUntil?: string | null;
  goalAmount?: number | null;
  currentAmount?: number | null;
}

export interface UpdateShareWeightRequest {
  shareWeight: number;
}

export interface UpdateMonthlyCommitmentRequest {
  monthlyCommitment: number;
}

export interface CreatePiggyRequest {
  title: string;
  goalAmount: number;
  lockUntil?: string | null;
  isShared: boolean;
}

export interface CreatePiggyResponse {
  piggyId: number;
  walletId: number;
  goalAmount: number;
  lockUntil?: string | null;
  isShared: boolean;
  createdAt?: string;
}

export interface CreateSharedPiggyInvitationRequest {
  title: string;
  goalAmount: number;
  inviteeId: number;
  lockUntil?: string | null;
}

export type SharedPiggyInvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface SharedPiggyInvitationResponse {
  id: number;
  inviterId: number;
  inviterName: string;
  inviterAvatar?: string | null;
  inviteeId: number;
  inviteeName: string;
  inviteeAvatar?: string | null;
  walletId: number;
  piggyTitle: string;
  goalAmount: number;
  lockUntil?: string | null;
  status: SharedPiggyInvitationStatus;
  expiresAt: string;
  respondedAt?: string | null;
  acceptedAt?: string | null;
  createdPiggyId?: number | null;
  createdAt?: string;
}

export type PiggyContributionSource = 'MANUAL' | 'AUTO';

export interface PiggyContributionResponse {
  contributionId: number;
  amount: number;
  source: PiggyContributionSource;
  createdAt: string;
  goalId?: number;
  piggyId?: number;
}

export interface GoalBondSummaryResponse {
  piggyId: number;
  currentProgress: number;
  targetProgress: number;
  progressPercent: number;
  status: 'IN_PROGRESS' | 'TARGET_REACHED' | string;
}

export interface GoalBondMissionState {
  missionId: string;
  requiredCount: number;
  progressCount: number;
  rewardGoalBond: number;
  claimable: boolean;
  completed: boolean;
  claimedAt?: string | null;
}

export interface GoalBondMissionStateResponse {
  piggyId: number;
  dayKey: string;
  missions: GoalBondMissionState[];
}

export interface GoalBondMissionClaimResponse {
  piggyId: number;
  missionId: string;
  dayKey: string;
  granted: boolean;
  rewardAwarded: number;
  currentProgress: number;
  targetProgress: number;
  status: 'IN_PROGRESS' | 'TARGET_REACHED' | string;
  claimedAt?: string | null;
}

async function resolveWalletIdForPiggy(): Promise<number> {
  try {
    const defaultWallet = await walletsApi.getDefault();
    if (defaultWallet.data?.walletId) {
      return defaultWallet.data.walletId;
    }
  } catch {
    // Fallback to first available wallet below.
  }

  const wallets = await walletsApi.getAll();
  const fallbackWalletId = wallets.data?.[0]?.walletId;
  if (fallbackWalletId) {
    return fallbackWalletId;
  }

  throw new Error('NO_WALLET_FOR_PIGGY');
}

export const piggiesApi = {
  create: async (payload: CreatePiggyRequest) => {
    const walletId = await resolveWalletIdForPiggy();
    return apiClient.post<CreatePiggyResponse>('/piggy-banks', {
      walletId,
      goalAmount: payload.goalAmount,
      lockUntil: payload.lockUntil ?? undefined,
      isShared: payload.isShared,
    });
  },

  createSharedInvitation: async (payload: CreateSharedPiggyInvitationRequest) => {
    const walletId = await resolveWalletIdForPiggy();
    return apiClient.post<SharedPiggyInvitationResponse>('/shared-piggy-invitations', {
      walletId,
      inviteeId: payload.inviteeId,
      piggyTitle: payload.title,
      goalAmount: payload.goalAmount,
      lockUntil: payload.lockUntil ?? undefined,
    });
  },

  getIncomingInvitations: () =>
    apiClient.get<SharedPiggyInvitationResponse[]>('/shared-piggy-invitations/incoming'),

  acceptInvitation: (invitationId: number) =>
    apiClient.post<SharedPiggyInvitationResponse>(`/shared-piggy-invitations/${invitationId}/accept`),

  rejectInvitation: (invitationId: number) =>
    apiClient.post<SharedPiggyInvitationResponse>(`/shared-piggy-invitations/${invitationId}/reject`),

  getById: (piggyId: number) =>
    apiClient.get<PiggyDetailResponse>(`/piggies/${piggyId}`),

  delete: (piggyId: number) =>
    apiClient.delete(`/piggy-banks/${piggyId}`),

  getMembers: (piggyId: number) =>
    apiClient.get<PiggyMemberResponse[]>(`/piggies/${piggyId}/members`),

  updateShareWeight: (
    piggyId: number,
    memberId: number,
    data: UpdateShareWeightRequest
  ) =>
    apiClient.patch<void>(
      `/piggies/${piggyId}/members/${memberId}/share-weight`,
      data
    ),

  updateMonthlyCommitment: (
    piggyId: number,
    memberId: number,
    data: UpdateMonthlyCommitmentRequest
  ) =>
    apiClient.patch<void>(
      `/piggies/${piggyId}/members/${memberId}/monthly-commitment`,
      data
    ),

  contribute: (
    piggyId: number,
    amount: number,
    source: PiggyContributionSource = 'MANUAL'
  ) =>
    apiClient.post<PiggyContributionResponse>(`/piggies/${piggyId}/contribute`, null, {
      params: { amount, source },
    }),

  getGoalBondSummary: (piggyId: number) =>
    apiClient.get<GoalBondSummaryResponse>(`/piggies/${piggyId}/goalbond/summary`),

  getGoalBondMissionsToday: (piggyId: number) =>
    apiClient.get<GoalBondMissionStateResponse>(`/piggies/${piggyId}/goalbond/missions/today`),

  claimGoalBondMission: (piggyId: number, missionId: string) =>
    apiClient.post<GoalBondMissionClaimResponse>(
      `/piggies/${piggyId}/goalbond/missions/${missionId}/claim`
    ),
};
