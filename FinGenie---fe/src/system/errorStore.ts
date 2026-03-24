/**
 * Global Error Store
 * 
 * Centralized error state management for the entire app.
 * Features:
 * - Deduplication (same error within 3s window)
 * - Severity classification
 * - Auto-dismiss scheduling
 * - Correlation ID tracking
 * 
 * @module system/errorStore
 */

import { create } from 'zustand';

// =====================================
// TYPES
// =====================================

export type ErrorSeverity = 'minor' | 'medium' | 'critical';

export interface PopupError {
  id: string;
  message: string;
  severity: ErrorSeverity;
  correlationId?: string;
  code?: string;
  timestamp: number;
  dismissable: boolean;
}

export interface ErrorStoreState {
  errors: PopupError[];
  recentErrorHashes: Map<string, number>;
  
  // Actions
  addError: (error: Omit<PopupError, 'id' | 'timestamp'>) => string | null;
  removeError: (id: string) => void;
  clearErrors: () => void;
  hasRecentError: (hash: string) => boolean;
}

// =====================================
// CONSTANTS
// =====================================

const DEDUP_WINDOW_MS = 3000; // 3 seconds
const MAX_ERRORS = 5; // Maximum concurrent popups

// =====================================
// HELPERS
// =====================================

function generateErrorId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createErrorHash(message: string, code?: string): string {
  return `${code ?? 'unknown'}:${message}`.toLowerCase();
}

// =====================================
// STORE
// =====================================

export const useErrorStore = create<ErrorStoreState>((set, get) => ({
  errors: [],
  recentErrorHashes: new Map(),

  addError: (error) => {
    const hash = createErrorHash(error.message, error.code);
    const now = Date.now();
    
    // Check for duplicate within dedup window
    const recentHashes = get().recentErrorHashes;
    const lastOccurrence = recentHashes.get(hash);
    
    if (lastOccurrence && now - lastOccurrence < DEDUP_WINDOW_MS) {
      console.log('[ErrorStore] Duplicate error suppressed:', hash);
      return null;
    }
    
    // Generate new error
    const id = generateErrorId();
    const newError: PopupError = {
      ...error,
      id,
      timestamp: now,
      dismissable: error.severity !== 'critical' ? true : error.dismissable ?? true,
    };
    
    // Update store
    set((state) => {
      const newHashes = new Map(state.recentErrorHashes);
      newHashes.set(hash, now);
      
      // Clean old hashes
      const cutoff = now - DEDUP_WINDOW_MS * 2;
      for (const [key, time] of newHashes) {
        if (time < cutoff) {
          newHashes.delete(key);
        }
      }
      
      // Limit max concurrent errors
      let errors = [...state.errors, newError];
      if (errors.length > MAX_ERRORS) {
        // Remove oldest non-critical errors first
        const nonCritical = errors.filter(e => e.severity !== 'critical');
        if (nonCritical.length > 0) {
          const toRemove = nonCritical[0];
          errors = errors.filter(e => e.id !== toRemove.id);
        } else {
          errors = errors.slice(-MAX_ERRORS);
        }
      }
      
      return {
        errors,
        recentErrorHashes: newHashes,
      };
    });
    
    console.log('[ErrorStore] Error added:', newError.severity, newError.message);
    return id;
  },

  removeError: (id) => {
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== id),
    }));
  },

  clearErrors: () => {
    set({ errors: [], recentErrorHashes: new Map() });
  },

  hasRecentError: (hash) => {
    const lastOccurrence = get().recentErrorHashes.get(hash);
    if (!lastOccurrence) return false;
    return Date.now() - lastOccurrence < DEDUP_WINDOW_MS;
  },
}));

// =====================================
// HELPER FUNCTIONS (for external use)
// =====================================

/**
 * Add an error to the global store
 * Returns error ID if added, null if deduplicated
 */
export function showError(
  message: string,
  options: {
    severity?: ErrorSeverity;
    code?: string;
    correlationId?: string;
    dismissable?: boolean;
  } = {}
): string | null {
  return useErrorStore.getState().addError({
    message,
    severity: options.severity ?? 'medium',
    code: options.code,
    correlationId: options.correlationId,
    dismissable: options.dismissable ?? true,
  });
}

/**
 * Show a minor toast-style notification
 */
export function showToast(message: string): string | null {
  return showError(message, { severity: 'minor' });
}

/**
 * Show a critical error that requires user acknowledgment
 */
export function showCriticalError(
  message: string,
  correlationId?: string
): string | null {
  return showError(message, {
    severity: 'critical',
    correlationId,
    dismissable: true,
  });
}

/**
 * Dismiss a specific error
 */
export function dismissError(id: string): void {
  useErrorStore.getState().removeError(id);
}

/**
 * Clear all errors
 */
export function clearAllErrors(): void {
  useErrorStore.getState().clearErrors();
}
