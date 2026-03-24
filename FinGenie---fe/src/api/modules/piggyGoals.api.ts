import { apiClient } from '../client';

export interface PiggyGoalResponse {
  id: number;
  accountId: number;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  progressPercentage: number;
  isCompleted: boolean;
  daysRemaining: number;
  onTrack: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PiggyGoalRequest {
  goalName: string;
  targetAmount: number;
  deadline: string;
  initialAmount?: number;
}

export interface PiggyGoalSummary {
  totalGoals: number;
  completedGoals: number;
  totalSaved: number;
  totalTarget: number;
  overallProgress: number;
  goals: PiggyGoalResponse[];
}

export interface DepositResult {
  goal: PiggyGoalResponse;
  amountDeposited: number;
  newBalance: number;
  justCompleted: boolean;
  xpEarned: number;
}

export const piggyGoalsApi = {
  list: () => 
    apiClient.get<PiggyGoalResponse[]>('/piggy-goals'),

  getSummary: () => 
    apiClient.get<PiggyGoalSummary>('/piggy-goals/summary'),

  getById: (goalId: number) => 
    apiClient.get<PiggyGoalResponse>(`/piggy-goals/${goalId}`),

  create: (data: PiggyGoalRequest) => 
    apiClient.post<PiggyGoalResponse>('/piggy-goals', data),

  update: (goalId: number, data: Partial<PiggyGoalRequest>) =>
    apiClient.put<PiggyGoalResponse>(`/piggy-goals/${goalId}`, data),

  delete: (goalId: number) => 
    apiClient.delete(`/piggy-goals/${goalId}`),

  deposit: (goalId: number, amount: number) => 
    apiClient.post<DepositResult>(`/piggy-goals/${goalId}/deposit`, null, {
      params: { amount },
    }),

  withdraw: (goalId: number, amount: number) => 
    apiClient.post<DepositResult>(`/piggy-goals/${goalId}/withdraw`, null, {
      params: { amount },
    }),
};
