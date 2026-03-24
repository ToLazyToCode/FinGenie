import { apiClient } from '../client';

export type ContributionSource = 'MANUAL' | 'AUTO';

export interface CreateGoalRequest {
  title: string;
  targetAmount: number;
  deadline?: string | null;
  iconUrl?: string | null;
}

export interface CreateGoalResponse {
  id: number;
  title?: string;
  targetAmount?: number;
  deadline?: string | null;
}

export interface ContributionResponse {
  contributionId: number;
  amount: number;
  source: ContributionSource;
  createdAt: string;
  goalId?: number;
  piggyId?: number;
}

export const goalsApi = {
  create: (payload: CreateGoalRequest) =>
    apiClient.post<CreateGoalResponse>('/piggy-goals', {
      title: payload.title,
      targetAmount: payload.targetAmount,
      deadline: payload.deadline ?? undefined,
      iconUrl: payload.iconUrl ?? null,
    }),

  contribute: (
    goalId: number,
    amount: number,
    source: ContributionSource = 'MANUAL'
  ) =>
    apiClient.post<ContributionResponse>(`/goals/${goalId}/contribute`, null, {
      params: { amount, source },
    }),

  delete: (goalId: number) =>
    apiClient.delete(`/piggy-goals/${goalId}`),
};
