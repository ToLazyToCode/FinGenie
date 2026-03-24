/**
 * Form Validation Utilities
 * 
 * Simple validation system without external dependencies
 * Features:
 * - Type-safe validation rules
 * - i18n-ready error messages
 * - Composable validators
 */

// =====================================
// TYPES
// =====================================

export interface ValidationError {
  field: string;
  message: string;
}

export type Validator<T> = (value: T, formValues?: Record<string, any>) => string | null;

export interface ValidationSchema<T> {
  [K: string]: Validator<any>[];
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors: Partial<Record<keyof T, string>>;
  firstError: string | null;
}

// =====================================
// BASIC VALIDATORS
// =====================================

export const validators = {
  required: (message = 'This field is required'): Validator<any> => 
    (value) => {
      if (value === null || value === undefined || value === '') {
        return message;
      }
      if (Array.isArray(value) && value.length === 0) {
        return message;
      }
      return null;
    },

  minLength: (min: number, message?: string): Validator<string> =>
    (value) => {
      if (!value || value.length < min) {
        return message ?? `Must be at least ${min} characters`;
      }
      return null;
    },

  maxLength: (max: number, message?: string): Validator<string> =>
    (value) => {
      if (value && value.length > max) {
        return message ?? `Must be at most ${max} characters`;
      }
      return null;
    },

  email: (message = 'Please enter a valid email'): Validator<string> =>
    (value) => {
      if (!value) return null;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) ? null : message;
    },

  phone: (message = 'Please enter a valid phone number'): Validator<string> =>
    (value) => {
      if (!value) return null;
      // Accept various phone formats: +84xxxxxxxxx, 0xxxxxxxxx, etc.
      const phoneRegex = /^(\+?\d{1,4}[-.\s]?)?(\d{9,12})$/;
      const cleanedValue = value.replace(/[-.\s]/g, '');
      return phoneRegex.test(cleanedValue) ? null : message;
    },

  positiveNumber: (message = 'Must be a positive number'): Validator<number | string> =>
    (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num) || num <= 0) {
        return message;
      }
      return null;
    },

  nonNegativeNumber: (message = 'Must be zero or greater'): Validator<number | string> =>
    (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num) || num < 0) {
        return message;
      }
      return null;
    },

  min: (min: number, message?: string): Validator<number | string> =>
    (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num) || num < min) {
        return message ?? `Must be at least ${min}`;
      }
      return null;
    },

  max: (max: number, message?: string): Validator<number | string> =>
    (value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num) || num > max) {
        return message ?? `Must be at most ${max}`;
      }
      return null;
    },

  pattern: (regex: RegExp, message: string): Validator<string> =>
    (value) => {
      if (!value) return null;
      return regex.test(value) ? null : message;
    },

  custom: <T>(validateFn: (value: T) => boolean, message: string): Validator<T> =>
    (value) => validateFn(value) ? null : message,
};

// =====================================
// VALIDATION RUNNER
// =====================================

/**
 * Validate a single field
 */
export function validateField<T>(
  value: T,
  validators: Validator<T>[],
  formValues?: Record<string, any>
): string | null {
  for (const validator of validators) {
    const error = validator(value, formValues);
    if (error) return error;
  }
  return null;
}

/**
 * Validate entire form
 */
export function validateForm<T extends Record<string, any>>(
  values: T,
  schema: { [K in keyof T]?: Validator<T[K]>[] }
): ValidationResult<T> {
  const errors: Partial<Record<keyof T, string>> = {};
  let firstError: string | null = null;

  for (const key of Object.keys(schema) as (keyof T)[]) {
    const fieldValidators = schema[key];
    if (!fieldValidators) continue;

    const error = validateField(values[key], fieldValidators, values);
    if (error) {
      errors[key] = error;
      if (!firstError) firstError = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    firstError,
  };
}

// =====================================
// TRANSACTION VALIDATION
// =====================================

export interface TransactionFormValues {
  amount: string;
  transactionType: 'INCOME' | 'EXPENSE';
  categoryId: number | null;
  walletId: number | null;
  transactionDate: Date;
  description: string;
}

export const transactionValidationSchema = {
  amount: [
    validators.required('Amount is required'),
    validators.positiveNumber('Amount must be greater than 0'),
  ],
  categoryId: [
    validators.required('Please select a category'),
  ],
  walletId: [
    validators.required('Please select a wallet'),
  ],
};

// =====================================
// WALLET VALIDATION
// =====================================

export interface WalletFormValues {
  walletName: string;
  walletType: 'REGULAR' | 'PIGGY';
  initialBalance: string;
}

export const walletValidationSchema = {
  walletName: [
    validators.required('Wallet name is required'),
    validators.minLength(2, 'Name must be at least 2 characters'),
    validators.maxLength(50, 'Name must be at most 50 characters'),
  ],
  initialBalance: [
    validators.nonNegativeNumber('Balance must be 0 or greater'),
  ],
};

// Alias for convenience
export const walletSchema = walletValidationSchema;

// =====================================
// PROFILE VALIDATION
// =====================================

export interface ProfileFormValues {
  fullName: string;
  phone: string;
  bio: string;
}

export const profileValidationSchema = {
  fullName: [
    validators.required('Full name is required'),
    validators.minLength(2, 'Name must be at least 2 characters'),
    validators.maxLength(100, 'Name must be at most 100 characters'),
  ],
  phone: [
    validators.phone('Please enter a valid phone number'),
  ],
  bio: [
    validators.maxLength(500, 'Bio must be at most 500 characters'),
  ],
};

// =====================================
// USE FORM VALIDATION HOOK
// =====================================

import { useState, useCallback } from 'react';

export interface UseFormOptions<T> {
  initialValues: T;
  schema?: { [K in keyof T]?: Validator<T[K]>[] };
  validationSchema?: { [K in keyof T]?: Validator<T[K]>[] }; // Alias for schema
  onSubmit: (values: T) => Promise<void> | void;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  
  // Actions
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void; // Alias for setValue
  setValues: (values: Partial<T>) => void;
  setError: <K extends keyof T>(field: K, error: string | null) => void;
  setTouched: <K extends keyof T>(field: K, touched?: boolean) => void;
  setFieldTouched: <K extends keyof T>(field: K, touched?: boolean) => void; // Alias for setTouched
  setSubmitting: (submitting: boolean) => void;
  validateField: <K extends keyof T>(field: K) => string | null;
  validate: () => ValidationResult<T>;
  handleSubmit: () => Promise<void>;
  reset: (newValues?: T) => void;
  resetForm: (newValues?: T) => void; // Alias for reset
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  schema,
  validationSchema,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  // Support both schema and validationSchema (alias)
  const activeSchema = schema || validationSchema;
  
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Clear error when value changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
    setIsDirty(true);
  }, []);

  const setError = useCallback(<K extends keyof T>(field: K, error: string | null) => {
    setErrors(prev => ({ ...prev, [field]: error ?? undefined }));
  }, []);

  const setTouched = useCallback(<K extends keyof T>(field: K, isTouched = true) => {
    setTouchedState(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  const validateFieldValue = useCallback(<K extends keyof T>(field: K): string | null => {
    const fieldValidators = activeSchema?.[field];
    if (!fieldValidators) return null;
    
    const error = validateField(values[field], fieldValidators, values as Record<string, any>);
    setErrors(prev => ({ ...prev, [field]: error ?? undefined }));
    return error;
  }, [activeSchema, values]);

  const validate = useCallback((): ValidationResult<T> => {
    const result = validateForm(values, activeSchema || {});
    setErrors(result.errors);
    // Mark all fields as touched
    const allTouched = Object.keys(activeSchema || {}).reduce((acc, key) => {
      acc[key as keyof T] = true;
      return acc;
    }, {} as Partial<Record<keyof T, boolean>>);
    setTouchedState(allTouched);
    return result;
  }, [activeSchema, values]);

  const handleSubmit = useCallback(async () => {
    const result = validate();
    if (!result.isValid) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, onSubmit, values]);

  const reset = useCallback((newValues?: T) => {
    setValuesState(newValues ?? initialValues);
    setErrors({});
    setTouchedState({});
    setIsDirty(false);
  }, [initialValues]);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  const isValid = Object.values(errors).every(e => !e);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    setValue,
    setFieldValue: setValue, // Alias for setValue
    setValues,
    setError,
    setTouched,
    setFieldTouched: setTouched, // Alias for setTouched
    setSubmitting,
    validateField: validateFieldValue,
    validate,
    handleSubmit,
    reset,
    resetForm: reset, // Alias for reset
  };
}
