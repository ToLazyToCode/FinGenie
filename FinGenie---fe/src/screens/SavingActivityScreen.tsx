import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  aiApi,
  savingsApi,
  type SavingContributionResponse,
  type SavingTargetResponse,
} from '../api/modules';
import { savingsKeys } from '../queryKeys/savings.keys';
import { Card } from '../components/ui';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import type { AppStackParamList, MainTabParamList } from '../navigation/types';

interface SavingActivityScreenProps {
  embedded?: boolean;
}

interface ActivityGroup {
  key: string;
  label: string;
  items: SavingContributionResponse[];
}

type TargetFilter = 'ALL' | 'GOAL' | 'PIGGY';
type SourceFilter = 'ALL' | 'MANUAL' | 'AUTO';
const LIMIT_STEPS = [50, 100, 200, 500] as const;

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Wallet'>,
  NativeStackNavigationProp<AppStackParamList>
>;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function SavingActivityScreen({ embedded = false }: SavingActivityScreenProps) {
  const navigation = useNavigation<Nav>();
  const { colors } = useThemeStore();
  const { t, locale } = useI18n();
  const themedStyles = getThemedStyles(colors);
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [limit, setLimit] = useState<number>(LIMIT_STEPS[0]);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
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

  const contributionsQuery = useQuery<SavingContributionResponse[]>({
    queryKey: savingsKeys.savingContributions(limit),
    queryFn: async () => {
      const response = await savingsApi.listContributions(limit);
      return response.data;
    },
  });

  const savingTargetsQuery = useQuery<SavingTargetResponse[]>({
    queryKey: savingsKeys.savingTargets(),
    queryFn: async () => {
      const response = await aiApi.savingTargets.list();
      return response.data;
    },
  });

  const titleMap = useMemo(() => {
    const map = new Map<string, string>();
    (savingTargetsQuery.data ?? []).forEach((target) => {
      map.set(`${target.type}-${target.id}`, target.title);
    });
    return map;
  }, [savingTargetsQuery.data]);

  const filteredContributions = useMemo(() => {
    return (contributionsQuery.data ?? []).filter((item) => {
      const targetMatches = targetFilter === 'ALL' || item.targetType === targetFilter;
      const sourceMatches = sourceFilter === 'ALL' || item.source === sourceFilter;
      return targetMatches && sourceMatches;
    });
  }, [contributionsQuery.data, sourceFilter, targetFilter]);

  const grouped = useMemo<ActivityGroup[]>(() => {
    const raw = [...filteredContributions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const todayStart = startOfDay(new Date());
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const groups = new Map<string, ActivityGroup>();

    raw.forEach((item) => {
      const date = new Date(item.createdAt);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const dayStart = startOfDay(date);
      const dateKey = toDateKey(date);
      let label = dateFormatter.format(date);

      if (dayStart === todayStart) {
        label = t('savingActivity.groupToday');
      } else if (dayStart === yesterdayStart) {
        label = t('savingActivity.groupYesterday');
      }

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          key: dateKey,
          label,
          items: [],
        });
      }
      groups.get(dateKey)?.items.push(item);
    });

    return Array.from(groups.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [
    dateFormatter,
    filteredContributions,
    t,
  ]);

  const resolveTitle = (item: SavingContributionResponse): string => {
    const mapped = titleMap.get(`${item.targetType}-${item.targetId}`);
    if (mapped) {
      return mapped;
    }
    if (item.targetType === 'GOAL') {
      return `${t('savingActivity.goalFallback')} #${item.targetId}`;
    }
    return `${t('savingActivity.piggyFallback')} #${item.targetId}`;
  };

  const isLoading = contributionsQuery.isLoading || savingTargetsQuery.isLoading;
  const isError = contributionsQuery.isError || savingTargetsQuery.isError;
  const nextLimit = useMemo(
    () => LIMIT_STEPS.find((step) => step > limit) ?? null,
    [limit]
  );
  const loadedCount = contributionsQuery.data?.length ?? 0;
  const hasReachedBackendEnd = loadedCount < limit;
  const canLoadMore = !isLoading && nextLimit != null && !hasReachedBackendEnd;
  const showNoMore = !isLoading && grouped.length > 0 && !canLoadMore;

  const targetFilterOptions: TargetFilter[] = ['ALL', 'GOAL', 'PIGGY'];
  const sourceFilterOptions: SourceFilter[] = ['ALL', 'MANUAL', 'AUTO'];

  const getTargetFilterLabel = (value: TargetFilter): string => {
    if (value === 'GOAL') {
      return t('savingTargets.typeGoal');
    }
    if (value === 'PIGGY') {
      return t('savingTargets.typePiggy');
    }
    return t('savingActivity.filterAll');
  };

  const getSourceFilterLabel = (value: SourceFilter): string => {
    if (value === 'MANUAL') {
      return t('savingActivity.sourceManual');
    }
    if (value === 'AUTO') {
      return t('savingActivity.sourceAuto');
    }
    return t('savingActivity.filterAll');
  };

  const handleActivityPress = (item: SavingContributionResponse) => {
    if (item.targetType === 'GOAL') {
      navigation.navigate('GoalDetail', { goalId: item.targetId });
      return;
    }
    navigation.navigate('PiggyDetail', { piggyId: item.targetId });
  };

  return (
    <SafeAreaView
      style={[styles.container, themedStyles.container]}
      edges={embedded ? ['bottom'] : ['top', 'bottom']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!embedded ? (
          <View style={styles.header}>
            <Text style={[styles.title, themedStyles.title]}>{t('savingActivity.title')}</Text>
            <Text style={[styles.subtitle, themedStyles.subtitle]}>
              {t('savingActivity.subtitle')}
            </Text>
          </View>
        ) : null}

        <Card>
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, themedStyles.subtitle]}>
              {t('savingActivity.filterTargetType')}
            </Text>
            <View style={styles.filterChipsRow}>
              {targetFilterOptions.map((option) => {
                const isActive = targetFilter === option;
                return (
                  <Pressable
                    key={`target-${option}`}
                    onPress={() => setTargetFilter(option)}
                    style={[
                      styles.filterChip,
                      themedStyles.filterChip,
                      isActive && themedStyles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        themedStyles.filterChipText,
                        isActive && themedStyles.filterChipTextActive,
                      ]}
                    >
                      {getTargetFilterLabel(option)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, themedStyles.subtitle]}>
              {t('savingActivity.filterSource')}
            </Text>
            <View style={styles.filterChipsRow}>
              {sourceFilterOptions.map((option) => {
                const isActive = sourceFilter === option;
                return (
                  <Pressable
                    key={`source-${option}`}
                    onPress={() => setSourceFilter(option)}
                    style={[
                      styles.filterChip,
                      themedStyles.filterChip,
                      isActive && themedStyles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        themedStyles.filterChipText,
                        isActive && themedStyles.filterChipTextActive,
                      ]}
                    >
                      {getSourceFilterLabel(option)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        {isLoading ? (
          <Card>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, themedStyles.subtitle]}>
                {t('common.loading')}
              </Text>
            </View>
          </Card>
        ) : null}

        {!isLoading && isError ? (
          <Card>
            <Text style={[styles.errorText, themedStyles.errorText]}>
              {t('common.loadingError')}
            </Text>
            <Pressable
              onPress={() => {
                void contributionsQuery.refetch();
                void savingTargetsQuery.refetch();
              }}
              style={styles.retryButton}
            >
              <Text style={[styles.retryText, themedStyles.retryText]}>
                {t('common.retry')}
              </Text>
            </Pressable>
          </Card>
        ) : null}

        {!isLoading && !isError && grouped.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, themedStyles.subtitle]}>
              {t('savingActivity.empty')}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Wallet', { initialTab: 'targets' })}
              style={({ pressed }) => [
                styles.emptyCta,
                themedStyles.emptyCta,
                pressed && styles.emptyCtaPressed,
              ]}
            >
              <Text style={[styles.emptyCtaText, themedStyles.emptyCtaText]}>
                {t('savingActivity.viewTargets')}
              </Text>
            </Pressable>
          </Card>
        ) : null}

        {!isLoading && !isError
          ? grouped.map((group) => (
              <View key={group.key} style={styles.group}>
                <Text style={[styles.groupTitle, themedStyles.title]}>{group.label}</Text>
                <Card>
                  {group.items.map((item, index) => {
                    const sourceLabel =
                      item.source === 'AUTO'
                        ? t('savingActivity.sourceAuto')
                        : t('savingActivity.sourceManual');
                    const sourceBadgeStyle =
                      item.source === 'AUTO'
                        ? themedStyles.autoBadge
                        : themedStyles.manualBadge;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => handleActivityPress(item)}
                        style={[
                          styles.item,
                          index < group.items.length - 1 && themedStyles.itemDivider,
                        ]}
                      >
                        <View style={styles.itemHeader}>
                          <Text style={[styles.itemTitle, themedStyles.title]}>
                            {resolveTitle(item)}
                          </Text>
                          <View style={[styles.sourceBadge, sourceBadgeStyle]}>
                            <Text style={[styles.sourceBadgeText, themedStyles.sourceBadgeText]}>
                              {sourceLabel}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.metaRow}>
                          <Text style={[styles.metaText, themedStyles.subtitle]}>
                            {t('savingActivity.amount')}: {currencyFormatter.format(item.amount)}
                          </Text>
                          <Text style={[styles.metaText, themedStyles.subtitle]}>
                            {t('savingActivity.time')}: {timeFormatter.format(new Date(item.createdAt))}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </Card>
              </View>
            ))
          : null}

        {canLoadMore ? (
          <Pressable
            onPress={() => {
              if (nextLimit != null) {
                setLimit(nextLimit);
              }
            }}
            style={({ pressed }) => [
              styles.loadMoreButton,
              themedStyles.loadMoreButton,
              pressed && styles.loadMoreButtonPressed,
            ]}
          >
            <Text style={[styles.loadMoreText, themedStyles.loadMoreText]}>
              {t('savingActivity.loadMore')}
            </Text>
          </Pressable>
        ) : null}

        {showNoMore ? (
          <Text style={[styles.noMoreText, themedStyles.subtitle]}>
            {t('savingActivity.noMore')}
          </Text>
        ) : null}
      </ScrollView>
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
    itemDivider: {
      borderBottomColor: colors.border,
    },
    manualBadge: {
      backgroundColor: colors.primary,
    },
    autoBadge: {
      backgroundColor: colors.info,
    },
    sourceBadgeText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    filterChip: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    filterChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    filterChipText: {
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: colors.textOnPrimary ?? colors.text,
    },
    errorText: {
      color: colors.error,
    },
    retryText: {
      color: colors.primary,
    },
    emptyCta: {
      backgroundColor: colors.primary,
    },
    emptyCtaText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    loadMoreButton: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    loadMoreText: {
      color: colors.textOnPrimary ?? colors.text,
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
    marginBottom: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    marginTop: tokens.spacing.xs,
    lineHeight: 20,
  },
  filterSection: {
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.sm,
  },
  filterLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.full,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
  },
  filterChipText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
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
    marginBottom: tokens.spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: tokens.spacing.xs,
  },
  retryText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontStyle: 'italic',
    marginBottom: tokens.spacing.sm,
  },
  emptyCta: {
    alignSelf: 'flex-start',
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  emptyCtaPressed: {
    opacity: 0.85,
  },
  emptyCtaText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  group: {
    gap: tokens.spacing.sm,
  },
  groupTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  item: {
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: tokens.spacing.xs,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  itemTitle: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  sourceBadge: {
    borderRadius: tokens.borderRadius.full,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
  },
  sourceBadgeText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  metaText: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  loadMoreButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
  },
  loadMoreButtonPressed: {
    opacity: 0.85,
  },
  loadMoreText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  noMoreText: {
    textAlign: 'center',
    fontSize: tokens.typography.fontSizes.sm,
    fontStyle: 'italic',
  },
});
