/**
 * Error Handling Utilities
 * 
 * Wrapper around system error classifier with additional options
 * for screen-level error handling (alerts, custom messages).
 */

import { Alert } from 'react-native';
import { AxiosError } from 'axios';
import { classifyAndDispatchError as systemClassifyError } from '../system/errorClassifier';

export interface ErrorHandlingOptions {
  /** Show an alert dialog to the user */
  showAlert?: boolean;
  /** Custom title for the alert */
  alertTitle?: string;
  /** Custom message (overrides classified message) */
  alertMessage?: string;
  /** Whether to suppress the global error popup */
  suppressPopup?: boolean;
  /** Callback after error is handled */
  onHandled?: (error: Error | AxiosError) => void;
}

/**
 * Classify and dispatch error with additional UI options
 * 
 * This wrapper adds screen-level error handling capabilities
 * on top of the global error classification system.
 */
export function classifyAndDispatchError(
  error: unknown,
  options: ErrorHandlingOptions = {}
): void {
  const {
    showAlert = false,
    alertTitle = 'Error',
    alertMessage,
    onHandled,
  } = options;

  // Ensure error is Error type
  const errorObj = error instanceof Error 
    ? error 
    : new Error(String(error));

  // Use system classifier
  const classified = systemClassifyError(errorObj as AxiosError | Error);

  // Show alert if requested
  if (showAlert) {
    const message = alertMessage || classified.message || 'An unexpected error occurred';
    Alert.alert(alertTitle, message, [{ text: 'OK' }]);
  }

  // Call handler if provided
  if (onHandled) {
    onHandled(errorObj);
  }
}

/**
 * Simple error alert helper
 */
export function showErrorAlert(
  title: string,
  message: string,
  onDismiss?: () => void
): void {
  Alert.alert(title, message, [
    { text: 'OK', onPress: onDismiss }
  ]);
}

/**
 * Extract user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message || 'Network error';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export default {
  classifyAndDispatchError,
  showErrorAlert,
  getErrorMessage,
};
