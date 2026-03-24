import { apiClient } from '../client';

export type PeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type BudgetStatus = 'ON_TRACK' | 'WARNING' | 'EXCEEDED';

export interface BudgetResponse {
  id: number;
  accountId: number;
  categoryId: number;
  categoryName: string;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  percentageUsed: number;
  status: BudgetStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetRequest {
  categoryId: number;
  limitAmount: number;
  periodType: PeriodType;
}

export interface BudgetSummary {
  totalBudgets: number;
  totalLimit: number;
  totalSpent: number;
  overallPercentage: number;
  budgetsOnTrack: number;
  budgetsWarning: number;
  budgetsExceeded: number;
  budgets: BudgetResponse[];
}

export interface BudgetAlert {
  budgetId: number;
  categoryName: string;
  message: string;
  percentageUsed: number;
  status: BudgetStatus;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export const budgetsApi = {
  getAll: () => 
    apiClient.get<BudgetResponse[]>('/budgets'),

  getSummary: () => 
    apiClient.get<BudgetSummary>('/budgets/summary'),

  getByPeriod: (periodType: PeriodType) => 
    apiClient.get<BudgetResponse[]>(`/budgets/period/${periodType}`),

  getById: (budgetId: number) => 
    apiClient.get<BudgetResponse>(`/budgets/${budgetId}`),

  create: (data: BudgetRequest) => 
    apiClient.post<BudgetResponse>('/budgets', data),

  update: (budgetId: number, data: Partial<BudgetRequest>) =>
    apiClient.put<BudgetResponse>(`/budgets/${budgetId}`, data),

  delete: (budgetId: number) => 
    apiClient.delete(`/budgets/${budgetId}`),

  getAlerts: () => 
    apiClient.get<BudgetAlert[]>('/budgets/alerts'),
};
