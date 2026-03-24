import React from 'react';
import { Pressable, StyleSheet, Text, View, Image, type ImageSourcePropType } from 'react-native';
import { tokens } from '../../theme';
import { categoryIcons, icons } from '../../constants/assets';

export type TransactionType = 'income' | 'expense';

export interface TransactionItemData {
  id: string;
  title: string;
  category: string;
  amount: number;
  type: TransactionType;
  date: string;
  iconSource?: ImageSourcePropType;
}

interface TransactionItemProps {
  transaction: TransactionItemData;
  onPress?: () => void;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.abs(amount));
}

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const isIncome = transaction.type === 'income';
  const backgroundTint = isIncome ? 'rgba(34,197,94,0.12)' : 'rgba(237,233,254,1)';
  const iconSource =
    transaction.iconSource ??
    categoryIcons[transaction.category] ??
    (isIncome ? icons.salaryIncome : icons.foodCategory);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: backgroundTint }]}> 
        <Image source={iconSource} style={[styles.icon, !isIncome && styles.expenseIcon]} resizeMode="contain" />
      </View>
      <View style={styles.middle}>
        <Text style={styles.title}>{transaction.title}</Text>
        <Text style={styles.category}>{transaction.category}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.amount, isIncome ? styles.income : styles.expense]}>
          {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
        </Text>
        <Text style={styles.date}>{transaction.date}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  icon: {
    width: 22,
    height: 22,
    tintColor: tokens.colors.primary,
  },
  expenseIcon: {
    tintColor: tokens.colors.text,
  },
  middle: {
    flex: 1,
  },
  title: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: tokens.colors.text,
  },
  category: {
    marginTop: 2,
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
  },
  meta: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  income: {
    color: tokens.colors.income,
  },
  expense: {
    color: tokens.colors.text,
  },
  date: {
    marginTop: 2,
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
  },
});
