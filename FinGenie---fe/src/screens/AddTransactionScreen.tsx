import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormDatePicker, FormInput, FormSelect, LoadingButton } from '../components/form';
import {
  aiApi,
  categoriesApi,
  CategoryResponse,
  goalsApi,
  piggiesApi,
  transactionsApi,
  transactionsSuggestionsApi,
  type TodayTransactionSuggestionResponse,
  type TransactionResponse,
  walletsApi,
  WalletResponse,
} from '../api/modules';
import { invalidateSavingsGraph, savingsKeys } from '../queryKeys/savings.keys';
import { useI18n } from '../i18n/useI18n';
import { useThemeStore } from '../store/themeStore';
import { showToast } from '../system';
import { tokens } from '../theme';
import { useForm, transactionValidationSchema } from '../utils/validation';

type TransactionType = 'INCOME' | 'EXPENSE';
type SavingTargetType = 'GOAL' | 'PIGGY';

interface TransactionFormData {
  amount: string;
  description: string;
  walletId: string;
  categoryId: string;
  date: Date;
  type: TransactionType;
}

interface NormalizedSuggestion {
  transactionType: TransactionType | null;
  categoryId: number | null;
  categoryName: string | null;
  amount: number | null;
  note: string | null;
  reason: string | null;
}

interface IncomeAllocationTarget {
  type: SavingTargetType;
  id: number;
  title: string;
  ratio: number;
}

const SUGGESTION_DISMISS_TODAY_STORAGE_KEY = 'fingenie:transaction-suggestion-dismiss-today';
const ROLLING_INCOME_WINDOW_DAYS = 60;

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseAmountInput(rawAmount: string): number {
  const normalized = rawAmount.replace(/,/g, '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getMedian(values: number[]): number | null {
  if (!values.length) {
    return null;
  }

  const middle = Math.floor(values.length / 2);
  if (values.length % 2 === 0) {
    return (values[middle - 1] + values[middle]) / 2;
  }

  return values[middle];
}

function normalizeSuggestion(
  suggestion: TodayTransactionSuggestionResponse | null | undefined
): NormalizedSuggestion | null {
  if (!suggestion) {
    return null;
  }

  const rawType = suggestion.transactionType ?? suggestion.type ?? null;
  const transactionType: TransactionType | null =
    rawType === 'INCOME' || rawType === 'EXPENSE' ? rawType : null;

  const amount = typeof suggestion.amount === 'number' ? suggestion.amount : null;
  const note = suggestion.note ?? suggestion.description ?? null;
  const reason = suggestion.reason ?? null;
  const categoryId = typeof suggestion.categoryId === 'number' ? suggestion.categoryId : null;
  const categoryName = suggestion.categoryName ?? null;

  if (!transactionType && amount == null && !note && !reason && categoryId == null && !categoryName) {
    return null;
  }

  return {
    transactionType,
    categoryId,
    categoryName,
    amount,
    note,
    reason,
  };
}

export function AddTransactionScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const { t, locale } = useI18n();

  const themedStyles = useMemo(() => getThemedStyles(colors), [colors]);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [isSuggestionIgnored, setSuggestionIgnored] = useState(false);
  const [isSuggestionDismissedToday, setSuggestionDismissedToday] = useState(false);

  const initialValues: TransactionFormData = {
    amount: '',
    description: '',
    walletId: '',
    categoryId: '',
    date: new Date(),
    type: 'EXPENSE',
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setTouched,
    handleSubmit,
  } = useForm<TransactionFormData>({
    initialValues,
    schema: transactionValidationSchema,
    onSubmit: async (formValues) => {
      await createTransactionMutation.mutateAsync(formValues);
    },
  });

  const parsedAmount = useMemo(() => parseAmountInput(values.amount), [values.amount]);

  const { data: walletsData, isLoading: loadingWallets } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const res = await walletsApi.getAll();
      return res.data;
    },
  });

  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await categoriesApi.getAll();
      return res.data;
    },
  });

  const {
    data: rawTodaySuggestion,
    isError: isTodaySuggestionError,
    isFetching: isTodaySuggestionFetching,
    refetch: refetchTodaySuggestion,
  } = useQuery({
    queryKey: ['transactions', 'suggestions', 'today'],
    queryFn: async () => {
      const res = await transactionsSuggestionsApi.getToday();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(SUGGESTION_DISMISS_TODAY_STORAGE_KEY)
      .then((value) => {
        if (!isMounted) {
          return;
        }
        setSuggestionDismissedToday(value === getTodayKey());
      })
      .catch(() => {
        if (isMounted) {
          setSuggestionDismissedToday(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const todaySuggestion = useMemo(
    () => normalizeSuggestion(rawTodaySuggestion),
    [rawTodaySuggestion]
  );

  const shouldShowSuggestionBar =
    Boolean(todaySuggestion) && !isSuggestionIgnored && !isSuggestionDismissedToday;
  const shouldShowSuggestionError =
    !todaySuggestion &&
    !isSuggestionIgnored &&
    !isSuggestionDismissedToday &&
    isTodaySuggestionError;
  const isIncomeFlow = transactionType === 'INCOME' && parsedAmount > 0;

  const { data: optimizedPlan } = useQuery({
    queryKey: savingsKeys.monthlySavingPlan('optimized'),
    enabled: isIncomeFlow,
    queryFn: async () => {
      const response = await aiApi.monthlyPlan.getPlan('optimized');
      return response.data;
    },
  });

  const { data: savingTargets } = useQuery({
    queryKey: savingsKeys.savingTargets(),
    enabled: isIncomeFlow,
    queryFn: async () => {
      const response = await aiApi.savingTargets.list();
      return response.data;
    },
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['transactions', 'income-baseline', ROLLING_INCOME_WINDOW_DAYS],
    enabled: isIncomeFlow,
    queryFn: async () => {
      const response = await transactionsApi.getAll();
      return response.data;
    },
  });

  const rollingIncomeMedian = useMemo(() => {
    const windowStartMs = Date.now() - ROLLING_INCOME_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const incomeValues = (recentTransactions ?? [])
      .filter((transaction: TransactionResponse) => transaction.transactionType === 'INCOME')
      .filter((transaction: TransactionResponse) => {
        const transactionMs = new Date(transaction.transactionDate).getTime();
        return Number.isFinite(transactionMs) && transactionMs >= windowStartMs;
      })
      .map((transaction: TransactionResponse) => transaction.amount)
      .filter((amount) => Number.isFinite(amount) && amount > 0)
      .sort((left, right) => left - right);

    return getMedian(incomeValues);
  }, [recentTransactions]);

  const incomeAllocationTarget = useMemo<IncomeAllocationTarget | null>(() => {
    const planAllocations = optimizedPlan?.allocations ?? [];
    const firstPlanAllocation = planAllocations.find(
      (allocation) => allocation.allocatedMonthly > 0
    );

    if (firstPlanAllocation) {
      const totalAllocated = planAllocations.reduce(
        (sum, item) => sum + Math.max(0, item.allocatedMonthly),
        0
      );
      const rawRatio =
        totalAllocated > 0 ? firstPlanAllocation.allocatedMonthly / totalAllocated : 0.1;
      const ratio = Number.isFinite(rawRatio) && rawRatio > 0 ? Math.min(rawRatio, 1) : 0.1;

      return {
        type: firstPlanAllocation.type,
        id: firstPlanAllocation.id,
        title: firstPlanAllocation.title,
        ratio,
      };
    }

    const fallbackTarget = savingTargets?.[0];
    if (!fallbackTarget) {
      return null;
    }

    return {
      type: fallbackTarget.type,
      id: fallbackTarget.id,
      title: fallbackTarget.title,
      ratio: 0.1,
    };
  }, [optimizedPlan?.allocations, savingTargets]);

  const suggestedAllocationRatio = useMemo(() => {
    const planRatio = incomeAllocationTarget?.ratio ?? 0.1;

    if (!isIncomeFlow || !rollingIncomeMedian || rollingIncomeMedian <= 0) {
      return planRatio;
    }

    const ratioToBaseline = parsedAmount / rollingIncomeMedian;
    let adaptiveRatio = 0.1;

    if (ratioToBaseline < 0.8) {
      adaptiveRatio = 0.05;
    } else if (ratioToBaseline > 1.2) {
      adaptiveRatio = 0.15;
    }

    const blendedRatio = (planRatio + adaptiveRatio) / 2;
    return Math.min(0.3, Math.max(0.05, blendedRatio));
  }, [incomeAllocationTarget?.ratio, isIncomeFlow, parsedAmount, rollingIncomeMedian]);

  const suggestedAllocationAmount = useMemo(() => {
    if (!isIncomeFlow) {
      return 0;
    }
    const suggested = Math.round(parsedAmount * suggestedAllocationRatio);
    return suggested > 0 ? suggested : 0;
  }, [isIncomeFlow, parsedAmount, suggestedAllocationRatio]);

  const suggestedAllocationPercent = useMemo(
    () => Math.max(1, Math.round(suggestedAllocationRatio * 100)),
    [suggestedAllocationRatio]
  );

  const suggestedCategoryLabel = useMemo(() => {
    if (!todaySuggestion) {
      return t('transaction.suggestion.notProvided');
    }

    if (todaySuggestion.categoryName) {
      return todaySuggestion.categoryName;
    }

    if (todaySuggestion.categoryId) {
      const matchedCategory = categoriesData?.find(
        (category: CategoryResponse) => category.categoryId === todaySuggestion.categoryId
      );
      if (matchedCategory?.categoryName) {
        return matchedCategory.categoryName;
      }
    }

    return t('transaction.suggestion.notProvided');
  }, [categoriesData, t, todaySuggestion]);

  const walletOptions = useMemo(() => {
    if (!walletsData) {
      return [];
    }

    return walletsData.map((wallet: WalletResponse) => ({
      label: `${wallet.walletName} (${currencyFormatter.format(wallet.balance ?? 0)})`,
      value: wallet.walletId.toString(),
    }));
  }, [currencyFormatter, walletsData]);

  const categoryOptions = useMemo(() => {
    if (!categoriesData) {
      return [];
    }

    return categoriesData
      .filter(
        (category: CategoryResponse) =>
          category.categoryType === transactionType || !category.categoryType
      )
      .map((category: CategoryResponse) => ({
        label: category.categoryName,
        value: category.categoryId.toString(),
      }));
  }, [categoriesData, transactionType]);

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      return categoriesApi.create({
        categoryName: name,
        categoryType: transactionType,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      Alert.alert(t('common.success'), t('category.createdSuccess'));
      setShowCategoryModal(false);
      setNewCategoryName('');
      if (response?.data?.categoryId) {
        setValue('categoryId', response.data.categoryId.toString());
      }
    },
    onError: () => {
      Alert.alert(t('common.error'), t('transaction.categoryCreateFailed'));
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (formData: TransactionFormData) => {
      const payload = {
        amount: Number.parseFloat(formData.amount),
        description: formData.description || undefined,
        walletId: Number.parseInt(formData.walletId, 10),
        categoryId: Number.parseInt(formData.categoryId, 10),
        transactionDate: formData.date.toISOString(),
        transactionType: formData.type,
      };
      return transactionsApi.create(payload);
    },
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey: ['wallets'] });
      await queryClient.cancelQueries({ queryKey: ['transactions'] });

      const previousWallets = queryClient.getQueryData(['wallets']);

      queryClient.setQueryData<WalletResponse[]>(['wallets'], (old) => {
        if (!old) {
          return old;
        }

        return old.map((wallet) => {
          if (wallet.walletId.toString() === formData.walletId) {
            const amountChange = Number.parseFloat(formData.amount);
            const newBalance =
              formData.type === 'INCOME'
                ? (wallet.balance || 0) + amountChange
                : (wallet.balance || 0) - amountChange;
            return { ...wallet, balance: newBalance };
          }
          return wallet;
        });
      });

      return { previousWallets };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousWallets) {
        queryClient.setQueryData(['wallets'], context.previousWallets);
      }
      showToast(t('transaction.createFailed'));
    },
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallets'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions', 'recent'] }),
        queryClient.invalidateQueries({ queryKey: ['analyticsHome'] }),
        queryClient.invalidateQueries({ queryKey: ['analysis', 'day'] }),
        queryClient.invalidateQueries({ queryKey: ['analysis', 'week'] }),
        queryClient.invalidateQueries({ queryKey: ['analysis', 'month'] }),
        queryClient.invalidateQueries({ queryKey: ['analysis', 'year'] }),
        queryClient.invalidateQueries({ queryKey: ['experienceDashboard'] }),
      ]);
      showToast(t('transaction.addSuccess'));
      navigation.goBack();
    },
  });

  const applyIncomeSuggestionMutation = useMutation({
    mutationFn: async () => {
      if (!incomeAllocationTarget || suggestedAllocationAmount <= 0) {
        throw new Error('INCOME_ALLOCATION_TARGET_UNAVAILABLE');
      }

      if (incomeAllocationTarget.type === 'GOAL') {
        await goalsApi.contribute(incomeAllocationTarget.id, suggestedAllocationAmount, 'AUTO');
        return { goalId: incomeAllocationTarget.id, piggyId: null };
      }

      await piggiesApi.contribute(incomeAllocationTarget.id, suggestedAllocationAmount, 'AUTO');
      return { goalId: null, piggyId: incomeAllocationTarget.id };
    },
    onSuccess: async ({ goalId, piggyId }) => {
      await invalidateSavingsGraph(queryClient, {
        goalId,
        piggyId,
      });
      Alert.alert(t('common.success'), t('incomeAllocation.applySuccess'));
    },
    onError: () => {
      Alert.alert(t('common.error'), t('incomeAllocation.applyError'));
    },
  });

  const handleCreateCategory = useCallback(() => {
    if (!newCategoryName.trim()) {
      Alert.alert(t('common.error'), t('transaction.categoryNameRequired'));
      return;
    }
    createCategoryMutation.mutate(newCategoryName.trim());
  }, [createCategoryMutation, newCategoryName, t]);

  const handleTypeChange = useCallback(
    (type: TransactionType) => {
      setTransactionType(type);
      setValue('type', type);
      setValue('categoryId', '');
    },
    [setValue]
  );

  const handleDateChange = useCallback(
    (date: Date) => {
      setValue('date', date);
    },
    [setValue]
  );

  const handleApplySuggestionToForm = useCallback(() => {
    if (!todaySuggestion) {
      return;
    }

    if (todaySuggestion.transactionType) {
      handleTypeChange(todaySuggestion.transactionType);
    }

    if (todaySuggestion.amount != null) {
      setValue('amount', `${todaySuggestion.amount}`);
    }

    if (todaySuggestion.categoryId != null) {
      setValue('categoryId', `${todaySuggestion.categoryId}`);
    }

    if (todaySuggestion.note) {
      setValue('description', todaySuggestion.note);
    }

    setSuggestionIgnored(true);
    setShowSuggestionModal(false);

    Alert.alert(t('common.success'), t('transaction.suggestion.applied'));
  }, [handleTypeChange, setValue, t, todaySuggestion]);

  const handleIgnoreSuggestion = useCallback(() => {
    setSuggestionIgnored(true);
    setShowSuggestionModal(false);
  }, []);

  const handleNotRemindToday = useCallback(async () => {
    try {
      await AsyncStorage.setItem(SUGGESTION_DISMISS_TODAY_STORAGE_KEY, getTodayKey());
    } finally {
      setSuggestionDismissedToday(true);
      setShowSuggestionModal(false);
    }
  }, []);

  const handleApplyIncomeSuggestion = useCallback(() => {
    if (!incomeAllocationTarget || suggestedAllocationAmount <= 0) {
      Alert.alert(t('common.error'), t('incomeAllocation.targetUnavailable'));
      return;
    }

    Alert.alert(
      t('incomeAllocation.confirmTitle'),
      `${t('incomeAllocation.confirmMessage')} ${currencyFormatter.format(
        suggestedAllocationAmount
      )}.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => {
            applyIncomeSuggestionMutation.mutate();
          },
        },
      ]
    );
  }, [
    applyIncomeSuggestionMutation,
    currencyFormatter,
    incomeAllocationTarget,
    suggestedAllocationAmount,
    t,
  ]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('transaction.add')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
              {t('transaction.subtitle')}
            </Text>
          </View>

          <View style={styles.typeToggleContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                { backgroundColor: colors.surface },
                transactionType === 'EXPENSE' && themedStyles.typeButtonActiveExpense,
              ]}
              onPress={() => handleTypeChange('EXPENSE')}
              accessibilityRole="button"
              accessibilityState={{ selected: transactionType === 'EXPENSE' }}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: colors.text },
                  transactionType === 'EXPENSE' && themedStyles.typeButtonTextActive,
                ]}
              >
                {t('transaction.expense')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                { backgroundColor: colors.surface },
                transactionType === 'INCOME' && themedStyles.typeButtonActiveIncome,
              ]}
              onPress={() => handleTypeChange('INCOME')}
              accessibilityRole="button"
              accessibilityState={{ selected: transactionType === 'INCOME' }}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: colors.text },
                  transactionType === 'INCOME' && themedStyles.typeButtonTextActive,
                ]}
              >
                {t('transaction.income')}
              </Text>
            </TouchableOpacity>
          </View>

          <FormInput
            label={t('transaction.amount')}
            placeholder={t('transaction.amountPlaceholder')}
            value={values.amount}
            onChangeText={(text) => setValue('amount', text)}
            onBlur={() => setTouched('amount')}
            error={touched.amount ? errors.amount : undefined}
            keyboardType="decimal-pad"
            required
          />

          {isIncomeFlow ? (
            <View style={[styles.incomeSuggestionCard, themedStyles.incomeSuggestionCard]}>
              <Text style={[styles.incomeSuggestionTitle, { color: colors.text }]}> 
                {t('incomeAllocation.title')}
              </Text>
              <Text style={[styles.incomeSuggestionSubtitle, { color: colors.textSecondary }]}> 
                {t('incomeAllocation.subtitle')}
              </Text>
              <Text style={[styles.incomeSuggestionLine, { color: colors.textSecondary }]}> 
                {t('incomeAllocation.targetLabel')}:{' '}
                {incomeAllocationTarget?.title ?? t('incomeAllocation.targetUnavailable')}
              </Text>
              <Text style={[styles.incomeSuggestionLine, { color: colors.textSecondary }]}> 
                {t('incomeAllocation.amountLabel')}: {currencyFormatter.format(suggestedAllocationAmount)} ({suggestedAllocationPercent}%)
              </Text>
              <TouchableOpacity
                style={[
                  styles.incomeSuggestionButton,
                  { backgroundColor: colors.primary },
                  (!incomeAllocationTarget || applyIncomeSuggestionMutation.isPending) && {
                    backgroundColor: colors.disabled,
                  },
                ]}
                onPress={handleApplyIncomeSuggestion}
                disabled={!incomeAllocationTarget || applyIncomeSuggestionMutation.isPending}
              >
                <Text style={[styles.incomeSuggestionButtonText, { color: colors.textOnPrimary ?? colors.text }]}> 
                  {applyIncomeSuggestionMutation.isPending
                    ? t('common.loading')
                    : t('incomeAllocation.apply')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <FormSelect
            label={t('transaction.wallet')}
            placeholder={t('transaction.selectWallet')}
            value={values.walletId}
            options={walletOptions}
            onChange={(value) => setValue('walletId', value as string)}
            error={touched.walletId ? errors.walletId : undefined}
            disabled={loadingWallets}
            required
          />

          <View style={styles.categoryContainer}>
            <View style={styles.categorySelectWrapper}>
              <FormSelect
                label={t('transaction.category')}
                placeholder={t('transaction.selectCategory')}
                value={values.categoryId}
                options={categoryOptions}
                onChange={(value) => setValue('categoryId', value as string)}
                error={touched.categoryId ? errors.categoryId : undefined}
                disabled={loadingCategories}
                required
              />
            </View>
            <TouchableOpacity
              style={[styles.addCategoryButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={[styles.addCategoryButtonText, themedStyles.addCategoryButtonText]}>+</Text>
            </TouchableOpacity>
          </View>

          <FormDatePicker
            label={t('transaction.date')}
            value={values.date}
            onChange={handleDateChange}
            maxDate={new Date()}
          />

          <FormInput
            label={t('transaction.note')}
            placeholder={t('transaction.notePlaceholder')}
            value={values.description}
            onChangeText={(text) => setValue('description', text)}
            onBlur={() => setTouched('description')}
            multiline
            numberOfLines={3}
          />

          {shouldShowSuggestionBar ? (
            <View style={[styles.suggestionBar, themedStyles.suggestionBar]}>
              <View style={styles.suggestionTextWrap}>
                <Text style={[styles.suggestionTitle, { color: colors.text }]}> 
                  {t('transaction.suggestion.title')}
                </Text>
                <Text style={[styles.suggestionSubtitle, { color: colors.textSecondary }]}> 
                  {t('transaction.suggestion.subtitle')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.suggestionActionButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowSuggestionModal(true)}
              >
                <Text style={[styles.suggestionActionButtonText, { color: colors.textOnPrimary ?? colors.text }]}> 
                  {t('transaction.suggestion.view')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {shouldShowSuggestionError ? (
            <View style={[styles.suggestionErrorBar, themedStyles.suggestionErrorBar]}>
              <View style={styles.suggestionTextWrap}>
                <Text style={[styles.suggestionTitle, { color: colors.text }]}>
                  {t('common.loadingError')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.suggestionRetryButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => {
                  void refetchTodaySuggestion();
                }}
                disabled={isTodaySuggestionFetching}
              >
                <Text style={[styles.suggestionSecondaryButtonText, { color: colors.text }]}>
                  {isTodaySuggestionFetching ? t('common.loading') : t('common.retry')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.buttonContainer}>
            <LoadingButton
              title={t('transaction.add')}
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={loadingWallets || loadingCategories}
              variant="primary"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showCategoryModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={[styles.modalOverlay, themedStyles.modalOverlay]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('category.createNew')}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}> 
              {transactionType === 'EXPENSE'
                ? t('category.modalSubtitleExpense')
                : t('category.modalSubtitleIncome')}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={t('category.name')}
              placeholderTextColor={colors.textMuted}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => {
                  setShowCategoryModal(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateCategory}
                disabled={createCategoryMutation.isPending}
              >
                <Text style={[styles.modalButtonText, { color: colors.textOnPrimary ?? colors.text }]}> 
                  {createCategoryMutation.isPending ? t('common.loading') : t('common.create')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSuggestionModal && shouldShowSuggestionBar}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSuggestionModal(false)}
      >
        <View style={[styles.modalOverlay, themedStyles.modalOverlay]}>
          <View
            style={[styles.modalContent, styles.suggestionModalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('transaction.suggestion.modalTitle')}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}> 
              {t('transaction.suggestion.modalSubtitle')}
            </Text>

            <View style={styles.suggestionInfoGroup}>
              <Text style={[styles.suggestionInfoLabel, { color: colors.textSecondary }]}> 
                {t('transaction.suggestion.typeLabel')}
              </Text>
              <Text style={[styles.suggestionInfoValue, { color: colors.text }]}> 
                {todaySuggestion?.transactionType === 'INCOME'
                  ? t('transaction.income')
                  : todaySuggestion?.transactionType === 'EXPENSE'
                    ? t('transaction.expense')
                    : t('transaction.suggestion.notProvided')}
              </Text>
            </View>

            <View style={styles.suggestionInfoGroup}>
              <Text style={[styles.suggestionInfoLabel, { color: colors.textSecondary }]}> 
                {t('transaction.suggestion.categoryLabel')}
              </Text>
              <Text style={[styles.suggestionInfoValue, { color: colors.text }]}>{suggestedCategoryLabel}</Text>
            </View>

            <View style={styles.suggestionInfoGroup}>
              <Text style={[styles.suggestionInfoLabel, { color: colors.textSecondary }]}> 
                {t('transaction.suggestion.amountLabel')}
              </Text>
              <Text style={[styles.suggestionInfoValue, { color: colors.text }]}> 
                {todaySuggestion?.amount != null
                  ? currencyFormatter.format(todaySuggestion.amount)
                  : t('transaction.suggestion.notProvided')}
              </Text>
            </View>

            <View style={styles.suggestionInfoGroup}>
              <Text style={[styles.suggestionInfoLabel, { color: colors.textSecondary }]}> 
                {t('transaction.suggestion.noteLabel')}
              </Text>
              <Text style={[styles.suggestionInfoValue, { color: colors.text }]}> 
                {todaySuggestion?.note || t('transaction.suggestion.notProvided')}
              </Text>
            </View>

            <View style={styles.suggestionInfoGroup}>
              <Text style={[styles.suggestionInfoLabel, { color: colors.textSecondary }]}> 
                {t('transaction.suggestion.reasonLabel')}
              </Text>
              <Text style={[styles.suggestionInfoValue, { color: colors.text }]}> 
                {todaySuggestion?.reason || t('transaction.suggestion.notProvided')}
              </Text>
            </View>

            <View style={styles.suggestionActionsColumn}>
              <TouchableOpacity
                style={[styles.suggestionPrimaryButton, { backgroundColor: colors.primary }]}
                onPress={handleApplySuggestionToForm}
              >
                <Text style={[styles.suggestionPrimaryButtonText, { color: colors.textOnPrimary ?? colors.text }]}> 
                  {t('transaction.suggestion.apply')}
                </Text>
              </TouchableOpacity>

              <View style={styles.suggestionSecondaryRow}>
                <TouchableOpacity
                  style={[styles.suggestionSecondaryButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={handleIgnoreSuggestion}
                >
                  <Text style={[styles.suggestionSecondaryButtonText, { color: colors.text }]}> 
                    {t('transaction.suggestion.ignore')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.suggestionSecondaryButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => {
                    void handleNotRemindToday();
                  }}
                >
                  <Text style={[styles.suggestionSecondaryButtonText, { color: colors.text }]}> 
                    {t('transaction.suggestion.notRemindToday')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    typeButtonActiveExpense: {
      backgroundColor: colors.error,
    },
    typeButtonActiveIncome: {
      backgroundColor: colors.success,
    },
    typeButtonTextActive: {
      color: colors.textOnPrimary ?? colors.text,
    },
    addCategoryButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    modalOverlay: {
      backgroundColor: colors.overlay,
    },
    suggestionBar: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    suggestionErrorBar: {
      backgroundColor: colors.surface,
      borderColor: colors.error,
    },
    incomeSuggestionCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xl,
  },
  header: {
    marginBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.md,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.lg,
    overflow: 'hidden',
  },
  typeButton: {
    flex: 1,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonText: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  incomeSuggestionCard: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
    gap: tokens.spacing.xs,
  },
  incomeSuggestionTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  incomeSuggestionSubtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  incomeSuggestionLine: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  incomeSuggestionButton: {
    marginTop: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
  },
  incomeSuggestionButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  buttonContainer: {
    marginTop: tokens.spacing.lg,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
  },
  categorySelectWrapper: {
    flex: 1,
  },
  addCategoryButton: {
    width: 44,
    height: 44,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  addCategoryButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  suggestionBar: {
    marginTop: tokens.spacing.md,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  suggestionErrorBar: {
    marginTop: tokens.spacing.md,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  suggestionTextWrap: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  suggestionTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  suggestionSubtitle: {
    fontSize: tokens.typography.fontSizes.xs,
    lineHeight: 18,
  },
  suggestionActionButton: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
  },
  suggestionActionButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  suggestionRetryButton: {
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.lg,
  },
  suggestionModalContent: {
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.xs,
  },
  modalSubtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    marginBottom: tokens.spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    fontSize: tokens.typography.fontSizes.md,
    marginBottom: tokens.spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  modalButton: {
    flex: 1,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  suggestionInfoGroup: {
    marginBottom: tokens.spacing.sm,
    gap: 2,
  },
  suggestionInfoLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  suggestionInfoValue: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  suggestionActionsColumn: {
    marginTop: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  suggestionPrimaryButton: {
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
  },
  suggestionPrimaryButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  suggestionSecondaryRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  suggestionSecondaryButton: {
    flex: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionSecondaryButtonText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
    textAlign: 'center',
  },
});
