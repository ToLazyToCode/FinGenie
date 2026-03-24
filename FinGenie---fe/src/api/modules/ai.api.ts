import { apiClient } from '../client';

// ============ AI Chat Types ============

export type ChatMode = 'FAST' | 'SMART';

export interface ChatMessageRequest {
  message: string;
  mode?: ChatMode;
}

export interface ChatSuggestion {
  text: string;
  action?: string;
}

export interface ChatMessageResponse {
  id: number;
  reply: string;
  confidenceScore: number;
  suggestions: ChatSuggestion[];
  timestamp: string;
}

export interface AIConversationMessageResponse {
  id: number;
  userId: number;
  role: string;
  message: string;
  timestamp: string;
}

// ============ AI Conversation Types ============

export interface AIChatRequest {
  conversationId?: number | null;
  message: string;
  context?: string;
  startNewConversation?: boolean;
  language?: string;
}

export interface MessageResponse {
  id: number;
  sender: string;
  text: string;
  confidence?: number | null;
  intent?: string | null;
  modelUsed?: string | null;
  tokenCount?: number | null;
  createdAt: string;
}

export interface AIConversationResponse {
  id: number;
  accountId: number;
  title: string;
  isActive: boolean;
  contextSummary?: string | null;
  totalTokens: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  recentMessages?: MessageResponse[] | null;
}

export interface ConversationList {
  conversations: AIConversationResponse[];
  totalCount: number;
}

export interface AIChatResult {
  conversationId: number;
  userMessage: MessageResponse;
  aiMessage: MessageResponse;
  suggestions: string[];
  detectedIntent: string;
  failure?: AIProviderFailureMetadata | null;
}

export interface AIProviderFailureMetadata {
  source?: string;
  reasonType?: string;
  path?: string;
  elapsedMs?: number | null;
  timeoutMs?: number | null;
  message?: string;
}

// Compatibility aliases for existing FE call sites
export type AIConversationMessage = AIConversationMessageResponse;
export type AIConversationMessageDto = MessageResponse;
export type AIConversationThreadMessage = MessageResponse;
export type AIConversation = AIConversationResponse;
export type AIConversationDetail = AIConversationResponse;
export type AIConversationListResponse = ConversationList;
export type ConversationChatRequest = AIChatRequest;
export type ConversationChatResponse = AIChatResult;

// ============ AI Spending Guess Types ============

export type GuessStatus = 'PENDING' | 'ACCEPTED' | 'EDITED' | 'REJECTED' | 'EXPIRED';

export interface SpendingGuessResponse {
  id: number;
  amount: number;
  currency: string;
  category: string | null;
  categoryId: number | null;
  walletName: string | null;
  walletId: number | null;
  confidence: number;
  reasoning: string | null;
  guessedForTime: string;
  expiresAt: string;
  status: GuessStatus | string;
}

export interface AcceptGuessRequest {}

export interface EditGuessRequest {
  amount?: number;
  categoryId?: number;
  walletId?: number;
  description?: string;
}

export interface RejectGuessRequest {
  reason?: string;
}

export interface AcceptGuessResponse {
  guessId: number;
  transactionId: number;
  amount: number;
  category?: string | null;
  message: string;
}

export interface RejectGuessResponse {
  message: string;
}

// Compatibility alias
export type SpendingGuess = SpendingGuessResponse;

// ============ AI Prediction Types ============

export interface SpendingPrediction {
  userId: number;
  predictedAmount: number;
  confidence: number;
  category?: string;
  description: string;
  basedOn: string;
  periodLabel?: string;
  tips?: string[];
}

export type FeedbackType = 'ACCEPT' | 'EDIT' | 'REJECT';

export interface PredictionFeedbackRequest {
  predictionId: number;
  feedbackType: FeedbackType;
  originalAmount?: number;
  finalAmount?: number;
  originalCategory?: string;
  finalCategory?: string;
  comment?: string;
}

// ============ Monthly Saving Plan Types ============

export type SavingTargetType = 'GOAL' | 'PIGGY';
export type MonthlySavingPlanMode = 'optimized';

export interface SavingTargetResponse {
  type: SavingTargetType;
  id: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  deadline?: string | null;
  requiredMonthly: number;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface MonthlySavingPlanAllocation {
  type: SavingTargetType;
  id: number;
  title: string;
  requiredMonthly: number;
  allocatedMonthly: number;
  feasibilityScore: number;
  notes?: string;
}

export interface MonthlySavingPlanRecommendation {
  type: string;
  message: string;
  impactMonthly: number;
}

export interface MonthlySavingPlanWhatIfScenario {
  assumption: string;
  newSavingCapacity: number;
  newFeasibilityScore: number;
}

export interface MonthlySavingPlanResponse {
  savingCapacity: number;
  totalRequired: number;
  overallFeasibilityScore: number;
  allocations: MonthlySavingPlanAllocation[];
  recommendations: MonthlySavingPlanRecommendation[];
  whatIfScenarios: MonthlySavingPlanWhatIfScenario[];
}

export interface MonthlySavingPlanAdvice {
  shortSummary: string;
  actionableSuggestions: string[];
  riskWarnings: string[];
  friendlyTone: string;
}

export interface MonthlySavingPlanAdviceResponse {
  plan: MonthlySavingPlanResponse;
  advice: MonthlySavingPlanAdvice;
  advisorSource: 'python' | 'fallback' | string;
  failure?: AIProviderFailureMetadata | null;
}

// ============ AI Conversations API ============

export const aiConversationsApi = {
  list: () => 
    apiClient.get<ConversationList>('/ai/conversations'),

  create: () => 
    apiClient.post<AIConversationResponse>('/ai/conversations'),

  getById: (conversationId: number) => 
    apiClient.get<AIConversationResponse>(`/ai/conversations/${conversationId}`),

  chat: (data: AIChatRequest) => 
    apiClient.post<AIChatResult>('/ai/conversations/chat', data),

  updateTitle: (conversationId: number, title: string) =>
    apiClient.put<AIConversationResponse>(`/ai/conversations/${conversationId}/title`, null, {
      params: { title },
    }),

  archive: (conversationId: number) => 
    apiClient.post<void>(`/ai/conversations/${conversationId}/archive`),

  delete: (conversationId: number) => 
    apiClient.delete(`/ai/conversations/${conversationId}`),

  clearAll: () => 
    apiClient.delete('/ai/conversations/clear'),
};

// ============ AI Spending Guess API ============

export const aiGuessApi = {
  getTodayGuesses: () => 
    apiClient.get<SpendingGuessResponse[]>('/ai/guess/today'),

  accept: (guessId: number) => 
    apiClient.post<AcceptGuessResponse>(`/ai/guess/${guessId}/accept`),

  edit: (guessId: number, data: EditGuessRequest) => 
    apiClient.post<AcceptGuessResponse>(`/ai/guess/${guessId}/edit`, data),

  reject: (guessId: number, data?: RejectGuessRequest) => 
    apiClient.post<RejectGuessResponse>(`/ai/guess/${guessId}/reject`, data),
};

// ============ AI Predictions API ============

export const aiPredictionsApi = {
  getDailyPrediction: (userId: number) => 
    apiClient.get<SpendingPrediction>(`/ai/predictions/daily/${userId}`),

  getCategoryPrediction: (userId: number, category: string) => 
    apiClient.get<SpendingPrediction>(`/ai/predictions/category/${userId}/${category}`),

  submitFeedback: (data: PredictionFeedbackRequest) => 
    apiClient.post('/ai/predictions/feedback', data),
};

// ============ Saving Targets API ============

export const aiSavingTargetsApi = {
  list: () =>
    apiClient.get<SavingTargetResponse[]>('/ai/saving-targets'),
};

// ============ Monthly Saving Plan API ============

export const aiMonthlyPlanApi = {
  getPlan: (mode?: MonthlySavingPlanMode) =>
    apiClient.get<MonthlySavingPlanResponse>('/ai/monthly-saving-plan', {
      params: mode ? { mode } : undefined,
    }),

  getAdvice: (language?: string) =>
    apiClient.post<MonthlySavingPlanAdviceResponse>('/ai/monthly-saving-plan/advice', null, {
      params: language ? { language } : undefined,
    }),
};

// ============ Combined AI API ============

export const aiApi = {
  conversations: aiConversationsApi,
  guesses: aiGuessApi,
  predictions: aiPredictionsApi,
  savingTargets: aiSavingTargetsApi,
  monthlyPlan: aiMonthlyPlanApi,
};
