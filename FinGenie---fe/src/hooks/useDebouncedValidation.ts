/**
 * Debounced Async Validation Hook
 * 
 * Provides secure, performant async field validation with:
 * - Debounced API calls to reduce server load
 * - Request cancellation (AbortController) to prevent race conditions
 * - Rate limit handling with graceful degradation
 * - No validation on empty values
 * 
 * SECURITY: Works with backend rate limiting to prevent
 * enumeration attacks and API abuse.
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

// =====================================
// TYPES
// =====================================

export interface AsyncValidationResult {
  valid: boolean;
  message: string;
  code: string;
  suggestions?: string[];
}

export interface PasswordStrengthResult {
  valid: boolean;
  score: number;
  level: 'WEAK' | 'FAIR' | 'GOOD' | 'STRONG';
  message: string;
  criteria: {
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    noCommonPatterns: boolean;
  };
  suggestions?: string[];
}

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'rate-limited';

export interface UseDebouncedValidationOptions {
  /** Debounce delay in ms (default: 500) */
  delay?: number;
  /** Minimum value length before triggering validation (default: 1) */
  minLength?: number;
  /** Local validation function to run before server call */
  localValidator?: (value: string) => string | null;
  /** Callback when validation completes */
  onValidationComplete?: (result: AsyncValidationResult | null) => void;
}

export interface UseDebouncedValidationReturn {
  /** Current validation status */
  status: ValidationStatus;
  /** Validation result from server */
  result: AsyncValidationResult | null;
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Error message (from local or server validation) */
  error: string | null;
  /** Trigger validation for a value */
  validate: (value: string) => void;
  /** Cancel any pending validation */
  cancel: () => void;
  /** Reset validation state */
  reset: () => void;
}

// =====================================
// MAIN HOOK
// =====================================

/**
 * Debounced validation hook with cancellation support
 * 
 * @param endpoint - API endpoint path (e.g., '/validate/email')
 * @param fieldName - Field name for the request body
 * @param options - Configuration options
 */
export function useDebouncedValidation(
  endpoint: string,
  fieldName: string,
  options: UseDebouncedValidationOptions = {}
): UseDebouncedValidationReturn {
  const {
    delay = 500,
    minLength = 1,
    localValidator,
    onValidationComplete,
  } = options;

  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [result, setResult] = useState<AsyncValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValueRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Cancel any pending validation
   */
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Don't reset status if already validated - keep last result
  }, []);

  /**
   * Reset validation state completely
   */
  const reset = useCallback(() => {
    cancel();
    setStatus('idle');
    setResult(null);
    setError(null);
    lastValueRef.current = '';
  }, [cancel]);

  /**
   * Trigger validation for a value
   */
  const validate = useCallback(
    (value: string) => {
      // Cancel previous pending request
      cancel();

      // Store current value for comparison
      lastValueRef.current = value;

      // Skip empty or too short values
      if (!value || value.length < minLength) {
        setStatus('idle');
        setResult(null);
        setError(null);
        onValidationComplete?.(null);
        return;
      }

      // Run local validation first (fast feedback)
      if (localValidator) {
        const localError = localValidator(value);
        if (localError) {
          setStatus('invalid');
          setError(localError);
          setResult({ valid: false, message: localError, code: 'LOCAL_VALIDATION_FAILED' });
          onValidationComplete?.({ valid: false, message: localError, code: 'LOCAL_VALIDATION_FAILED' });
          return;
        }
      }

      // Set validating state
      setStatus('validating');
      setError(null);

      // Create abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Debounced API call
      timeoutRef.current = setTimeout(async () => {
        try {
          const response = await apiClient.post<AsyncValidationResult>(
            endpoint,
            { [fieldName]: value },
            { signal: controller.signal }
          );

          // Check if this is still the current validation
          if (value !== lastValueRef.current) return;

          const data = response.data;
          setResult(data);
          setStatus(data.valid ? 'valid' : 'invalid');
          setError(data.valid ? null : data.message);
          onValidationComplete?.(data);
        } catch (err: any) {
          // Ignore aborted requests
          if (err.name === 'AbortError' || err.name === 'CanceledError') {
            return;
          }

          // Check if this is still the current validation
          if (value !== lastValueRef.current) return;

          // Handle rate limiting gracefully
          if (err.response?.status === 429) {
            setStatus('rate-limited');
            setError('Too many attempts. Please wait.');
            const rateLimitResult: AsyncValidationResult = {
              valid: false,
              message: 'Too many attempts. Please wait.',
              code: 'RATE_LIMITED',
            };
            setResult(rateLimitResult);
            onValidationComplete?.(rateLimitResult);
            return;
          }

          // For other errors, fail gracefully (allow form submission)
          console.error('Validation error:', err);
          setStatus('idle');
          setResult(null);
          setError(null);
          onValidationComplete?.(null);
        }
      }, delay);
    },
    [endpoint, fieldName, delay, minLength, localValidator, onValidationComplete, cancel]
  );

  return {
    status,
    result,
    isValidating: status === 'validating',
    error,
    validate,
    cancel,
    reset,
  };
}

// =====================================
// PASSWORD STRENGTH HOOK
// =====================================

/**
 * Hook for password strength validation
 * Returns detailed strength analysis without blocking on server validation
 */
export function usePasswordStrength(
  options: Omit<UseDebouncedValidationOptions, 'localValidator'> = {}
): UseDebouncedValidationReturn & { strength: PasswordStrengthResult | null } {
  const [strength, setStrength] = useState<PasswordStrengthResult | null>(null);

  const handleValidationComplete = useCallback((result: AsyncValidationResult | null) => {
    if (result && 'score' in result) {
      setStrength(result as unknown as PasswordStrengthResult);
    } else {
      setStrength(null);
    }
    options.onValidationComplete?.(result);
  }, [options.onValidationComplete]);

  const validation = useDebouncedValidation(
    '/validate/password',
    'password',
    {
      ...options,
      delay: options.delay ?? 300, // Faster for password (local-first)
      onValidationComplete: handleValidationComplete,
    }
  );

  // Reset strength when validation resets
  const originalReset = validation.reset;
  const reset = useCallback(() => {
    setStrength(null);
    originalReset();
  }, [originalReset]);

  return {
    ...validation,
    reset,
    strength,
  };
}

// =====================================
// CONVENIENCE HOOKS
// =====================================

/**
 * Email validation hook
 */
export function useEmailValidation(options?: UseDebouncedValidationOptions) {
  return useDebouncedValidation('/validate/email', 'email', {
    delay: 500,
    minLength: 5,
    localValidator: (value) => {
      // Quick local check for @ symbol
      if (!value.includes('@')) {
        return null; // Don't show error while typing
      }
      return null;
    },
    ...options,
  });
}

/**
 * Username validation hook
 */
export function useUsernameValidation(options?: UseDebouncedValidationOptions) {
  return useDebouncedValidation('/validate/username', 'username', {
    delay: 500,
    minLength: 3,
    localValidator: (value) => {
      if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        return 'Username can only contain letters, numbers, and underscores';
      }
      return null;
    },
    ...options,
  });
}

/**
 * Phone validation hook
 */
export function usePhoneValidation(options?: UseDebouncedValidationOptions) {
  return useDebouncedValidation('/validate/phone', 'phone', {
    delay: 500,
    minLength: 9,
    ...options,
  });
}

/**
 * Wallet name validation hook
 */
export function useWalletNameValidation(
  excludeWalletId?: number,
  options?: UseDebouncedValidationOptions
) {
  return useDebouncedValidation('/validate/wallet-name', 'walletName', {
    delay: 400,
    minLength: 1,
    ...options,
  });
}
