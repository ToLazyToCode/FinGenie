import { apiClient } from '../client';

export type SavingContributionTargetType = 'GOAL' | 'PIGGY';
export type SavingContributionSource = 'MANUAL' | 'AUTO';

export interface SavingContributionResponse {
  id: number;
  accountId: number;
  targetType: SavingContributionTargetType;
  targetId: number;
  amount: number;
  source: SavingContributionSource;
  createdAt: string;
}

export const savingsApi = {
  listContributions: (limit = 50) =>
    apiClient.get<SavingContributionResponse[]>('/savings/contributions', {
      params: { limit },
    }),
};
