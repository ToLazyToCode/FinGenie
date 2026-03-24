/**
 * Error Popup Manager
 * 
 * Global error notification display component.
 * Mounted at App root level above navigation.
 * 
 * Features:
 * - Animated slide-down + fade
 * - Severity-based styling (critical/medium/minor)
 * - Auto-dismiss timers
 * - Correlation ID display
 * - Manual dismiss option
 * 
 * @module components/system/ErrorPopupManager
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../../theme/tokens';
import { useThemeStore } from '../../store/themeStore';
import { useErrorStore, PopupError, ErrorSeverity, dismissError } from '../../system/errorStore';

// =====================================
// CONSTANTS
// =====================================

const AUTO_DISMISS_TIMES: Record<ErrorSeverity, number> = {
  minor: 3000,    // 3 seconds
  medium: 5000,   // 5 seconds
  critical: 0,    // Manual dismiss only
};

const ANIMATION_DURATION = 300;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =====================================
// SEVERITY STYLES FACTORY
// =====================================

function getSeverityStyles(colors: ReturnType<typeof useThemeStore>['colors']) {
  return {
    minor: {
      backgroundColor: colors.surface,
      borderColor: colors.info,
      iconBackground: colors.info,
      icon: 'ℹ️',
    },
    medium: {
      backgroundColor: colors.surface,
      borderColor: colors.warning,
      iconBackground: colors.warning,
      icon: '⚠️',
    },
    critical: {
      backgroundColor: colors.surface,
      borderColor: colors.error,
      iconBackground: colors.error,
      icon: '🚨',
    },
  } as Record<ErrorSeverity, {
    backgroundColor: string;
    borderColor: string;
    iconBackground: string;
    icon: string;
  }>;
}

// =====================================
// SINGLE POPUP COMPONENT
// =====================================

interface ErrorPopupProps {
  error: PopupError;
  index: number;
  onDismiss: (id: string) => void;
  severityStyles: ReturnType<typeof getSeverityStyles>;
  colors: ReturnType<typeof useThemeStore>['colors'];
}

function ErrorPopup({ error, index, onDismiss, severityStyles, colors }: ErrorPopupProps): React.ReactElement {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimeout = useRef<NodeJS.Timeout | null>(null);
  const isDismissing = useRef(false);

  const severityStyle = severityStyles[error.severity];

  // Animate in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();

    // Set auto-dismiss timer
    const dismissTime = AUTO_DISMISS_TIMES[error.severity];
    if (dismissTime > 0) {
      dismissTimeout.current = setTimeout(() => {
        handleDismiss();
      }, dismissTime);
    }

    return () => {
      if (dismissTimeout.current) {
        clearTimeout(dismissTimeout.current);
      }
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;

    if (dismissTimeout.current) {
      clearTimeout(dismissTimeout.current);
    }

    // Animate out
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(error.id);
    });
  }, [error.id, onDismiss, translateY, opacity]);

  return (
    <Animated.View
      style={[
        styles.popup,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: severityStyle.backgroundColor,
          borderLeftColor: severityStyle.borderColor,
          marginTop: index > 0 ? 8 : 0,
        },
      ]}
    >
      <View style={styles.popupContent}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: severityStyle.iconBackground }]}>
          <Text style={styles.icon}>{severityStyle.icon}</Text>
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={[styles.message, { color: colors.text }]} numberOfLines={3}>
            {error.message}
          </Text>
          {error.correlationId && (
            <Text style={[styles.correlationId, { color: colors.textMuted }]} selectable>
              Ref: {error.correlationId}
            </Text>
          )}
        </View>

        {/* Dismiss button */}
        {error.dismissable && (
          <TouchableOpacity
            style={[styles.dismissButton, { backgroundColor: colors.overlay }]}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.dismissText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar for auto-dismiss */}
      {AUTO_DISMISS_TIMES[error.severity] > 0 && (
        <AutoDismissProgress 
          duration={AUTO_DISMISS_TIMES[error.severity]} 
          borderColor={severityStyle.borderColor}
        />
      )}
    </Animated.View>
  );
}

// =====================================
// AUTO DISMISS PROGRESS BAR
// =====================================

interface AutoDismissProgressProps {
  duration: number;
  borderColor: string;
}

function AutoDismissProgress({ duration, borderColor }: AutoDismissProgressProps): React.ReactElement {
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration,
      useNativeDriver: false, // Width animation needs native driver false
    }).start();
  }, [duration, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressContainer}>
      <Animated.View
        style={[
          styles.progressBar,
          { 
            width,
            backgroundColor: borderColor,
          },
        ]}
      />
    </View>
  );
}

// =====================================
// MAIN MANAGER COMPONENT
// =====================================

export function ErrorPopupManager(): React.ReactElement | null {
  const errors = useErrorStore((state) => state.errors);
  const { colors } = useThemeStore();
  const severityStyles = useMemo(() => getSeverityStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const handleDismiss = useCallback((id: string) => {
    dismissError(id);
  }, []);

  if (errors.length === 0) {
    return null;
  }

  return (
    <View 
      style={[
        styles.container, 
        { 
          top: insets.top + 10,
          paddingTop: Platform.OS === 'android' ? 10 : 0,
        }
      ]}
      pointerEvents="box-none"
    >
      {errors.map((error, index) => (
        <ErrorPopup
          key={error.id}
          error={error}
          index={index}
          onDismiss={handleDismiss}
          severityStyles={severityStyles}
          colors={colors}
        />
      ))}
    </View>
  );
}

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    paddingHorizontal: 16,
  },
  popup: {
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  popupContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
  },
  messageContainer: {
    flex: 1,
    paddingRight: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  correlationId: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  progressBar: {
    height: '100%',
  },
});

export default ErrorPopupManager;
