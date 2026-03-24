import { apiClient } from '../client';

export interface DashboardInsight {
  insightText?: string;
  insightType?: string;
  confidence?: number;
  actionSuggestion?: string;
}

export interface DashboardPetSummary {
  mood?: number;
  happiness?: number;
  energy?: number;
  hunger?: number;
  moodState?: string;
  message?: string;
}

export interface DashboardResponse {
  aiInsight?: DashboardInsight;
  pet?: DashboardPetSummary;
}

export const dashboardApi = {
  getDashboard: () => apiClient.get<DashboardResponse>('/experience/dashboard'),
};
