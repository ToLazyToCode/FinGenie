/**
 * Skeleton Components
 * 
 * Loading placeholders with shimmer animation
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { themeStore } from '../../store';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { colors, isDark } = themeStore();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? colors.surfaceElevated : colors.backgroundSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Card Skeleton
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const { colors } = themeStore();
  
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, style]}>
      <Skeleton width={120} height={14} />
      <Skeleton width="80%" height={24} style={{ marginTop: 8 }} />
      <Skeleton width="60%" height={14} style={{ marginTop: 12 }} />
    </View>
  );
}

// Wallet Card Skeleton
export function SkeletonWalletCard() {
  const { colors } = themeStore();
  
  return (
    <View style={[styles.walletCard, { backgroundColor: colors.surface }]}>
      <View style={styles.walletHeader}>
        <Skeleton width={100} height={18} />
        <Skeleton width={50} height={20} borderRadius={10} />
      </View>
      <Skeleton width={80} height={14} style={{ marginTop: 8 }} />
      <Skeleton width={140} height={28} style={{ marginTop: 12 }} />
    </View>
  );
}

// List Item Skeleton
export function SkeletonListItem() {
  const { colors } = themeStore();
  
  return (
    <View style={[styles.listItem, { backgroundColor: colors.surface }]}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.listItemContent}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: 4 }} />
      </View>
      <Skeleton width={80} height={18} />
    </View>
  );
}

// Transaction List Skeleton
export function SkeletonTransactionList({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  );
}

// Wallet List Skeleton
export function SkeletonWalletList({ count = 2 }: { count?: number }) {
  return (
    <View style={styles.walletList}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonWalletCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: 'rgba(173,70,255,0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  walletCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: 'rgba(173,70,255,0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletList: {},
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
});
