import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui';
import {
  aiApi,
  goalsApi,
  type MonthlySavingPlanAllocation,
  type MonthlySavingPlanResponse,
  type SavingTargetResponse,
} from '../api/modules';
import {
  invalidateSavingsGraph,
  savingsKeys,
} from '../queryKeys/savings.keys';
import type { AppStackParamList } from '../navigation/types';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import { tokens } from '../theme';

type GoalDetailRoute = RouteProp<AppStackParamList, 'GoalDetail'>;

interface ContributeContext {
  previousTargets?: SavingTargetResponse[];
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000] as const;

function sanitizeMoneyInput(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function parseContributionAmount(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function formatQuickAmountLabel(amount: number): string {
  if (amount >= 1_000_000) {
    return `${amount / 1_000_000}m`;
  }
  return `${amount / 1_000}k`;
}

function formatDate(value: string | null | undefined, formatter: Intl.DateTimeFormat): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return formatter.format(parsed);
}

function getProgressPercent(currentAmount: number, targetAmount: number): number {
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return 0;
  }
  const percent = (currentAmount / targetAmount) * 100;
  return Math.max(0, Math.min(100, percent));
}

export function GoalDetailScreen() {
  const route = useRoute<GoalDetailRoute>();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const { t, locale } = useI18n();
  const themedStyles = getThemedStyles(colors);

  const [isContributeModalOpen, setContributeModalOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);

  const goalId = route.params?.goalId;
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }),
    [locale]
  );
  const savingTargetsQueryKey = savingsKeys.savingTargets();
  const monthlyPlanOptimizedQueryKey = savingsKeys.monthlySavingPlan('optimized');

  const targetsQuery = useQuery<SavingTargetResponse[]>({
    queryKey: savingTargetsQueryKey,
    queryFn: async () => {
      const response = await aiApi.savingTargets.list();
      return response.data;
    },
  });

  const monthlyPlanQuery = useQuery<MonthlySavingPlanResponse>({
    queryKey: monthlyPlanOptimizedQueryKey,
    queryFn: async () => {
      const response = await aiApi.monthlyPlan.getPlan('optimized');
      return response.data;
    },
  });

  const goalTarget = useMemo(
    () =>
      (targetsQuery.data ?? []).find(
        (target) => target.type === 'GOAL' && target.id === goalId
      ) ?? null,
    [goalId, targetsQuery.data]
  );

  const goalAllocation = useMemo<MonthlySavingPlanAllocation | null>(
    () =>
      (monthlyPlanQuery.data?.allocations ?? []).find(
        (allocation) => allocation.type === 'GOAL' && allocation.id === goalId
      ) ?? null,
    [goalId, monthlyPlanQuery.data?.allocations]
  );

  const contributeMutation = useMutation<
    void,
    Error,
    { amount: number },
    ContributeContext
  >({
    mutationFn: async ({ amount }) => {
      if (!goalId) {
        throw new Error(t('goalDetail.invalidGoal'));
      }
      await goalsApi.contribute(goalId, amount);
    },
    onMutate: async ({ amount }) => {
      await queryClient.cancelQueries({ queryKey: savingTargetsQueryKey });
      const previousTargets =
        queryClient.getQueryData<SavingTargetResponse[]>(savingTargetsQueryKey);

      queryClient.setQueryData<SavingTargetResponse[]>(
        savingTargetsQueryKey,
        (current = []) =>
          current.map((target) => {
            if (target.type !== 'GOAL' || target.id !== goalId) {
              return target;
            }

            const nextCurrentAmount = target.currentAmount + amount;
            return {
              ...target,
              currentAmount: nextCurrentAmount,
              remainingAmount: Math.max(0, target.targetAmount - nextCurrentAmount),
            };
          })
      );

      return { previousTargets };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTargets) {
        queryClient.setQueryData(savingTargetsQueryKey, context.previousTargets);
      }
      Alert.alert(t('common.error'), t('contribute.error'));
    },
    onSuccess: () => {
      setContributeModalOpen(false);
      setAmountInput('');
      setAmountError(null);
      Alert.alert(t('common.success'), t('contribute.successGoal'));
    },
    onSettled: async () => {
      await invalidateSavingsGraph(queryClient, { goalId });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async () => {
      if (!goalId) {
        throw new Error(t('goalDetail.invalidGoal'));
      }
      await goalsApi.delete(goalId);
    },
    onSuccess: async () => {
      await invalidateSavingsGraph(queryClient, { goalId });
      Alert.alert(t('common.success'), t('goalDetail.deleteSuccess'));
      navigation.goBack();
    },
    onError: () => {
      Alert.alert(t('common.error'), t('goalDetail.deleteError'));
    },
  });

  const handleSubmitContribution = () => {
    const parsedAmount = parseContributionAmount(amountInput);
    if (!parsedAmount) {
      setAmountError(t('contribute.invalidAmount'));
      return;
    }
    setAmountError(null);
    contributeMutation.mutate({ amount: parsedAmount });
  };

  if (!goalId) {
    return (
      <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, themedStyles.errorText]}>{t('goalDetail.invalidGoal')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercent = goalTarget
    ? getProgressPercent(goalTarget.currentAmount, goalTarget.targetAmount)
    : 0;
  const deadline = goalTarget ? formatDate(goalTarget.deadline, dateFormatter) : null;
  const canContribute = Boolean(goalTarget) && !contributeMutation.isPending;
  const requiredMonthlyValue =
    goalTarget?.requiredMonthly ?? goalAllocation?.requiredMonthly ?? 0;
  const parsedContributionAmount = parseContributionAmount(amountInput);
  const previewAfterAmount = goalTarget
    ? goalTarget.currentAmount + (parsedContributionAmount ?? 0)
    : null;
  const previewProgressPercent =
    goalTarget && goalTarget.targetAmount > 0 && previewAfterAmount != null
      ? getProgressPercent(previewAfterAmount, goalTarget.targetAmount)
      : null;
  const allocationGap = goalAllocation
    ? goalAllocation.allocatedMonthly - requiredMonthlyValue
    : 0;
  const allocationCompareText = goalAllocation
    ? allocationGap > 0
      ? `${t('feasibility.compareAbove')} ${currencyFormatter.format(allocationGap)}`
      : allocationGap < 0
        ? `${t('feasibility.compareBelow')} ${currencyFormatter.format(Math.abs(allocationGap))}`
        : t('feasibility.compareEqual')
    : t('feasibility.unavailable');
  const allocationCompareStyle = goalAllocation
    ? allocationGap > 0
      ? themedStyles.feasibilityPositive
      : allocationGap < 0
        ? themedStyles.feasibilityNegative
        : themedStyles.subtitle
    : themedStyles.subtitle;

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, themedStyles.title]}>
            {goalTarget?.title ?? `${t('goalDetail.fallbackTitle')} #${goalId}`}
          </Text>
          <Text style={[styles.subtitle, themedStyles.subtitle]}>{t('goalDetail.subtitle')}</Text>
        </View>

        {targetsQuery.isLoading ? (
          <Card>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, themedStyles.subtitle]}>{t('common.loading')}</Text>
            </View>
          </Card>
        ) : null}

        {!targetsQuery.isLoading && targetsQuery.isError ? (
          <Card>
            <Text style={[styles.errorText, themedStyles.errorText]}>{t('common.loadingError')}</Text>
            <Pressable onPress={() => targetsQuery.refetch()} style={styles.retryButton}>
              <Text style={[styles.retryText, themedStyles.retryText]}>{t('common.retry')}</Text>
            </Pressable>
          </Card>
        ) : null}

        {!targetsQuery.isLoading && !targetsQuery.isError && !goalTarget ? (
          <Card>
            <Text style={[styles.emptyText, themedStyles.subtitle]}>{t('common.noData')}</Text>
          </Card>
        ) : null}

        {!targetsQuery.isLoading && !targetsQuery.isError && goalTarget ? (
          <>
            <Card>
              <Text style={[styles.sectionTitle, themedStyles.title]}>{t('goalDetail.overview')}</Text>

              <Text style={[styles.infoLine, themedStyles.subtitle]}>
                {t('goalDetail.progress')}: {currencyFormatter.format(goalTarget.currentAmount)} /{' '}
                {currencyFormatter.format(goalTarget.targetAmount)} (
                {Math.round(progressPercent)}%)
              </Text>
              <View style={[styles.progressTrack, themedStyles.progressTrack]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>

              <Text style={[styles.infoLine, themedStyles.subtitle]}>
                {t('goalDetail.remaining')}: {currencyFormatter.format(goalTarget.remainingAmount)}
              </Text>
              <Text style={[styles.infoLine, themedStyles.subtitle]}>
                {t('goalDetail.requiredMonthly')}:{' '}
                {currencyFormatter.format(goalTarget.requiredMonthly)}
              </Text>
              <Text style={[styles.infoLine, themedStyles.subtitle]}>
                {t('goalDetail.deadline')}: {deadline ?? t('goalDetail.noDeadline')}
              </Text>
            </Card>

            <Card>
              <Text style={[styles.sectionTitle, themedStyles.title]}>{t('feasibility.title')}</Text>

              {monthlyPlanQuery.isLoading ? (
                <Text style={[styles.infoLine, themedStyles.subtitle]}>{t('common.loading')}</Text>
              ) : goalAllocation ? (
                <>
                  <Text style={[styles.infoLine, themedStyles.subtitle]}>
                    {t('allocatedMonthly.label')}: {currencyFormatter.format(goalAllocation.allocatedMonthly)}
                  </Text>
                  <Text style={[styles.infoLine, themedStyles.subtitle]}>
                    {t('feasibility.score')}: {Math.round(goalAllocation.feasibilityScore)}%
                  </Text>
                  <Text style={[styles.infoLine, themedStyles.subtitle]}>
                    {t('feasibility.requiredMonthly')}: {currencyFormatter.format(requiredMonthlyValue)}
                  </Text>
                  <Text style={[styles.infoLine, allocationCompareStyle]}>{allocationCompareText}</Text>
                </>
              ) : (
                <Text style={[styles.infoLine, themedStyles.subtitle]}>{t('feasibility.unavailable')}</Text>
              )}
            </Card>

            <Card>
              <Pressable
                onPress={() => {
                  setAmountError(null);
                  setContributeModalOpen(true);
                }}
                disabled={!canContribute}
                style={({ pressed }) => [
                  styles.contributeButton,
                  themedStyles.contributeButton,
                  (!canContribute || pressed) && styles.contributeButtonPressed,
                ]}
              >
                <Text style={[styles.contributeButtonTitle, themedStyles.contributeButtonText]}>
                  {t('goalDetail.contribute')}
                </Text>
                <Text style={[styles.contributeButtonDescription, themedStyles.contributeButtonText]}>
                  {t('goalDetail.contributeDescription')}
                </Text>
              </Pressable>
            </Card>

            <Card>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    t('goalDetail.deleteConfirmTitle'),
                    t('goalDetail.deleteConfirmBody'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('goalDetail.delete'),
                        style: 'destructive',
                        onPress: () => deleteGoalMutation.mutate(),
                      },
                    ]
                  )
                }
                disabled={deleteGoalMutation.isPending}
                style={({ pressed }) => [
                  styles.deleteButton,
                  (pressed || deleteGoalMutation.isPending) && styles.contributeButtonPressed,
                ]}
              >
                <Text style={[styles.deleteButtonTitle, themedStyles.errorText]}>
                  {t('goalDetail.delete')}
                </Text>
                <Text style={[styles.deleteButtonDescription, themedStyles.subtitle]}>
                  {t('goalDetail.deleteDescription')}
                </Text>
              </Pressable>
            </Card>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={isContributeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setContributeModalOpen(false);
          setAmountError(null);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, themedStyles.modalCard]}>
            <Text style={[styles.modalTitle, themedStyles.title]}>{t('contribute.title')}</Text>
            <Text style={[styles.modalSubtitle, themedStyles.subtitle]}>{t('contribute.goalHint')}</Text>
            <Text style={[styles.quickAmountTitle, themedStyles.subtitle]}>{t('contribute.quickAmounts')}</Text>
            <View style={styles.quickAmountList}>
              {QUICK_AMOUNTS.map((quickAmount) => {
                const isActive = amountInput === String(quickAmount);
                return (
                  <Pressable
                    key={quickAmount}
                    onPress={() => {
                      setAmountInput(String(quickAmount));
                      setAmountError(null);
                    }}
                    style={[
                      styles.quickAmountButton,
                      themedStyles.quickAmountButton,
                      isActive && themedStyles.quickAmountButtonActive,
                    ]}
                    disabled={contributeMutation.isPending}
                  >
                    <Text
                      style={[
                        styles.quickAmountText,
                        themedStyles.quickAmountText,
                        isActive && themedStyles.quickAmountTextActive,
                      ]}
                    >
                      {formatQuickAmountLabel(quickAmount)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={amountInput}
              onChangeText={(value) => {
                setAmountInput(sanitizeMoneyInput(value));
                setAmountError(null);
              }}
              placeholder={t('contribute.amountPlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[styles.amountInput, themedStyles.amountInput]}
              editable={!contributeMutation.isPending}
            />
            {amountError ? (
              <Text style={[styles.amountErrorText, themedStyles.amountErrorText]}>{amountError}</Text>
            ) : null}

            <View style={[styles.previewCard, themedStyles.previewCard]}>
              <Text style={[styles.previewLine, themedStyles.subtitle]}>
                {t('contribute.previewAfter')}:{' '}
                {previewAfterAmount == null
                  ? t('contribute.previewUnavailable')
                  : currencyFormatter.format(previewAfterAmount)}
              </Text>
              <Text style={[styles.previewLine, themedStyles.subtitle]}>
                {t('contribute.previewProgress')}:{' '}
                {previewProgressPercent == null
                  ? t('contribute.previewUnavailable')
                  : `${Math.round(previewProgressPercent)}%`}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setContributeModalOpen(false);
                  setAmountError(null);
                }}
                style={[styles.modalActionButton, themedStyles.cancelButton]}
                disabled={contributeMutation.isPending}
              >
                <Text style={[styles.modalActionText, themedStyles.cancelButtonText]}>
                  {t('common.cancel')}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSubmitContribution}
                style={[
                  styles.modalActionButton,
                  themedStyles.submitButton,
                  contributeMutation.isPending && themedStyles.submitButtonDisabled,
                ]}
                disabled={contributeMutation.isPending}
              >
                {contributeMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary ?? colors.text} />
                ) : (
                  <Text style={[styles.modalActionText, themedStyles.submitButtonText]}>
                    {t('contribute.submit')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    title: {
      color: colors.text,
    },
    subtitle: {
      color: colors.textSecondary,
    },
    errorText: {
      color: colors.error,
    },
    retryText: {
      color: colors.primary,
    },
    progressTrack: {
      backgroundColor: colors.backgroundSecondary,
    },
    contributeButton: {
      backgroundColor: colors.primary,
    },
    contributeButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    amountInput: {
      borderColor: colors.border,
      color: colors.text,
      backgroundColor: colors.backgroundSecondary,
    },
    quickAmountButton: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    quickAmountButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    quickAmountText: {
      color: colors.text,
    },
    quickAmountTextActive: {
      color: colors.textOnPrimary ?? colors.text,
    },
    amountErrorText: {
      color: colors.error,
    },
    previewCard: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    cancelButton: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    cancelButtonText: {
      color: colors.text,
    },
    submitButton: {
      backgroundColor: colors.primary,
    },
    submitButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    submitButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    feasibilityPositive: {
      color: colors.success,
    },
    feasibilityNegative: {
      color: colors.error,
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
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
    gap: tokens.spacing.md,
  },
  header: {
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  loadingText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  errorText: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: tokens.spacing.sm,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.sm,
  },
  infoLine: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
    marginBottom: tokens.spacing.xs,
  },
  progressTrack: {
    height: 8,
    borderRadius: tokens.borderRadius.full,
    overflow: 'hidden',
    marginBottom: tokens.spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: tokens.borderRadius.full,
  },
  contributeButton: {
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  contributeButtonPressed: {
    opacity: 0.85,
  },
  contributeButtonTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  contributeButtonDescription: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  deleteButton: {
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  deleteButtonTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  deleteButtonDescription: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.md,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  modalTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  modalSubtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  quickAmountTitle: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  quickAmountList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  quickAmountButton: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  quickAmountText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.fontSizes.md,
  },
  amountErrorText: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  previewLine: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  modalActionButton: {
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
  },
  modalActionText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
