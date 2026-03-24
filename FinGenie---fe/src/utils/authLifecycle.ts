/**
 * Auth Lifecycle Management
 * 
 * Centralized auth lifecycle handling for bank-grade security.
 * This module manages:
 * - Global logout with full cleanup
 * - Session state machine
 * - Cross-component auth events
 * - Infinite loop prevention
 * 
 * CRITICAL: All auth state changes should go through this module.
 */

import { QueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secureStorage';

// =====================================
// SESSION STATE MACHINE
// =====================================

export type SessionState = 
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATED'
  | 'REFRESHING'
  | 'EXPIRED'
  | 'LOGGING_OUT';

// =====================================
// GLOBAL STATE (Module-scoped singletons)
// =====================================

let isLoggingOut = false;
let queryClientRef: QueryClient | null = null;
let navigationResetFn: (() => void) | null = null;
let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
let refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
let authStoreResetFn: (() => void) | null = null;

// Event listeners for auth state changes
type AuthEventListener = (event: AuthEvent) => void;
const authEventListeners = new Set<AuthEventListener>();

export type AuthEvent = 
  | { type: 'LOGOUT'; reason: LogoutReason }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'TOKEN_REFRESHED' }
  | { type: 'LOGIN_SUCCESS' };

export type LogoutReason = 
  | 'user_initiated'
  | 'token_expired'
  | 'refresh_failed'
  | 'session_invalidated'
  | 'account_disabled'
  | 'cross_device_logout'
  | 'multi_tab_sync';

// =====================================
// INITIALIZATION
// =====================================

/**
 * Initialize the auth lifecycle module with required dependencies
 * Call this once during app startup
 */
export function initAuthLifecycle(config: {
  queryClient: QueryClient;
  navigationReset: () => void;
  authStoreReset: () => void;
}) {
  queryClientRef = config.queryClient;
  navigationResetFn = config.navigationReset;
  authStoreResetFn = config.authStoreReset;
}

// =====================================
// EVENT SYSTEM
// =====================================

/**
 * Subscribe to auth events
 */
export function subscribeToAuthEvents(listener: AuthEventListener): () => void {
  authEventListeners.add(listener);
  return () => authEventListeners.delete(listener);
}

/**
 * Emit an auth event to all listeners
 */
function emitAuthEvent(event: AuthEvent) {
  authEventListeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      console.error('[AuthLifecycle] Event listener error:', error);
    }
  });
}

// =====================================
// GLOBAL LOGOUT
// =====================================

/**
 * MASTER LOGOUT FUNCTION
 * 
 * This is THE function to call for any logout scenario.
 * It handles everything:
 * - Prevents multiple simultaneous logouts
 * - Clears all secure storage
 * - Resets all stores
 * - Clears React Query cache
 * - Stops background processes
 * - Resets navigation
 * 
 * @param reason Why the logout is happening (for analytics/debugging)
 */
export async function logoutAndResetApp(reason: LogoutReason = 'user_initiated'): Promise<void> {
  // Prevent multiple simultaneous logout attempts
  if (isLoggingOut) {
    console.log('[AuthLifecycle] Logout already in progress, skipping duplicate call');
    return;
  }

  isLoggingOut = true;
  console.log('[AuthLifecycle] Starting global logout, reason:', reason);

  try {
    // 1. Stop all background processes FIRST
    stopHeartbeat();
    stopAutoRefresh();

    // 2. Clear React Query cache
    if (queryClientRef) {
      queryClientRef.clear();
    }

    // 3. Clear secure storage (tokens, user data)
    await secureStorage.clearAuthData();

    // 4. Clear AsyncStorage auth keys (legacy cleanup)
    try {
      await AsyncStorage.multiRemove([
        '@fingenie/auth_tokens',
        '@fingenie/auth_user',
      ]);
    } catch {
      // AsyncStorage might not be available on all platforms
    }

    // 5. Reset auth store
    if (authStoreResetFn) {
      authStoreResetFn();
    }

    // 6. Emit logout event (for other listeners)
    emitAuthEvent({ type: 'LOGOUT', reason });

    // 7. Reset navigation to login screen
    if (navigationResetFn) {
      navigationResetFn();
    }

    console.log('[AuthLifecycle] Global logout complete');
  } catch (error) {
    console.error('[AuthLifecycle] Error during logout:', error);
  } finally {
    isLoggingOut = false;
  }
}

/**
 * Check if logout is currently in progress
 */
export function isLogoutInProgress(): boolean {
  return isLoggingOut;
}

// =====================================
// HEARTBEAT MANAGEMENT
// =====================================

/**
 * Start session heartbeat
 * Checks session validity every 5 minutes
 */
export function startHeartbeat(checkFn: () => Promise<void>, intervalMs: number = 5 * 60 * 1000) {
  stopHeartbeat(); // Clear any existing heartbeat
  
  heartbeatIntervalId = setInterval(async () => {
    try {
      await checkFn();
    } catch (error) {
      console.error('[AuthLifecycle] Heartbeat error:', error);
    }
  }, intervalMs);
  
  console.log('[AuthLifecycle] Heartbeat started, interval:', intervalMs / 1000, 'seconds');
}

/**
 * Stop session heartbeat
 */
export function stopHeartbeat() {
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
    console.log('[AuthLifecycle] Heartbeat stopped');
  }
}

// =====================================
// AUTO REFRESH MANAGEMENT
// =====================================

/**
 * Schedule a token refresh
 */
export function scheduleTokenRefresh(refreshFn: () => Promise<void>, delayMs: number) {
  stopAutoRefresh(); // Clear any existing scheduled refresh
  
  refreshTimeoutId = setTimeout(async () => {
    try {
      await refreshFn();
    } catch (error) {
      console.error('[AuthLifecycle] Scheduled refresh error:', error);
    }
  }, delayMs);
  
  console.log('[AuthLifecycle] Token refresh scheduled in:', Math.round(delayMs / 1000), 'seconds');
}

/**
 * Stop scheduled token refresh
 */
export function stopAutoRefresh() {
  if (refreshTimeoutId) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
}

// =====================================
// MULTI-TAB SYNC (WEB ONLY)
// =====================================

const LOGOUT_STORAGE_KEY = 'fingenie_logout_event';
let storageListenerRegistered = false;

/**
 * Initialize multi-tab logout sync (web only)
 */
export function initMultiTabSync() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  if (storageListenerRegistered) {
    return;
  }

  window.addEventListener('storage', (event) => {
    if (event.key === LOGOUT_STORAGE_KEY && event.newValue) {
      console.log('[AuthLifecycle] Logout detected from another tab');
      logoutAndResetApp('multi_tab_sync');
    }
  });

  storageListenerRegistered = true;
  console.log('[AuthLifecycle] Multi-tab sync initialized');
}

/**
 * Broadcast logout to other tabs (web only)
 */
export function broadcastLogout() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LOGOUT_STORAGE_KEY, Date.now().toString());
    // Clean up immediately to allow future logouts
    window.localStorage.removeItem(LOGOUT_STORAGE_KEY);
  } catch {
    // localStorage might not be available
  }
}

// =====================================
// LOGOUT REASONS - User-friendly messages
// =====================================

export function getLogoutMessage(reason: LogoutReason): string {
  switch (reason) {
    case 'user_initiated':
      return 'You have been logged out.';
    case 'token_expired':
      return 'Your session has expired. Please log in again.';
    case 'refresh_failed':
      return 'Unable to refresh your session. Please log in again.';
    case 'session_invalidated':
      return 'Your session was ended. Please log in again.';
    case 'account_disabled':
      return 'Your account has been disabled. Please contact support.';
    case 'cross_device_logout':
      return 'You were logged out from another device.';
    case 'multi_tab_sync':
      return 'You were logged out from another tab.';
    default:
      return 'Session ended. Please log in again.';
  }
}
