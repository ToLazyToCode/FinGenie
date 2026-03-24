/**
 * Adaptive Validation System
 * 
 * Provides different validation strictness levels:
 * - SOFT: While typing (hints only, no errors)
 * - MEDIUM: On blur (warnings and mild errors)
 * - STRICT: On submit (full validation)
 * 
 * UX BENEFITS:
 * - No aggressive red errors while typing
 * - Progressive feedback as user interaction increases
 * - Clear errors only when user commits (blur/submit)
 */

import { useState, useCallback } from 'react';
import { Validator, validateField as runValidation } from './validation';
import { tokens } from '../theme';

// =====================================
// TYPES
// =====================================

/**
 * Validation strictness levels for different user interaction states
 */
export type ValidationStrictness = 'soft' | 'medium' | 'strict';

/**
 * Adaptive validation configuration per field
 */
export interface AdaptiveValidationConfig {
  /** Validators to run while typing (soft feedback - hints only) */
  soft?: Validator<any>[];
  /** Validators to run on blur (medium strictness - warnings) */
  medium?: Validator<any>[];
  /** Validators to run on submit (full validation - errors) */
  strict?: Validator<any>[];
}

/**
 * Adaptive validation result with hints for UX
 */
export interface AdaptiveValidationResult {
  /** Whether the value passes current strictness level */
  valid: boolean;
  /** Error message (blocking, shown on medium/strict) */
  error: string | null;
  /** Hint message (soft suggestion while typing, non-blocking) */
  hint: string | null;
  /** Warning message (attention needed on blur, but may proceed) */
  warning: string | null;
}

// =====================================
// CORE VALIDATION LOGIC
// =====================================

/**
 * Run adaptive validation based on strictness level
 * 
 * @param value - Value to validate
 * @param config - Adaptive validation config
 * @param strictness - Current strictness level
 * @param formValues - Other form values for cross-field validation
 */
export function validateAdaptive<T>(
  value: T,
  config: AdaptiveValidationConfig,
  strictness: ValidationStrictness,
  formValues?: Record<string, any>
): AdaptiveValidationResult {
  const result: AdaptiveValidationResult = {
    valid: true,
    error: null,
    hint: null,
    warning: null,
  };

  // Get validators for current strictness level
  const validators = getValidatorsForStrictness(config, strictness);

  for (const validator of validators) {
    const message = validator(value, formValues);
    if (message) {
      if (strictness === 'soft') {
        // During typing: show as hint (non-blocking)
        result.hint = message;
        // Still valid - hints don't block
      } else if (strictness === 'medium') {
        // On blur: show as warning (mild blocking)
        result.warning = message;
        result.valid = false;
      } else {
        // On submit: show as error (hard block)
        result.error = message;
        result.valid = false;
      }
      break; // Stop at first issue
    }
  }

  return result;
}

/**
 * Get validators for given strictness level
 * Validators are cumulative: strict includes medium includes soft
 */
function getValidatorsForStrictness(
  config: AdaptiveValidationConfig,
  strictness: ValidationStrictness
): Validator<any>[] {
  const validators: Validator<any>[] = [];

  // Always include soft validators
  if (config.soft) {
    validators.push(...config.soft);
  }

  // Medium and strict include medium validators
  if (strictness !== 'soft' && config.medium) {
    validators.push(...config.medium);
  }

  // Only strict includes strict validators
  if (strictness === 'strict' && config.strict) {
    validators.push(...config.strict);
  }

  return validators;
}

// =====================================
// PRE-BUILT ADAPTIVE VALIDATORS
// =====================================

/**
 * Adaptive email validation
 * 
 * Soft: No validation (let user type freely)
 * Medium: Check for @ and domain
 * Strict: Full email regex
 */
export const adaptiveEmailValidation: AdaptiveValidationConfig = {
  soft: [
    // No errors while typing
    (_value: string) => null,
  ],
  medium: [
    (value: string) => {
      if (!value) return null;
      if (!value.includes('@')) return 'Email should include @';
      const parts = value.split('@');
      if (parts.length === 2 && !parts[1].includes('.')) {
        return 'Email should include a domain (e.g., gmail.com)';
      }
      return null;
    },
  ],
  strict: [
    (value: string) => {
      if (!value) return 'Email is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Please enter a valid email address';
      return null;
    },
  ],
};

/**
 * Adaptive password validation
 * 
 * Soft: Just check minimum length hint
 * Medium: Length + basic complexity hint
 * Strict: Full password policy
 */
export const adaptivePasswordValidation: AdaptiveValidationConfig = {
  soft: [
    (value: string) => {
      if (!value) return null; // No hint on empty
      if (value.length < 6) return null; // Don't nag early
      if (value.length < 8) return 'Consider using at least 8 characters';
      return null;
    },
  ],
  medium: [
    (value: string) => {
      if (!value) return null;
      if (value.length < 8) return 'Password must be at least 8 characters';
      if (!/[0-9]/.test(value)) return 'Add a number for better security';
      return null;
    },
  ],
  strict: [
    (value: string) => {
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
      if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
      if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
      if (!/[0-9]/.test(value)) return 'Password must contain a number';
      return null;
    },
  ],
};

/**
 * Adaptive username validation
 */
export const adaptiveUsernameValidation: AdaptiveValidationConfig = {
  soft: [
    (_value: string) => null, // No feedback while typing
  ],
  medium: [
    (value: string) => {
      if (!value) return null;
      if (value.length < 3) return 'Username must be at least 3 characters';
      if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        return 'Only letters, numbers, and underscores allowed';
      }
      return null;
    },
  ],
  strict: [
    (value: string) => {
      if (!value) return 'Username is required';
      if (value.length < 3) return 'Username must be at least 3 characters';
      if (value.length > 30) return 'Username must be at most 30 characters';
      if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        return 'Username can only contain letters, numbers, and underscores';
      }
      return null;
    },
  ],
};

/**
 * Adaptive phone validation
 */
export const adaptivePhoneValidation: AdaptiveValidationConfig = {
  soft: [
    (_value: string) => null,
  ],
  medium: [
    (value: string) => {
      if (!value) return null;
      const cleaned = value.replace(/[\s\-]/g, '');
      if (cleaned.length < 9) return 'Phone number seems too short';
      return null;
    },
  ],
  strict: [
    (value: string) => {
      if (!value) return null; // Phone might be optional
      const cleaned = value.replace(/[\s\-]/g, '');
      const phoneRegex = /^(\+84|84|0)?[0-9]{9,10}$/;
      if (!phoneRegex.test(cleaned)) {
        return 'Please enter a valid phone number';
      }
      return null;
    },
  ],
};

// =====================================
// PASSWORD STRENGTH CALCULATOR
// =====================================

export interface PasswordStrength {
  /** Score from 0-100 */
  score: number;
  /** Strength level */
  level: 'weak' | 'fair' | 'good' | 'strong';
  /** Color for UI display */
  color: string;
  /** Improvement suggestions */
  feedback: string[];
  /** Individual criteria status */
  criteria: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

/**
 * Calculate password strength (runs locally for instant feedback)
 * Use this for strength bar UI during typing
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      level: 'weak',
      color: tokens.colors.error,
      feedback: ['Enter a password'],
      criteria: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      },
    };
  }

  let score = 0;
  const feedback: string[] = [];
  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(password),
  };

  // Length scoring
  if (criteria.length) {
    score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 5;
  } else {
    feedback.push('Use at least 8 characters');
  }

  // Character variety scoring
  if (criteria.uppercase) score += 15;
  else feedback.push('Add uppercase letters');

  if (criteria.lowercase) score += 10;
  else feedback.push('Add lowercase letters');

  if (criteria.number) score += 15;
  else feedback.push('Add numbers');

  if (criteria.special) score += 20;
  else feedback.push('Add special characters (!@#$%)');

  // Bonus for variety
  const varietyCount = Object.values(criteria).filter(Boolean).length;
  if (varietyCount >= 4) score += 5;
  if (varietyCount >= 5) score += 5;

  // Determine level and color
  let level: PasswordStrength['level'];
  let color: string;

  if (score < 30) {
    level = 'weak';
    color = tokens.colors.error;
  } else if (score < 60) {
    level = 'fair';
    color = tokens.colors.warning;
  } else if (score < 80) {
    level = 'good';
    color = tokens.colors.success;
  } else {
    level = 'strong';
    color = tokens.colors.success;
  }

  // Success message
  if (feedback.length === 0) {
    feedback.push('Great password!');
  }

  return {
    score: Math.min(score, 100),
    level,
    color,
    feedback,
    criteria,
  };
}

// =====================================
// ADAPTIVE FORM HOOK
// =====================================

export interface AdaptiveFieldState<T> {
  value: T;
  error: string | null;
  hint: string | null;
  warning: string | null;
  touched: boolean;
  dirty: boolean;
}

export interface UseAdaptiveFieldOptions<T> {
  initialValue: T;
  config: AdaptiveValidationConfig;
  /** Run async validation after local validation passes */
  asyncValidate?: (value: T) => Promise<AdaptiveValidationResult>;
}

/**
 * Hook for a single field with adaptive validation
 */
export function useAdaptiveField<T>({
  initialValue,
  config,
  asyncValidate,
}: UseAdaptiveFieldOptions<T>) {
  const [state, setState] = useState<AdaptiveFieldState<T>>({
    value: initialValue,
    error: null,
    hint: null,
    warning: null,
    touched: false,
    dirty: false,
  });

  const [isValidating, setIsValidating] = useState(false);

  /**
   * Handle value change (soft validation)
   */
  const handleChange = useCallback((newValue: T) => {
    const result = validateAdaptive(newValue, config, 'soft');
    
    setState(prev => ({
      ...prev,
      value: newValue,
      hint: result.hint,
      error: null, // Clear error while typing
      warning: null,
      dirty: true,
    }));
  }, [config]);

  /**
   * Handle blur (medium validation)
   */
  const handleBlur = useCallback(async () => {
    // Run medium validation
    const result = validateAdaptive(state.value, config, 'medium');
    
    setState(prev => ({
      ...prev,
      touched: true,
      hint: null, // Clear hint on blur
      warning: result.warning,
      error: result.error,
    }));

    // If local validation passes and async is available, run it
    if (result.valid && asyncValidate) {
      setIsValidating(true);
      try {
        const asyncResult = await asyncValidate(state.value);
        setState(prev => ({
          ...prev,
          error: asyncResult.error,
          warning: asyncResult.warning,
        }));
      } catch {
        // Fail silently - server will catch on submit
      } finally {
        setIsValidating(false);
      }
    }
  }, [state.value, config, asyncValidate]);

  /**
   * Validate strictly (for submit)
   */
  const validateStrict = useCallback(async (): Promise<boolean> => {
    const result = validateAdaptive(state.value, config, 'strict');
    
    setState(prev => ({
      ...prev,
      touched: true,
      hint: null,
      warning: null,
      error: result.error,
    }));

    if (!result.valid) return false;

    // Run async validation if available
    if (asyncValidate) {
      setIsValidating(true);
      try {
        const asyncResult = await asyncValidate(state.value);
        setState(prev => ({
          ...prev,
          error: asyncResult.error,
        }));
        return asyncResult.valid;
      } catch {
        return true; // Fail open - server will catch
      } finally {
        setIsValidating(false);
      }
    }

    return true;
  }, [state.value, config, asyncValidate]);

  /**
   * Reset field state
   */
  const reset = useCallback((newValue?: T) => {
    setState({
      value: newValue ?? initialValue,
      error: null,
      hint: null,
      warning: null,
      touched: false,
      dirty: false,
    });
  }, [initialValue]);

  return {
    ...state,
    isValidating,
    handleChange,
    handleBlur,
    validateStrict,
    reset,
    setValue: (value: T) => setState(prev => ({ ...prev, value })),
    setError: (error: string | null) => setState(prev => ({ ...prev, error })),
  };
}
