import type { AxiosResponse } from 'axios';
import { apiClient } from '../client';

// ============ Analytics Types ============

export interface CategoryBreakdown {
  categoryId: number;
  categoryName: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendPercentage: number;
}

export interface DailySpending {
  date: string;
  income: number;
  expense: number;
  net: number;
}

export interface MonthlyComparison {
  month: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  savingsRate: number;
  comparedToPreviousMonth: number;
}

export interface AnalyticsResponse {
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  categoryBreakdown: CategoryBreakdown[];
  dailySpending: DailySpending[];
  topExpenseCategories: CategoryBreakdown[];
  averageDailySpending: number;
  transactionCount: number;
}

export interface CategoryTrendResponse {
  month: string;
  year: number;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
}

async function runAnalyticsRequest<T>(
  operation: string,
  request: () => Promise<AxiosResponse<T>>,
  context?: Record<string, unknown>
): Promise<AxiosResponse<T>> {
  try {
    return await request();
  } catch (error) {
    console.warn(`[analyticsApi.${operation}] Request failed.`, context ?? {}, error);
    throw error;
  }
}

export const analyticsApi = {
  getAnalytics: (startDate: string, endDate: string) =>
    runAnalyticsRequest(
      'getAnalytics',
      () =>
        apiClient.get<AnalyticsResponse>('/analytics', {
          params: { startDate, endDate },
        }),
      { startDate, endDate }
    ),

  getMonthlyAnalytics: (year: number, month: number) =>
    runAnalyticsRequest(
      'getMonthlyAnalytics',
      () =>
        apiClient.get<AnalyticsResponse>('/analytics/monthly', {
          params: { year, month },
        }),
      { year, month }
    ),

  getWeeklyAnalytics: () =>
    runAnalyticsRequest('getWeeklyAnalytics', () => apiClient.get<AnalyticsResponse>('/analytics/weekly')),

  getCurrentMonthAnalytics: () =>
    runAnalyticsRequest(
      'getCurrentMonthAnalytics',
      () => apiClient.get<AnalyticsResponse>('/analytics/current-month')
    ),

  getYearlyAnalytics: (year: number) =>
    runAnalyticsRequest(
      'getYearlyAnalytics',
      () =>
        apiClient.get<AnalyticsResponse>('/analytics/yearly', {
          params: { year },
        }),
      { year }
    ),

  getCategoryTrend: (categoryId: number, months = 6) =>
    runAnalyticsRequest(
      'getCategoryTrend',
      () =>
        apiClient.get<CategoryTrendResponse[]>(`/analytics/category/${categoryId}/trend`, {
          params: { months },
        }),
      { categoryId, months }
    ),
};
