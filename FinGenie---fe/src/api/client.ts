/**
 * API Client with Bank-Grade Auth Interceptor
 * 
 * Features:
 * - Global 401/403 handling
 * - Silent token refresh with request queueing
 * - Infinite loop prevention
 * - Proper error classification
 * - No logout on network errors or rate limits
 * 
 * SECURITY: Never log token values
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { shouldNotLogout, isTokenRevokedError, AUTH_ERROR_CODES } from '../utils/tokenUtils';
import { logoutAndResetApp, isLogoutInProgress } from '../utils/authLifecycle';
import { getApiBaseUrl, API_PREFIX, getFullApiUrl } from './config';

// Dynamic API_BASE_URL based on platform
const API_BASE_URL = getApiBaseUrl();

export { API_BASE_URL, API_PREFIX };

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =====================================
// AUTH STATE (Module-scoped to avoid circular deps)
// =====================================

interface AuthCallbacks {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokensRefreshed: (accessToken: string, refreshToken: string, expiresAt: number) => void;
}

let authCallbacks: AuthCallbacks | null = null;

/**
 * Register auth callbacks from the auth store
 * This breaks circular dependency between client and store
 */
export function registerAuthCallbacks(callbacks: AuthCallbacks) {
  authCallbacks = callbacks;
}

// =====================================
// REFRESH TOKEN QUEUE
// =====================================

interface QueuedRequest {
  resolve: (value: AxiosResponse) => void;
  reject: (error: Error) => void;
  config: InternalAxiosRequestConfig;
}

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];
let refreshAttemptCount = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const REFRESH_COOLDOWN_MS = 5000;
let lastRefreshAttempt = 0;

/**
 * Process the queue of failed requests after refresh
 */
function processQueue(success: boolean, newToken?: string) {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (success && newToken) {
      config.headers.Authorization = `Bearer ${newToken}`;
      resolve(apiClient(config) as unknown as AxiosResponse);
    } else {
      reject(new Error('Token refresh failed'));
    }
  });
  failedQueue = [];
}

/**
 * Perform token refresh with proper locking
 */
async function refreshTokens(): Promise<string | null> {
  const refreshToken = authCallbacks?.getRefreshToken();
  
  if (!refreshToken) {
    console.log('[ApiClient] No refresh token available');
    return null;
  }

  // Rate limit refresh attempts
  const now = Date.now();
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
    console.log('[ApiClient] Refresh attempt rate limited');
    return null;
  }
  lastRefreshAttempt = now;

  // Max retry protection
  if (refreshAttemptCount >= MAX_REFRESH_ATTEMPTS) {
    console.log('[ApiClient] Max refresh attempts reached');
    refreshAttemptCount = 0;
    return null;
  }

  refreshAttemptCount++;

  try {
    console.log('[ApiClient] Attempting token refresh...');
    
    // Use raw axios to avoid interceptor recursion
    const { data } = await axios.post<{
      accessToken: string;
      refreshToken: string;
      expiresIn?: number;
    }>(
      `${API_BASE_URL}${API_PREFIX}/auth/refresh`,
      { refreshToken },
      { 
        timeout: 10000,
      }
    );

    // Calculate expiration (default 1 hour if not provided)
    const expiresIn = data.expiresIn ?? 3600;
    const expiresAt = Date.now() + (expiresIn * 1000);

    // Update tokens through callback
    authCallbacks?.onTokensRefreshed(data.accessToken, data.refreshToken, expiresAt);
    
    // Reset attempt counter on success
    refreshAttemptCount = 0;
    
    console.log('[ApiClient] Token refresh successful');
    return data.accessToken;
  } catch (error) {
    console.log('[ApiClient] Token refresh failed');
    
    // Check if refresh token was revoked
    if (axios.isAxiosError(error)) {
      const errorCode = (error.response?.data as Record<string, unknown>)?.code as string;
      if (isTokenRevokedError(errorCode) || error.response?.status === 401) {
        // Token was revoked - force logout
        refreshAttemptCount = 0;
        return null;
      }
    }
    
    return null;
  }
}

// =====================================
// REQUEST INTERCEPTOR
// =====================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Skip auth header for refresh endpoint (it handles its own)
    if (config.url?.includes('/auth/refresh')) {
      return config;
    }

    const token = authCallbacks?.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =====================================
// RESPONSE INTERCEPTOR
// =====================================

// Extended config type with retry tracking
interface ExtendedAxiosConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

apiClient.interceptors.response.use(
  // Success - pass through
  (response) => response,
  
  // Error handler
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosConfig | undefined;
    
    // No config means we can't retry
    if (!originalRequest) {
      return Promise.reject(normalizeError(error));
    }

    const status = error.response?.status;
    const errorData = error.response?.data as Record<string, unknown> | undefined;
    const errorCode = errorData?.code as string | undefined;

    // =====================================
    // CASE 1: Network error - DO NOT logout
    // =====================================
    if (!error.response) {
      return Promise.reject(normalizeError(error));
    }

    // =====================================
    // CASE 2: Rate limit (429) - DO NOT logout
    // =====================================
    if (status === 429) {
      return Promise.reject(normalizeError(error));
    }

    // =====================================
    // CASE 3: 403 Forbidden with valid session - DO NOT logout
    // =====================================
    if (status === 403 && !isTokenRevokedError(errorCode)) {
      return Promise.reject(normalizeError(error));
    }

    // =====================================
    // CASE 4: 401 Unauthorized - Try refresh
    // =====================================
    if (status === 401 || (status === 403 && isTokenRevokedError(errorCode))) {
      // Prevent infinite retry loop
      if (originalRequest._retry) {
        console.log('[ApiClient] Request already retried, triggering logout');
        if (!isLogoutInProgress()) {
          await logoutAndResetApp('token_expired');
        }
        return Promise.reject(normalizeError(error));
      }

      // Check for explicit token revocation
      if (errorCode === AUTH_ERROR_CODES.TOKEN_REVOKED || 
          errorCode === AUTH_ERROR_CODES.SESSION_EXPIRED) {
        console.log('[ApiClient] Token revoked by server, triggering logout');
        if (!isLogoutInProgress()) {
          await logoutAndResetApp('session_invalidated');
        }
        return Promise.reject(normalizeError(error));
      }

      // Skip refresh for auth endpoints (login, register, etc.)
      if (originalRequest.url?.startsWith('/auth/') && 
          !originalRequest.url?.includes('/session-status')) {
        return Promise.reject(normalizeError(error));
      }

      // Mark as retry in progress
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        console.log('[ApiClient] Refresh in progress, queueing request');
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      // Start refresh
      isRefreshing = true;

      try {
        const newToken = await refreshTokens();
        
        if (newToken) {
          // Success - retry original request and process queue
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(true, newToken);
          return apiClient(originalRequest);
        } else {
          // Refresh failed - logout and reject queued requests
          processQueue(false);
          if (!isLogoutInProgress()) {
            await logoutAndResetApp('refresh_failed');
          }
          return Promise.reject(normalizeError(error));
        }
      } finally {
        isRefreshing = false;
      }
    }

    // =====================================
    // CASE 5: Other errors - Pass through
    // =====================================
    return Promise.reject(normalizeError(error));
  }
);

// =====================================
// ERROR NORMALIZATION
// =====================================

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  isAuthError?: boolean;
  isNetworkError?: boolean;
  isRateLimited?: boolean;
}

function normalizeError(error: AxiosError): ApiError {
  // Network error (no response)
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return { 
        message: 'Request timed out. Please try again.',
        isNetworkError: true,
      };
    }
    return { 
      message: error.message ?? 'Network error. Please check your connection.',
      isNetworkError: true,
    };
  }

  const data = error.response.data as Record<string, unknown>;
  const status = error.response.status;
  
  return {
    message: (data?.message as string) ?? error.message ?? 'An error occurred',
    code: (data?.code as string) ?? undefined,
    status,
    isAuthError: status === 401 || status === 403,
    isRateLimited: status === 429,
  };
}

// =====================================
// UTILITIES
// =====================================

/**
 * Check if the API client is currently refreshing tokens
 */
export function isRefreshingTokens(): boolean {
  return isRefreshing;
}

/**
 * Get the number of queued requests
 */
export function getQueuedRequestCount(): number {
  return failedQueue.length;
}

/**
 * Reset refresh state (for testing/debugging)
 */
export function resetRefreshState() {
  isRefreshing = false;
  failedQueue = [];
  refreshAttemptCount = 0;
  lastRefreshAttempt = 0;
}
