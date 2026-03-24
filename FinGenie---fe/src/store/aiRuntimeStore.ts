/**
 * AI Runtime Store
 * 
 * Manages AI chat state, predictions, and feedback queue.
 * 
 * IMPORTANT: Feedback queue items MUST be submitted to backend.
 * Use submitPendingFeedback() to process and submit all queued feedback.
 * 
 * Usage:
 * - Chat: Use aiConversationsApi with React Query
 * - Predictions: Use aiPredictionsApi with React Query
 * - Feedback: Queue with queueFeedback(), submit with submitPendingFeedback()
 */

import { create } from 'zustand';
import { aiPredictionsApi, type PredictionFeedbackRequest } from '../api/modules/ai.api';
import type { 
  ChatMessageResponse, 
  AIConversationMessage,
  SpendingPrediction,
  FeedbackType 
} from '../api/modules/ai.api';

interface PendingFeedback {
  predictionId: number;
  feedbackType: FeedbackType;
  originalAmount?: number;
  finalAmount?: number;
  originalCategory?: string;
  finalCategory?: string;
  timestamp: number;
  retryCount?: number;
}

interface AIRuntimeState {
  // Chat state (cache for UI)
  chatHistory: AIConversationMessage[];
  isTyping: boolean;
  lastResponse: ChatMessageResponse | null;

  // Prediction state (cache for UI)
  predictions: SpendingPrediction[];
  activePrediction: SpendingPrediction | null;

  // Feedback queue (persisted, submitted to backend)
  feedbackQueue: PendingFeedback[];
  isSubmittingFeedback: boolean;
  feedbackError: string | null;

  // Learning signals (local analytics)
  learningEvents: Array<{
    type: 'TRANSACTION_CONFIRMED' | 'PREDICTION_ACCEPTED' | 'PREDICTION_REJECTED' | 'USER_CORRECTION';
    data: Record<string, unknown>;
    timestamp: number;
  }>;

  // AI context cache
  contextCache: {
    financialSummary: Record<string, unknown> | null;
    recentTransactions: unknown[];
    lastUpdated: number | null;
  };

  // Chat actions
  addMessage: (message: AIConversationMessage) => void;
  setChatHistory: (history: AIConversationMessage[]) => void;
  setTyping: (isTyping: boolean) => void;
  setLastResponse: (response: ChatMessageResponse | null) => void;
  clearChat: () => void;

  // Prediction actions
  setPredictions: (predictions: SpendingPrediction[]) => void;
  setActivePrediction: (prediction: SpendingPrediction | null) => void;

  // Feedback actions (with API integration)
  queueFeedback: (feedback: Omit<PendingFeedback, 'timestamp' | 'retryCount'>) => void;
  submitPendingFeedback: () => Promise<{ submitted: number; failed: number }>;
  submitSingleFeedback: (feedback: PendingFeedback) => Promise<boolean>;
  clearFeedbackQueue: () => void;
  
  /** @deprecated Use submitPendingFeedback() instead */
  processFeedbackQueue: () => PendingFeedback | null;

  // Learning actions
  recordLearningEvent: (type: AIRuntimeState['learningEvents'][0]['type'], data: Record<string, unknown>) => void;
  clearLearningEvents: () => void;

  // Context actions
  updateContextCache: (data: Partial<AIRuntimeState['contextCache']>) => void;

  // Reset
  reset: () => void;
}

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;

const initialState = {
  chatHistory: [],
  isTyping: false,
  lastResponse: null,
  predictions: [],
  activePrediction: null,
  feedbackQueue: [],
  isSubmittingFeedback: false,
  feedbackError: null,
  learningEvents: [],
  contextCache: {
    financialSummary: null,
    recentTransactions: [],
    lastUpdated: null,
  },
};

export const aiRuntimeStore = create<AIRuntimeState>((set, get) => ({
  ...initialState,

  // Chat actions
  addMessage: (message) => {
    const { chatHistory } = get();
    set({ chatHistory: [...chatHistory, message] });
  },

  setChatHistory: (chatHistory) => set({ chatHistory }),

  setTyping: (isTyping) => set({ isTyping }),

  setLastResponse: (lastResponse) => set({ lastResponse }),

  clearChat: () => set({ chatHistory: [], lastResponse: null }),

  // Prediction actions
  setPredictions: (predictions) => set({ predictions }),

  setActivePrediction: (activePrediction) => set({ activePrediction }),

  // Queue feedback for submission
  queueFeedback: (feedback) => {
    const { feedbackQueue } = get();
    const newFeedback: PendingFeedback = {
      ...feedback,
      timestamp: Date.now(),
      retryCount: 0,
    };
    set({ feedbackQueue: [...feedbackQueue, newFeedback] });
    
    // Auto-submit immediately (fire and forget)
    get().submitPendingFeedback().catch(err => {
      console.warn('[aiRuntimeStore] Auto-submit feedback failed:', err);
    });
  },

  // Submit a single feedback item to API
  submitSingleFeedback: async (feedback) => {
    try {
      const request: PredictionFeedbackRequest = {
        predictionId: feedback.predictionId,
        feedbackType: feedback.feedbackType,
        originalAmount: feedback.originalAmount,
        finalAmount: feedback.finalAmount,
        originalCategory: feedback.originalCategory,
        finalCategory: feedback.finalCategory,
      };
      
      await aiPredictionsApi.submitFeedback(request);
      return true;
    } catch (error) {
      console.error('[aiRuntimeStore] Failed to submit feedback:', error);
      return false;
    }
  },

  // Submit all pending feedback to backend
  submitPendingFeedback: async () => {
    const { feedbackQueue, isSubmittingFeedback } = get();
    
    if (isSubmittingFeedback || feedbackQueue.length === 0) {
      return { submitted: 0, failed: 0 };
    }

    set({ isSubmittingFeedback: true, feedbackError: null });

    let submitted = 0;
    let failed = 0;
    const remainingQueue: PendingFeedback[] = [];

    for (const feedback of feedbackQueue) {
      const success = await get().submitSingleFeedback(feedback);
      
      if (success) {
        submitted++;
        // Record as learning event
        get().recordLearningEvent(
          feedback.feedbackType === 'ACCEPT' ? 'PREDICTION_ACCEPTED' 
            : feedback.feedbackType === 'REJECT' ? 'PREDICTION_REJECTED'
            : 'USER_CORRECTION',
          { predictionId: feedback.predictionId, feedbackType: feedback.feedbackType }
        );
      } else {
        // Retry logic
        const newRetryCount = (feedback.retryCount || 0) + 1;
        if (newRetryCount < MAX_RETRY_COUNT) {
          remainingQueue.push({ ...feedback, retryCount: newRetryCount });
        } else {
          failed++;
          console.warn(`[aiRuntimeStore] Feedback ${feedback.predictionId} failed after ${MAX_RETRY_COUNT} retries`);
        }
      }
      
      // Small delay between submissions
      if (feedbackQueue.indexOf(feedback) < feedbackQueue.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    set({ 
      feedbackQueue: remainingQueue,
      isSubmittingFeedback: false,
      feedbackError: failed > 0 ? `${failed} feedback items failed to submit` : null,
    });

    return { submitted, failed };
  },

  // DEPRECATED: Legacy method that doesn't submit to API
  processFeedbackQueue: () => {
    console.warn(
      '[aiRuntimeStore.processFeedbackQueue] DEPRECATED: ' +
      'Use submitPendingFeedback() to submit feedback to backend.'
    );
    const { feedbackQueue } = get();
    if (feedbackQueue.length === 0) return null;
    
    const [next, ...rest] = feedbackQueue;
    set({ feedbackQueue: rest });
    return next;
  },

  clearFeedbackQueue: () => set({ feedbackQueue: [] }),

  // Learning actions (local analytics)
  recordLearningEvent: (type, data) => {
    const { learningEvents } = get();
    set({
      learningEvents: [
        ...learningEvents,
        { type, data, timestamp: Date.now() },
      ].slice(-100), // Keep last 100 events
    });
  },

  clearLearningEvents: () => set({ learningEvents: [] }),

  // Context actions
  updateContextCache: (data) => {
    const { contextCache } = get();
    set({
      contextCache: {
        ...contextCache,
        ...data,
        lastUpdated: Date.now(),
      },
    });
  },

  // Reset
  reset: () => set(initialState),
}));
