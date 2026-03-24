/**
 * Sync Status UI Components
 * 
 * Visual indicators for:
 * - Pending sync items (clock icon)
 * - Sync in progress (animated)
 * - Offline state
 * - Item pending state
 * 
 * @module components/ui/SyncStatus
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { tokens } from '../../theme/tokens';
import { useSyncStatus } from '../../hooks/useResilientMutation';
import { useIsOnline } from '../../system/networkMonitor';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeColors } from '../../theme/colors';

// =====================================
// SYNC STATUS BADGE
// =====================================

interface SyncStatusBadgeProps {
  /**
   * Position style to override
   */
  style?: object;
  
  /**
   * Whether to show count
   */
  showCount?: boolean;
}

/**
 * Badge showing sync queue status
 * Shows when there are pending items or when syncing
 */
export function SyncStatusBadge({ 
  style, 
  showCount = true 
}: SyncStatusBadgeProps): React.ReactElement | null {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const { pendingCount, isProcessing } = useSyncStatus();
  const isOnline = useIsOnline();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Rotate animation while processing
  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isProcessing, rotateAnim]);

  // Don't show if nothing pending
  if (pendingCount === 0 && !isProcessing) {
    return null;
  }

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.badge, themedStyles.badge, style]}>
      <Animated.Text 
        style={[
          styles.badgeIcon,
          isProcessing && { transform: [{ rotate }] },
        ]}
      >
        {isProcessing ? '🔄' : '🕐'}
      </Animated.Text>
      {showCount && pendingCount > 0 && (
        <Text style={[styles.badgeCount, themedStyles.badgeCount]}>{pendingCount}</Text>
      )}
      {!isOnline && (
        <Text style={[styles.offlineText, themedStyles.offlineText]}>Offline</Text>
      )}
    </View>
  );
}

// =====================================
// PENDING INDICATOR
// =====================================

interface PendingIndicatorProps {
  /**
   * Whether item is pending sync
   */
  isPending: boolean;
  
  /**
   * Size variant
   */
  size?: 'small' | 'medium';
}

/**
 * Small indicator for individual items that are pending sync
 */
export function PendingIndicator({ 
  isPending, 
  size = 'small' 
}: PendingIndicatorProps): React.ReactElement | null {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPending) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isPending, pulseAnim]);

  if (!isPending) return null;

  const iconSize = size === 'small' ? 12 : 16;

  return (
    <Animated.View 
      style={[
        styles.pendingIndicator,
        { opacity: pulseAnim },
      ]}
    >
      <Text style={{ fontSize: iconSize }}>🕐</Text>
    </Animated.View>
  );
}

// =====================================
// OFFLINE BANNER
// =====================================

/**
 * Full-width banner showing offline state
 */
export function OfflineBanner(): React.ReactElement | null {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const isOnline = useIsOnline();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOnline ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  if (isOnline) return null;

  return (
    <Animated.View 
      style={[
        styles.offlineBanner,
        themedStyles.offlineBanner,
        { transform: [{ translateY }] },
      ]}
    >
      <Text style={[styles.offlineBannerText, themedStyles.offlineBannerText]}>
        📶 You're offline. Changes will sync when connected.
      </Text>
    </Animated.View>
  );
}

// =====================================
// ERROR ROLLBACK BANNER
// =====================================

interface RollbackBannerProps {
  message: string;
  visible: boolean;
  onDismiss?: () => void;
}

/**
 * Animated banner shown after a rollback
 */
export function RollbackBanner({ 
  message, 
  visible,
  onDismiss,
}: RollbackBannerProps): React.ReactElement | null {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss?.();
        });
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible, slideAnim, opacityAnim, onDismiss]);

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 0],
  });

  return (
    <Animated.View 
      style={[
        styles.rollbackBanner,
        themedStyles.rollbackBanner,
        { 
          transform: [{ translateY }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Text style={[styles.rollbackBannerText, themedStyles.rollbackBannerText]}>⚠️ {message}</Text>
    </Animated.View>
  );
}

// =====================================
// THEMED STYLES
// =====================================

const getThemedStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    badge: {
      backgroundColor: colors.accent,
    },
    badgeCount: {
      color: colors.primary,
    },
    offlineText: {
      color: colors.warning,
    },
    offlineBanner: {
      backgroundColor: colors.warning,
    },
    offlineBannerText: {
      color: colors.textOnPrimary,
    },
    rollbackBanner: {
      backgroundColor: colors.error,
    },
    rollbackBannerText: {
      color: colors.textOnPrimary,
    },
  });

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.borderRadius.sm,
    gap: 4,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  pendingIndicator: {
    marginLeft: 4,
  },
  offlineBanner: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  offlineBannerText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  rollbackBanner: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    marginHorizontal: tokens.spacing.md,
    marginVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.sm,
  },
  rollbackBannerText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default {
  SyncStatusBadge,
  PendingIndicator,
  OfflineBanner,
  RollbackBanner,
};
