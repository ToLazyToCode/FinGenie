import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, Text, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import {
  useI18n,
  type TranslateFn,
  type TranslationKey,
} from '../i18n/useI18n';
import { getErrorMessage } from '../utils/errorHandling';
import { useBehaviorInsights, useBehaviorProfile, useEntitlements, useSurveyStatus } from '../hooks';
import {
  HeaderGreeting,
  BalanceCard,
  QuickActionButtons,
  PetStreakCard,
  RecentTransactionsList,
  type TransactionItemData,
} from '../components/home';
import { SharedPiggyInvitationsSection } from '../components/social/SharedPiggyInvitationsSection';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, AppStackParamList } from '../navigation/types';
import {
  walletsApi,
  transactionsApi,
  petApi,
  gamificationApi,
  notificationsApi,
  analyticsApi,
  dashboardApi,
  aiApi,
  type MonthlySavingPlanResponse,
} from '../api/modules';
import { savingsKeys } from '../queryKeys/savings.keys';
import { authStore, petStore, gamificationStore } from '../store';
import { showToast } from '../system';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<AppStackParamList>
>;

function getGreetingKey(): TranslationKey {
  const hour = new Date().getHours();
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

type AnalysisTab = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

const COACHMARK_VERSION = 'v1';

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useThemeStore();
  const { t, locale } = useI18n();
  const themedStyles = getThemedStyles(colors);
  const [refreshing, setRefreshing] = useState(false);
  const greeting = useMemo(() => t(getGreetingKey()), [t]);
  const categoryColors = useMemo(
    () => [colors.primary, colors.secondary, colors.warning, colors.success, colors.info],
    [colors]
  );
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [locale]
  );
  const userFallbackName = t('home.userFallbackName');
  
  // Get user info from auth store
  const userName = authStore((state) => state.user?.fullName || state.user?.email?.split('@')[0] || userFallbackName);
  
  // Store setters for caching
  const setPet = petStore((state) => state.setPet);
  const setGamificationProfile = gamificationStore((state) => state.setProfile);
  const accountId = authStore((state) => state.user?.accountId);

  const [selectedAnalysisTab, setSelectedAnalysisTab] = useState<AnalysisTab>('DAY');
  const [coachmarkVisible, setCoachmarkVisible] = useState(false);
  const [coachmarkStep, setCoachmarkStep] = useState(0);

  const { canAccess } = useEntitlements();
  const coachmarkKey = accountId ? `coachmark.home.${COACHMARK_VERSION}.${accountId}` : null;

  // Fetch wallets for balance
  const { data: walletsData, isLoading: walletsLoading, error: walletsError, refetch: refetchWallets } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const response = await walletsApi.getAll();
      return response.data;
    },
  });

  // Fetch recent transactions
  const { data: transactionsData, isLoading: txLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: async () => {
      const response = await transactionsApi.getAll();
      return response.data.slice(0, 5); // Get last 5 transactions
    },
  });

  // Fetch pet state
  const { refetch: refetchPet } = useQuery({
    queryKey: ['petState'],
    queryFn: async () => {
      const response = await petApi.getState();
      setPet(response.data);
      return response.data;
    },
  });

  // Fetch gamification profile
  const { data: gamificationData, refetch: refetchGamification } = useQuery({
    queryKey: ['gamificationProfile'],
    queryFn: async () => {
      const response = await gamificationApi.getProfile();
      setGamificationProfile(response.data);
      return response.data;
    },
  });

  // Fetch unread notifications count
  const { data: notifCountData, refetch: refetchNotifications } = useQuery({
    queryKey: ['notificationsCount'],
    queryFn: async () => {
      const response = await notificationsApi.countUnread();
      return response.data.count;
    },
  });

  // Fetch analytics for spending insights (last 30 days)
  const { data: analyticsData, refetch: refetchAnalytics } = useQuery({
    queryKey: ['analyticsHome'],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      const response = await analyticsApi.getAnalytics(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      return response.data;
    },
  });

  const { data: dashboardData, refetch: refetchDashboard } = useQuery({
    queryKey: ['experienceDashboard'],
    queryFn: async () => {
      const response = await dashboardApi.getDashboard();
      return response.data;
    },
  });

  const todayIsoDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const { data: analysisDayData, error: analysisDayError, refetch: refetchAnalysisDay } = useQuery({
    queryKey: ['analysis', 'day', todayIsoDate],
    queryFn: async () => {
      const response = await analyticsApi.getAnalytics(todayIsoDate, todayIsoDate);
      return response.data;
    },
  });

  const { data: analysisWeekData, error: analysisWeekError, refetch: refetchAnalysisWeek } = useQuery({
    queryKey: ['analysis', 'week'],
    queryFn: async () => {
      const response = await analyticsApi.getWeeklyAnalytics();
      return response.data;
    },
  });

  const monthEnabled = canAccess('analytics.month');
  const yearEnabled = canAccess('analytics.year');
  const availableAnalysisTabs = useMemo<AnalysisTab[]>(
    () => [
      'DAY',
      'WEEK',
      ...(monthEnabled ? (['MONTH'] as AnalysisTab[]) : []),
      ...(yearEnabled ? (['YEAR'] as AnalysisTab[]) : []),
    ],
    [monthEnabled, yearEnabled]
  );

  const { data: analysisMonthData, error: analysisMonthError, refetch: refetchAnalysisMonth } = useQuery({
    queryKey: ['analysis', 'month', currentYear],
    enabled: monthEnabled,
    queryFn: async () => {
      const response = await analyticsApi.getCurrentMonthAnalytics();
      return response.data;
    },
  });

  const { data: analysisYearData, error: analysisYearError, refetch: refetchAnalysisYear } = useQuery({
    queryKey: ['analysis', 'year', currentYear],
    enabled: yearEnabled,
    queryFn: async () => {
      const response = await analyticsApi.getYearlyAnalytics(currentYear);
      return response.data;
    },
  });

  const {
    data: savingPlanData,
    isLoading: savingPlanLoading,
    isError: savingPlanError,
    refetch: refetchSavingPlan,
  } = useQuery<MonthlySavingPlanResponse>({
    queryKey: savingsKeys.monthlySavingPlan('optimized'),
    queryFn: async () => {
      const response = await aiApi.monthlyPlan.getPlan('optimized');
      return response.data;
    },
  });

  const {
    data: surveyStatus,
    isLoading: surveyStatusLoading,
    isError: surveyStatusError,
    refetch: refetchSurveyStatus,
  } = useSurveyStatus();

  const hasCompletedSurvey = Boolean(surveyStatus?.hasCompletedSurvey);

  const {
    data: behaviorProfile,
    isLoading: behaviorProfileLoading,
    isError: behaviorProfileError,
    refetch: refetchBehaviorProfile,
  } = useBehaviorProfile(hasCompletedSurvey);

  const {
    data: behaviorInsights,
    isLoading: behaviorInsightsLoading,
    isError: behaviorInsightsError,
    refetch: refetchBehaviorInsights,
  } = useBehaviorInsights(hasCompletedSurvey);

  // Calculate totals from wallets
  const totalBalance = useMemo(() => 
    walletsData?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0,
    [walletsData]
  );

  // Calculate income/expense from recent transactions
  const { income, expense } = useMemo(() => {
    if (!transactionsData) return { income: 0, expense: 0 };
    
    const now = new Date();
    const thisMonth = transactionsData.filter(t => {
      const txDate = new Date(t.transactionDate);
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });
    
    return thisMonth.reduce((acc, t) => {
      if (t.transactionType === 'INCOME') {
        acc.income += t.amount;
      } else {
        acc.expense += t.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
  }, [transactionsData]);

  // Transform transactions for display
  const transactions: TransactionItemData[] = useMemo(() => {
    if (!transactionsData) return [];
    return transactionsData
      .filter((transaction) => transaction.transactionType)
      .map((transaction) => ({
        id: transaction.transactionId.toString(),
        title:
          transaction.description ||
          transaction.categoryName ||
          t('home.transactionFallbackTitle'),
        category: transaction.categoryName || t('home.transactionFallbackCategory'),
        amount: transaction.amount,
        type: transaction.transactionType.toLowerCase() as 'income' | 'expense',
        date: new Date(transaction.transactionDate).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      }));
  }, [locale, t, transactionsData]);

  const behaviorCardLoading = surveyStatusLoading || (hasCompletedSurvey && behaviorProfileLoading);
  const topActionLabel = behaviorInsightsLoading
    ? t('common.loading')
    : behaviorInsights?.recommendations?.[0]?.title;

  const companionCardText = useMemo(
    () => ({
      title: t('petChat.title'),
      subtitle: hasCompletedSurvey
        ? t('home.companion.subtitle.ready')
        : t('home.companion.subtitle.locked'),
      cta: hasCompletedSurvey ? t('home.companion.cta') : t('advisor.completeSurvey'),
    }),
    [hasCompletedSurvey, t]
  );

  const coachmarkHints = useMemo(
    () => [
      t('home.coachmark.balance'),
      t('home.coachmark.addIncome'),
      t('home.coachmark.addExpense'),
      t('home.coachmark.recentTransactions'),
      t('home.coachmark.gamification'),
    ],
    [t]
  );

  const aiSummaryText = useMemo(() => {
    const aiText = dashboardData?.aiInsight?.insightText?.trim();
    if (aiText) {
      return aiText;
    }
    return buildRuleBasedHomeSummary(totalBalance, income, expense, t);
  }, [dashboardData?.aiInsight?.insightText, expense, income, t, totalBalance]);

  const analysisByTab = useMemo(
    () => ({
      DAY: analysisDayData,
      WEEK: analysisWeekData,
      MONTH: analysisMonthData,
      YEAR: analysisYearData,
    }),
    [analysisDayData, analysisMonthData, analysisWeekData, analysisYearData]
  );
  const analysisErrorsByTab = useMemo(
    () => ({
      DAY: analysisDayError,
      WEEK: analysisWeekError,
      MONTH: analysisMonthError,
      YEAR: analysisYearError,
    }),
    [analysisDayError, analysisMonthError, analysisWeekError, analysisYearError]
  );

  const selectedAnalysis = analysisByTab[selectedAnalysisTab];
  const selectedAnalysisError = analysisErrorsByTab[selectedAnalysisTab];
  const selectedAnalysisErrorMessage = selectedAnalysisError
    ? getErrorMessage(selectedAnalysisError)
    : null;
  const selectedIncome = selectedAnalysis?.totalIncome ?? 0;
  const selectedExpense = selectedAnalysis?.totalExpense ?? 0;
  const selectedDelta = selectedAnalysis?.netSavings ?? selectedIncome - selectedExpense;
  const selectedTopCategory = selectedAnalysis?.categoryBreakdown?.[0]?.categoryName;
  const selectedHasData =
    Boolean(selectedAnalysis?.transactionCount && selectedAnalysis.transactionCount > 0) ||
    selectedIncome > 0 ||
    selectedExpense > 0;
  const analysisSummaryText = useMemo(() => {
    if (!selectedHasData) {
      return t('home.analysis.empty');
    }
    const aiText = dashboardData?.aiInsight?.insightText?.trim();
    if (aiText) {
      return aiText;
    }
    return buildRuleBasedAnalysisSummary(
      selectedAnalysisTab,
      selectedIncome,
      selectedExpense,
      selectedTopCategory,
      t
    );
  }, [
    selectedAnalysisTab,
    dashboardData?.aiInsight?.insightText,
    selectedExpense,
    selectedHasData,
    selectedIncome,
    selectedTopCategory,
    t,
  ]);

  const analysisTabLabels = useMemo(
    () => ({
      DAY: t('home.analysis.tab.day'),
      WEEK: t('home.analysis.tab.week'),
      MONTH: t('home.analysis.tab.month'),
      YEAR: t('home.analysis.tab.year'),
    }),
    [t]
  );

  const analysisLabels = useMemo(
    () => ({
      title: t('home.analysis.title'),
      income: t('home.analysis.income'),
      expense: t('home.analysis.expense'),
      delta: t('home.analysis.delta'),
      topCategory: t('home.analysis.topCategory'),
      empty: t('home.analysis.emptyPeriod'),
      topCategoryFallback: t('home.analysis.topCategoryFallback'),
      error: t('home.analysis.error'),
      retry: t('common.retry'),
    }),
    [t]
  );

  useEffect(() => {
    if (!availableAnalysisTabs.includes(selectedAnalysisTab)) {
      setSelectedAnalysisTab(availableAnalysisTabs[0] ?? 'DAY');
    }
  }, [availableAnalysisTabs, selectedAnalysisTab]);

  const handleAnalysisTabPress = useCallback((tab: AnalysisTab) => {
    setSelectedAnalysisTab(tab);
  }, []);

  const handleAnalysisRetry = useCallback(async () => {
    try {
      if (selectedAnalysisTab === 'DAY') {
        await refetchAnalysisDay();
        return;
      }
      if (selectedAnalysisTab === 'WEEK') {
        await refetchAnalysisWeek();
        return;
      }
      if (selectedAnalysisTab === 'MONTH' && monthEnabled) {
        await refetchAnalysisMonth();
        return;
      }
      if (selectedAnalysisTab === 'YEAR' && yearEnabled) {
        await refetchAnalysisYear();
      }
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  }, [
    monthEnabled,
    refetchAnalysisDay,
    refetchAnalysisMonth,
    refetchAnalysisWeek,
    refetchAnalysisYear,
    selectedAnalysisTab,
    yearEnabled,
  ]);

  useEffect(() => {
    if (!coachmarkKey || !hasCompletedSurvey) {
      return;
    }

    let isMounted = true;
    AsyncStorage.getItem(coachmarkKey)
      .then((value) => {
        if (!isMounted) {
          return;
        }
        if (value !== '1') {
          setCoachmarkVisible(true);
          setCoachmarkStep(0);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCoachmarkVisible(true);
          setCoachmarkStep(0);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [coachmarkKey, hasCompletedSurvey]);

  const dismissCoachmark = useCallback(async () => {
    if (coachmarkKey) {
      await AsyncStorage.setItem(coachmarkKey, '1');
    }
    setCoachmarkVisible(false);
    setCoachmarkStep(0);
  }, [coachmarkKey]);

  const nextCoachmark = useCallback(() => {
    setCoachmarkStep((prev) => {
      const next = prev + 1;
      if (next >= coachmarkHints.length) {
        void dismissCoachmark();
        return prev;
      }
      return next;
    });
  }, [coachmarkHints.length, dismissCoachmark]);

  const isLoading = walletsLoading || txLoading;
  const hasError = !!walletsError;
  const isEmpty = !isLoading && transactions.length === 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchWallets(),
        refetchTransactions(),
        refetchPet(),
        refetchGamification(),
        refetchNotifications(),
        refetchAnalytics(),
        refetchDashboard(),
        refetchAnalysisDay(),
        refetchAnalysisWeek(),
        ...(monthEnabled ? [refetchAnalysisMonth()] : []),
        ...(yearEnabled ? [refetchAnalysisYear()] : []),
        refetchSavingPlan(),
        refetchSurveyStatus(),
        refetchBehaviorProfile(),
        refetchBehaviorInsights(),
      ]);
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, [
    refetchWallets,
    refetchTransactions,
    refetchPet,
    refetchGamification,
    refetchNotifications,
    refetchAnalytics,
    refetchDashboard,
    refetchAnalysisDay,
    refetchAnalysisWeek,
    refetchAnalysisMonth,
    refetchAnalysisYear,
    monthEnabled,
    yearEnabled,
    refetchSavingPlan,
    refetchSurveyStatus,
    refetchBehaviorProfile,
    refetchBehaviorInsights,
  ]);

  const navigateToAddTransaction = useCallback(() => {
    navigation.navigate('AddTransaction', {});
  }, [navigation]);

  const handleTransactionPress = useCallback(
    (tx: TransactionItemData) => {
      navigation.navigate('TransactionHistory', { walletId: undefined });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <HeaderGreeting
          greeting={greeting}
          userName={userName}
          subtitle={t('home.subtitle')}
          onPressNotifications={() => navigation.navigate('Notifications')}
          unreadCount={notifCountData || 0}
        />

        {coachmarkVisible ? (
          <View style={[coachmarkStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[coachmarkStyles.title, { color: colors.text }]}>
              {t('home.coachmark.title')}
            </Text>
            <Text style={[coachmarkStyles.message, { color: colors.textSecondary }]}>
              {coachmarkHints[coachmarkStep]}
            </Text>
            <View style={coachmarkStyles.actions}>
              <Pressable
                onPress={() => {
                  void dismissCoachmark();
                }}
                style={[coachmarkStyles.secondaryButton, { backgroundColor: colors.backgroundSecondary }]}
              >
                <Text style={[coachmarkStyles.secondaryLabel, { color: colors.text }]}>
                  {t('home.coachmark.skip')}
                </Text>
              </Pressable>
              <Pressable
                onPress={nextCoachmark}
                style={[coachmarkStyles.primaryButton, { backgroundColor: colors.primary }]}
              >
                <Text style={[coachmarkStyles.primaryLabel, { color: colors.textOnPrimary ?? '#fff' }]}>
                  {coachmarkStep >= coachmarkHints.length - 1 ? t('common.done') : t('common.next')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {isLoading && <SkeletonHome />}

        {hasError && (
          <ErrorState
            onRetry={onRefresh}
            themedStyles={themedStyles}
            title={t('home.errorTitle')}
            subtitle={t('home.errorSubtitle')}
            retryLabel={t('common.retry')}
          />
        )}

        {!isLoading && !hasError && (
          <View>
            <BalanceCard
              totalBalance={totalBalance}
              income={income}
              expense={expense}
              summaryText={aiSummaryText}
              onPress={() => navigation.navigate('Wallet')}
            />

            <SharedPiggyInvitationsSection compact />

            <BehaviorHubCard
              isLoading={behaviorCardLoading}
              hasStatusError={surveyStatusError}
              hasProfileIssue={hasCompletedSurvey && (behaviorProfileError || !behaviorProfile)}
              hasInsightsIssue={hasCompletedSurvey && !behaviorInsightsLoading && behaviorInsightsError}
              hasCompletedSurvey={hasCompletedSurvey}
              segmentName={behaviorProfile?.segmentDisplayName}
              riskLevel={behaviorProfile?.riskLevel}
              topAction={topActionLabel}
              themedStyles={themedStyles}
              title={t('behavior.homeCardTitle')}
              incompleteTitle={t('behavior.incompleteTitle')}
              incompleteSubtitle={t('behavior.incompleteSubtitle')}
              completeSurveyLabel={t('behavior.completeSurveyCta')}
              profileLabel={t('behavior.viewProfile')}
              riskLabel={t('behavior.riskLabel')}
              actionLabel={t('behavior.topAction')}
              planLabel={t('behavior.improveSavingPlan')}
              loadingLabel={t('common.loading')}
              retryLabel={t('common.retry')}
              loadingErrorLabel={t('common.loadingError')}
              profileUnavailableLabel={t('behavior.profilePendingSubtitle')}
              insightsUnavailableLabel={t('behavior.insightsUnavailable')}
              unknownLabel={t('behavior.unknown')}
              onCompleteSurvey={() => navigation.navigate('BehaviorSurvey')}
              onViewProfile={() => navigation.navigate('BehaviorProfile')}
              onImprovePlan={() => navigation.navigate('Wallet', { initialTab: 'plan' })}
              onRetry={() => {
                void refetchSurveyStatus();
                void refetchBehaviorProfile();
                void refetchBehaviorInsights();
              }}
            />

            <SavingOverviewCard
              plan={savingPlanData}
              isLoading={savingPlanLoading}
              isError={savingPlanError}
              currencyFormatter={currencyFormatter}
              numberFormatter={numberFormatter}
              themedStyles={themedStyles}
              title={t('savingOverview.title')}
              feasibilityLabel={t('savingOverview.feasibility')}
              topAllocationsLabel={t('savingOverview.topAllocations')}
              emptyLabel={t('savingOverview.empty')}
              loadingLabel={t('savingOverview.loading')}
              retryLabel={t('common.retry')}
              viewPlanLabel={t('savingOverview.viewPlan')}
              viewTargetsLabel={t('savingOverview.viewTargets')}
              onRetry={() => refetchSavingPlan()}
              onViewPlan={() => navigation.navigate('Wallet', { initialTab: 'plan' })}
              onViewTargets={() => navigation.navigate('Wallet', { initialTab: 'targets' })}
            />

            <AIAdvisorCard
              hasCompletedSurvey={hasCompletedSurvey}
              themedStyles={themedStyles}
              title={companionCardText.title}
              subtitle={companionCardText.subtitle}
              ctaLabel={companionCardText.cta}
              onPress={() =>
                hasCompletedSurvey
                  ? navigation.navigate('PetChat')
                  : navigation.navigate('BehaviorSurvey')
              }
            />

            <QuickActionButtons
              onAddIncome={navigateToAddTransaction}
              onAddExpense={navigateToAddTransaction}
            />

            <PetStreakCard
              level={gamificationData?.level || 1}
              streakDays={gamificationData?.currentStreak || 0}
              onPress={() => navigation.navigate('Pet')}
            />

            <RecentTransactionsList
              transactions={isEmpty ? [] : transactions}
              onSeeAll={() => navigation.navigate('TransactionHistory', { walletId: undefined })}
              onTransactionPress={handleTransactionPress}
              onEmptyCta={navigateToAddTransaction}
            />

            <AnalysisSummaryCard
              locale={locale}
              labels={analysisLabels}
              colors={colors}
              availableTabs={availableAnalysisTabs}
              tabLabels={analysisTabLabels}
              selectedTab={selectedAnalysisTab}
              onSelectTab={handleAnalysisTabPress}
              selectedIncome={selectedIncome}
              selectedExpense={selectedExpense}
              selectedDelta={selectedDelta}
              topCategory={selectedTopCategory}
              hasData={selectedHasData}
              summaryText={analysisSummaryText}
              errorMessage={selectedAnalysisErrorMessage}
              onRetry={handleAnalysisRetry}
            />

            {/* Spending Insights Card */}
            {analyticsData && analyticsData.categoryBreakdown && analyticsData.categoryBreakdown.length > 0 && (
              <SpendingInsightsCard
                analytics={analyticsData}
                themedStyles={themedStyles}
                locale={locale}
                categoryColors={categoryColors}
                title={t('home.spendingInsightsTitle')}
                subtitle={t('home.last30Days')}
                totalSpentLabel={t('home.totalSpent')}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface SavingOverviewCardProps {
  plan?: MonthlySavingPlanResponse;
  isLoading: boolean;
  isError: boolean;
  currencyFormatter: Intl.NumberFormat;
  numberFormatter: Intl.NumberFormat;
  themedStyles: ReturnType<typeof getThemedStyles>;
  title: string;
  feasibilityLabel: string;
  topAllocationsLabel: string;
  emptyLabel: string;
  loadingLabel: string;
  retryLabel: string;
  viewPlanLabel: string;
  viewTargetsLabel: string;
  onRetry: () => void;
  onViewPlan: () => void;
  onViewTargets: () => void;
}

interface BehaviorHubCardProps {
  isLoading: boolean;
  hasStatusError: boolean;
  hasProfileIssue: boolean;
  hasInsightsIssue: boolean;
  hasCompletedSurvey: boolean;
  segmentName?: string;
  riskLevel?: string;
  topAction?: string;
  themedStyles: ReturnType<typeof getThemedStyles>;
  title: string;
  incompleteTitle: string;
  incompleteSubtitle: string;
  completeSurveyLabel: string;
  profileLabel: string;
  riskLabel: string;
  actionLabel: string;
  planLabel: string;
  loadingLabel: string;
  retryLabel: string;
  loadingErrorLabel: string;
  profileUnavailableLabel: string;
  insightsUnavailableLabel: string;
  unknownLabel: string;
  onCompleteSurvey: () => void;
  onViewProfile: () => void;
  onImprovePlan: () => void;
  onRetry: () => void;
}

function BehaviorHubCard({
  isLoading,
  hasStatusError,
  hasProfileIssue,
  hasInsightsIssue,
  hasCompletedSurvey,
  segmentName,
  riskLevel,
  topAction,
  themedStyles,
  title,
  incompleteTitle,
  incompleteSubtitle,
  completeSurveyLabel,
  profileLabel,
  riskLabel,
  actionLabel,
  planLabel,
  loadingLabel,
  retryLabel,
  loadingErrorLabel,
  profileUnavailableLabel,
  insightsUnavailableLabel,
  unknownLabel,
  onCompleteSurvey,
  onViewProfile,
  onImprovePlan,
  onRetry,
}: BehaviorHubCardProps) {
  return (
    <View style={[behaviorCardStyles.card, themedStyles.behaviorCard]}>
      <Text style={[behaviorCardStyles.title, themedStyles.behaviorTitle]}>{title}</Text>
      {isLoading ? (
        <Text style={[behaviorCardStyles.subtitle, themedStyles.behaviorSubtitle]}>{loadingLabel}</Text>
      ) : null}

      {!isLoading && hasStatusError ? (
        <>
          <Text style={[behaviorCardStyles.subtitle, themedStyles.behaviorSubtitle]}>{loadingErrorLabel}</Text>
          <Pressable onPress={onRetry} style={[behaviorCardStyles.secondaryButton, themedStyles.behaviorSecondaryButton]}>
            <Text style={[behaviorCardStyles.secondaryButtonLabel, themedStyles.behaviorSecondaryLabel]}>{retryLabel}</Text>
          </Pressable>
        </>
      ) : null}

      {!isLoading && !hasStatusError && !hasCompletedSurvey ? (
        <>
          <Text style={[behaviorCardStyles.heading, themedStyles.behaviorHeading]}>{incompleteTitle}</Text>
          <Text style={[behaviorCardStyles.subtitle, themedStyles.behaviorSubtitle]}>{incompleteSubtitle}</Text>
          <Pressable onPress={onCompleteSurvey} style={[behaviorCardStyles.primaryButton, themedStyles.behaviorPrimaryButton]}>
            <Text style={[behaviorCardStyles.primaryButtonLabel, themedStyles.behaviorPrimaryLabel]}>{completeSurveyLabel}</Text>
          </Pressable>
        </>
      ) : null}

      {!isLoading && !hasStatusError && hasCompletedSurvey ? (
        <>
          {hasProfileIssue ? (
            <Text style={[behaviorCardStyles.subtitle, themedStyles.behaviorSubtitle]}>{profileUnavailableLabel}</Text>
          ) : null}
          {!hasProfileIssue ? (
            <>
              <View style={behaviorCardStyles.row}>
                <Text style={[behaviorCardStyles.metaLabel, themedStyles.behaviorSubtitle]}>{riskLabel}</Text>
                <Text style={[behaviorCardStyles.metaValue, themedStyles.behaviorValue]}>{riskLevel ?? unknownLabel}</Text>
              </View>
              <View style={behaviorCardStyles.row}>
                <Text style={[behaviorCardStyles.metaLabel, themedStyles.behaviorSubtitle]}>{profileLabel}</Text>
                <Text style={[behaviorCardStyles.metaValue, themedStyles.behaviorValue]}>{segmentName ?? unknownLabel}</Text>
              </View>
              <Text style={[behaviorCardStyles.actionLabel, themedStyles.behaviorSubtitle]}>
                {actionLabel}: {topAction ?? unknownLabel}
              </Text>
              {hasInsightsIssue ? (
                <Text style={[behaviorCardStyles.subtitle, themedStyles.behaviorSubtitle]}>{insightsUnavailableLabel}</Text>
              ) : null}
            </>
          ) : null}

          <View style={behaviorCardStyles.ctaRow}>
            <Pressable onPress={onViewProfile} style={[behaviorCardStyles.secondaryButton, themedStyles.behaviorSecondaryButton]}>
              <Text style={[behaviorCardStyles.secondaryButtonLabel, themedStyles.behaviorSecondaryLabel]}>{profileLabel}</Text>
            </Pressable>
            <Pressable onPress={onImprovePlan} style={[behaviorCardStyles.primaryButton, themedStyles.behaviorPrimaryButton]}>
              <Text style={[behaviorCardStyles.primaryButtonLabel, themedStyles.behaviorPrimaryLabel]}>{planLabel}</Text>
            </Pressable>
          </View>
          {hasProfileIssue || hasInsightsIssue ? (
            <Pressable onPress={onRetry} style={[behaviorCardStyles.planButton, themedStyles.behaviorSecondaryButton]}>
              <Text style={[behaviorCardStyles.secondaryButtonLabel, themedStyles.behaviorSecondaryLabel]}>{retryLabel}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

interface AIAdvisorCardProps {
  hasCompletedSurvey: boolean;
  themedStyles: ReturnType<typeof getThemedStyles>;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onPress: () => void;
}

function AIAdvisorCard({
  hasCompletedSurvey,
  themedStyles,
  title,
  subtitle,
  ctaLabel,
  onPress,
}: AIAdvisorCardProps) {
  return (
    <View style={[advisorCardStyles.card, themedStyles.advisorCard]}>
      <Text style={[advisorCardStyles.title, themedStyles.advisorTitle]}>{title}</Text>
      <Text style={[advisorCardStyles.subtitle, themedStyles.advisorSubtitle]}>{subtitle}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          advisorCardStyles.button,
          hasCompletedSurvey ? themedStyles.advisorPrimaryButton : themedStyles.advisorSecondaryButton,
          pressed && advisorCardStyles.pressed,
        ]}
      >
        <Text
          style={[
            advisorCardStyles.buttonLabel,
            hasCompletedSurvey ? themedStyles.advisorPrimaryLabel : themedStyles.advisorSecondaryLabel,
          ]}
        >
          {ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function SavingOverviewCard({
  plan,
  isLoading,
  isError,
  currencyFormatter,
  numberFormatter,
  themedStyles,
  title,
  feasibilityLabel,
  topAllocationsLabel,
  emptyLabel,
  loadingLabel,
  retryLabel,
  viewPlanLabel,
  viewTargetsLabel,
  onRetry,
  onViewPlan,
  onViewTargets,
}: SavingOverviewCardProps) {
  const topAllocations = (plan?.allocations ?? []).slice(0, 2);

  return (
    <View style={[savingOverviewStyles.card, themedStyles.savingOverviewCard]}>
      <Text style={[savingOverviewStyles.title, themedStyles.savingOverviewTitle]}>{title}</Text>

      {isLoading ? (
        <Text style={[savingOverviewStyles.metaText, themedStyles.savingOverviewMeta]}>{loadingLabel}</Text>
      ) : null}

      {!isLoading && isError ? (
        <Pressable onPress={onRetry} style={savingOverviewStyles.retryWrap}>
          <Text style={[savingOverviewStyles.retryLabel, themedStyles.savingOverviewValue]}>{retryLabel}</Text>
        </Pressable>
      ) : null}

      {!isLoading && !isError ? (
        <>
          <View style={[savingOverviewStyles.row, themedStyles.savingOverviewDivider]}>
            <Text style={[savingOverviewStyles.metaText, themedStyles.savingOverviewMeta]}>
              {feasibilityLabel}
            </Text>
            <Text style={[savingOverviewStyles.feasibilityValue, themedStyles.savingOverviewValue]}>
              {numberFormatter.format(plan?.overallFeasibilityScore ?? 0)}%
            </Text>
          </View>

          <Text style={[savingOverviewStyles.sectionLabel, themedStyles.savingOverviewMeta]}>
            {topAllocationsLabel}
          </Text>
          {topAllocations.length === 0 ? (
            <Text style={[savingOverviewStyles.metaText, themedStyles.savingOverviewMeta]}>
              {emptyLabel}
            </Text>
          ) : (
            topAllocations.map((allocation) => (
              <View key={`${allocation.type}-${allocation.id}`} style={savingOverviewStyles.allocationRow}>
                <Text
                  style={[savingOverviewStyles.allocationTitle, themedStyles.savingOverviewAllocationTitle]}
                  numberOfLines={1}
                >
                  {allocation.title}
                </Text>
                <Text style={[savingOverviewStyles.allocationAmount, themedStyles.savingOverviewAllocationAmount]}>
                  {currencyFormatter.format(allocation.allocatedMonthly)}
                </Text>
              </View>
            ))
          )}
        </>
      ) : null}

      <View style={savingOverviewStyles.ctaRow}>
        <Pressable
          onPress={onViewPlan}
          style={({ pressed }) => [
            savingOverviewStyles.primaryButton,
            themedStyles.savingOverviewPrimaryButton,
            pressed && savingOverviewStyles.pressed,
          ]}
        >
          <Text style={[savingOverviewStyles.primaryButtonLabel, themedStyles.savingOverviewPrimaryLabel]}>
            {viewPlanLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={onViewTargets}
          style={({ pressed }) => [
            savingOverviewStyles.secondaryButton,
            themedStyles.savingOverviewSecondaryButton,
            pressed && savingOverviewStyles.pressed,
          ]}
        >
          <Text style={[savingOverviewStyles.secondaryButtonLabel, themedStyles.savingOverviewSecondaryLabel]}>
            {viewTargetsLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

interface AnalysisSummaryCardProps {
  locale: string;
  colors: ReturnType<typeof useThemeStore>['colors'];
  availableTabs: AnalysisTab[];
  tabLabels: Record<AnalysisTab, string>;
  labels: {
    title: string;
    income: string;
    expense: string;
    delta: string;
    topCategory: string;
    empty: string;
    topCategoryFallback: string;
    error: string;
    retry: string;
  };
  selectedTab: AnalysisTab;
  onSelectTab: (tab: AnalysisTab) => void;
  selectedIncome: number;
  selectedExpense: number;
  selectedDelta: number;
  topCategory?: string;
  hasData: boolean;
  summaryText: string;
  errorMessage: string | null;
  onRetry: () => void;
}

function AnalysisSummaryCard({
  locale,
  colors,
  availableTabs,
  tabLabels,
  labels,
  selectedTab,
  onSelectTab,
  selectedIncome,
  selectedExpense,
  selectedDelta,
  topCategory,
  hasData,
  summaryText,
  errorMessage,
  onRetry,
}: AnalysisSummaryCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);

  const deltaColor = selectedDelta >= 0 ? colors.success : colors.error;

  return (
    <View style={[analysisCardStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[analysisCardStyles.title, { color: colors.text }]}>{labels.title}</Text>

      <View style={analysisCardStyles.tabRow}>
        {availableTabs.map((tab) => {
          const isActive = selectedTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => onSelectTab(tab)}
              style={[
                analysisCardStyles.tab,
                {
                  backgroundColor: isActive ? colors.primary : colors.backgroundSecondary,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                analysisCardStyles.tabLabel,
                { color: isActive ? colors.textOnPrimary ?? '#fff' : colors.text },
              ]}
              >
                {tabLabels[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {errorMessage ? (
        <View style={[analysisCardStyles.errorBox, { backgroundColor: `${colors.error}12`, borderColor: colors.error }]}>
          <Text style={[analysisCardStyles.errorTitle, { color: colors.error }]}>{labels.error}</Text>
          <Text style={[analysisCardStyles.errorMessage, { color: colors.text }]}>{errorMessage}</Text>
          <Pressable
            style={[analysisCardStyles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRetry}
          >
            <Text style={[analysisCardStyles.retryButtonText, { color: colors.textOnPrimary ?? '#fff' }]}>
              {labels.retry}
            </Text>
          </Pressable>
        </View>
      ) : !hasData ? (
        <Text style={[analysisCardStyles.emptyText, { color: colors.textSecondary }]}>{labels.empty}</Text>
      ) : (
        <>
          <View style={analysisCardStyles.metricGrid}>
            <View style={analysisCardStyles.metricItem}>
              <Text style={[analysisCardStyles.metricLabel, { color: colors.textSecondary }]}>{labels.income}</Text>
              <Text style={[analysisCardStyles.metricValue, { color: colors.text }]}>{formatCurrency(selectedIncome)}</Text>
            </View>
            <View style={analysisCardStyles.metricItem}>
              <Text style={[analysisCardStyles.metricLabel, { color: colors.textSecondary }]}>{labels.expense}</Text>
              <Text style={[analysisCardStyles.metricValue, { color: colors.text }]}>{formatCurrency(selectedExpense)}</Text>
            </View>
            <View style={analysisCardStyles.metricItem}>
              <Text style={[analysisCardStyles.metricLabel, { color: colors.textSecondary }]}>{labels.delta}</Text>
              <Text style={[analysisCardStyles.metricValue, { color: deltaColor }]}>{formatCurrency(selectedDelta)}</Text>
            </View>
            <View style={analysisCardStyles.metricItem}>
              <Text style={[analysisCardStyles.metricLabel, { color: colors.textSecondary }]}>{labels.topCategory}</Text>
              <Text style={[analysisCardStyles.metricValue, { color: colors.text }]} numberOfLines={1}>
                {topCategory || labels.topCategoryFallback}
              </Text>
            </View>
          </View>

          <View style={[analysisCardStyles.summaryBubble, { backgroundColor: `${colors.primary}12` }]}>
            <Text style={[analysisCardStyles.summaryText, { color: colors.text }]}>{summaryText}</Text>
          </View>
        </>
      )}
    </View>
  );
}

function buildRuleBasedHomeSummary(
  totalBalance: number,
  income: number,
  expense: number,
  t: TranslateFn
): string {
  if (expense > income * 1.2 && expense > 0) {
    return t('home.summary.highSpending');
  }
  if (income > expense && totalBalance > 0) {
    return t('home.summary.positive');
  }
  return t('home.summary.steady');
}

function buildRuleBasedAnalysisSummary(
  tab: AnalysisTab,
  income: number,
  expense: number,
  topCategory: string | undefined,
  t: TranslateFn
): string {
  const periodByTab: Record<AnalysisTab, string> = {
    DAY: t('home.analysis.period.day'),
    WEEK: t('home.analysis.period.week'),
    MONTH: t('home.analysis.period.month'),
    YEAR: t('home.analysis.period.year'),
  };
  const period = periodByTab[tab];

  if (income >= expense) {
    if (topCategory) {
      return t('home.analysis.summary.positiveWithCategory', {
        period,
        category: topCategory,
      });
    }
    return t('home.analysis.summary.positive', { period });
  }

  if (topCategory) {
    return t('home.analysis.summary.negativeWithCategory', {
      period,
      category: topCategory,
    });
  }
  return t('home.analysis.summary.negative', { period });
}

// Dynamic themed styles - must be before static styles
const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    insightCard: {
      backgroundColor: colors.surface,
    },
    insightTitle: {
      color: colors.text,
    },
    insightSubtitle: {
      color: colors.textSecondary,
    },
    insightTotalRow: {
      borderBottomColor: colors.border,
    },
    insightTotalLabel: {
      color: colors.textSecondary,
    },
    insightTotalValue: {
      color: colors.text,
    },
    insightCategoryName: {
      color: colors.text,
    },
    insightCategoryAmount: {
      color: colors.text,
    },
    insightCategoryPercent: {
      color: colors.textSecondary,
    },
    errorCard: {
      backgroundColor: colors.surface,
    },
    errorTitle: {
      color: colors.text,
    },
    errorSubtitle: {
      color: colors.textSecondary,
    },
    errorButton: {
      backgroundColor: colors.primary,
    },
    errorButtonLabel: {
      color: colors.textOnPrimary ?? colors.text,
    },
    savingOverviewCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    savingOverviewTitle: {
      color: colors.text,
    },
    savingOverviewMeta: {
      color: colors.textSecondary,
    },
    savingOverviewValue: {
      color: colors.primary,
    },
    savingOverviewDivider: {
      borderBottomColor: colors.border,
    },
    savingOverviewAllocationTitle: {
      color: colors.text,
    },
    savingOverviewAllocationAmount: {
      color: colors.textSecondary,
    },
    savingOverviewPrimaryButton: {
      backgroundColor: colors.primary,
    },
    savingOverviewPrimaryLabel: {
      color: colors.textOnPrimary ?? colors.text,
    },
    savingOverviewSecondaryButton: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    savingOverviewSecondaryLabel: {
      color: colors.text,
    },
    behaviorCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    behaviorTitle: {
      color: colors.text,
    },
    behaviorHeading: {
      color: colors.text,
    },
    behaviorSubtitle: {
      color: colors.textSecondary,
    },
    behaviorValue: {
      color: colors.primary,
    },
    behaviorPrimaryButton: {
      backgroundColor: colors.primary,
    },
    behaviorPrimaryLabel: {
      color: colors.textOnPrimary ?? colors.text,
    },
    behaviorSecondaryButton: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
    },
    behaviorSecondaryLabel: {
      color: colors.text,
    },
    advisorCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    advisorTitle: {
      color: colors.text,
    },
    advisorSubtitle: {
      color: colors.textSecondary,
    },
    advisorPrimaryButton: {
      backgroundColor: colors.primary,
    },
    advisorPrimaryLabel: {
      color: colors.textOnPrimary ?? colors.text,
    },
    advisorSecondaryButton: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
    },
    advisorSecondaryLabel: {
      color: colors.text,
    },
  });

const coachmarkStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  title: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  message: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  secondaryLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  primaryButton: {
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  primaryLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});

const analysisCardStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.lg,
    marginTop: tokens.spacing.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  title: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  tabRow: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.xs,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  inlineHint: {
    fontSize: tokens.typography.fontSizes.xs,
    lineHeight: 18,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  errorTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  errorMessage: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderRadius: tokens.borderRadius.full,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  retryButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  metricItem: {
    width: '48%',
    gap: 2,
  },
  metricLabel: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  metricValue: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  summaryBubble: {
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
  },
  summaryText: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl + tokens.spacing.md,
  },
});

const behaviorCardStyles = StyleSheet.create({
  card: {
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    marginTop: tokens.spacing.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  title: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  heading: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  metaLabel: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  metaValue: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  actionLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  primaryButton: {
    flex: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  planButton: {
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const advisorCardStyles = StyleSheet.create({
  card: {
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    marginTop: tokens.spacing.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    ...tokens.shadows.sm,
  },
  title: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  button: {
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  pressed: {
    opacity: 0.9,
  },
});

function SkeletonHome() {
  return (
    <View>
      <View style={skeletonStyles.card} />
      <View style={skeletonStyles.actionRow}>
        <View style={skeletonStyles.action} />
        <View style={skeletonStyles.action} />
      </View>
      <View style={skeletonStyles.petCard} />
      <View style={skeletonStyles.transactions} />
    </View>
  );
}

function ErrorState({
  onRetry,
  themedStyles,
  title,
  subtitle,
  retryLabel,
}: {
  onRetry: () => void;
  themedStyles: ReturnType<typeof getThemedStyles>;
  title: string;
  subtitle: string;
  retryLabel: string;
}) {
  return (
    <View style={[errorStyles.card, themedStyles.errorCard]}>
      <Text style={[errorStyles.title, themedStyles.errorTitle]}>{title}</Text>
      <Text style={[errorStyles.subtitle, themedStyles.errorSubtitle]}>{subtitle}</Text>
      <Pressable onPress={onRetry} style={({ pressed }) => [errorStyles.button, themedStyles.errorButton, pressed && errorStyles.pressed]}>
        <Text style={[errorStyles.buttonLabel, themedStyles.errorButtonLabel]}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}

function SpendingInsightsCard({
  analytics,
  themedStyles,
  locale,
  categoryColors,
  title,
  subtitle,
  totalSpentLabel,
}: {
  analytics: { categoryBreakdown: Array<{ categoryId: number; categoryName: string; totalAmount: number }> };
  themedStyles: ReturnType<typeof getThemedStyles>;
  locale: string;
  categoryColors: string[];
  title: string;
  subtitle: string;
  totalSpentLabel: string;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalSpent = analytics.categoryBreakdown.reduce((sum, cat) => sum + cat.totalAmount, 0);
  const topCategories = analytics.categoryBreakdown.slice(0, 4);

  return (
    <View style={[insightStyles.card, themedStyles.insightCard]}>
      <View style={insightStyles.header}>
        <Text style={[insightStyles.title, themedStyles.insightTitle]}>{title}</Text>
        <Text style={[insightStyles.subtitle, themedStyles.insightSubtitle]}>{subtitle}</Text>
      </View>

      <View style={[insightStyles.totalRow, themedStyles.insightTotalRow]}>
        <Text style={[insightStyles.totalLabel, themedStyles.insightTotalLabel]}>{totalSpentLabel}</Text>
        <Text style={[insightStyles.totalValue, themedStyles.insightTotalValue]}>{formatCurrency(totalSpent)}</Text>
      </View>

      <View style={insightStyles.categories}>
        {topCategories.map((cat, index) => {
          const percentage = totalSpent > 0 ? (cat.totalAmount / totalSpent) * 100 : 0;
          const color = categoryColors[index % categoryColors.length];
          return (
            <View key={cat.categoryId} style={insightStyles.categoryItem}>
              <View style={insightStyles.categoryInfo}>
                <View style={[insightStyles.categoryDot, { backgroundColor: color }]} />
                <Text style={[insightStyles.categoryName, themedStyles.insightCategoryName]} numberOfLines={1}>{cat.categoryName}</Text>
              </View>
              <View style={insightStyles.categoryStats}>
                <Text style={[insightStyles.categoryAmount, themedStyles.insightCategoryAmount]}>{formatCurrency(cat.totalAmount)}</Text>
                <Text style={[insightStyles.categoryPercent, themedStyles.insightCategoryPercent]}>{percentage.toFixed(0)}%</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Mini bar visualization */}
      <View style={insightStyles.barContainer}>
        {topCategories.map((cat, index) => {
          const percentage = totalSpent > 0 ? (cat.totalAmount / totalSpent) * 100 : 0;
          const color = categoryColors[index % categoryColors.length];
          return (
            <View
              key={cat.categoryId}
              style={[
                insightStyles.barSegment,
                {
                  flex: percentage,
                  backgroundColor: color,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const insightStyles = StyleSheet.create({
  card: {
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    marginTop: tokens.spacing.md,
    ...tokens.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  title: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    marginBottom: tokens.spacing.sm,
  },
  totalLabel: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  totalValue: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  categories: {
    gap: tokens.spacing.xs,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: tokens.spacing.xs,
  },
  categoryName: {
    fontSize: tokens.typography.fontSizes.sm,
    flex: 1,
  },
  categoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  categoryAmount: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  categoryPercent: {
    fontSize: tokens.typography.fontSizes.xs,
    width: 32,
    textAlign: 'right',
  },
  barContainer: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: tokens.spacing.md,
  },
  barSegment: {
    height: '100%',
  },
});

const savingOverviewStyles = StyleSheet.create({
  card: {
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    marginTop: tokens.spacing.md,
    borderWidth: 1,
    ...tokens.shadows.sm,
    gap: tokens.spacing.sm,
  },
  title: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  feasibilityValue: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  sectionLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  allocationTitle: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  allocationAmount: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  primaryButton: {
    flex: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  secondaryButtonLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  retryWrap: {
    alignSelf: 'flex-start',
  },
  retryLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  pressed: {
    opacity: 0.85,
  },
});

const skeletonStyles = StyleSheet.create({
  card: {
    height: 180,
    borderRadius: 24,
    backgroundColor: tokens.colors.backgroundSecondary,
    marginBottom: tokens.spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  action: {
    flex: 1,
    height: 56,
    borderRadius: 999,
    backgroundColor: tokens.colors.backgroundSecondary,
  },
  petCard: {
    height: 96,
    borderRadius: tokens.borderRadius.lg,
    backgroundColor: tokens.colors.backgroundSecondary,
    marginBottom: tokens.spacing.lg,
  },
  transactions: {
    height: 220,
    borderRadius: 24,
    backgroundColor: tokens.colors.backgroundSecondary,
  },
});

const errorStyles = StyleSheet.create({
  card: {
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
    ...tokens.shadows.sm,
  },
  title: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  subtitle: {
    marginTop: 4,
    fontSize: tokens.typography.fontSizes.sm,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.full,
  },
  buttonLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  pressed: {
    opacity: 0.8,
  },
});

