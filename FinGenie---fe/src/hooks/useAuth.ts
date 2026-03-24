/**
 * Auth Hooks - Bank-Grade Session Management
 * 
 * Provides:
 * - useTokenAutoRefresh: Background token refresh before expiration
 * - useSessionHeartbeat: Periodic session validation
 * - useMultiTabSync: Cross-tab logout synchronization
 * - useAuthLifecycle: Combined auth management hook
 * 
 * SECURITY: Designed for fintech-grade applications
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { authStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { getRefreshTime, isTokenExpired } from '../utils/tokenUtils';
import {
  scheduleTokenRefresh,
  stopAutoRefresh,
  startHeartbeat,
  stopHeartbeat,
  initMultiTabSync,
  logoutAndResetApp,
  broadcastLogout,
} from '../utils/authLifecycle';

// =====================================
// CONSTANTS
// =====================================

const REFRESH_BUFFER_SECONDS = 60; // Refresh 60 seconds before expiry
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_REFRESH_INTERVAL_MS = 30 * 1000; // Minimum 30 seconds between refreshes

// =====================================
// useTokenAutoRefresh
// =====================================

/**
 * Background token refresh hook
 * 
 * Features:
 * - Schedules refresh before token expiration
 * - Handles app backgrounding/foregrounding
 * - Prevents multiple concurrent refreshes
 * - Integrates with AppState for proper lifecycle
 */
export function useTokenAutoRefresh() {
  const accessToken = authStore((state) => state.accessToken);
  const refreshToken = authStore((state) => state.refreshToken);
  const expiresAt = authStore((state) => state.expiresAt);
  const setTokens = authStore((state) => state.setTokens);
  const isAuthenticated = authStore((state) => state.isAuthenticated);
  
  const lastRefreshTimeRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Perform token refresh
   */
  const performRefresh = useCallback(async () => {
    // Rate limit
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < MIN_REFRESH_INTERVAL_MS) {
      console.log('[useTokenAutoRefresh] Rate limited, skipping refresh');
      return;
    }

    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      console.log('[useTokenAutoRefresh] Already refreshing, skipping');
      return;
    }

    if (!refreshToken) {
      console.log('[useTokenAutoRefresh] No refresh token available');
      return;
    }

    isRefreshingRef.current = true;
    lastRefreshTimeRef.current = now;

    try {
      console.log('[useTokenAutoRefresh] Proactively refreshing token...');
      
      const { data } = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn?: number;
      }>('/auth/refresh', { refreshToken });

      const expiresIn = data.expiresIn ?? 3600;
      const newExpiresAt = Date.now() + (expiresIn * 1000);
      
      setTokens(data.accessToken, data.refreshToken, newExpiresAt);
      console.log('[useTokenAutoRefresh] Token refreshed successfully');
      
      // Schedule next refresh
      scheduleNextRefresh(data.accessToken, newExpiresAt);
    } catch (error) {
      if (__DEV__) {
        console.warn('[useTokenAutoRefresh] Refresh failed:', error);
      }
      // Don't logout here - the interceptor will handle actual 401s
    } finally {
      isRefreshingRef.current = false;
    }
  }, [refreshToken, setTokens]);

  /**
   * Schedule the next token refresh
   */
  const scheduleNextRefresh = useCallback((token: string, exp: number) => {
    const refreshTime = getRefreshTime(token, REFRESH_BUFFER_SECONDS);
    const delay = Math.max(refreshTime - Date.now(), MIN_REFRESH_INTERVAL_MS);
    
    console.log('[useTokenAutoRefresh] Next refresh in', Math.round(delay / 1000), 'seconds');
    scheduleTokenRefresh(performRefresh, delay);
  }, [performRefresh]);

  /**
   * Check token and refresh if needed
   */
  const checkAndRefresh = useCallback(() => {
    if (!accessToken || !isAuthenticated) {
      return;
    }

    // Check if token is expired or about to expire
    if (isTokenExpired(accessToken, REFRESH_BUFFER_SECONDS)) {
      console.log('[useTokenAutoRefresh] Token expired or expiring soon, refreshing...');
      performRefresh();
    } else if (expiresAt) {
      // Schedule refresh for later
      scheduleNextRefresh(accessToken, expiresAt);
    }
  }, [accessToken, expiresAt, isAuthenticated, performRefresh, scheduleNextRefresh]);

  /**
   * Handle app state changes (foreground/background)
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      // App coming to foreground
      if (previousState.match(/inactive|background/) && nextState === 'active') {
        console.log('[useTokenAutoRefresh] App foregrounded, checking token...');
        checkAndRefresh();
      }

      // App going to background - stop scheduled refreshes
      if (nextState.match(/inactive|background/) && previousState === 'active') {
        console.log('[useTokenAutoRefresh] App backgrounded, stopping auto-refresh');
        stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkAndRefresh]);

  /**
   * Initial setup and cleanup
   */
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      checkAndRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [isAuthenticated, accessToken, checkAndRefresh]);
}

// =====================================
// useSessionHeartbeat
// =====================================

/**
 * Session heartbeat hook
 * 
 * Periodically validates session with backend to detect:
 * - Server-side session invalidation
 * - Account suspension/deletion
 * - Cross-device logout
 */
export function useSessionHeartbeat() {
  const isAuthenticated = authStore((state) => state.isAuthenticated);

  /**
   * Check session status with backend
   */
  const checkSession = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{
        valid: boolean;
        reason?: string;
      }>('/auth/session-status');

      if (!data.valid) {
        console.log('[useSessionHeartbeat] Session invalid:', data.reason);
        
        // Determine logout reason
        let reason: Parameters<typeof logoutAndResetApp>[0] = 'session_invalidated';
        if (data.reason === 'ACCOUNT_DISABLED') {
          reason = 'account_disabled';
        } else if (data.reason === 'CONCURRENT_SESSION') {
          reason = 'cross_device_logout';
        }
        
        await logoutAndResetApp(reason);
      }
    } catch (error) {
      // Don't logout on network errors - only on explicit invalid response
      console.warn('[useSessionHeartbeat] Session check failed:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // Initial check
      checkSession();
      
      // Start periodic heartbeat
      startHeartbeat(checkSession, HEARTBEAT_INTERVAL_MS);
    } else {
      stopHeartbeat();
    }

    return () => {
      stopHeartbeat();
    };
  }, [isAuthenticated, checkSession]);
}

// =====================================
// useMultiTabSync
// =====================================

/**
 * Multi-tab logout synchronization (web only)
 * 
 * When user logs out in one tab, all other tabs are notified
 * and automatically logged out.
 */
export function useMultiTabSync() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    // Initialize the storage event listener
    initMultiTabSync();
  }, []);
}

// =====================================
// useAuthLogout
// =====================================

/**
 * Hook for handling logout with proper cleanup
 */
export function useAuthLogout() {
  const queryClient = useQueryClient();

  const logout = useCallback(async (reason: Parameters<typeof logoutAndResetApp>[0] = 'user_initiated') => {
    // Broadcast to other tabs (web only)
    broadcastLogout();
    
    // Call backend logout endpoint (optional, fails gracefully)
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors - we're logging out anyway
    }

    // Perform full app reset
    await logoutAndResetApp(reason);
  }, [queryClient]);

  return { logout };
}

// =====================================
// useAuthLifecycle
// =====================================

/**
 * Combined auth lifecycle hook
 * 
 * Use this single hook to enable all auth features:
 * - Background token refresh
 * - Session heartbeat
 * - Multi-tab sync
 * 
 * Should be used once at the app root level.
 */
export function useAuthLifecycle() {
  // Enable all auth features
  useTokenAutoRefresh();
  useSessionHeartbeat();
  useMultiTabSync();
  
  const { logout } = useAuthLogout();
  
  return { logout };
}

// =====================================
// useAuthState
// =====================================

/**
 * Convenience hook for accessing common auth state
 */
export function useAuthState() {
  const isAuthenticated = authStore((state) => state.isAuthenticated);
  const sessionState = authStore((state) => state.sessionState);
  const user = authStore((state) => state.user);
  const expiresAt = authStore((state) => state.expiresAt);
  const lastLogoutReason = authStore((state) => state.lastLogoutReason);

  return {
    isAuthenticated,
    sessionState,
    user,
    expiresAt,
    lastLogoutReason,
    isExpired: expiresAt ? Date.now() >= expiresAt : false,
  };
}
