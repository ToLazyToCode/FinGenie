import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';
import { icons, images } from '../../constants/assets';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expense: number;
  summaryText?: string;
  onPress?: () => void;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function BalanceCard({ totalBalance, income, expense, summaryText, onPress }: BalanceCardProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const petFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, damping: 12, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, totalBalance, income, expense]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(petFloat, { toValue: -4, duration: 1300, useNativeDriver: true }),
        Animated.timing(petFloat, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [petFloat]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <AnimatedGradient
        colors={tokens.gradients.balanceCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { opacity, transform: [{ translateY }] }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.label}>Total Balance</Text>
          <Animated.View style={{ transform: [{ translateY: petFloat }] }}>
            <Image source={images.geniePet} style={styles.petImage} resizeMode="contain" />
          </Animated.View>
        </View>
        <Text style={[styles.balanceValue, themedStyles.balanceValue]}>VND {formatAmount(totalBalance)}</Text>
        {summaryText ? (
          <View style={styles.summaryBubble}>
            <Text style={styles.summaryText} numberOfLines={2}>
              {summaryText}
            </Text>
          </View>
        ) : null}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Image source={icons.incomePlus} style={[styles.pillIcon, themedStyles.pillIcon]} resizeMode="contain" />
            <View>
              <Text style={styles.pillLabel}>Income</Text>
              <Text style={[styles.pillValue, themedStyles.pillValue]}>VND {formatAmount(income)}</Text>
            </View>
          </View>
          <View style={styles.statPill}>
            <Image source={icons.expenseMinus} style={[styles.pillIcon, themedStyles.pillIcon]} resizeMode="contain" />
            <View>
              <Text style={styles.pillLabel}>Expense</Text>
              <Text style={[styles.pillValue, themedStyles.pillValue]}>VND {formatAmount(expense)}</Text>
            </View>
          </View>
        </View>
      </AnimatedGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: tokens.spacing.lg,
    borderRadius: 24,
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.995 }],
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  label: {
    fontSize: tokens.typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  petImage: {
    width: 46,
    height: 46,
  },
  summaryBubble: {
    marginBottom: tokens.spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    maxWidth: '86%',
  },
  summaryText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 18,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: tokens.borderRadius.lg,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
  pillIcon: {
    width: 24,
    height: 24,
  },
  pillLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  pillValue: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    balanceValue: {
      color: colors.textOnPrimary,
    },
    pillIcon: {
      tintColor: colors.textOnPrimary,
    },
    pillValue: {
      color: colors.textOnPrimary,
    },
  });
