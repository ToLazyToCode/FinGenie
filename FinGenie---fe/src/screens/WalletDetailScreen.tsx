import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/types';
import { tokens } from '../theme';
import { Card, BalanceDisplay, GradientButton } from '../components/ui';
import { useQuery } from '@tanstack/react-query';
import { walletsApi } from '../api/modules';

type Route = RouteProp<AppStackParamList, 'WalletDetail'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

export function WalletDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { walletId } = route.params;

  const { data: wallet, isLoading, error } = useQuery({
    queryKey: ['wallet', walletId],
    queryFn: async () => {
      const { data } = await walletsApi.getById(walletId);
      return data;
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.placeholder}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error || !wallet) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Failed to load wallet</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.balanceCard}>
          <Text style={styles.walletName}>{wallet.walletName}</Text>
          <Text style={styles.walletType}>{wallet.walletType}</Text>
          <BalanceDisplay amount={Number(wallet.balance)} size="lg" />
          <GradientButton
            title="Add Transaction"
            onPress={() => navigation.navigate('AddTransaction', { walletId })}
            style={styles.addButton}
          />
          <GradientButton
            title="View History"
            onPress={() => navigation.navigate('TransactionHistory', { walletId })}
            variant="secondary"
            style={styles.historyButton}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  balanceCard: {},
  walletName: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  walletType: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.md,
  },
  addButton: {
    marginTop: tokens.spacing.md,
  },
  historyButton: {
    marginTop: tokens.spacing.sm,
  },
  placeholder: {
    textAlign: 'center',
    color: tokens.colors.textSecondary,
    marginVertical: tokens.spacing.lg,
  },
  error: {
    textAlign: 'center',
    color: tokens.colors.error,
    marginVertical: tokens.spacing.lg,
  },
});
