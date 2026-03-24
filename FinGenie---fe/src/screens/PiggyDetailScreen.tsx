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
  piggiesApi,
  rewardsApi,
  savingsApi,
  type GoalBondMissionState,
  type GoalBondSummaryResponse,
  type MonthlySavingPlanAllocation,
  type MonthlySavingPlanResponse,
  type PiggyDetailResponse,
  type PiggyMemberResponse,
  type SharedPiggyRewardResponse,
  type SavingContributionResponse,
} from '../api/modules';
import {
  invalidateSavingsGraph,
  savingsKeys,
} from '../queryKeys/savings.keys';
import type { AppStackParamList } from '../navigation/types';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import { useEntitlements } from '../hooks';

type PiggyDetailRoute = RouteProp<AppStackParamList, 'PiggyDetail'>;
const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000] as const;

function formatCurrency(value: number | null | undefined, formatter: Intl.NumberFormat): string {
  if (value == null || Number.isNaN(Number(value))) {
    return '-';
  }
  return formatter.format(Number(value));
}

function formatDate(value: string | null | undefined, formatter: Intl.DateTimeFormat): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return formatter.format(date);
}

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

export function PiggyDetailScreen() {
  const route = useRoute<PiggyDetailRoute>();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const { t, locale } = useI18n();
  const { canAccess } = useEntitlements();
  const themedStyles = getThemedStyles(colors);
  const piggyId = route.params?.piggyId;
  const [isContributeModalOpen, setContributeModalOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [claimingMissionId, setClaimingMissionId] = useState<string | null>(null);
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
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
      }),
    [locale]
  );
  const piggyDetailQueryKey = savingsKeys.piggyDetail(piggyId);
  const piggyMembersQueryKey = savingsKeys.piggyMembers(piggyId);
  const monthlyPlanOptimizedQueryKey = savingsKeys.monthlySavingPlan('optimized');
  const piggyContributionsQueryKey = savingsKeys.piggyContributions(piggyId, 200);
  const goalBondSummaryQueryKey = savingsKeys.goalBondSummary(piggyId);
  const goalBondMissionsQueryKey = savingsKeys.goalBondMissions(piggyId);
  const sharedPiggyRewardsQueryKey = savingsKeys.sharedPiggyRewards(piggyId);

  const detailQuery = useQuery<PiggyDetailResponse>({
    queryKey: piggyDetailQueryKey,
    queryFn: async () => {
      if (!piggyId) {
        throw new Error(t('piggyDetail.invalidPiggy'));
      }
      const response = await piggiesApi.getById(piggyId);
      return response.data;
    },
    enabled: Boolean(piggyId),
  });

  const membersQuery = useQuery<PiggyMemberResponse[]>({
    queryKey: piggyMembersQueryKey,
    queryFn: async () => {
      if (!piggyId) {
        throw new Error(t('piggyDetail.invalidPiggy'));
      }
      const response = await piggiesApi.getMembers(piggyId);
      return response.data;
    },
    enabled: Boolean(piggyId),
  });

  const monthlyPlanQuery = useQuery<MonthlySavingPlanResponse>({
    queryKey: monthlyPlanOptimizedQueryKey,
    queryFn: async () => {
      const response = await aiApi.monthlyPlan.getPlan('optimized');
      return response.data;
    },
  });

  const piggyContributionsQuery = useQuery<SavingContributionResponse[]>({
    queryKey: piggyContributionsQueryKey,
    queryFn: async () => {
      if (!piggyId) {
        throw new Error(t('piggyDetail.invalidPiggy'));
      }
      const response = await savingsApi.listContributions(200);
      return response.data.filter(
        (item) => item.targetType === 'PIGGY' && item.targetId === piggyId
      );
    },
    enabled: Boolean(piggyId),
  });

  const isLoading = detailQuery.isLoading || membersQuery.isLoading;
  const isError = detailQuery.isError || membersQuery.isError;
  const members = membersQuery.data ?? [];
  const detail = detailQuery.data ?? null;

  const contributeMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!piggyId) {
        throw new Error(t('piggyDetail.invalidPiggy'));
      }
      await piggiesApi.contribute(piggyId, amount);
    },
    onSuccess: async () => {
      setContributeModalOpen(false);
      setAmountInput('');
      setAmountError(null);
      Alert.alert(t('common.success'), t('contribute.successPiggy'));
      await invalidateSavingsGraph(queryClient, { piggyId });
    },
    onError: () => {
      Alert.alert(t('common.error'), t('contribute.error'));
    },
  });

  const deletePiggyMutation = useMutation({
    mutationFn: async () => {
      if (!piggyId) {
        throw new Error(t('piggyDetail.invalidPiggy'));
      }
      await piggiesApi.delete(piggyId);
    },
    onSuccess: async () => {
      await invalidateSavingsGraph(queryClient, { piggyId });
      Alert.alert(t('common.success'), t('piggyDetail.deleteSuccess'));
      navigation.goBack();
    },
    onError: () => {
      Alert.alert(t('common.error'), t('piggyDetail.deleteError'));
    },
  });

  const piggyName =
    detail?.piggyName?.trim() ||
    detail?.name?.trim() ||
    `${t('piggyDetail.title')} #${piggyId ?? ''}`;
  const isShared =
    typeof detail?.isShared === 'boolean' ? detail.isShared : members.length > 1;
  const canViewGroupRewards = canAccess('voucher.group.redeem');
  const goalBondSummaryQuery = useQuery<GoalBondSummaryResponse>({
    queryKey: goalBondSummaryQueryKey,
    queryFn: async () => {
      if (!piggyId) {
        throw new Error(t('piggyDetail.invalidPiggy'));
      }
      const response = await piggiesApi.getGoalBondSummary(piggyId);
      return response.data;
    },
    enabled: Boolean(piggyId && isShared),
  });
  const goalBondMissionsQuery = useQuery<{
    piggyId: number;
    dayKey: string;
    missions: GoalBondMissionState[];
  }>({
    queryKey: goalBondMissionsQueryKey,
    queryFn: async () => {
      if (!piggyId) {
        throw new Error(t('piggyDetail.invalidPiggy'));
      }
      const response = await piggiesApi.getGoalBondMissionsToday(piggyId);
      return response.data;
    },
    enabled: Boolean(piggyId && isShared),
  });
  const sharedRewardsQuery = useQuery<SharedPiggyRewardResponse[]>({
    queryKey: sharedPiggyRewardsQueryKey,
    queryFn: async () => {
      if (!piggyId) {
        throw new Error(t('piggyDetail.invalidPiggy'));
      }
      const response = await rewardsApi.getSharedPiggyRewards(piggyId, 20);
      return response.data;
    },
    enabled: Boolean(piggyId && isShared && canViewGroupRewards),
  });
  const claimGoalBondMissionMutation = useMutation({
    mutationFn: async (missionId: string) => {
      if (!piggyId) {
        throw new Error(t('piggyDetail.invalidPiggy'));
      }
      await piggiesApi.claimGoalBondMission(piggyId, missionId);
    },
    onMutate: (missionId) => {
      setClaimingMissionId(missionId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: goalBondSummaryQueryKey }),
        queryClient.invalidateQueries({ queryKey: goalBondMissionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: sharedPiggyRewardsQueryKey }),
      ]);
    },
    onError: () => {
      Alert.alert(t('common.error'), t('goalBond.loadError'));
    },
    onSettled: () => {
      setClaimingMissionId(null);
    },
  });
  const goalBondMissionTexts = useMemo(
    () => ({
      sharedContributeOnce: {
        title: t('goalBond.mission.sharedContributeOnce.title'),
        description: t('goalBond.mission.sharedContributeOnce.desc'),
      },
      sharedContributeThree: {
        title: t('goalBond.mission.sharedContributeThree.title'),
        description: t('goalBond.mission.sharedContributeThree.desc'),
      },
      sharedTeamTwoContributors: {
        title: t('goalBond.mission.sharedTeamTwoContributors.title'),
        description: t('goalBond.mission.sharedTeamTwoContributors.desc'),
      },
    }),
    [t]
  );
  const lockUntilValue = detail?.lockUntil ? formatDate(detail.lockUntil, dateFormatter) : '-';
  const goalAmountValue =
    detail?.goalAmount == null
      ? '-'
      : formatCurrency(detail.goalAmount, currencyFormatter);
  const piggyAllocation = useMemo<MonthlySavingPlanAllocation | null>(
    () =>
      (monthlyPlanQuery.data?.allocations ?? []).find(
        (allocation) => allocation.type === 'PIGGY' && allocation.id === piggyId
      ) ?? null,
    [monthlyPlanQuery.data?.allocations, piggyId]
  );
  const requiredMonthlyValue = piggyAllocation?.requiredMonthly ?? 0;
  const allocationGap = piggyAllocation
    ? piggyAllocation.allocatedMonthly - requiredMonthlyValue
    : 0;
  const allocationCompareText = piggyAllocation
    ? allocationGap > 0
      ? `${t('feasibility.compareAbove')} ${currencyFormatter.format(allocationGap)}`
      : allocationGap < 0
        ? `${t('feasibility.compareBelow')} ${currencyFormatter.format(Math.abs(allocationGap))}`
        : t('feasibility.compareEqual')
    : t('feasibility.unavailable');
  const allocationCompareStyle = piggyAllocation
    ? allocationGap > 0
      ? themedStyles.feasibilityPositive
      : allocationGap < 0
        ? themedStyles.feasibilityNegative
        : themedStyles.subtitle
    : themedStyles.subtitle;
  const parsedContributionAmount = parseContributionAmount(amountInput);
  const previewAfterAmount = (detail?.currentAmount ?? 0) + (parsedContributionAmount ?? 0);
  const previewProgressPercent =
    detail?.goalAmount && detail.goalAmount > 0
      ? Math.max(0, Math.min(100, (previewAfterAmount / detail.goalAmount) * 100))
      : null;
  const contributionByAccountId = useMemo(() => {
    const grouped = new Map<number, number>();
    for (const contribution of piggyContributionsQuery.data ?? []) {
      if (contribution.accountId == null) {
        continue;
      }
      grouped.set(
        contribution.accountId,
        (grouped.get(contribution.accountId) ?? 0) + contribution.amount
      );
    }
    return grouped;
  }, [piggyContributionsQuery.data]);
  const totalMemberContributed = useMemo(
    () =>
      Array.from(contributionByAccountId.values()).reduce(
        (sum, amount) => sum + amount,
        0
      ),
    [contributionByAccountId]
  );
  const hasMemberAccountIdData = useMemo(
    () => (piggyContributionsQuery.data ?? []).some((item) => item.accountId != null),
    [piggyContributionsQuery.data]
  );
  const goalBondSummary = goalBondSummaryQuery.data ?? null;
  const goalBondMissions = goalBondMissionsQuery.data?.missions ?? [];
  const sharedRewards = sharedRewardsQuery.data ?? [];

  const goalBondStatusText = goalBondSummary?.status === 'TARGET_REACHED'
    ? t('goalBond.statusReached')
    : t('goalBond.statusInProgress');
  const formatRewardStatus = (status: string | undefined) => {
    switch (status) {
      case 'AVAILABLE':
        return t('rewardStatus.available');
      case 'CLAIMED':
        return t('rewardStatus.claimed');
      case 'REDEEMED':
        return t('rewardStatus.redeemed');
      case 'EXPIRED':
        return t('rewardStatus.expired');
      case 'LOCKED':
        return t('rewardStatus.locked');
      default:
        return t('rewardStatus.unknown');
    }
  };

  const handleClaimGoalBondMission = (missionId: string) => {
    if (claimGoalBondMissionMutation.isPending) {
      return;
    }
    claimGoalBondMissionMutation.mutate(missionId);
  };

  const handleSubmitContribution = () => {
    const parsedAmount = parseContributionAmount(amountInput);
    if (!parsedAmount) {
      setAmountError(t('contribute.invalidAmount'));
      return;
    }
    setAmountError(null);
    contributeMutation.mutate(parsedAmount);
  };

  if (!piggyId) {
    return (
      <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, themedStyles.errorText]}>{t('piggyDetail.invalidPiggy')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, themedStyles.title]}>{piggyName}</Text>
          <Text style={[styles.subtitle, themedStyles.subtitle]}>{t('piggyDetail.subtitle')}</Text>
        </View>

        {isLoading ? (
          <Card>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, themedStyles.subtitle]}>{t('common.loading')}</Text>
            </View>
          </Card>
        ) : null}

        {!isLoading && isError ? (
          <Card>
            <Text style={[styles.errorText, themedStyles.errorText]}>{t('common.loadingError')}</Text>
            <Pressable
              onPress={() => {
                detailQuery.refetch();
                membersQuery.refetch();
              }}
              style={styles.retryButton}
            >
              <Text style={[styles.retryText, themedStyles.retryText]}>{t('common.retry')}</Text>
            </Pressable>
          </Card>
        ) : null}

        {!isLoading && !isError ? (
          <>
            <Card>
              <Text style={[styles.sectionTitle, themedStyles.title]}>{t('piggyDetail.basicInfo')}</Text>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('piggyDetail.isShared')}</Text>
                <Text style={[styles.infoValue, themedStyles.title]}>
                  {isShared ? t('piggyDetail.sharedYes') : t('piggyDetail.sharedNo')}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('piggyDetail.lockUntil')}</Text>
                <Text style={[styles.infoValue, themedStyles.title]}>
                  {lockUntilValue === '-' ? t('piggyDetail.unknown') : lockUntilValue}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('piggyDetail.goalAmount')}</Text>
                <Text style={[styles.infoValue, themedStyles.title]}>
                  {goalAmountValue === '-' ? t('piggyDetail.unknown') : goalAmountValue}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('piggyDetail.memberCount')}</Text>
                <Text style={[styles.infoValue, themedStyles.title]}>{members.length}</Text>
              </View>
            </Card>

            {isShared ? (
              <Card>
                <Text style={[styles.sectionTitle, themedStyles.title]}>{t('goalBond.title')}</Text>

                {goalBondSummaryQuery.isLoading ? (
                  <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('common.loading')}</Text>
                ) : goalBondSummaryQuery.isError ? (
                  <>
                    <Text style={[styles.errorText, themedStyles.errorText]}>{t('goalBond.loadError')}</Text>
                    <Pressable
                      onPress={() => goalBondSummaryQuery.refetch()}
                      style={styles.retryButton}
                    >
                      <Text style={[styles.retryText, themedStyles.retryText]}>{t('common.retry')}</Text>
                    </Pressable>
                  </>
                ) : goalBondSummary ? (
                  <>
                    <View style={styles.goalBondProgressRow}>
                      <Text style={[styles.infoLabel, themedStyles.subtitle]}>
                        {t('goalBond.progress')}: {goalBondSummary.currentProgress} / {goalBondSummary.targetProgress}
                      </Text>
                      <Text style={[styles.infoValue, themedStyles.title]}>
                        {goalBondSummary.progressPercent}%
                      </Text>
                    </View>
                    <View style={[styles.goalBondBarTrack, themedStyles.goalBondBarTrack]}>
                      <View
                        style={[
                          styles.goalBondBarFill,
                          themedStyles.goalBondBarFill,
                          { width: `${Math.max(0, Math.min(goalBondSummary.progressPercent, 100))}%` },
                        ]}
                      />
                    </View>
                    <Text style={[styles.goalBondStatusText, themedStyles.subtitle]}>
                      {goalBondStatusText}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('common.noData')}</Text>
                )}

                <Text style={[styles.goalBondMissionTitle, themedStyles.title]}>
                  {t('goalBond.sharedMissions')}
                </Text>

                {goalBondMissionsQuery.isLoading ? (
                  <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('common.loading')}</Text>
                ) : goalBondMissionsQuery.isError ? (
                  <>
                    <Text style={[styles.errorText, themedStyles.errorText]}>{t('goalBond.loadError')}</Text>
                    <Pressable
                      onPress={() => goalBondMissionsQuery.refetch()}
                      style={styles.retryButton}
                    >
                      <Text style={[styles.retryText, themedStyles.retryText]}>{t('common.retry')}</Text>
                    </Pressable>
                  </>
                ) : goalBondMissions.length === 0 ? (
                  <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('goalBond.emptyMissions')}</Text>
                ) : (
                  <View style={styles.goalBondMissionList}>
                    {goalBondMissions.map((mission) => {
                      const missionText = goalBondMissionTexts[mission.missionId as keyof typeof goalBondMissionTexts];
                      const isClaimingThisMission =
                        claimGoalBondMissionMutation.isPending && claimingMissionId === mission.missionId;

                      return (
                        <View
                          key={mission.missionId}
                          style={[styles.goalBondMissionItem, themedStyles.goalBondMissionItem]}
                        >
                          <Text style={[styles.goalBondMissionItemTitle, themedStyles.title]}>
                            {missionText?.title ?? mission.missionId}
                          </Text>
                          <Text style={[styles.goalBondMissionItemDesc, themedStyles.subtitle]}>
                            {missionText?.description ?? t('common.noData')}
                          </Text>
                          <Text style={[styles.goalBondMissionMeta, themedStyles.subtitle]}>
                            {t('goalBond.reward')}: +{mission.rewardGoalBond}
                          </Text>
                          <Text style={[styles.goalBondMissionMeta, themedStyles.subtitle]}>
                            {t('goalBond.missionProgress')}: {mission.progressCount}/{mission.requiredCount}
                          </Text>

                          {mission.completed ? (
                            <Text style={[styles.goalBondMissionClaimed, themedStyles.goalBondMissionClaimed]}>
                              {t('goalBond.claimed')}
                            </Text>
                          ) : (
                            <Pressable
                              onPress={() => handleClaimGoalBondMission(mission.missionId)}
                              disabled={!mission.claimable || claimGoalBondMissionMutation.isPending}
                              style={[
                                styles.goalBondClaimButton,
                                themedStyles.goalBondClaimButton,
                                (!mission.claimable || claimGoalBondMissionMutation.isPending) &&
                                  themedStyles.goalBondClaimButtonDisabled,
                              ]}
                            >
                              <Text style={[styles.goalBondClaimButtonText, themedStyles.goalBondClaimButtonText]}>
                                {isClaimingThisMission
                                  ? t('goalBond.claiming')
                                  : mission.claimable
                                    ? t('goalBond.claim')
                                    : t('goalBond.readyToClaim')}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {canViewGroupRewards ? (
                  <>
                    <Text style={[styles.goalBondMissionTitle, themedStyles.title]}>
                      {t('goalBond.groupRewardsTitle')}
                    </Text>

                    {sharedRewardsQuery.isLoading ? (
                      <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('common.loading')}</Text>
                    ) : sharedRewardsQuery.isError ? (
                      <>
                        <Text style={[styles.errorText, themedStyles.errorText]}>
                          {t('goalBond.groupRewardsLoadError')}
                        </Text>
                        <Pressable
                          onPress={() => sharedRewardsQuery.refetch()}
                          style={styles.retryButton}
                        >
                          <Text style={[styles.retryText, themedStyles.retryText]}>{t('common.retry')}</Text>
                        </Pressable>
                      </>
                    ) : sharedRewards.length === 0 ? (
                      <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('goalBond.groupRewardsEmpty')}</Text>
                    ) : (
                      <View style={styles.goalBondMissionList}>
                        {sharedRewards.map((reward) => (
                          <View
                            key={reward.unlockId}
                            style={[styles.goalBondMissionItem, themedStyles.goalBondMissionItem]}
                          >
                            <Text style={[styles.goalBondMissionItemTitle, themedStyles.title]}>
                              {reward.title}
                            </Text>
                            {reward.description ? (
                              <Text style={[styles.goalBondMissionItemDesc, themedStyles.subtitle]}>
                                {reward.description}
                              </Text>
                            ) : null}
                            <Text style={[styles.goalBondMissionMeta, themedStyles.subtitle]}>
                              {t('goalBond.groupRewardStatus')}: {formatRewardStatus(reward.status)}
                            </Text>
                            <Text style={[styles.goalBondMissionMeta, themedStyles.subtitle]}>
                              {t('goalBond.groupRewardUnlockedAt')}: {formatDate(reward.unlockedAt, dateFormatter)}
                            </Text>
                            {reward.partnerName ? (
                              <Text style={[styles.goalBondMissionMeta, themedStyles.subtitle]}>
                                {t('goalBond.groupRewardPartner')}: {reward.partnerName}
                              </Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                ) : null}
              </Card>
            ) : null}

            <Card>
              <Text style={[styles.sectionTitle, themedStyles.title]}>{t('feasibility.title')}</Text>

              {monthlyPlanQuery.isLoading ? (
                <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('common.loading')}</Text>
              ) : piggyAllocation ? (
                <>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('allocatedMonthly.label')}</Text>
                    <Text style={[styles.infoValue, themedStyles.title]}>
                      {currencyFormatter.format(piggyAllocation.allocatedMonthly)}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('feasibility.score')}</Text>
                    <Text style={[styles.infoValue, themedStyles.title]}>
                      {Math.round(piggyAllocation.feasibilityScore)}%
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('feasibility.requiredMonthly')}</Text>
                    <Text style={[styles.infoValue, themedStyles.title]}>
                      {currencyFormatter.format(requiredMonthlyValue)}
                    </Text>
                  </View>
                  <Text style={[styles.infoLabel, allocationCompareStyle]}>{allocationCompareText}</Text>
                </>
              ) : (
                <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('feasibility.unavailable')}</Text>
              )}
            </Card>

            <Card>
              <Text style={[styles.sectionTitle, themedStyles.title]}>
                {t('piggyDetail.memberContributions')}
              </Text>

              {piggyContributionsQuery.isLoading ? (
                <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('common.loading')}</Text>
              ) : null}

              {!piggyContributionsQuery.isLoading && piggyContributionsQuery.isError ? (
                <>
                  <Text style={[styles.errorText, themedStyles.errorText]}>{t('common.loadingError')}</Text>
                  <Pressable
                    onPress={() => piggyContributionsQuery.refetch()}
                    style={styles.retryButton}
                  >
                    <Text style={[styles.retryText, themedStyles.retryText]}>{t('common.retry')}</Text>
                  </Pressable>
                </>
              ) : null}

              {!piggyContributionsQuery.isLoading && !piggyContributionsQuery.isError ? (
                !hasMemberAccountIdData ? (
                  <View style={[styles.memberFallbackCard, themedStyles.memberFallbackCard]}>
                    <Text style={[styles.memberFallbackText, themedStyles.subtitle]}>
                      {t('piggyDetail.memberContribUnavailable')}
                    </Text>
                    <Pressable
                      onPress={() =>
                        navigation.navigate('MainTabs', {
                          screen: 'Wallet',
                          params: { initialTab: 'activity' },
                        })
                      }
                      style={({ pressed }) => [
                        styles.memberFallbackCta,
                        themedStyles.memberFallbackCta,
                        pressed && styles.memberFallbackCtaPressed,
                      ]}
                    >
                      <Text style={[styles.memberFallbackCtaText, themedStyles.memberFallbackCtaText]}>
                        {t('piggyDetail.viewActivity')}
                      </Text>
                    </Pressable>
                  </View>
                ) : members.length === 0 ? (
                  <Text style={[styles.infoLabel, themedStyles.subtitle]}>{t('common.noData')}</Text>
                ) : (
                  <View style={styles.memberContributionList}>
                    {members.map((member) => {
                      const memberContributed = contributionByAccountId.get(member.accountId) ?? 0;
                      const percentOfTotal =
                        totalMemberContributed > 0
                          ? (memberContributed / totalMemberContributed) * 100
                          : 0;
                      const roleLabel =
                        member.role === 'OWNER'
                          ? t('piggyMembers.roleOwner')
                          : member.role === 'CONTRIBUTOR'
                            ? t('piggyMembers.roleContributor')
                            : member.role;
                      const monthlyCommitmentText =
                        member.monthlyCommitment != null && member.monthlyCommitment > 0
                          ? currencyFormatter.format(member.monthlyCommitment)
                          : t('piggyDetail.monthlyCommitmentAuto');

                      return (
                        <View
                          key={member.id}
                          style={[styles.memberContributionItem, themedStyles.memberContributionItem]}
                        >
                          <View style={styles.memberContributionHeader}>
                            <Text style={[styles.memberName, themedStyles.title]}>
                              {member.displayName || `${t('piggyDetail.memberFallback')} #${member.accountId}`}
                            </Text>
                            <Text style={[styles.memberRole, themedStyles.subtitle]}>{roleLabel}</Text>
                          </View>
                          <Text style={[styles.memberMetaText, themedStyles.subtitle]}>
                            {t('piggyDetail.shareWeightLabel')}: {member.shareWeight ?? 1}
                          </Text>
                          <Text style={[styles.memberMetaText, themedStyles.subtitle]}>
                            {t('piggyDetail.monthlyCommitmentLabel')}: {monthlyCommitmentText}
                          </Text>
                          <Text style={[styles.memberMetaText, themedStyles.subtitle]}>
                            {t('piggyDetail.contributedSumLabel')}: {currencyFormatter.format(memberContributed)}
                          </Text>
                          <Text style={[styles.memberMetaText, themedStyles.subtitle]}>
                            {t('piggyDetail.percentOfTotalLabel')}: {percentFormatter.format(percentOfTotal)}%
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )
              ) : null}
            </Card>

            <Card>
              <Pressable
                onPress={() => navigation.navigate('PiggyMembers', { piggyId })}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              >
                <Text style={[styles.actionTitle, themedStyles.title]}>{t('piggyDetail.members')}</Text>
                <Text style={[styles.actionDescription, themedStyles.subtitle]}>
                  {t('piggyDetail.membersDescription')}
                </Text>
              </Pressable>
            </Card>

            <Card>
              <Pressable
                onPress={() => {
                  setAmountError(null);
                  setContributeModalOpen(true);
                }}
                disabled={contributeMutation.isPending}
                style={({ pressed }) => [
                  styles.actionButton,
                  (pressed || contributeMutation.isPending) && styles.actionButtonPressed,
                ]}
              >
                <Text style={[styles.actionTitle, themedStyles.title]}>{t('piggyDetail.contribute')}</Text>
                <Text style={[styles.actionDescription, themedStyles.subtitle]}>
                  {t('piggyDetail.contributeDescription')}
                </Text>
              </Pressable>
            </Card>

            <Card>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    t('piggyDetail.deleteConfirmTitle'),
                    t('piggyDetail.deleteConfirmBody'),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('piggyDetail.delete'),
                        style: 'destructive',
                        onPress: () => deletePiggyMutation.mutate(),
                      },
                    ]
                  )
                }
                disabled={deletePiggyMutation.isPending}
                style={({ pressed }) => [
                  styles.actionButton,
                  (pressed || deletePiggyMutation.isPending) && styles.actionButtonPressed,
                ]}
              >
                <Text style={[styles.actionTitle, themedStyles.errorText]}>{t('piggyDetail.delete')}</Text>
                <Text style={[styles.actionDescription, themedStyles.subtitle]}>
                  {t('piggyDetail.deleteDescription')}
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
            <Text style={[styles.modalSubtitle, themedStyles.subtitle]}>{t('contribute.piggyHint')}</Text>
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
                {t('contribute.previewAfter')}: {currencyFormatter.format(previewAfterAmount)}
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
    memberContributionItem: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    memberFallbackCard: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    memberFallbackCta: {
      backgroundColor: colors.primary,
    },
    memberFallbackCtaText: {
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
    goalBondBarTrack: {
      backgroundColor: colors.backgroundSecondary,
    },
    goalBondBarFill: {
      backgroundColor: colors.primary,
    },
    goalBondMissionItem: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    goalBondMissionClaimed: {
      color: colors.success,
    },
    goalBondClaimButton: {
      backgroundColor: colors.primary,
    },
    goalBondClaimButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    goalBondClaimButtonText: {
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
    alignSelf: 'flex-start',
    marginTop: tokens.spacing.sm,
  },
  retryText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.sm,
  },
  goalBondProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.xs,
    gap: tokens.spacing.sm,
  },
  goalBondBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: tokens.borderRadius.full,
    overflow: 'hidden',
    marginBottom: tokens.spacing.xs,
  },
  goalBondBarFill: {
    height: '100%',
    borderRadius: tokens.borderRadius.full,
  },
  goalBondStatusText: {
    fontSize: tokens.typography.fontSizes.xs,
    marginBottom: tokens.spacing.sm,
  },
  goalBondMissionTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
    marginBottom: tokens.spacing.xs,
  },
  goalBondMissionList: {
    gap: tokens.spacing.sm,
  },
  goalBondMissionItem: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  goalBondMissionItemTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  goalBondMissionItemDesc: {
    fontSize: tokens.typography.fontSizes.xs,
    lineHeight: 18,
  },
  goalBondMissionMeta: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  goalBondMissionClaimed: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  goalBondClaimButton: {
    alignSelf: 'flex-start',
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  goalBondClaimButtonText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  infoLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    flex: 1,
  },
  infoValue: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
    textAlign: 'right',
  },
  memberContributionList: {
    gap: tokens.spacing.sm,
  },
  memberContributionItem: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  memberContributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  memberName: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  memberRole: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  memberMetaText: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  memberFallbackCard: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  memberFallbackText: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  memberFallbackCta: {
    alignSelf: 'flex-start',
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  memberFallbackCtaPressed: {
    opacity: 0.85,
  },
  memberFallbackCtaText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  actionButton: {
    gap: tokens.spacing.xs,
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  actionDescription: {
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
