import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { AppStackParamList } from '../navigation/types';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import { Card } from '../components/ui';
import { Skeleton } from '../components/form';
import { TransactionItem, type TransactionItemData } from '../components/home/TransactionItem';
import { transactionsApi, type TransactionResponse, type TransactionType } from '../api/modules/transactions.api';

type RouteParams = RouteProp<AppStackParamList, 'TransactionHistory'>;

type FilterType = 'all' | 'INCOME' | 'EXPENSE';

const formatDate = (dateStr: string, locale: string, todayLabel: string, yesterdayLabel: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return todayLabel;
  if (diffDays === 1) return yesterdayLabel;
  if (diffDays < 7) return date.toLocaleDateString(locale, { weekday: 'long' });
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

const mapToTransactionItem = (
  tx: TransactionResponse,
  locale: string,
  todayLabel: string,
  yesterdayLabel: string
): TransactionItemData => ({
  id: tx.transactionId.toString(),
  title: tx.description || tx.categoryName,
  category: tx.categoryName,
  amount: tx.amount,
  type: (tx.transactionType ?? 'EXPENSE').toLowerCase() as 'income' | 'expense',
  date: formatDate(tx.transactionDate, locale, todayLabel, yesterdayLabel),
});

export function TransactionHistoryScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { colors } = useThemeStore();
  const { t, locale } = useI18n();
  const walletId = route.params?.walletId;
  const screenText = useMemo(
    () => ({
      noTransactions: t('transaction.noTransactions'),
      addFirst: t('transaction.addFirst'),
      all: t('common.all'),
      loadError: t('transaction.loadFailed'),
      retry: t('common.retry'),
      today: t('common.today'),
      yesterday: t('common.yesterday'),
    }),
    [t]
  );
  
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch transactions
  const {
    data: transactionsData,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: walletId ? ['transactions', 'wallet', walletId] : ['transactions'],
    queryFn: async () => {
      const response = walletId
        ? await transactionsApi.getByWallet(walletId)
        : await transactionsApi.getAll();
      return response.data;
    },
  });

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactionsData) return [];
    if (filter === 'all') return transactionsData;
    return transactionsData.filter(tx => tx.transactionType === filter);
  }, [transactionsData, filter]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: TransactionResponse[] } = {};
    filteredTransactions.forEach(tx => {
      const dateKey = new Date(tx.transactionDate).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tx);
    });
    
    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, transactions]) => ({
        date,
        data: transactions.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }));
  }, [filteredTransactions]);

  const renderFilterButton = (type: FilterType, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { backgroundColor: filter === type ? colors.primary : colors.surface },
      ]}
      onPress={() => setFilter(type)}
    >
      <Text
        style={[
          styles.filterText,
          { color: filter === type ? colors.textOnPrimary : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSectionHeader = useCallback(({ date }: { date: string }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {formatDate(date, locale, screenText.today, screenText.yesterday)}
      </Text>
    </View>
  ), [colors.background, colors.textSecondary, locale, screenText.today, screenText.yesterday]);

  const renderItem = useCallback(({ item }: { item: TransactionResponse }) => (
    <TransactionItem
      transaction={mapToTransactionItem(item, locale, screenText.today, screenText.yesterday)}
      onPress={() => {
        // Navigate to transaction detail or edit
      }}
    />
  ), [locale, screenText.today, screenText.yesterday]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {screenText.noTransactions}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {screenText.addFirst}
      </Text>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddTransaction' as never)}
      >
        <Ionicons name="add" size={20} color={colors.textOnPrimary} />
        <Text style={[styles.addButtonText, { color: colors.textOnPrimary }]}>
          {t('transaction.add')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={styles.skeletonRow}>
          <Skeleton width={48} height={48} borderRadius={16} />
          <View style={styles.skeletonContent}>
            <Skeleton width={120} height={16} />
            <Skeleton width={80} height={12} style={{ marginTop: 6 }} />
          </View>
          <View style={styles.skeletonAmount}>
            <Skeleton width={70} height={16} />
            <Skeleton width={50} height={12} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {screenText.loadError}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
          >
            <Text style={[styles.retryText, { color: colors.textOnPrimary }]}>
              {screenText.retry}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.background }]}>
        {renderFilterButton('all', screenText.all)}
        {renderFilterButton('INCOME', t('transaction.income'))}
        {renderFilterButton('EXPENSE', t('transaction.expense'))}
      </View>

      {isLoading ? (
        renderLoading()
      ) : (
        <FlatList
          data={groupedTransactions.flatMap(group => [
            { type: 'header', date: group.date } as const,
            ...group.data.map(tx => ({ type: 'item', ...tx } as const)),
          ])}
          keyExtractor={(item, index) => 
            item.type === 'header' ? `header-${item.date}` : `tx-${item.transactionId}`
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return renderSectionHeader({ date: item.date });
            }
            return renderItem({ item: item as TransactionResponse });
          }}
          contentContainerStyle={[
            styles.listContent,
            groupedTransactions.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radii.full,
  },
  filterText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  listContent: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  emptyList: {
    flexGrow: 1,
  },
  sectionHeader: {
    paddingVertical: tokens.spacing.sm,
    paddingTop: tokens.spacing.md,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonContent: {
    flex: 1,
    marginLeft: tokens.spacing.md,
  },
  skeletonAmount: {
    alignItems: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.xl,
  },
  emptyTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.semibold,
    marginTop: tokens.spacing.md,
  },
  emptySubtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    textAlign: 'center',
    marginTop: tokens.spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radii.full,
    marginTop: tokens.spacing.lg,
    gap: tokens.spacing.xs,
  },
  addButtonText: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.xl,
  },
  errorText: {
    fontSize: tokens.typography.fontSizes.md,
    marginTop: tokens.spacing.md,
  },
  retryButton: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radii.md,
    marginTop: tokens.spacing.md,
  },
  retryText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});

