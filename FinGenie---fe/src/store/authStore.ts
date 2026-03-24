/**
 * Auth Store - Bank-Grade Session Management
 * 
 * Features:
 * - Session state machine
 * - Secure token storage
 * - Expiration tracking
 * - Automatic API client registration
 * 
 * SECURITY NOTES:
 * - Tokens stored in memory + SecureStore
 * - Never logged or exposed
 * - Cleared completely on logout
 */

import { create } from 'zustand';
import { registerAuthCallbacks } from '../api/client';
import { secureStorage, STORAGE_KEYS } from '../utils/secureStorage';
import { SessionState, logoutAndResetApp, initAuthLifecycle, type LogoutReason } from '../utils/authLifecycle';
import { getTokenExpiration } from '../utils/tokenUtils';
import type { QueryClient } from '@tanstack/react-query';

// =====================================
// TYPES
// =====================================

interface UserInfo {
  accountId: number;
  email: string;
  fullName: string;
}

interface AuthState {
  // Core auth state
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
  user: UserInfo | null;
  
  // Session state machine
  sessionState: SessionState;
  lastLogoutReason: LogoutReason | null;
  
  // Actions
  setTokens: (access: string, refresh: string, expiresAt?: number) => void;
  setUser: (user: UserInfo) => void;
  setSessionState: (state: SessionState) => void;
  
  // Logout with reason tracking
  logout: (reason?: LogoutReason) => void;
  
  // Full reset (for global logout)
  reset: () => void;
  
  // Initialization
  initialize: (queryClient: QueryClient, navigationReset: () => void) => Promise<void>;
  
  // Hydration from secure storage
  hydrate: () => Promise<boolean>;
}

// =====================================
// INITIAL STATE
// =====================================

const initialState = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  isAuthenticated: false,
  user: null,
  sessionState: 'UNAUTHENTICATED' as SessionState,
  lastLogoutReason: null,
};

// =====================================
// STORE
// =====================================

export const authStore = create<AuthState>((set, get) => ({
  ...initialState,

  setTokens: (access, refresh, expiresAt) => {
    // Calculate expiration from token if not provided
    const exp = expiresAt ?? getTokenExpiration(access) ?? (Date.now() + 3600 * 1000);
    
    // Update state
    set({
      accessToken: access,
      refreshToken: refresh,
      expiresAt: exp,
      isAuthenticated: true,
      sessionState: 'AUTHENTICATED',
    });

    // Persist to secure storage (async, don't await)
    secureStorage.setTokens(access, refresh, exp).catch((err) => {
      if (__DEV__) {
        console.warn('[AuthStore] Token persistence degraded.', err);
      }
    });
  },

  setUser: (user) => {
    set({ user });
    
    // Persist user data (async)
    secureStorage.setItem(
      STORAGE_KEYS.USER_DATA,
      JSON.stringify(user)
    ).catch((err) => {
      if (__DEV__) {
        console.warn('[AuthStore] User persistence degraded.', err);
      }
    });
  },

  setSessionState: (sessionState) => {
    set({ sessionState });
  },

  logout: (reason = 'user_initiated') => {
    set({ 
      ...initialState,
      lastLogoutReason: reason,
    });
    
    // Clear secure storage (async)
    secureStorage.clearAuthData().catch((err) => {
      if (__DEV__) {
        console.warn('[AuthStore] Auth storage cleanup degraded.', err);
      }
    });
  },

  reset: () => {
    set(initialState);
  },

  initialize: async (queryClient, navigationReset) => {
    // Register callbacks with API client
    registerAuthCallbacks({
      getAccessToken: () => get().accessToken,
      getRefreshToken: () => get().refreshToken,
      onTokensRefreshed: (access, refresh, expiresAt) => {
        get().setTokens(access, refresh, expiresAt);
      },
    });

    // Initialize auth lifecycle with dependencies
    initAuthLifecycle({
      queryClient,
      navigationReset,
      authStoreReset: () => get().reset(),
    });

    // Hydrate from secure storage
    await get().hydrate();
  },

  hydrate: async () => {
    try {
      const { accessToken, refreshToken, expiresAt } = await secureStorage.getTokens();
      const userDataStr = await secureStorage.getItem(STORAGE_KEYS.USER_DATA);

      // Check if we have valid tokens
      if (accessToken && refreshToken) {
        // Check if token is expired
        if (expiresAt && expiresAt < Date.now()) {
          if (__DEV__) console.log('[AuthStore] Stored token expired, need to refresh');
          set({
            accessToken: null,
            refreshToken,
            expiresAt: null,
            isAuthenticated: false,
            sessionState: 'EXPIRED',
          });
          return false;
        }

        // Restore session
        set({
          accessToken,
          refreshToken,
          expiresAt,
          isAuthenticated: true,
          sessionState: 'AUTHENTICATED',
          user: userDataStr ? JSON.parse(userDataStr) : null,
        });

        if (__DEV__) console.log('[AuthStore] Session restored from secure storage');
        return true;
      }

      return false;
    } catch (error) {
      if (__DEV__) {
        console.warn('[AuthStore] Storage hydration degraded.', error);
      }
      return false;
    }
  },
}));

// =====================================
// SELECTORS (for optimized re-renders)
// =====================================

export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectSessionState = (state: AuthState) => state.sessionState;
export const selectUser = (state: AuthState) => state.user;
export const selectExpiresAt = (state: AuthState) => state.expiresAt;
