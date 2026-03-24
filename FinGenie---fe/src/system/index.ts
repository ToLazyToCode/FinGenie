import {
  initializeNotificationRuntime as initializeNotificationRuntimeInternal,
  setNotificationPreference as setNotificationPreferenceInternal,
  teardownNotificationRuntime as teardownNotificationRuntimeInternal,
} from './notificationRuntime';

/**
 * System Module Index
 * 
 * Exports all resilience and system infrastructure components
 * 
 * @module system
 */

// Error Boundary
export { 
  AppErrorBoundary, 
  AppErrorBoundaryWithNavigation 
} from './AppErrorBoundary';

// Correlation ID Store
export { 
  useCorrelationStore, 
  extractCorrelationId,
  setDeviceInfo,
  type ErrorContext,
  type SupportContext,
  type DeviceInfo,
} from './correlationStore';

// Sync Queue
export { 
  syncQueue, 
  registerMutationType,
  type SyncTask,
  type SyncQueueState,
} from './syncQueue';

// Network Monitor
export { 
  networkMonitor, 
  useNetworkState, 
  useIsOnline,
  type NetworkState,
} from './networkMonitor';

// Error Store (Global error popup state)
export {
  useErrorStore,
  showError,
  showToast,
  showCriticalError,
  type PopupError,
  type ErrorSeverity,
} from './errorStore';

// Error Classifier (API error classification and dispatch)
export {
  classifyError,
  classifyAndDispatchError,
  globalQueryErrorHandler,
  type ClassifiedError,
} from './errorClassifier';

// Notifications runtime
export const initializeNotificationRuntime = initializeNotificationRuntimeInternal;
export const setNotificationPreference = setNotificationPreferenceInternal;
export const teardownNotificationRuntime = teardownNotificationRuntimeInternal;

/**
 * Initialize all system modules
 * Call this at app startup
 */
export async function initializeSystem(): Promise<void> {
  console.log('[System] Initializing...');
  
  // Initialize network monitor (triggers sync queue on reconnect)
  const { networkMonitor } = await import('./networkMonitor');
  await networkMonitor.initialize();
  
  // Initialize sync queue
  const { syncQueue } = await import('./syncQueue');
  await syncQueue.initialize();

  // Initialize notification listeners foundation (no permission prompt here)
  try {
    await initializeNotificationRuntimeInternal();
  } catch (error) {
    if (__DEV__) {
      console.warn('[System] Notification runtime degraded during initialization.', error);
    }
  }
  
  console.log('[System] Initialization complete');
}
