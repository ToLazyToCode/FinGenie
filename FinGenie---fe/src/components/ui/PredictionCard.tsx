import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Card } from './Card';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeColors } from '../../theme/colors';

export interface PredictionCardData {
  id: string;
  category: string;
  amount: number;
  confidence: number; // 0-100
  description?: string;
}

interface PredictionCardProps {
  prediction: PredictionCardData;
  onAccept: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PredictionCard({ prediction, onAccept, onReject, onEdit, isLoading, disabled, style }: PredictionCardProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const isDisabled = isLoading || disabled;
  const confidenceColor =
    prediction.confidence >= 80
      ? colors.success
      : prediction.confidence >= 50
        ? colors.warning
        : colors.textMuted;

  return (
    <Card variant="elevated" style={style}>
      <View style={styles.header}>
        <Text style={[styles.category, themedStyles.category]}>{prediction.category}</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: `${confidenceColor}20` }]}>
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>
            {prediction.confidence}%
          </Text>
        </View>
      </View>
      <Text style={[styles.amount, themedStyles.amount]}>
        {new Intl.NumberFormat('vi-VN').format(prediction.amount)} ₫
      </Text>
      {prediction.description && (
        <Text style={[styles.description, themedStyles.description]}>{prediction.description}</Text>
      )}
      <View style={styles.actions}>
        <Pressable
          onPress={onAccept}
          disabled={isDisabled}
          style={({ pressed }) => [styles.acceptButton, themedStyles.acceptButton, pressed && styles.pressed]}
        >
          <Text style={[styles.acceptText, themedStyles.acceptText]}>Accept</Text>
        </Pressable>
        {onEdit && (
          <Pressable
            onPress={onEdit}
            disabled={isDisabled}
            style={({ pressed }) => [styles.editButton, themedStyles.editButton, pressed && styles.pressed]}
          >
            <Text style={[styles.editText, themedStyles.editText]}>Edit</Text>
          </Pressable>
        )}
        {onReject && (
          <Pressable
            onPress={onReject}
            disabled={isDisabled}
            style={({ pressed }) => [styles.rejectButton, themedStyles.rejectButton, pressed && styles.pressed]}
          >
            <Text style={[styles.rejectText, themedStyles.rejectText]}>Reject</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}


const getThemedStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    category: {
      color: colors.text,
    },
    amount: {
      color: colors.primary,
    },
    description: {
      color: colors.textSecondary,
    },
    acceptButton: {
      backgroundColor: colors.primary,
    },
    editButton: {
      backgroundColor: colors.warning,
    },
    rejectButton: {
      backgroundColor: colors.backgroundSecondary,
    },
    acceptText: {
      color: colors.background,
    },
    editText: {
      color: colors.textOnPrimary,
    },
    rejectText: {
      color: colors.textSecondary,
    },
  });

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  category: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  confidenceBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.sm,
  },
  confidenceText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  amount: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.xs,
  },
  description: {
    fontSize: tokens.typography.fontSizes.sm,
    marginBottom: tokens.spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
  },
  editButton: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
  },
  acceptText: {
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  editText: {
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  rejectText: {},
  pressed: {
    opacity: 0.9,
  },
});
