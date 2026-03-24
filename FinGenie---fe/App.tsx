/**
 * FinGenie App Root
 * 
 * Features:
 * - Hardened QueryClient with auth error handling
 * - Auth lifecycle integration
 * - Global error boundaries
 * - Offline sync queue
 * - Network monitoring
 * - Correlation ID tracking
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation';
import { logoutAndResetApp, isLogoutInProgress } from './src/utils/authLifecycle';
import { AppErrorBoundary } from './src/system/AppErrorBoundary';
import { initializeSystem, setDeviceInfo, useCorrelationStore } from './src/system';
import { globalQueryErrorHandler } from './src/system/errorClassifier';
import { OfflineBanner } from './src/components/ui/SyncStatus';
import { ErrorPopupManager } from './src/components/system/ErrorPopupManager';
import type { ApiError } from './src/api/client';
// Initialize resilient client interceptors (side effect import)
import './src/api/resilientClient';

/**
 * Create hardened QueryClient with bank-grade error handling
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // =====================================
        // RETRY CONFIGURATION
        // =====================================
        
        // Don't retry on auth errors (401/403) - interceptor handles those
        retry: (failureCount, error) => {
          const apiError = error as ApiError;
          
          // Never retry auth errors
          if (apiError.status === 401 || apiError.status === 403) {
            return false;
          }
          
          // Never retry rate limits
          if (apiError.status === 429) {
            return false;
          }
          
          // Retry network errors up to 2 times
          if (apiError.isNetworkError) {
            return failureCount < 2;
          }
          
          // Default: no retry
          return false;
        },
        
        // =====================================
        // STALE/CACHE CONFIGURATION
        // =====================================
        
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        
        // =====================================
        // REFETCH CONFIGURATION
        // =====================================
        
        refetchOnWindowFocus: false, // Prevent excessive refetches
        refetchOnReconnect: true, // Refetch when network reconnects
        refetchOnMount: true,
      },
      
      mutations: {
        // Don't retry mutations
        retry: false,
        
        // Global mutation error handler - dispatch to popup system
        onError: (error) => {
          const apiError = error as ApiError;
          
          // Dispatch to global error popup system
          globalQueryErrorHandler(apiError);
          
          // Handle auth errors in mutations
          if (apiError.status === 401 && !isLogoutInProgress()) {
            // The interceptor should handle this, but double-check
            console.warn('[QueryClient] Unhandled 401 in mutation');
          }
        },
      },
    },
  });
}

export default function App() {
  // Create stable QueryClient instance
  const queryClient = useMemo(() => createQueryClient(), []);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Initialize system modules on mount
  useEffect(() => {
    // Set device info for support context
    setDeviceInfo({
      platform: Platform.OS,
      version: Platform.Version ? Platform.Version.toString() : 'unknown',
      appVersion: Constants.expoConfig?.version ?? '1.0.0',
    });

    // Initialize system (network monitor, sync queue)
    initializeSystem().catch((error) => {
      if (__DEV__) {
        console.warn('[App] System initialization degraded:', error);
      }
    });
  }, []);

  // Navigation handlers for error boundary
  const handleNavigateToSupport = (context: any) => {
    if (navigationRef.current) {
      navigationRef.current.navigate('Support', {
        screen: 'SupportChat',
        params: { context },
      });
    }
  };

  const handleNavigateToHome = () => {
    if (navigationRef.current) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'Home' } }],
      });
    }
  };

  return (
    <SafeAreaProvider>
      <AppErrorBoundary
        onNavigateToSupport={handleNavigateToSupport}
        onNavigateToHome={handleNavigateToHome}
      >
        <QueryClientProvider client={queryClient}>
          <OfflineBanner />
          <ErrorPopupManager />
          <RootNavigator queryClient={queryClient} navigationRef={navigationRef} />
          <StatusBar style="dark" />
        </QueryClientProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
