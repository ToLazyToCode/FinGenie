import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { tokens } from '../theme';
import { Card } from '../components/ui';
import { analyticsApi, aiApi } from '../api/modules';
import { useI18n } from '../i18n/useI18n';
import { getErrorMessage } from '../utils/errorHandling';
import { showToast } from '../system';

type TimeRange = '7d' | '30d' | '90d' | '1y';
type ChartType = 'SPENDING' | 'INCOME' | 'BALANCE';

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: '1 Year', value: '1y' },
];

const CATEGORY_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function AnalysisScreen() {
  const { t } = useI18n();
  const [selectedRange, setSelectedRange] = useState<TimeRange>('30d');
  const [selectedChart, setSelectedChart] = useState<ChartType>('SPENDING');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const getDateRange = (range: TimeRange) => {
    const endDate = new Date();
    const startDate = new Date();
    switch (range) {
      case '7d': startDate.setDate(endDate.getDate() - 7); break;
      case '30d': startDate.setDate(endDate.getDate() - 30); break;
      case '90d': startDate.setDate(endDate.getDate() - 90); break;
      case '1y': startDate.setFullYear(endDate.getFullYear() - 1); break;
    }
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  // Fetch analytics data
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['analytics', selectedRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange(selectedRange);
      const response = await analyticsApi.getAnalytics(startDate, endDate);
      return response.data;
    },
  });

  // Fetch spending prediction
  const { data: spendingPrediction } = useQuery({
    queryKey: ['spendingPrediction'],
    queryFn: async () => {
      // For now, userId is not needed as backend uses auth context
      const response = await aiApi.predictions.getDailyPrediction(0);
      return response.data;
    },
    enabled: false, // Disabled until backend is verified
  });

  // Fetch category trends (for one category) - disabled for now
  const categoryTrends = null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAnalytics();
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, [refetchAnalytics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Calculate max value for bar chart scaling
  const maxCategoryAmount = useMemo(() => {
    if (!analytics?.categoryBreakdown) return 1;
    return Math.max(...analytics.categoryBreakdown.map(c => c.totalAmount), 1);
  }, [analytics]);

  // Simple bar chart component
  const renderSpendingChart = () => {
    if (!analytics?.dailySpending || analytics.dailySpending.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No spending data available</Text>
        </View>
      );
    }

    const maxValue = Math.max(...analytics.dailySpending.map(d => d.expense), 1);
    const barWidth = (SCREEN_WIDTH - tokens.spacing.md * 4) / Math.max(analytics.dailySpending.length, 1);

    return (
      <View style={styles.chartContainer}>
        <View style={styles.barChart}>
          {analytics.dailySpending.slice(-14).map((day, index) => {
            const height = (day.expense / maxValue) * 100;
            return (
              <Pressable
                key={day.date}
                style={[styles.barContainer, { width: barWidth }]}
                onPress={() => {
                  // Show day details
                }}
              >
                <View style={styles.barValue}>
                  <Text style={styles.barValueText} numberOfLines={1}>
                    {formatCurrency(day.expense)}
                  </Text>
                </View>
                <View style={[styles.bar, { height: `${Math.max(height, 5)}%` }]} />
                <Text style={styles.barLabel} numberOfLines={1}>
                  {new Date(day.date).getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  // Donut chart-like category breakdown
  const renderCategoryBreakdown = () => {
    if (!analytics?.categoryBreakdown || analytics.categoryBreakdown.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No category data</Text>
        </View>
      );
    }

    const totalSpent = analytics.categoryBreakdown.reduce((sum, cat) => sum + cat.totalAmount, 0);

    return (
      <View style={styles.categoryBreakdown}>
        {/* Visual representation */}
        <View style={styles.donutContainer}>
          <View style={styles.donutRing}>
            {analytics.categoryBreakdown.map((cat, index) => {
              const percentage = (cat.totalAmount / totalSpent) * 100;
              const rotation = analytics.categoryBreakdown
                .slice(0, index)
                .reduce((sum, c) => sum + (c.totalAmount / totalSpent) * 360, 0);
              
              return (
                <View
                  key={cat.categoryId}
                  style={[
                    styles.donutSegment,
                    {
                      backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                      transform: [{ rotate: `${rotation}deg` }],
                      width: `${percentage}%`,
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.donutCenter}>
            <Text style={styles.donutTotal}>{formatCurrency(totalSpent)}</Text>
            <Text style={styles.donutLabel}>Total Spent</Text>
          </View>
        </View>

        {/* Category list */}
        <View style={styles.categoryList}>
          {analytics.categoryBreakdown.map((cat, index) => {
            const percentage = (cat.totalAmount / totalSpent) * 100;
            const isExpanded = expandedCategory === cat.categoryId.toString();

            return (
              <Pressable
                key={cat.categoryId}
                style={styles.categoryItem}
                onPress={() => setExpandedCategory(isExpanded ? null : cat.categoryId.toString())}
              >
                <View style={styles.categoryHeader}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] },
                    ]}
                  />
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {cat.categoryName}
                  </Text>
                  <Text style={styles.categoryAmount}>{formatCurrency(cat.totalAmount)}</Text>
                </View>
                <View style={styles.categoryBarContainer}>
                  <View style={styles.categoryBar}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}%</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  if (analyticsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
      </View>
    );
  }

  const analyticsErrorMessage = analyticsError ? getErrorMessage(analyticsError) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analysis</Text>
          <Text style={styles.subtitle}>Your spending insights</Text>
        </View>

        {analyticsErrorMessage ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>{t('home.analysis.error')}</Text>
            <Text style={styles.errorMessage}>{analyticsErrorMessage}</Text>
            <Pressable style={styles.errorRetryButton} onPress={onRefresh}>
              <Text style={styles.errorRetryButtonText}>{t('common.retry')}</Text>
            </Pressable>
          </Card>
        ) : null}

        {/* Time Range Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.timeRangeScroll}
          contentContainerStyle={styles.timeRangeContainer}
        >
          {TIME_RANGES.map((range) => (
            <Pressable
              key={range.value}
              style={[
                styles.timeRangeButton,
                selectedRange === range.value && styles.timeRangeButtonActive,
              ]}
              onPress={() => setSelectedRange(range.value)}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  selectedRange === range.value && styles.timeRangeTextActive,
                ]}
              >
                {range.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(analytics?.totalExpense || 0)}
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryValue, styles.incomeValue]}>
              {formatCurrency(analytics?.totalIncome || 0)}
            </Text>
          </Card>
        </View>

        {/* Net Balance */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceContent}>
            <View>
              <Text style={styles.balanceLabel}>Net Balance</Text>
              <Text
                style={[
                  styles.balanceValue,
                  (analytics?.netSavings || 0) >= 0 ? styles.positiveBalance : styles.negativeBalance,
                ]}
              >
                {formatCurrency(analytics?.netSavings || 0)}
              </Text>
            </View>
            <View style={styles.savingsRate}>
              <Text style={styles.savingsLabel}>Savings Rate</Text>
              <Text style={styles.savingsValue}>
                {analytics?.savingsRate?.toFixed(1) || '0'}%
              </Text>
            </View>
          </View>
        </Card>

        {/* AI Prediction */}
        {spendingPrediction && (
          <Card style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <Text style={styles.predictionIcon}>🤖</Text>
              <Text style={styles.predictionTitle}>AI Spending Forecast</Text>
            </View>
            <Text style={styles.predictionAmount}>
              {formatCurrency(spendingPrediction.predictedAmount)}
            </Text>
            <Text style={styles.predictionLabel}>
              Predicted spending for {spendingPrediction.periodLabel || 'this month'}
            </Text>
            {spendingPrediction.confidence && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>Confidence:</Text>
                <View style={styles.confidenceBar}>
                  <View
                    style={[
                      styles.confidenceFill,
                      { width: `${spendingPrediction.confidence * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.confidenceValue}>
                  {(spendingPrediction.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            )}
            {spendingPrediction.tips && spendingPrediction.tips.length > 0 && (
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>💡 Tips:</Text>
                {spendingPrediction.tips.map((tip, index) => (
                  <Text key={index} style={styles.tipText}>• {tip}</Text>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Spending Chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Spending</Text>
          {renderSpendingChart()}
        </Card>

        {/* Category Breakdown */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Category Breakdown</Text>
          {renderCategoryBreakdown()}
        </Card>

        {/* Spending Trends - disabled until backend endpoint is verified */}
        {/* {categoryTrends && categoryTrends.length > 0 && (
          <Card style={styles.trendsCard}>
            <Text style={styles.trendsTitle}>Category Trends</Text>
            {categoryTrends.slice(0, 5).map((trend, index) => (
              <View key={index} style={styles.trendItem}>
                <View style={styles.trendInfo}>
                  <Text style={styles.trendName}>{trend.categoryName}</Text>
                  <Text style={styles.trendAmount}>{formatCurrency(trend.currentAmount)}</Text>
                </View>
                <View style={styles.trendChange}>
                  <Text
                    style={[
                      styles.trendPercentage,
                      trend.changePercentage >= 0 ? styles.trendUp : styles.trendDown,
                    ]}
                  >
                    {trend.changePercentage >= 0 ? '↑' : '↓'} {Math.abs(trend.changePercentage).toFixed(1)}%
                  </Text>
                  <Text style={styles.trendLabel}>vs last period</Text>
                </View>
              </View>
            ))}
          </Card>
        )} */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing.md,
  },
  header: {
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    marginTop: tokens.spacing.xs,
  },
  errorCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.error,
    backgroundColor: `${tokens.colors.error}10`,
    gap: tokens.spacing.sm,
  },
  errorTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: tokens.colors.error,
  },
  errorMessage: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
    color: tokens.colors.text,
  },
  errorRetryButton: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.borderRadius.full,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  errorRetryButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: '#fff',
  },
  timeRangeScroll: {
    marginBottom: tokens.spacing.md,
  },
  timeRangeContainer: {
    paddingRight: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  timeRangeButton: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  timeRangeButtonActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  timeRangeText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.text,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  timeRangeTextActive: {
    color: '#fff',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: tokens.spacing.md,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.xs,
  },
  summaryValue: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.error,
  },
  incomeValue: {
    color: tokens.colors.success,
  },
  summaryChange: {
    fontSize: tokens.typography.fontSizes.xs,
    marginTop: tokens.spacing.xs,
  },
  changePositive: {
    color: tokens.colors.success,
  },
  changeNegative: {
    color: tokens.colors.error,
  },
  balanceCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.md,
  },
  balanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.xs,
  },
  balanceValue: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  positiveBalance: {
    color: tokens.colors.success,
  },
  negativeBalance: {
    color: tokens.colors.error,
  },
  savingsRate: {
    alignItems: 'flex-end',
  },
  savingsLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.xs,
  },
  savingsValue: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.primary,
  },
  predictionCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.lg,
    backgroundColor: `${tokens.colors.accent}10`,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  predictionIcon: {
    fontSize: 20,
    marginRight: tokens.spacing.sm,
  },
  predictionTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: tokens.colors.accent,
  },
  predictionAmount: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  predictionLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.md,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  confidenceLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: tokens.colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: tokens.colors.accent,
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
    color: tokens.colors.accent,
    minWidth: 40,
    textAlign: 'right',
  },
  tipsContainer: {
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
  },
  tipsTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  tipText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  chartCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.md,
  },
  chartTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.md,
  },
  emptyChart: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textMuted,
  },
  chartContainer: {
    paddingVertical: tokens.spacing.sm,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: tokens.spacing.xs,
  },
  barContainer: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  barValue: {
    marginBottom: 4,
  },
  barValueText: {
    fontSize: 8,
    color: tokens.colors.textMuted,
  },
  bar: {
    width: '80%',
    backgroundColor: tokens.colors.primary,
    borderRadius: 2,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: tokens.colors.textSecondary,
    marginTop: 4,
  },
  categoryBreakdown: {},
  donutContainer: {
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  donutRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: tokens.colors.backgroundSecondary,
    flexDirection: 'row',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutSegment: {
    height: '100%',
  },
  donutCenter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutTotal: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
  },
  donutLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
  },
  categoryList: {},
  categoryItem: {
    marginBottom: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: tokens.spacing.sm,
  },
  categoryName: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.text,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  categoryAmount: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
  },
  categoryBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  categoryBar: {
    flex: 1,
    height: 8,
    backgroundColor: tokens.colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryPercentage: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
    minWidth: 40,
    textAlign: 'right',
  },
  transactionList: {
    marginTop: tokens.spacing.sm,
    paddingLeft: tokens.spacing.lg,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.xs,
  },
  transactionNote: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
    marginRight: tokens.spacing.sm,
  },
  transactionAmount: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.text,
  },
  trendsCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.md,
  },
  trendsTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.md,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  trendInfo: {},
  trendName: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
    color: tokens.colors.text,
    marginBottom: 2,
  },
  trendAmount: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
  },
  trendChange: {
    alignItems: 'flex-end',
  },
  trendPercentage: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  trendUp: {
    color: tokens.colors.error,
  },
  trendDown: {
    color: tokens.colors.success,
  },
  trendLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textMuted,
  },
});
