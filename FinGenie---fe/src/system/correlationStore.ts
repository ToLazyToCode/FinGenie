/**
 * Correlation ID Store
 * 
 * Centralized store for tracking API correlation IDs
 * Used for error reporting and support chat context
 * 
 * @module system/correlationStore
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ErrorContext {
  correlationId: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: number;
  screen?: string;
  action?: string;
}

interface CorrelationState {
  // Current correlation ID from last API response
  lastCorrelationId: string | null;
  
  // Last error context for support reporting
  lastErrorContext: ErrorContext | null;
  
  // History of recent errors (max 10)
  errorHistory: ErrorContext[];
  
  // Current screen name for context
  currentScreen: string | null;
  
  // Last action performed
  lastAction: string | null;
  
  // Actions
  setCorrelationId: (id: string) => void;
  setErrorContext: (context: Omit<ErrorContext, 'timestamp' | 'screen' | 'action'>) => void;
  setCurrentScreen: (screen: string) => void;
  setLastAction: (action: string) => void;
  clearErrorContext: () => void;
  getErrorContextForSupport: () => SupportContext;
}

export interface SupportContext {
  correlationId: string | null;
  errorCode?: string;
  errorMessage?: string;
  screen?: string;
  lastAction?: string;
  timestamp?: number;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  appVersion: string;
}

// Default device info - will be populated by app
let deviceInfo: DeviceInfo = {
  platform: 'unknown',
  version: 'unknown',
  appVersion: '1.0.0',
};

export function setDeviceInfo(info: DeviceInfo) {
  deviceInfo = info;
}

const MAX_ERROR_HISTORY = 10;

export const useCorrelationStore = create<CorrelationState>()(
  persist(
    (set, get) => ({
      lastCorrelationId: null,
      lastErrorContext: null,
      errorHistory: [],
      currentScreen: null,
      lastAction: null,

      setCorrelationId: (id: string) => {
        set({ lastCorrelationId: id });
      },

      setErrorContext: (context) => {
        const fullContext: ErrorContext = {
          ...context,
          timestamp: Date.now(),
          screen: get().currentScreen ?? undefined,
          action: get().lastAction ?? undefined,
        };

        set((state) => ({
          lastErrorContext: fullContext,
          lastCorrelationId: context.correlationId,
          errorHistory: [
            fullContext,
            ...state.errorHistory.slice(0, MAX_ERROR_HISTORY - 1),
          ],
        }));
      },

      setCurrentScreen: (screen: string) => {
        set({ currentScreen: screen });
      },

      setLastAction: (action: string) => {
        set({ lastAction: action });
      },

      clearErrorContext: () => {
        set({ lastErrorContext: null });
      },

      getErrorContextForSupport: () => {
        const state = get();
        return {
          correlationId: state.lastErrorContext?.correlationId ?? state.lastCorrelationId,
          errorCode: state.lastErrorContext?.errorCode,
          errorMessage: state.lastErrorContext?.errorMessage,
          screen: state.currentScreen ?? undefined,
          lastAction: state.lastAction ?? undefined,
          timestamp: state.lastErrorContext?.timestamp,
          deviceInfo,
        };
      },
    }),
    {
      name: 'fingenie-correlation-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastCorrelationId: state.lastCorrelationId,
        errorHistory: state.errorHistory.slice(0, 5), // Only persist last 5
      }),
    }
  )
);

/**
 * Extract correlation ID from API response headers
 */
export function extractCorrelationId(headers: Record<string, string>): string | null {
  return (
    headers['x-correlation-id'] ??
    headers['X-Correlation-Id'] ??
    headers['x-request-id'] ??
    headers['X-Request-Id'] ??
    null
  );
}
