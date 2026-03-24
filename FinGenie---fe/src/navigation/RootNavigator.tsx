/**
 * Root Navigator - Bank-Grade Session Management
 * 
 * Features:
 * - Secure auth initialization
 * - Navigation reset for logout
 * - Auth lifecycle hooks integration
 * - Session state handling
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NavigationContainer, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, View, ActivityIndicator, StyleSheet, Pressable, Text, Linking } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import type { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { MandatorySurveyNavigator } from './MandatorySurveyNavigator';
import { authStore, themeStore } from '../store';
import { useThemeStore } from '../store/themeStore';
import { useAuthLifecycle, useAuthLogout } from '../hooks';
import { useSurveyStatus } from '../hooks/useBehaviorSurvey';
import { useI18n } from '../i18n/useI18n';
import { tokens } from '../theme';
import { getLogoutMessage } from '../utils/authLifecycle';
import { parseBillingReturnUrl, type BillingReturnRouteParams } from '../utils/billingReturn';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  queryClient: QueryClient;
  /** External navigation ref for error boundary integration */
  navigationRef?: React.RefObject<NavigationContainerRef<RootStackParamList>>;
}

export function RootNavigator({ queryClient, navigationRef: externalNavRef }: RootNavigatorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const internalNavRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const pendingBillingReturnRef = useRef<BillingReturnRouteParams | null>(null);
  
  // Use external ref if provided, otherwise use internal
  const navigationRef = externalNavRef ?? internalNavRef;
  
  // Auth state
  const isAuthenticated = authStore((state) => state.isAuthenticated);
  const initialize = authStore((state) => state.initialize);
  const lastLogoutReason = authStore((state) => state.lastLogoutReason);
  
  // Theme
  const isDark = themeStore((state) => state.isDark);
  const { colors } = useThemeStore();

  /**
   * Navigation reset function for global logout
   * This resets the navigation stack to the Auth screen
   */
  const resetNavigation = useCallback(() => {
    if (navigationRef.current) {
      navigationRef.current.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        })
      );
    }
  }, []);

  /**
   * Initialize auth system on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize auth store with dependencies
        await initialize(queryClient, resetNavigation);
        console.log('[RootNavigator] Auth system initialized');
      } catch (error) {
        console.error('[RootNavigator] Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [initialize, queryClient, resetNavigation]);

  /**
   * Show logout message when logged out
   */
  useEffect(() => {
    if (lastLogoutReason && lastLogoutReason !== 'user_initiated') {
      const message = getLogoutMessage(lastLogoutReason);
      // In a real app, show this in a Toast or Alert
      console.log('[RootNavigator] Logout reason:', message);
    }
  }, [lastLogoutReason]);

  const routeBillingReturn = useCallback((params: BillingReturnRouteParams) => {
    if (!navigationRef.current?.isReady()) {
      pendingBillingReturnRef.current = params;
      return;
    }

    navigationRef.current.navigate('App', {
      screen: 'CheckoutResult',
      params,
    });
  }, [navigationRef]);

  useEffect(() => {
    if (!isAuthenticated) {
      pendingBillingReturnRef.current = null;
      return;
    }

    Linking.getInitialURL()
      .then((url) => {
        const params = parseBillingReturnUrl(url);
        if (params) {
          routeBillingReturn(params);
        }
      })
      .catch(() => {
        // Ignore missing initial URL.
      });
  }, [isAuthenticated, routeBillingReturn]);

  useEffect(() => {
    if (!isAuthenticated || !isNavigationReady || !pendingBillingReturnRef.current) {
      return;
    }

    const params = pendingBillingReturnRef.current;
    pendingBillingReturnRef.current = null;
    routeBillingReturn(params);
  }, [isAuthenticated, isNavigationReady, routeBillingReturn]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={() => setIsNavigationReady(true)}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="App" component={AppNavigatorWithAuth} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * Wrapper component that adds auth lifecycle hooks
 * Only active when authenticated
 */
function AppNavigatorWithAuth() {
  // Enable all auth lifecycle features:
  // - Background token refresh
  // - Session heartbeat
  // - Multi-tab sync
  useAuthLifecycle();

  const { colors } = useThemeStore();
  const { t } = useI18n();
  const { logout } = useAuthLogout();
  const {
    data: surveyStatus,
    isLoading: isSurveyStatusLoading,
    isError: isSurveyStatusError,
    refetch: refetchSurveyStatus,
  } = useSurveyStatus();

  if (isSurveyStatusLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (isSurveyStatusError || !surveyStatus) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.stateText, { color: colors.error }]}>{t('common.loadingError')}</Text>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            void refetchSurveyStatus();
          }}
        >
          <Text style={[styles.primaryButtonLabel, { color: colors.textOnPrimary ?? colors.text }]}>
            {t('common.retry')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
          onPress={() => {
            void logout('user_initiated');
          }}
        >
          <Text style={[styles.secondaryButtonLabel, { color: colors.text }]}>{t('auth.logout')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!surveyStatus.hasCompletedSurvey) {
    return <MandatorySurveyNavigator />;
  }

  return <AppNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
  },
  stateText: {
    fontSize: tokens.typography.fontSizes.sm,
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
  },
  primaryButtonLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  secondaryButton: {
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
  },
  secondaryButtonLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
