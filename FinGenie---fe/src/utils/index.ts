// Formatting utilities
export { formatCurrency, formatDate, formatRelativeDate } from './format';

// Auth utilities
export {
  secureStorage,
  STORAGE_KEYS,
} from './secureStorage';

export {
  decodeJwtPayload,
  getTokenExpiration,
  isTokenExpired,
  getTimeUntilExpiration,
  getRefreshTime,
  getTokenDebugInfo,
  AUTH_ERROR_CODES,
  isTokenRevokedError,
  shouldNotLogout,
} from './tokenUtils';
export type { AuthErrorCode } from './tokenUtils';

export {
  logoutAndResetApp,
  isLogoutInProgress,
  subscribeToAuthEvents,
  initAuthLifecycle,
  initMultiTabSync,
  broadcastLogout,
  startHeartbeat,
  stopHeartbeat,
  scheduleTokenRefresh,
  stopAutoRefresh,
  getLogoutMessage,
} from './authLifecycle';
export type { SessionState, AuthEvent, LogoutReason } from './authLifecycle';

// Error handling
export {
  classifyAndDispatchError,
  showErrorAlert,
  getErrorMessage,
} from './errorHandling';
export type { ErrorHandlingOptions } from './errorHandling';
