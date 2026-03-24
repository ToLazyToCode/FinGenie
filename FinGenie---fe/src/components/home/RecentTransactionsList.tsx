import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';
import { TransactionItem, type TransactionItemData } from './TransactionItem';
import { images } from '../../constants/assets';

interface RecentTransactionsListProps {
  transactions: TransactionItemData[];
  onSeeAll?: () => void;
  onTransactionPress?: (tx: TransactionItemData) => void;
  onEmptyCta?: () => void;
}

export function RecentTransactionsList({
  transactions,
  onSeeAll,
  onTransactionPress,
  onEmptyCta,
}: RecentTransactionsListProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const hasTransactions = transactions.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, themedStyles.title]}>Recent Transactions</Text>
        <Pressable onPress={onSeeAll} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={[styles.seeAll, themedStyles.seeAll]}>See All</Text>
        </Pressable>
      </View>
      <View style={[styles.list, themedStyles.list]}>
        {hasTransactions ? (
          transactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              onPress={() => onTransactionPress?.(tx)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Image source={images.geniePet} style={styles.emptyImage} resizeMode="contain" />
            <Text style={[styles.emptyTitle, themedStyles.emptyTitle]}>No transactions yet</Text>
            <Text style={[styles.emptySubtitle, themedStyles.emptySubtitle]}>Add your first transaction to see it here.</Text>
            <Pressable
              onPress={onEmptyCta}
              style={({ pressed }) => [styles.emptyButton, themedStyles.emptyButton, pressed && styles.pressed]}
            >
              <Text style={[styles.emptyButtonLabel, themedStyles.emptyButtonLabel]}>Add Transaction</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
  },
  seeAll: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  list: {
    backgroundColor: tokens.colors.surface,
    borderRadius: 24,
    paddingHorizontal: tokens.spacing.md,
    ...tokens.shadows.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xl,
    gap: tokens.spacing.sm,
  },
  emptyImage: {
    width: 120,
    height: 120,
  },
  emptyTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
  },
  emptySubtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
  emptyButton: {
    marginTop: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: tokens.colors.primary,
  },
  emptyButtonLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    title: {
      color: colors.text,
    },
    seeAll: {
      color: colors.primary,
    },
    list: {
      backgroundColor: colors.surface,
    },
    emptyTitle: {
      color: colors.text,
    },
    emptySubtitle: {
      color: colors.textSecondary,
    },
    emptyButton: {
      backgroundColor: colors.primary,
    },
    emptyButtonLabel: {
      color: colors.textOnPrimary,
    },
  });
