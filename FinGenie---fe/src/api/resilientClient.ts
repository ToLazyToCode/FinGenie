/**
 * Resilient API Client Extension
 * 
 * Extends the base API client with:
 * - Correlation ID extraction from responses
 * - Error context capture
 * - Global error popup dispatch
 * - Network state awareness
 * 
 * @module api/resilientClient
 */

import { AxiosResponse, AxiosError } from 'axios';
import { apiClient } from './client';
import { 
  useCorrelationStore, 
  extractCorrelationId 
} from '../system/correlationStore';
import { classifyAndDispatchError } from '../system/errorClassifier';

// =====================================
// RESPONSE INTERCEPTOR FOR CORRELATION ID + ERROR POPUP
// =====================================

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Extract correlation ID from successful responses
    const correlationId = extractCorrelationId(
      response.headers as Record<string, string>
    );
    
    if (correlationId) {
      useCorrelationStore.getState().setCorrelationId(correlationId);
    }

    return response;
  },
  (error: AxiosError) => {
    // Extract correlation ID from error responses
    const correlationId = extractCorrelationId(
      (error.response?.headers ?? {}) as Record<string, string>
    );

    if (correlationId) {
      const errorData = error.response?.data as Record<string, unknown> | undefined;
      
      useCorrelationStore.getState().setErrorContext({
        correlationId,
        errorCode: (errorData?.code as string) ?? undefined,
        errorMessage: (errorData?.message as string) ?? error.message,
      });
    }

    // Dispatch error to global popup system
    // This handles classification and shows appropriate popup
    classifyAndDispatchError(error);

    return Promise.reject(error);
  }
);

// =====================================
// RE-EXPORT CLIENT
// =====================================

export { apiClient } from './client';
export type { ApiError } from './client';
