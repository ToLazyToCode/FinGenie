import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';

interface BalanceDisplayProps {
  amount: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  currency?: string;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function BalanceDisplay({
  amount,
  label,
  size = 'md',
  currency = '₫',
}: BalanceDisplayProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const sizeMap = {
    sm: tokens.typography.fontSizes.lg,
    md: tokens.typography.fontSizes.xxl,
    lg: tokens.typography.fontSizes.xxl + 8,
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, themedStyles.label]}>{label}</Text>}
      <Text style={[styles.amount, themedStyles.amount, { fontSize: sizeMap[size] }]}>
        {formatAmount(amount)}
        <Text style={[styles.currency, themedStyles.currency]}> {currency}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: tokens.typography.fontSizes.sm,
    marginBottom: tokens.spacing.xs,
  },
  amount: {
    fontWeight: tokens.typography.fontWeights.bold,
  },
  currency: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.medium,
  },
});

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    label: {
      color: colors.textSecondary,
    },
    amount: {
      color: colors.text,
    },
    currency: {
      color: colors.textSecondary,
    },
  });
