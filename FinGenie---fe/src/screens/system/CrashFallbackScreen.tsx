/**
 * Crash Fallback Screen
 * 
 * Displayed when the React tree crashes. Provides:
 * - Friendly error message
 * - Correlation ID display
 * - App version info
 * - Recovery options (Retry, Report, Go Home)
 * 
 * @module screens/system/CrashFallbackScreen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  ScrollView,
} from 'react-native';
import { tokens } from '../../theme/tokens';
import { useCorrelationStore, SupportContext } from '../../system/correlationStore';

// =====================================
// TYPES
// =====================================

export interface CrashFallbackProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  correlationId?: string | null;
  onRetry: () => void;
  onReportIssue: (context: SupportContext) => void;
  onGoHome: () => void;
}

// =====================================
// APP VERSION (should be injected from app config)
// =====================================

const APP_VERSION = '1.0.0';

// =====================================
// COMPONENT
// =====================================

export function CrashFallbackScreen({
  error,
  errorInfo,
  correlationId,
  onRetry,
  onReportIssue,
  onGoHome,
}: CrashFallbackProps): React.ReactElement {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const getErrorContextForSupport = useCorrelationStore((s) => s.getErrorContextForSupport);

  React.useEffect(() => {
    // Fade in animation - no flash
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleReportIssue = () => {
    const context = getErrorContextForSupport();
    onReportIssue({
      ...context,
      correlationId: correlationId ?? context.correlationId,
      errorMessage: error.message,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚠️</Text>
        </View>

        {/* Main Message */}
        <Text style={styles.title}>Oops! Something went wrong</Text>
        <Text style={styles.subtitle}>
          We're sorry for the inconvenience. The app encountered an unexpected error.
        </Text>

        {/* Error Details (collapsible) */}
        <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Error</Text>
            <Text style={styles.detailValue} numberOfLines={3}>
              {error.message}
            </Text>
          </View>

          {correlationId && (
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Reference ID</Text>
              <Text style={styles.correlationId} selectable>
                {correlationId}
              </Text>
            </View>
          )}

          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>App Version</Text>
            <Text style={styles.detailValue}>{APP_VERSION}</Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Primary: Retry */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>🔄 Try Again</Text>
          </TouchableOpacity>

          {/* Secondary: Report Issue */}
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleReportIssue}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>📝 Report Issue</Text>
          </TouchableOpacity>

          {/* Tertiary: Go Home */}
          <TouchableOpacity
            style={[styles.button, styles.tertiaryButton]}
            onPress={onGoHome}
            activeOpacity={0.8}
          >
            <Text style={styles.tertiaryButtonText}>🏠 Go to Home</Text>
          </TouchableOpacity>
        </View>

        {/* Help Text */}
        <Text style={styles.helpText}>
          If this problem persists, please contact support with the Reference ID above.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: tokens.colors.text,
    textAlign: 'center',
    marginBottom: tokens.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
    marginBottom: tokens.spacing.lg,
    lineHeight: 24,
  },
  detailsContainer: {
    width: '100%',
    maxHeight: 200,
    marginBottom: tokens.spacing.lg,
  },
  detailCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: tokens.colors.text,
  },
  correlationId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: tokens.colors.primary,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: '100%',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  button: {
    width: '100%',
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: tokens.colors.primary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: tokens.colors.primary,
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: tokens.colors.textSecondary,
  },
  helpText: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
});

export default CrashFallbackScreen;
