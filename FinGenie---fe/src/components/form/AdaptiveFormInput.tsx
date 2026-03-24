/**
 * Adaptive Form Input
 * 
 * FormInput wrapper with built-in adaptive validation:
 * - Soft validation while typing (hints only)
 * - Medium validation on blur (warnings)
 * - Strict validation on submit (errors)
 * - Async server validation with debouncing
 * 
 * PREVENTS:
 * - Aggressive red errors while typing
 * - Flicker from rapid validation
 * - Race conditions from async validation
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, NativeSyntheticEvent, TextInputFocusEventData } from 'react-native';
import { FormInput, FormInputProps } from './FormInput';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeColors } from '../../theme/colors';
import { tokens } from '../../theme';
import {
  AdaptiveValidationConfig,
  ValidationStrictness,
  validateAdaptive,
  useAdaptiveField,
} from '../../utils/adaptiveValidation';
import { useDebouncedValidation, ValidationStatus } from '../../hooks/useDebouncedValidation';

// =====================================
// TYPES
// =====================================

export interface AdaptiveFormInputProps extends Omit<FormInputProps, 'error'> {
  /** Adaptive validation configuration */
  adaptiveConfig?: AdaptiveValidationConfig;
  /** Async validation endpoint (e.g., '/validate/email') */
  asyncEndpoint?: string;
  /** Field name for async validation request body */
  asyncFieldName?: string;
  /** Async validation debounce delay (ms) */
  asyncDelay?: number;
  /** Show async validation status indicator */
  showAsyncStatus?: boolean;
  /** External error (e.g., from form-level validation) */
  error?: string | null;
  /** External hint (soft feedback) */
  hint?: string | null;
  /** External warning (medium feedback) */
  warning?: string | null;
  /** Whether field has been touched */
  touched?: boolean;
  /** Callback when async validation completes */
  onAsyncValidate?: (result: { valid: boolean; message: string }) => void;
}

// =====================================
// VALIDATION STATUS INDICATOR
// =====================================

interface ValidationStatusIndicatorProps {
  status: ValidationStatus;
  colors: any;
}

function ValidationStatusIndicator({ status, colors }: ValidationStatusIndicatorProps) {
  if (status === 'idle') return null;

  const statusConfig = {
    validating: { text: 'Checking...', color: colors.textMuted },
    valid: { text: '✓ Available', color: colors.success },
    invalid: { text: '', color: colors.error }, // Message shown separately
    'rate-limited': { text: 'Too many attempts', color: colors.warning },
  };

  const config = statusConfig[status];
  if (!config.text) return null;

  return (
    <Text style={[styles.statusText, { color: config.color }]}>
      {config.text}
    </Text>
  );
}

// =====================================
// ADAPTIVE FORM INPUT COMPONENT
// =====================================

export function AdaptiveFormInput({
  adaptiveConfig,
  asyncEndpoint,
  asyncFieldName,
  asyncDelay = 500,
  showAsyncStatus = true,
  error: externalError,
  hint: externalHint,
  warning: externalWarning,
  touched = false,
  onAsyncValidate,
  onChangeText,
  onBlur,
  value,
  ...restProps
}: AdaptiveFormInputProps) {
  const { colors } = useThemeStore();
  const themedStyles = useMemo(() => getThemedStyles(colors), [colors]);

  // Async validation (if configured)
  const asyncValidation = useDebouncedValidation(
    asyncEndpoint ?? '',
    asyncFieldName ?? '',
    {
      delay: asyncDelay,
      minLength: 3,
      onValidationComplete: (result) => {
        if (result && onAsyncValidate) {
          onAsyncValidate({ valid: result.valid, message: result.message });
        }
      },
    }
  );

  // Track internal validation state
  const [internalState, setInternalState] = React.useState({
    hint: null as string | null,
    warning: null as string | null,
    error: null as string | null,
  });

  /**
   * Handle text change with soft validation
   */
  const handleChangeText = useCallback((text: string) => {
    // Run soft validation if config provided
    if (adaptiveConfig) {
      const result = validateAdaptive(text, adaptiveConfig, 'soft');
      setInternalState(prev => ({
        ...prev,
        hint: result.hint,
        error: null, // Clear error while typing
        warning: null,
      }));
    }

    // Trigger async validation if endpoint configured
    if (asyncEndpoint) {
      asyncValidation.validate(text);
    }

    // Call parent handler
    onChangeText?.(text);
  }, [adaptiveConfig, asyncEndpoint, asyncValidation, onChangeText]);

  /**
   * Handle blur with medium validation
   */
  const handleBlur = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    // Run medium validation if config provided
    if (adaptiveConfig && value) {
      const result = validateAdaptive(value, adaptiveConfig, 'medium');
      setInternalState(prev => ({
        ...prev,
        hint: null, // Clear hint on blur
        warning: result.warning,
        error: result.error,
      }));
    }

    // Call parent handler
    onBlur?.(e);
  }, [adaptiveConfig, value, onBlur]);

  // Determine what to display
  // Priority: external error > async error > internal error > warning > hint
  const displayError = externalError || 
    (asyncValidation.status === 'invalid' ? asyncValidation.error : null) ||
    (touched ? internalState.error : null);
  
  const displayWarning = !displayError && (externalWarning || internalState.warning);
  const displayHint = !displayError && !displayWarning && (externalHint || internalState.hint);

  // Show feedback only in appropriate states
  const showError = touched && displayError;
  const showWarning = touched && displayWarning;
  const showHint = !touched && displayHint;

  return (
    <View style={styles.container}>
      <FormInput
        {...restProps}
        value={value}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        error={showError ? displayError : undefined}
      />

      {/* Hint (while typing, before blur) */}
      {showHint && (
        <Text style={[styles.hintText, { color: colors.textMuted }]}>
          {displayHint}
        </Text>
      )}

      {/* Warning (after blur, less severe than error) */}
      {showWarning && (
        <Text style={[styles.warningText, { color: colors.warning }]}>
          {displayWarning}
        </Text>
      )}

      {/* Async validation status */}
      {showAsyncStatus && asyncEndpoint && (
        <View style={styles.asyncStatus}>
          <ValidationStatusIndicator 
            status={asyncValidation.status} 
            colors={colors} 
          />
        </View>
      )}
    </View>
  );
}

// =====================================
// EMAIL INPUT WITH VALIDATION
// =====================================

export interface EmailInputProps extends Omit<AdaptiveFormInputProps, 'asyncEndpoint' | 'asyncFieldName' | 'adaptiveConfig'> {
  /** Enable server-side email validation */
  validateOnServer?: boolean;
}

/**
 * Pre-configured email input with adaptive + async validation
 */
export function EmailInput({
  validateOnServer = true,
  placeholder = 'Enter your email',
  label = 'Email',
  ...props
}: EmailInputProps) {
  return (
    <AdaptiveFormInput
      {...props}
      label={label}
      placeholder={placeholder}
      keyboardType="email-address"
      autoCapitalize="none"
      autoComplete="email"
      adaptiveConfig={{
        soft: [() => null], // No error while typing
        medium: [
          (v: string) => !v?.includes('@') ? 'Email should contain @' : null,
        ],
        strict: [
          (v: string) => !v ? 'Email is required' : null,
          (v: string) => {
            if (!v) return null;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(v) ? null : 'Please enter a valid email';
          },
        ],
      }}
      asyncEndpoint={validateOnServer ? '/validate/email' : undefined}
      asyncFieldName="email"
    />
  );
}

// =====================================
// USERNAME INPUT WITH VALIDATION
// =====================================

export interface UsernameInputProps extends Omit<AdaptiveFormInputProps, 'asyncEndpoint' | 'asyncFieldName' | 'adaptiveConfig'> {
  /** Enable server-side username validation */
  validateOnServer?: boolean;
}

/**
 * Pre-configured username input with adaptive + async validation
 */
export function UsernameInput({
  validateOnServer = true,
  placeholder = 'Enter username',
  label = 'Username',
  ...props
}: UsernameInputProps) {
  return (
    <AdaptiveFormInput
      {...props}
      label={label}
      placeholder={placeholder}
      autoCapitalize="none"
      autoComplete="username"
      adaptiveConfig={{
        soft: [() => null],
        medium: [
          (v: string) => {
            if (!v) return null;
            if (v.length < 3) return 'Username must be at least 3 characters';
            if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Only letters, numbers, and underscores';
            return null;
          },
        ],
        strict: [
          (v: string) => !v ? 'Username is required' : null,
          (v: string) => v && v.length < 3 ? 'Username must be at least 3 characters' : null,
          (v: string) => v && v.length > 30 ? 'Username must be at most 30 characters' : null,
          (v: string) => v && !/^[a-zA-Z0-9_]+$/.test(v) 
            ? 'Only letters, numbers, and underscores allowed' 
            : null,
        ],
      }}
      asyncEndpoint={validateOnServer ? '/validate/username' : undefined}
      asyncFieldName="username"
    />
  );
}

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  container: {
    // Wrapper doesn't add margin - FormInput handles that
  },
  hintText: {
    fontSize: tokens.typography.fontSizes.xs,
    marginTop: tokens.spacing.xs,
    marginLeft: tokens.spacing.xs,
  },
  warningText: {
    fontSize: tokens.typography.fontSizes.xs,
    marginTop: tokens.spacing.xs,
    marginLeft: tokens.spacing.xs,
  },
  asyncStatus: {
    marginTop: tokens.spacing.xs,
    marginLeft: tokens.spacing.xs,
  },
  statusText: {
    fontSize: tokens.typography.fontSizes.xs,
  },
});

/**
 * Get themed styles based on current color scheme
 */
function getThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({});
}

export default AdaptiveFormInput;
