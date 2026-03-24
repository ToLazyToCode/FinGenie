import { apiClient } from '../client';

export interface SurveyDefinitionResponse {
  id: number;
  version: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  sections: SurveySection[];
}

export interface SurveySection {
  code: string;
  title: string;
  order: number;
  questions: SurveyQuestion[];
}

export interface SurveyQuestion {
  id: number;
  questionCode: string;
  questionText: string;
  order: number;
  isRequired: boolean;
  options: SurveyAnswerOption[];
}

export interface SurveyAnswerOption {
  code: string;
  text: string;
  order: number;
}

export interface StartSurveyRequest {
  consentGiven: boolean;
  surveyVersion?: string;
}

export interface StartSurveyResponse {
  responseId: number;
  surveyId: number;
  surveyVersion: string;
  responseVersion: number;
  startedAt: string;
  expiresAt: string;
  status: string;
  existingAnswers: Record<string, string>;
}

export interface SubmitSurveyRequest {
  answers: Record<string, string>;
  isPartialSubmission?: boolean;
}

export interface SubmitSurveyResponse {
  responseId: number;
  status: string;
  answeredQuestions: number;
  totalQuestions: number;
  isComplete: boolean;
  completedAt?: string;
  message: string;
}

export interface SurveyStatusResponse {
  userId: number;
  hasSurvey: boolean;
  hasCompletedSurvey: boolean;
  currentStatus: string;
  completedVersion?: number;
  completedAt?: string;
  canRetake: boolean;
  daysSinceCompletion?: number;
  message: string;
}

export interface BehaviorProfileActionItem {
  title: string;
  description: string;
  priority: string;
  category: string;
}

export interface BehaviorProfileResponse {
  userId: number;
  profileVersion: number;
  overspendingScore: number;
  debtRiskScore: number;
  savingsCapacityScore: number;
  financialAnxietyIndex: number;
  segment: string;
  segmentDisplayName: string;
  segmentDescription: string;
  segmentConfidence: number;
  riskLevel: string;
  topFactors: string[];
  suggestedActions: BehaviorProfileActionItem[];
  surveyCompletedAt: string;
  profileUpdatedAt: string;
  needsRefresh: boolean;
}

export interface BehaviorProfileCheckResponse {
  userId: number;
  hasCompletedSurvey: boolean;
}

export interface BehaviorInsightScore {
  scoreName: string;
  scoreValue: number;
  level: string;
  explanation: string;
  icon: string;
}

export interface BehaviorInsightRecommendation {
  priority: number;
  category: string;
  title: string;
  description: string;
  expectedImpact: string;
}

export interface BehaviorInsightsResponse {
  overallSummary: string;
  riskLevel: string;
  scoreInsights: BehaviorInsightScore[];
  segmentRationale: string;
  topFactors: string[];
  recommendations: BehaviorInsightRecommendation[];
}

export const surveyApi = {
  getDefinition: () => apiClient.get<SurveyDefinitionResponse>('/survey'),

  start: (payload: StartSurveyRequest) =>
    apiClient.post<StartSurveyResponse>('/survey/start', payload),

  submit: (responseId: number, payload: SubmitSurveyRequest) =>
    apiClient.post<SubmitSurveyResponse>(`/survey/${responseId}/submit`, payload),

  getStatus: () => apiClient.get<SurveyStatusResponse>('/survey/status'),

  getBehaviorProfile: () => apiClient.get<BehaviorProfileResponse>('/behavior/profile'),

  getBehaviorInsights: () => apiClient.get<BehaviorInsightsResponse>('/behavior/insights'),

  checkBehaviorCompletion: () =>
    apiClient.get<BehaviorProfileCheckResponse>('/behavior/check'),
};
