import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tokens } from '../theme';
import { Card } from '../components/ui';
import {
  finPointApi,
  petApi,
  rewardsApi,
  savingsApi,
  type FinPointHistoryItem,
  type FinPointHistoryPageResponse,
  type FinPointMissionRewardState,
  type FinPointSummaryResponse,
  type PersonalRewardCatalogItemResponse,
  type PersonalRewardOwnedResponse,
  type SavingContributionResponse,
} from '../api/modules';
import { usePet, useDailyMissionsStore } from '../store';
import { useThemeStore } from '../store/themeStore';
import type { AppStackParamList } from '../navigation/types';
import { DailyMissionsService } from '../services/DailyMissionsService';
import { useI18n } from '../i18n/useI18n';
import { dailyMissionsStore, type DailyMissionId } from '../store/dailyMissionsStore';
import { useEntitlements } from '../hooks';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const MOOD_EMOJIS: Record<string, string> = {
  ECSTATIC: '🤩',
  HAPPY: '😊',
  CONTENT: '😌',
  NEUTRAL: '😐',
  SAD: '😢',
  WORRIED: '😟',
  ANGRY: '😤',
  SLEEPY: '😴',
};

const MOOD_COLORS: Record<string, string> = {
  ECSTATIC: '#FFD700',
  HAPPY: '#4ADE80',
  CONTENT: '#60A5FA',
  NEUTRAL: '#9CA3AF',
  SAD: '#60A5FA',
  WORRIED: '#F59E0B',
  ANGRY: '#EF4444',
  SLEEPY: '#A78BFA',
};

const PET_IMAGES: Record<string, Record<string, string>> = {
  CAT: {
    IDLE: '🐱',
    HAPPY: '😺',
    SAD: '😿',
    EATING: '😻',
    PLAYING: '🙀',
    SLEEPING: '😸',
  },
  DOG: {
    IDLE: '🐕',
    HAPPY: '🐶',
    SAD: '🐕‍🦺',
    EATING: '🦴',
    PLAYING: '🎾',
    SLEEPING: '💤',
  },
  RABBIT: {
    IDLE: '🐰',
    HAPPY: '🐇',
    SAD: '😢',
    EATING: '🥕',
    PLAYING: '🌸',
    SLEEPING: '💤',
  },
};

export function PetScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const themedStyles = getThemedStyles(colors);
  const themedStatStyles = getThemedStatStyles(colors);
  const { canAccess } = useEntitlements();
  const canRedeemPersonalRewards = canAccess('voucher.personal.redeem');
  const screenText = useMemo(
    () => ({
      yourPet: t('pet.hubTitle'),
      level: t('gamification.level'),
      statsTitle: t('pet.statsTitle'),
      energy: t('pet.energy'),
      chat: t('pet.chat'),
      activityTitle: t('pet.activityTitle'),
      noActivity: t('pet.noActivity'),
      petSays: t('pet.saysSuffix'),
      petFallbackName: t('pet.fallbackName'),
      reactButton: t('pet.reactButton'),
      achievementsCta: t('pet.achievementsCta'),
      achievementsHint: t('pet.achievementsHint'),
    }),
    [t]
  );
  const { missions, xpToday, streak, ensureCurrentDay } = useDailyMissionsStore();
  const {
    setPet: setPetData,
    setMood,
  } = usePet();

  const [currentMood, setCurrentMood] = useState<string>('NEUTRAL');
  const [redeemingRewardId, setRedeemingRewardId] = useState<number | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // Fetch pet state
  const { data: petState, isLoading, refetch } = useQuery({
    queryKey: ['petState'],
    queryFn: async () => {
      const response = await petApi.getState();
      setPetData(response.data);
      setMood(response.data.mood);
      setCurrentMood(response.data.mood);
      return response.data;
    },
  });

  const { data: contributionsData, refetch: refetchContributions } = useQuery<SavingContributionResponse[]>({
    queryKey: ['saving-contributions-missions', 50],
    queryFn: async () => {
      try {
        const response = await savingsApi.listContributions(50);
        return response.data;
      } catch {
        return [];
      }
    },
  });

  const { data: finPointSummary, refetch: refetchFinPointSummary } = useQuery<FinPointSummaryResponse>({
    queryKey: ['finPointSummary'],
    queryFn: async () => {
      const response = await finPointApi.getSummary();
      return response.data;
    },
  });

  const {
    data: finPointHistory,
    isLoading: isFinPointHistoryLoading,
    isError: isFinPointHistoryError,
    refetch: refetchFinPointHistory,
  } = useQuery<FinPointHistoryPageResponse>({
    queryKey: ['finPointHistory', 5],
    queryFn: async () => {
      const response = await finPointApi.getHistory({ page: 0, size: 5 });
      return response.data;
    },
  });

  const { data: missionRewardState, refetch: refetchMissionRewardState } = useQuery<{
    dayKey: string;
    xpToday: number;
    finPointToday: number;
    missions: FinPointMissionRewardState[];
  }>({
    queryKey: ['finPointMissionsToday'],
    queryFn: async () => {
      const response = await finPointApi.getTodayMissionState();
      return response.data;
    },
  });
  const {
    data: personalRewardCatalog,
    isLoading: isPersonalRewardCatalogLoading,
    isError: isPersonalRewardCatalogError,
    refetch: refetchPersonalRewardCatalog,
  } = useQuery<PersonalRewardCatalogItemResponse[]>({
    queryKey: ['personalRewardsCatalog'],
    enabled: canRedeemPersonalRewards,
    queryFn: async () => {
      const response = await rewardsApi.getPersonalCatalog();
      return response.data;
    },
  });
  const {
    data: personalOwnedRewards,
    isLoading: isPersonalOwnedRewardsLoading,
    isError: isPersonalOwnedRewardsError,
    refetch: refetchPersonalOwnedRewards,
  } = useQuery<PersonalRewardOwnedResponse[]>({
    queryKey: ['personalRewardsOwned'],
    enabled: canRedeemPersonalRewards,
    queryFn: async () => {
      const response = await rewardsApi.getPersonalOwned(20);
      return response.data;
    },
  });

  const redeemPersonalRewardMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      const response = await rewardsApi.redeemPersonalReward(rewardId);
      return response.data;
    },
    onMutate: (rewardId) => {
      setRedeemingRewardId(rewardId);
    },
    onSuccess: async (response) => {
      Alert.alert(
        t('common.success'),
        response.granted ? t('personalRewards.redeemSuccess') : t('personalRewards.redeemAlreadyOwned')
      );
      await Promise.all([
        refetchFinPointSummary(),
        refetchFinPointHistory(),
        refetchPersonalRewardCatalog(),
        refetchPersonalOwnedRewards(),
      ]);
    },
    onError: () => {
      Alert.alert(t('common.error'), t('personalRewards.redeemFailed'));
    },
    onSettled: () => {
      setRedeemingRewardId(null);
    },
  });


  const playBounceAnimation = useCallback(() => {
    Animated.sequence([
      Animated.spring(bounceAnim, { toValue: 1.2, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [bounceAnim]);

  useEffect(() => {
    ensureCurrentDay();
    void DailyMissionsService.syncFromBackend();
  }, [ensureCurrentDay]);

  useEffect(() => {
    if (!missionRewardState) {
      return;
    }

    const completedMissionIds = missionRewardState.missions
      .filter((mission) => mission.completed)
      .map((mission) => mission.missionId)
      .filter((missionId): missionId is DailyMissionId =>
        missionId === 'contributeToday' || missionId === 'viewPlan' || missionId === 'viewActivity'
      );

    dailyMissionsStore.getState().setTodaySnapshot(
      missionRewardState.dayKey,
      {
        contributeToday: completedMissionIds.includes('contributeToday'),
        viewPlan: completedMissionIds.includes('viewPlan'),
        viewActivity: completedMissionIds.includes('viewActivity'),
      },
      missionRewardState.xpToday ?? completedMissionIds.length * 10
    );
  }, [missionRewardState]);

  useEffect(() => {
    if (contributionsData) {
      DailyMissionsService.syncContributeToday(contributionsData);
    }
  }, [contributionsData]);

  useEffect(() => {
    void refetchFinPointSummary();
    void refetchFinPointHistory();
    void refetchMissionRewardState();
  }, [
    missions.contributeToday,
    missions.viewPlan,
    missions.viewActivity,
    refetchFinPointSummary,
    refetchFinPointHistory,
    refetchMissionRewardState,
  ]);

  useEffect(() => {
    // Idle animation loop
    const idleLoop = () => {
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]).start(() => idleLoop());
    };
    idleLoop();
  }, [bounceAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetch(),
      refetchContributions(),
      refetchFinPointSummary(),
      refetchFinPointHistory(),
      refetchMissionRewardState(),
      refetchPersonalRewardCatalog(),
      refetchPersonalOwnedRewards(),
      DailyMissionsService.syncFromBackend(),
    ]);
    setRefreshing(false);
  }, [
    refetch,
    refetchContributions,
    refetchFinPointSummary,
    refetchFinPointHistory,
    refetchMissionRewardState,
    refetchPersonalRewardCatalog,
    refetchPersonalOwnedRewards,
  ]);

  const getPetEmoji = () => {
    const type = petState?.petType || 'CAT';
    return PET_IMAGES[type]?.IDLE || PET_IMAGES.CAT.IDLE;
  };

  const getMoodEmoji = () => MOOD_EMOJIS[currentMood] || MOOD_EMOJIS.NEUTRAL;
  const getMoodColor = () => MOOD_COLORS[currentMood] || colors.textSecondary;

  const missionRewards = useMemo(() => {
    const defaults: Record<DailyMissionId, { xpReward: number; finPointReward: number }> = {
      contributeToday: { xpReward: 10, finPointReward: 5 },
      viewPlan: { xpReward: 10, finPointReward: 5 },
      viewActivity: { xpReward: 10, finPointReward: 5 },
    };

    (missionRewardState?.missions || []).forEach((mission) => {
      const missionId = mission.missionId;
      if (missionId === 'contributeToday' || missionId === 'viewPlan' || missionId === 'viewActivity') {
        defaults[missionId] = {
          xpReward: mission.xpReward ?? defaults[missionId].xpReward,
          finPointReward: mission.finPointReward ?? defaults[missionId].finPointReward,
        };
      }
    });

    return defaults;
  }, [missionRewardState?.missions]);

  const completedDailyMissionCount = useMemo(() => {
    const flags = [missions.contributeToday, missions.viewPlan, missions.viewActivity];
    return flags.filter(Boolean).length;
  }, [missions.contributeToday, missions.viewActivity, missions.viewPlan]);

  const missionEnergy = useMemo(
    () => Math.min(100, Math.round((completedDailyMissionCount / 3) * 100)),
    [completedDailyMissionCount]
  );

  const finPointRecentItems = useMemo(
    () => (finPointHistory?.items || []).slice(0, 3),
    [finPointHistory?.items]
  );

  const missionLabelById = useMemo(
    () => ({
      contributeToday: t('petMissions.contributeToday'),
      viewPlan: t('petMissions.viewPlan'),
      viewActivity: t('petMissions.viewActivity'),
    }),
    [t]
  );

  const formatMissionReward = useCallback(
    (missionId: DailyMissionId) => {
      const reward = missionRewards[missionId];
      return `+${reward.xpReward} ${t('petMissions.rewardUnitXp')} | +${reward.finPointReward} ${t('petMissions.rewardUnitFinPoint')}`;
    },
    [missionRewards, t]
  );

  const formatFinPointReason = useCallback(
    (item: FinPointHistoryItem) => {
      const missionId = item.missionId as DailyMissionId | undefined;
      if (
        missionId &&
        (missionId === 'contributeToday' || missionId === 'viewPlan' || missionId === 'viewActivity')
      ) {
        return missionLabelById[missionId];
      }
      if (item.reason === 'daily_mission_reward') {
        return t('finPoint.dailyMissionReward');
      }
      return item.reason || t('common.noData');
    },
    [missionLabelById, t]
  );
  const formatRewardStatus = useCallback(
    (status: string | null | undefined) => {
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
    },
    [t]
  );
  const formatSignedFinPoint = useCallback((amount: number) => {
    if (amount > 0) {
      return `+${amount}`;
    }
    return String(amount);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, themedStyles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Pet Header */}
        <View style={styles.header}>
          <Text style={[styles.petName, themedStyles.petName]}>
            {petState?.petName || screenText.yourPet}
          </Text>
          <Text style={[styles.petLevel, themedStyles.petLevel]}>
            {screenText.level} {petState?.level || 1}
          </Text>
        </View>

        {/* Pet Display */}
        <Card style={styles.petCard}>
          <View style={styles.petContainer}>
            {/* Mood bubble */}
            <View style={[styles.moodBubble, { backgroundColor: `${getMoodColor()}20` }]}>
              <Text style={styles.moodEmoji}>{getMoodEmoji()}</Text>
              <Text style={[styles.moodText, { color: getMoodColor() }]}>
                {currentMood}
              </Text>
            </View>

            {/* Pet animation */}
            <Animated.View
              style={[
                styles.petImageContainer,
                {
                  transform: [
                    { scale: bounceAnim },
                  ],
                },
              ]}
            >
              <Pressable
                onPress={() => {
                  playBounceAnimation();
                  Alert.alert(`${petState?.petName || screenText.petFallbackName} ${screenText.petSays}`, `"${getPetMessage()}"`, [
                    { text: screenText.reactButton, style: 'default' },
                  ]);
                }}
              >
                <Text style={styles.petEmoji}>{getPetEmoji()}</Text>
              </Pressable>
            </Animated.View>

            {/* XP Bar */}
            <View style={styles.xpContainer}>
              <View style={[styles.xpBar, themedStyles.xpBar]}>
                <View
                  style={[
                    styles.xpFill,
                    themedStyles.xpFill,
                    { width: `${((petState?.xp || 0) / (petState?.xpToNextLevel || 100)) * 100}%` },
                  ]}
                />
              </View>
              <Text style={[styles.xpText, themedStyles.xpText]}>
                {petState?.xp || 0} / {petState?.xpToNextLevel || 100} XP
              </Text>
            </View>
          </View>
        </Card>

        {/* Stats */}
        <Card style={styles.statsCard}>
          <Text style={[styles.statsTitle, themedStyles.statsTitle]}>{screenText.statsTitle}</Text>
          <View style={styles.statsGrid}>
            <StatBar
              label={screenText.energy}
              value={missionEnergy}
              maxValue={100}
              color={colors.warning}
              themedStatStyles={themedStatStyles}
              icon="E"
            />
          </View>
        </Card>


        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={[styles.actionButton, themedStyles.actionButton]}
            onPress={() => navigation.navigate('PetChat')}
          >
            <Text style={styles.actionIcon}>AI</Text>
            <Text style={[styles.actionText, themedStyles.actionText]}>{screenText.chat}</Text>
          </Pressable>
        </View>

        <Card style={styles.activityCard}>
          <Pressable onPress={() => navigation.navigate('Achievements')}>
            <Text style={[styles.activityTitle, themedStyles.activityTitle]}>{screenText.achievementsCta}</Text>
            <Text style={[styles.noActivity, themedStyles.noActivity]}>{screenText.achievementsHint}</Text>
          </Pressable>
        </Card>

        {/* Pet Activity - using store activities */}
        <Card style={styles.activityCard}>
          <Text style={[styles.activityTitle, themedStyles.activityTitle]}>
            {screenText.activityTitle}
          </Text>
          {/* Activity will be populated from store */}
          <Text style={[styles.noActivity, themedStyles.noActivity]}>
            {screenText.noActivity}
          </Text>
        </Card>

        {/* Daily Missions */}
        <Card style={styles.missionsCard}>
          <Text style={[styles.missionsTitle, themedStyles.missionsTitle]}>
            {t('petMissions.title')}
          </Text>

          <View style={styles.missionsSummaryRow}>
            <Text style={[styles.missionsSummaryText, themedStyles.missionsSummaryText]}>
              {t('petMissions.xpToday')}: +{xpToday}
            </Text>
            <Text style={[styles.missionsSummaryText, themedStyles.missionsSummaryText]}>
              {t('petMissions.streak')}: {streak}
            </Text>
          </View>

          <Card style={styles.finPointCard}>
            <Text style={[styles.finPointTitle, themedStyles.statsTitle]}>{t('finPoint.title')}</Text>
            <View style={styles.finPointSummaryRow}>
              <Text style={[styles.finPointMeta, themedStyles.missionsSummaryText]}>
                {t('finPoint.balance')}: {finPointSummary?.balance ?? 0}
              </Text>
              <Text style={[styles.finPointMeta, themedStyles.missionsSummaryText]}>
                {t('finPoint.earnedToday')}: +{finPointSummary?.todayEarned ?? 0}
              </Text>
            </View>

            <Text style={[styles.finPointRecentTitle, themedStyles.missionsSummaryText]}>
              {t('finPoint.recentGains')}
            </Text>
            {isFinPointHistoryLoading ? (
              <Text style={[styles.finPointEmpty, themedStyles.noActivity]}>{t('common.loading')}</Text>
            ) : isFinPointHistoryError ? (
              <Text style={[styles.finPointEmpty, themedStyles.noActivity]}>{t('common.loadingError')}</Text>
            ) : finPointRecentItems.length === 0 ? (
              <Text style={[styles.finPointEmpty, themedStyles.noActivity]}>{t('finPoint.empty')}</Text>
            ) : (
              finPointRecentItems.map((item) => (
                <View key={item.id} style={[styles.finPointHistoryRow, themedStyles.missionRow]}>
                  <Text style={[styles.finPointHistoryAmount, themedStyles.missionStatusDone]}>
                    {formatSignedFinPoint(item.amount)} {t('petMissions.rewardUnitFinPoint')}
                  </Text>
                  <Text style={[styles.finPointHistoryReason, themedStyles.missionLabel]}>
                    {formatFinPointReason(item)}
                  </Text>
                </View>
              ))
            )}
          </Card>

          {canRedeemPersonalRewards ? (
            <Card style={styles.personalRewardsCard}>
              <Text style={[styles.personalRewardsTitle, themedStyles.statsTitle]}>
                {t('personalRewards.title')}
              </Text>

              <Text style={[styles.personalRewardsSectionTitle, themedStyles.missionsSummaryText]}>
                {t('personalRewards.availableTitle')}
              </Text>
              {isPersonalRewardCatalogLoading ? (
                <Text style={[styles.finPointEmpty, themedStyles.noActivity]}>{t('common.loading')}</Text>
              ) : isPersonalRewardCatalogError ? (
                <Text style={[styles.finPointEmpty, themedStyles.noActivity]}>{t('common.loadingError')}</Text>
              ) : (personalRewardCatalog?.length ?? 0) === 0 ? (
                <Text style={[styles.finPointEmpty, themedStyles.noActivity]}>{t('personalRewards.emptyCatalog')}</Text>
              ) : (
                <View style={styles.personalRewardList}>
                  {(personalRewardCatalog ?? []).map((reward) => {
                    const isRedeemingThisReward =
                      redeemPersonalRewardMutation.isPending && redeemingRewardId === reward.rewardId;
                    const isDisabled =
                      isRedeemingThisReward ||
                      redeemPersonalRewardMutation.isPending ||
                      reward.owned ||
                      !reward.canRedeem;
                    const statusLabel = reward.owned
                      ? formatRewardStatus(reward.ownedStatus ?? 'CLAIMED')
                      : reward.canRedeem
                        ? t('rewardStatus.available')
                        : t('personalRewards.insufficient');

                    return (
                      <View key={reward.rewardId} style={[styles.personalRewardItem, themedStyles.missionRow]}>
                        <View style={styles.personalRewardHeaderRow}>
                          <Text style={[styles.personalRewardName, themedStyles.missionLabel]}>{reward.title}</Text>
                          <Text style={[styles.personalRewardCost, themedStyles.missionsSummaryText]}>
                            {reward.pointCost} {t('petMissions.rewardUnitFinPoint')}
                          </Text>
                        </View>
                        {reward.description ? (
                          <Text style={[styles.personalRewardDescription, themedStyles.noActivity]}>
                            {reward.description}
                          </Text>
                        ) : null}
                        {reward.partnerName ? (
                          <Text style={[styles.personalRewardMeta, themedStyles.missionsSummaryText]}>
                            {t('personalRewards.partner')}: {reward.partnerName}
                          </Text>
                        ) : null}
                        <Text style={[styles.personalRewardMeta, themedStyles.missionsSummaryText]}>
                          {t('personalRewards.status')}: {statusLabel}
                        </Text>
                        <Pressable
                          onPress={() => redeemPersonalRewardMutation.mutate(reward.rewardId)}
                          disabled={isDisabled}
                          style={[
                            styles.redeemButton,
                            themedStyles.personalRewardRedeemButton,
                            isDisabled && themedStyles.personalRewardRedeemButtonDisabled,
                          ]}
                        >
                          <Text style={[styles.redeemButtonText, themedStyles.personalRewardRedeemButtonText]}>
                            {isRedeemingThisReward
                              ? t('personalRewards.redeeming')
                              : reward.owned
                                ? t('personalRewards.owned')
                                : t('personalRewards.redeemAction')}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={[styles.personalRewardsSectionTitle, themedStyles.missionsSummaryText]}>
                {t('personalRewards.ownedTitle')}
              </Text>
              {isPersonalOwnedRewardsLoading ? (
                <Text style={[styles.finPointEmpty, themedStyles.noActivity]}>{t('common.loading')}</Text>
              ) : isPersonalOwnedRewardsError ? (
                <Text style={[styles.finPointEmpty, themedStyles.noActivity]}>{t('common.loadingError')}</Text>
              ) : (personalOwnedRewards?.length ?? 0) === 0 ? (
                <Text style={[styles.finPointEmpty, themedStyles.noActivity]}>{t('personalRewards.emptyOwned')}</Text>
              ) : (
                <View style={styles.personalRewardList}>
                  {(personalOwnedRewards ?? []).map((reward) => (
                    <View key={reward.redemptionId} style={[styles.personalRewardItem, themedStyles.missionRow]}>
                      <View style={styles.personalRewardHeaderRow}>
                        <Text style={[styles.personalRewardName, themedStyles.missionLabel]}>{reward.title}</Text>
                        <Text style={[styles.personalRewardCost, themedStyles.missionsSummaryText]}>
                          {reward.finPointCost} {t('petMissions.rewardUnitFinPoint')}
                        </Text>
                      </View>
                      <Text style={[styles.personalRewardMeta, themedStyles.missionsSummaryText]}>
                        {t('personalRewards.status')}: {formatRewardStatus(reward.status)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ) : null}

          <View style={styles.missionList}>
            <MissionRow
              label={t('petMissions.contributeToday')}
              completed={missions.contributeToday}
              doneLabel={t('petMissions.completed')}
              pendingLabel={t('petMissions.pending')}
              rewardText={formatMissionReward('contributeToday')}
              themedStyles={themedStyles}
            />
            <MissionRow
              label={t('petMissions.viewPlan')}
              completed={missions.viewPlan}
              doneLabel={t('petMissions.completed')}
              pendingLabel={t('petMissions.pending')}
              rewardText={formatMissionReward('viewPlan')}
              themedStyles={themedStyles}
            />
            <MissionRow
              label={t('petMissions.viewActivity')}
              completed={missions.viewActivity}
              doneLabel={t('petMissions.completed')}
              pendingLabel={t('petMissions.pending')}
              rewardText={formatMissionReward('viewActivity')}
              themedStyles={themedStyles}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );

  function getPetMessage() {
    const moodKeyMap: Record<string, string> = {
      ECSTATIC: 'pet.message.ecstatic',
      HAPPY: 'pet.message.happy',
      CONTENT: 'pet.message.content',
      NEUTRAL: 'pet.message.neutral',
      SAD: 'pet.message.sad',
      WORRIED: 'pet.message.worried',
      ANGRY: 'pet.message.angry',
      SLEEPY: 'pet.message.sleepy',
    };

    const key = moodKeyMap[currentMood] || 'pet.message.neutral';
    const moodMessages = t(key)
      .split('|')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (moodMessages.length === 0) {
      return t('pet.message.fallback');
    }

    return moodMessages[Math.floor(Math.random() * moodMessages.length)];
  }
}

// Stat bar component
function StatBar({
  label,
  value,
  maxValue,
  color,
  icon,
  themedStatStyles,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  icon: string;
  themedStatStyles: ReturnType<typeof getThemedStatStyles>;
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  return (
    <View style={statStyles.container}>
      <View style={statStyles.header}>
        <Text style={statStyles.icon}>{icon}</Text>
        <Text style={[statStyles.label, themedStatStyles.label]}>{label}</Text>
        <Text style={[statStyles.value, themedStatStyles.value]}>{Math.round(value)}%</Text>
      </View>
      <View style={[statStyles.bar, themedStatStyles.bar]}>
        <View style={[statStyles.fill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MissionRow({
  label,
  completed,
  doneLabel,
  pendingLabel,
  rewardText,
  themedStyles,
}: {
  label: string;
  completed: boolean;
  doneLabel: string;
  pendingLabel: string;
  rewardText: string;
  themedStyles: ReturnType<typeof getThemedStyles>;
}) {
  return (
    <View style={[styles.missionRow, themedStyles.missionRow]}>
      <Text style={[styles.missionCheckbox, completed ? themedStyles.missionCheckboxDone : themedStyles.missionCheckboxPending]}>
        {completed ? '[x]' : '[ ]'}
      </Text>
      <Text style={[styles.missionLabel, themedStyles.missionLabel]}>{label}</Text>
      <View style={styles.missionMeta}>
        <Text style={[styles.missionReward, themedStyles.missionsSummaryText]}>{rewardText}</Text>
        <Text style={[styles.missionStatus, completed ? themedStyles.missionStatusDone : themedStyles.missionStatusPending]}>
          {completed ? doneLabel : pendingLabel}
        </Text>
      </View>
    </View>
  );
}

const getThemedStatStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    label: {
      color: colors.textSecondary,
    },
    value: {
      color: colors.text,
    },
    bar: {
      backgroundColor: colors.backgroundSecondary,
    },
  });

const statStyles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  icon: {
    fontSize: 14,
    marginRight: tokens.spacing.xs,
  },
  label: {
    fontSize: tokens.typography.fontSizes.sm,
    flex: 1,
  },
  value: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  bar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    loadingContainer: {
      backgroundColor: colors.background,
    },
    petName: {
      color: colors.text,
    },
    petLevel: {
      color: colors.textSecondary,
    },
    xpBar: {
      backgroundColor: colors.backgroundSecondary,
    },
    xpFill: {
      backgroundColor: colors.primary,
    },
    xpText: {
      color: colors.textSecondary,
    },
    statsTitle: {
      color: colors.text,
    },
    actionButton: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    actionText: {
      color: colors.text,
    },
    insightCard: {
      backgroundColor: `${colors.primary}10`,
      borderColor: colors.primary,
    },
    insightTitle: {
      color: colors.primary,
    },
    insightText: {
      color: colors.text,
    },
    activityTitle: {
      color: colors.text,
    },
    activityItem: {
      borderBottomColor: colors.border,
    },
    activityText: {
      color: colors.text,
    },
    activityTime: {
      color: colors.textMuted,
    },
    noActivity: {
      color: colors.textSecondary,
    },
    missionsTitle: {
      color: colors.text,
    },
    missionsSummaryText: {
      color: colors.textSecondary,
    },
    missionRow: {
      borderBottomColor: colors.border,
    },
    missionLabel: {
      color: colors.text,
    },
    missionStatusDone: {
      color: colors.success,
    },
    missionStatusPending: {
      color: colors.textSecondary,
    },
    missionCheckboxDone: {
      color: colors.success,
    },
    missionCheckboxPending: {
      color: colors.textSecondary,
    },
    personalRewardRedeemButton: {
      backgroundColor: colors.primary,
    },
    personalRewardRedeemButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    personalRewardRedeemButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
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
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  petName: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  petLevel: {
    fontSize: tokens.typography.fontSizes.sm,
    marginTop: tokens.spacing.xs,
  },
  petCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.lg,
  },
  petContainer: {
    alignItems: 'center',
  },
  moodBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.full,
    marginBottom: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  petImageContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  petEmoji: {
    fontSize: 120,
  },
  xpContainer: {
    width: '100%',
    alignItems: 'center',
  },
  xpBar: {
    width: '80%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: tokens.spacing.xs,
  },
  xpFill: {
    height: '100%',
    borderRadius: 6,
  },
  xpText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  statsCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.lg,
  },
  statsTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.md,
  },
  statsGrid: {},
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionDisabled: {
    opacity: 0.6,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: tokens.spacing.xs,
  },
  actionText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  insightCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  insightEmoji: {
    fontSize: 20,
    marginRight: tokens.spacing.sm,
  },
  insightTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  insightText: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  activityCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.lg,
  },
  activityTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  activityEmoji: {
    fontSize: 20,
    marginRight: tokens.spacing.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  activityTime: {
    fontSize: tokens.typography.fontSizes.xs,
    marginTop: 2,
  },
  noActivity: {
    fontSize: tokens.typography.fontSizes.sm,
    textAlign: 'center',
    paddingVertical: tokens.spacing.md,
  },
  missionsCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.lg,
  },
  missionsTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.sm,
  },
  missionsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  missionsSummaryText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  finPointCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.md,
  },
  finPointTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
    marginBottom: tokens.spacing.sm,
  },
  finPointSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  finPointMeta: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  finPointRecentTitle: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    marginBottom: tokens.spacing.xs,
  },
  finPointEmpty: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  finPointHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: tokens.spacing.sm,
  },
  finPointHistoryAmount: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  finPointHistoryReason: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.sm,
    textAlign: 'right',
  },
  personalRewardsCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.md,
  },
  personalRewardsTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
    marginBottom: tokens.spacing.sm,
  },
  personalRewardsSectionTitle: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    marginBottom: tokens.spacing.xs,
  },
  personalRewardList: {
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  personalRewardItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  personalRewardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  personalRewardName: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  personalRewardCost: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  personalRewardDescription: {
    fontSize: tokens.typography.fontSizes.xs,
    lineHeight: 18,
  },
  personalRewardMeta: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  redeemButton: {
    alignSelf: 'flex-start',
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  redeemButtonText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  missionList: {
    gap: tokens.spacing.sm,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  missionCheckbox: {
    fontSize: tokens.typography.fontSizes.md,
    width: 22,
    textAlign: 'center',
  },
  missionLabel: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.sm,
  },
  missionMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 110,
  },
  missionReward: {
    fontSize: tokens.typography.fontSizes.xs,
    marginBottom: 2,
  },
  missionStatus: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});





