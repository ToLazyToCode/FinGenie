/**
 * Error Classification System
 * 
 * Classifies API and runtime errors into severity levels
 * and dispatches to the global error store.
 * 
 * Classification Rules:
 * - VALIDATION_FAILED: minor (inline, not popup)
 * - AUTH_INVALID_CREDENTIALS: medium (popup)
 * - 400/404/403/409: medium (popup)
 * - 401 expired: critical (logout + popup)
 * - 5xx: critical (full modal)
 * - Network error: medium (popup)
 * - Offline: minor (banner, handled separately)
 * 
 * @module system/errorClassifier
 */

import { AxiosError } from 'axios';
import { useErrorStore, ErrorSeverity } from './errorStore';
import { extractCorrelationId, useCorrelationStore } from './correlationStore';

// =====================================
// TYPES
// =====================================

export interface ApiErrorResponse {
  status?: number;
  code?: string;
  message?: string;
  correlationId?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface ClassifiedError {
  message: string;
  severity: ErrorSeverity;
  code?: string;
  correlationId?: string;
  isValidation: boolean;
  validationErrors?: Array<{ field: string; message: string }>;
  shouldLogout: boolean;
  shouldShowPopup: boolean;
}

// =====================================
// ERROR CODE MAPPINGS
// =====================================

const VALIDATION_ERROR_CODES = new Set([
  'VALIDATION_FAILED',
  'VALIDATION_ERROR',
  'INVALID_INPUT',
  'FIELD_REQUIRED',
  'INVALID_FORMAT',
]);

const AUTH_ERROR_CODES = new Set([
  'AUTH_INVALID_CREDENTIALS',
  'INVALID_CREDENTIALS',
  'AUTH_FAILED',
  'LOGIN_FAILED',
]);

const SESSION_EXPIRED_CODES = new Set([
  'TOKEN_EXPIRED',
  'SESSION_EXPIRED',
  'TOKEN_INVALID',
  'TOKEN_REVOKED',
  'REFRESH_TOKEN_EXPIRED',
]);

// =====================================
// FRIENDLY MESSAGE MAPPINGS
// =====================================

const FRIENDLY_MESSAGES: Record<string, string> = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  TOKEN_EXPIRED: 'Your session has expired. Please login again.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  
  // User errors
  USER_NOT_FOUND: 'Account not found. Please check your email.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  DUPLICATE_EMAIL: 'An account with this email already exists.',
  
  // Rate limiting
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please wait a moment and try again.',
  
  // Permission errors
  ACCESS_DENIED: 'You don\'t have permission to perform this action.',
  FORBIDDEN: 'You don\'t have permission to perform this action.',
  
  // Not found
  NOT_FOUND: 'The requested resource was not found.',
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  
  // Conflict
  CONFLICT: 'This action conflicts with existing data.',
  ALREADY_EXISTS: 'This item already exists.',
  
  // Server errors
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again later.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later.',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Please login to continue.',
  403: 'You don\'t have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This action conflicts with existing data.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Something went wrong on our end. Please try again.',
  502: 'Service is temporarily unavailable.',
  503: 'Service is temporarily unavailable.',
  504: 'Request timed out. Please try again.',
};

// =====================================
// CLASSIFICATION LOGIC
// =====================================

/**
 * Classify an error into severity and determine handling
 */
export function classifyError(error: AxiosError | Error): ClassifiedError {
  // Handle non-Axios errors
  if (!isAxiosError(error)) {
    return {
      message: error.message || 'An unexpected error occurred.',
      severity: 'medium',
      isValidation: false,
      shouldLogout: false,
      shouldShowPopup: true,
    };
  }

  const axiosError = error as AxiosError<ApiErrorResponse>;
  const response = axiosError.response;
  const status = response?.status;
  const data = response?.data;
  const errorCode = data?.code;
  const correlationId = (data?.correlationId ?? 
    extractCorrelationId((response?.headers ?? {}) as Record<string, string>)) || undefined;

  // Network error (no response)
  if (!response) {
    return {
      message: axiosError.code === 'ECONNABORTED' 
        ? 'Request timed out. Please check your connection.'
        : 'Network error. Please check your internet connection.',
      severity: 'medium',
      isValidation: false,
      shouldLogout: false,
      shouldShowPopup: true,
    };
  }

  // Check for validation errors (should be handled inline)
  if (errorCode && VALIDATION_ERROR_CODES.has(errorCode)) {
    return {
      message: data?.message ?? 'Validation failed.',
      severity: 'minor',
      code: errorCode,
      correlationId,
      isValidation: true,
      validationErrors: data?.errors,
      shouldLogout: false,
      shouldShowPopup: false, // Handle inline
    };
  }

  // Check for session expiry (critical - needs logout)
  if (errorCode && SESSION_EXPIRED_CODES.has(errorCode)) {
    return {
      message: FRIENDLY_MESSAGES[errorCode] ?? 'Your session has expired. Please login again.',
      severity: 'critical',
      code: errorCode,
      correlationId,
      isValidation: false,
      shouldLogout: true,
      shouldShowPopup: true,
    };
  }

  // 401 without specific code - treat as session issue
  if (status === 401) {
    return {
      message: FRIENDLY_MESSAGES[errorCode ?? ''] ?? 'Please login to continue.',
      severity: AUTH_ERROR_CODES.has(errorCode ?? '') ? 'medium' : 'critical',
      code: errorCode,
      correlationId,
      isValidation: false,
      shouldLogout: !AUTH_ERROR_CODES.has(errorCode ?? ''),
      shouldShowPopup: true,
    };
  }

  // Auth errors (wrong password, etc.)
  if (errorCode && AUTH_ERROR_CODES.has(errorCode)) {
    return {
      message: FRIENDLY_MESSAGES[errorCode] ?? data?.message ?? 'Authentication failed.',
      severity: 'medium',
      code: errorCode,
      correlationId,
      isValidation: false,
      shouldLogout: false,
      shouldShowPopup: true,
    };
  }

  // 5xx errors (server errors - critical)
  if (status && status >= 500) {
    return {
      message: FRIENDLY_MESSAGES[errorCode ?? ''] ?? 
        STATUS_MESSAGES[status] ?? 
        'Something went wrong. Please try again later.',
      severity: 'critical',
      code: errorCode,
      correlationId,
      isValidation: false,
      shouldLogout: false,
      shouldShowPopup: true,
    };
  }

  // 4xx errors (client errors - medium)
  if (status && status >= 400 && status < 500) {
    return {
      message: FRIENDLY_MESSAGES[errorCode ?? ''] ?? 
        data?.message ?? 
        STATUS_MESSAGES[status] ?? 
        'Request failed. Please try again.',
      severity: 'medium',
      code: errorCode,
      correlationId,
      isValidation: false,
      shouldLogout: false,
      shouldShowPopup: true,
    };
  }

  // Default fallback
  return {
    message: data?.message ?? 'An error occurred. Please try again.',
    severity: 'medium',
    code: errorCode,
    correlationId,
    isValidation: false,
    shouldLogout: false,
    shouldShowPopup: true,
  };
}

/**
 * Check if error is an Axios error
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (error as AxiosError)?.isAxiosError === true;
}

// =====================================
// DISPATCH TO STORE
// =====================================

/**
 * Classify error and dispatch to global error store
 * Returns the classified error for additional handling
 */
export function classifyAndDispatchError(error: AxiosError | Error): ClassifiedError {
  const classified = classifyError(error);
  
  // Store correlation ID in correlation store
  if (classified.correlationId) {
    useCorrelationStore.getState().setErrorContext({
      correlationId: classified.correlationId,
      errorCode: classified.code,
      errorMessage: classified.message,
    });
  }
  
  // Only show popup if not validation error and should show
  if (classified.shouldShowPopup && !classified.isValidation) {
    useErrorStore.getState().addError({
      message: classified.message,
      severity: classified.severity,
      code: classified.code,
      correlationId: classified.correlationId,
      dismissable: classified.severity !== 'critical',
    });
  }
  
  return classified;
}

/**
 * Global error handler for React Query
 * Prevents double-handling from Axios interceptor
 */
let lastHandledError: { message: string; timestamp: number } | null = null;

export function globalQueryErrorHandler(error: unknown): void {
  const err = error as Error;
  
  // Prevent duplicate handling (axios interceptor already handled)
  if (isAxiosError(err)) {
    // Axios errors are handled by interceptor
    return;
  }
  
  // Check for recent duplicate
  const now = Date.now();
  if (lastHandledError && 
      lastHandledError.message === err.message && 
      now - lastHandledError.timestamp < 1000) {
    return;
  }
  
  lastHandledError = { message: err.message, timestamp: now };
  
  // Handle non-axios errors (JS runtime errors in queries)
  classifyAndDispatchError(err);
}

// =====================================
// EXPORTS
// =====================================

export { isAxiosError };
