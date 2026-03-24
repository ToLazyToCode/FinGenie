import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui';
import { gamificationApi, type Achievement } from '../api/modules';
import { useGamification } from '../store';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import { tokens } from '../theme';
import { showToast } from '../system';

type AchievementTab = 'ALL' | 'CLAIMED' | 'UNCLAIMED';

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#B9F2FF',
};

const FALLBACK_ICON = '🏆';

export function AchievementsScreen() {
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const { addPendingReward } = useGamification();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<AchievementTab>('ALL');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const text = useMemo(
    () => ({
      all: t('achievements.tab.all'),
      claimed: t('achievements.tab.claimed'),
      unclaimed: t('achievements.tab.unclaimed'),
      unlocked: t('achievements.status.unlocked'),
      locked: t('achievements.status.locked'),
      claimable: t('achievements.status.claimable'),
      claim: t('achievements.action.claim'),
      claimedLabel: t('achievements.status.claimed'),
      detailTitle: t('achievements.detail.title'),
      detailSummary: t('achievements.detail.summary'),
      detailHowTo: t('achievements.detail.howTo'),
      close: t('common.close'),
      reward: t('achievements.reward'),
      progress: t('achievements.progress'),
      levelLabel: t('gamification.level'),
      empty: t('achievements.empty'),
      loading: t('common.loading'),
      claimFailed: t('achievements.claimFailed'),
      unlockedCount: t('achievements.metric.unlocked'),
      lockedCount: t('achievements.metric.locked'),
      claimableCount: t('achievements.metric.claimable'),
    }),
    [t]
  );

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['gamificationProfile'],
    queryFn: async () => {
      const response = await gamificationApi.getProfile();
      return response.data;
    },
  });

  const {
    data: achievements,
    isLoading: achievementsLoading,
    refetch,
  } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const response = await gamificationApi.getAchievements();
      return response.data;
    },
  });

  const claimMutation = useMutation({
    mutationFn: gamificationApi.claimAchievement,
    onSuccess: async (_response, achievementId) => {
      const claimed = achievements?.find((item) => item.id === achievementId);
      if (claimed) {
        addPendingReward(claimed);
      }

      showToast(t('achievements.claimSuccess'));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['achievements'] }),
        queryClient.invalidateQueries({ queryKey: ['gamificationProfile'] }),
      ]);
    },
    onError: () => {
      showToast(text.claimFailed);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredAchievements = useMemo(() => {
    const list = achievements ?? [];
    if (selectedTab === 'CLAIMED') {
      return list.filter((achievement) => achievement.isClaimed);
    }
    if (selectedTab === 'UNCLAIMED') {
      return list.filter((achievement) => !achievement.isClaimed);
    }
    return list;
  }, [achievements, selectedTab]);

  const unlockedCount = (achievements ?? []).filter((achievement) => achievement.isUnlocked).length;
  const totalCount = achievements?.length ?? 0;
  const claimableCount = (achievements ?? []).filter(
    (achievement) => achievement.isUnlocked && !achievement.isClaimed
  ).length;

  const progressPercent = profile && profile.xpToNextLevel > 0
    ? Math.min(100, Math.round((profile.xp / profile.xpToNextLevel) * 100))
    : 0;

  const handleClaim = useCallback(
    (achievement: Achievement) => {
      if (claimMutation.isPending) {
        return;
      }
      claimMutation.mutate(achievement.id);
    },
    [claimMutation]
  );

  if (profileLoading || achievementsLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{text.loading}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {profile ? (
          <Card style={[styles.profileCard, { backgroundColor: colors.surface }]}> 
            <View style={styles.profileHeader}>
              <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}> 
                <Text style={styles.levelNumber}>{profile.level}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileTitle, { color: colors.text }]}>
                  {profile.title || `${text.levelLabel} ${profile.level}`}
                </Text>
                <Text style={[styles.xpText, { color: colors.textSecondary }]}>
                  {profile.xp} / {profile.xpToNextLevel} XP
                </Text>
              </View>
            </View>

            <View style={[styles.xpBar, { backgroundColor: colors.backgroundSecondary }]}> 
              <View
                style={[
                  styles.xpFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>

            <View style={styles.statsRow}>
              <Metric value={unlockedCount} label={text.unlockedCount} color={colors.text} />
              <Metric value={Math.max(0, totalCount - unlockedCount)} label={text.lockedCount} color={colors.text} />
              <Metric value={claimableCount} label={text.claimableCount} color={colors.success} />
            </View>
          </Card>
        ) : null}

        <View style={styles.tabsRow}>
          {[
            { label: text.all, value: 'ALL' as AchievementTab },
            { label: text.claimed, value: 'CLAIMED' as AchievementTab },
            { label: text.unclaimed, value: 'UNCLAIMED' as AchievementTab },
          ].map((tab) => (
            <Pressable
              key={tab.value}
              style={[
                styles.tab,
                {
                  borderColor: selectedTab === tab.value ? colors.primary : colors.border,
                  backgroundColor:
                    selectedTab === tab.value ? colors.primary : colors.surface,
                },
              ]}
              onPress={() => setSelectedTab(tab.value)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: selectedTab === tab.value ? colors.textOnPrimary ?? '#fff' : colors.text },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.achievementList}>
          {filteredAchievements.length === 0 ? (
            <Card style={[styles.emptyCard, { backgroundColor: colors.surface }]}> 
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{text.empty}</Text>
            </Card>
          ) : (
            filteredAchievements.map((achievement) => {
              const statusLabel = achievement.isClaimed
                ? text.claimedLabel
                : achievement.isUnlocked
                  ? text.claimable
                  : text.locked;

              return (
                <Pressable
                  key={achievement.id}
                  onPress={() => setSelectedAchievement(achievement)}
                >
                  <Card
                    style={[
                      styles.achievementCard,
                      {
                        backgroundColor: colors.surface,
                        opacity: achievement.isUnlocked ? 1 : 0.78,
                      },
                    ]}
                  >
                    <View style={styles.achievementContent}>
                      <View
                        style={[
                          styles.achievementIcon,
                          {
                            backgroundColor: achievement.isUnlocked
                              ? TIER_COLORS[achievement.tier] || colors.primary
                              : colors.textMuted,
                          },
                        ]}
                      >
                        <Text style={styles.iconText}>{achievement.icon || FALLBACK_ICON}</Text>
                      </View>

                      <View style={styles.achievementInfo}>
                        <View style={styles.achievementHeader}>
                          <Text
                            style={[
                              styles.achievementName,
                              { color: achievement.isUnlocked ? colors.text : colors.textMuted },
                            ]}
                            numberOfLines={1}
                          >
                            {achievement.name}
                          </Text>
                          <View
                            style={[
                              styles.rarityBadge,
                              {
                                backgroundColor: TIER_COLORS[achievement.tier] || colors.primary,
                              },
                            ]}
                          >
                            <Text style={styles.rarityText}>{achievement.tier}</Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.achievementDescription,
                            { color: achievement.isUnlocked ? colors.textSecondary : colors.textMuted },
                          ]}
                          numberOfLines={2}
                        >
                          {achievement.description}
                        </Text>

                        {!achievement.isUnlocked ? (
                          <View style={styles.progressSection}>
                            <View
                              style={[
                                styles.progressBar,
                                { backgroundColor: colors.backgroundSecondary },
                              ]}
                            >
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${achievement.progressPercentage || 0}%`,
                                    backgroundColor: colors.primary,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={[styles.progressText, { color: colors.textSecondary }]}> 
                              {achievement.progressValue} / {achievement.targetValue}
                            </Text>
                          </View>
                        ) : null}

                        <View style={styles.achievementFooter}>
                          <Text style={[styles.xpReward, { color: colors.primary }]}>+{achievement.xpReward} XP</Text>
                          <View style={styles.footerRight}>
                            <Text style={[styles.statusText, { color: colors.textSecondary }]}>{statusLabel}</Text>
                            {achievement.isUnlocked && !achievement.isClaimed ? (
                              <Pressable
                                style={[styles.claimButton, { backgroundColor: colors.success }]}
                                onPress={() => handleClaim(achievement)}
                                disabled={claimMutation.isPending}
                              >
                                {claimMutation.isPending ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <Text style={styles.claimButtonText}>{text.claim}</Text>
                                )}
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(selectedAchievement)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]}>{text.detailTitle}</Text>

            {selectedAchievement ? (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIcon,
                      {
                        backgroundColor: TIER_COLORS[selectedAchievement.tier] || colors.primary,
                      },
                    ]}
                  >
                    <Text style={styles.iconText}>{selectedAchievement.icon || FALLBACK_ICON}</Text>
                  </View>
                  <View style={styles.modalMeta}>
                    <Text style={[styles.modalName, { color: colors.text }]}>{selectedAchievement.name}</Text>
                    <Text style={[styles.modalTier, { color: colors.textSecondary }]}> 
                      {selectedAchievement.tier} • +{selectedAchievement.xpReward} XP
                    </Text>
                  </View>
                </View>

                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{text.detailSummary}</Text>
                <Text style={[styles.modalSectionBody, { color: colors.textSecondary }]}>
                  {selectedAchievement.description}
                </Text>

                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{text.progress}</Text>
                <Text style={[styles.modalSectionBody, { color: colors.textSecondary }]}>
                  {selectedAchievement.progressValue} / {selectedAchievement.targetValue}
                </Text>

                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>{text.detailHowTo}</Text>
                <Text style={[styles.modalSectionBody, { color: colors.textSecondary }]}>
                  {selectedAchievement.isClaimed
                    ? t('achievements.detail.hint.claimed')
                    : selectedAchievement.isUnlocked
                      ? t('achievements.detail.hint.unlocked')
                      : t('achievements.detail.hint.locked')}
                </Text>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={[styles.modalCloseButton, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => setSelectedAchievement(null)}
                  >
                    <Text style={[styles.modalCloseText, { color: colors.text }]}>{text.close}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Metric({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.metricItem}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
  },
  loadingText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  profileCard: {
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  levelNumber: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: 2,
  },
  xpText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  xpBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: tokens.spacing.md,
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  metricLabel: {
    marginTop: 2,
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
  },
  tabText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  achievementList: {
    gap: tokens.spacing.sm,
  },
  emptyCard: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  achievementCard: {
    padding: tokens.spacing.md,
  },
  achievementContent: {
    flexDirection: 'row',
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  iconText: {
    fontSize: 28,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
  },
  achievementName: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  rarityBadge: {
    borderRadius: tokens.borderRadius.xs,
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 2,
  },
  rarityText: {
    color: '#fff',
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  achievementDescription: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 18,
    marginBottom: tokens.spacing.sm,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    minWidth: 72,
    textAlign: 'right',
    fontSize: tokens.typography.fontSizes.xs,
  },
  achievementFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  xpReward: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  statusText: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  claimButton: {
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    minWidth: 72,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
  },
  modalCard: {
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.lg,
  },
  modalTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  modalMeta: {
    flex: 1,
  },
  modalName: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
    marginBottom: 2,
  },
  modalTier: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  modalSectionTitle: {
    marginTop: tokens.spacing.sm,
    marginBottom: 2,
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  modalSectionBody: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  modalFooter: {
    marginTop: tokens.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCloseButton: {
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  modalCloseText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
