import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { tokens } from '../theme';
import { Card } from '../components/ui';
import { leaderboardApi } from '../api/modules';
import type { LeaderboardEntry, LeaderboardType as APILeaderboardType, LeaderboardPeriod } from '../api/modules';
import { useGamification } from '../store';

type LeaderboardType = 'GLOBAL' | 'FRIENDS';
type TimeFrame = LeaderboardPeriod;

const LEADERBOARD_TABS: { label: string; value: LeaderboardType }[] = [
  { label: 'Global', value: 'GLOBAL' },
  { label: 'Friends', value: 'FRIENDS' },
];

const TIME_FRAMES: { label: string; value: TimeFrame }[] = [
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'All Time', value: 'ALL_TIME' },
];

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700', // Gold
  2: '#C0C0C0', // Silver
  3: '#CD7F32', // Bronze
};

export function LeaderboardScreen() {
  const { setLeaderboard } = useGamification();
  const [selectedType, setSelectedType] = useState<LeaderboardType>('GLOBAL');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('WEEKLY');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch leaderboard
  const {
    data: leaderboard,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['leaderboard', selectedType, selectedTimeFrame],
    queryFn: async () => {
      const apiType: APILeaderboardType = 'XP';
      const response = selectedType === 'FRIENDS'
        ? await leaderboardApi.getFriends(apiType, selectedTimeFrame)
        : await leaderboardApi.getGlobal(apiType, selectedTimeFrame);
      // Cache leaderboard data
      setLeaderboard(selectedType === 'FRIENDS' ? 'friends' : 'global', response.data.entries);
      return response.data;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderRankBadge = (rank: number) => {
    if (rank <= 3) {
      return (
        <View style={[styles.rankBadge, { backgroundColor: RANK_COLORS[rank] }]}>
          <Text style={styles.rankBadgeText}>{rank}</Text>
        </View>
      );
    }
    return (
      <View style={styles.rankNumber}>
        <Text style={styles.rankNumberText}>{rank}</Text>
      </View>
    );
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = item.isCurrentUser;
    const rank = item.rank || index + 1;

    return (
      <Card style={[styles.leaderboardItem, isCurrentUser && styles.currentUserItem]}>
        <View style={styles.itemContent}>
          {renderRankBadge(rank)}
          
          <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {item.accountName?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {isCurrentUser && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.displayName, isCurrentUser && styles.currentUserText]} numberOfLines={1}>
              {item.accountName || item.displayName || 'Player'}
            </Text>
            <View style={styles.userStats}>
              <Text style={styles.levelText}>Lvl {item.level}</Text>
              {item.badge && (
                <Text style={styles.titleText}>{item.badge}</Text>
              )}
            </View>
          </View>

          <View style={styles.xpContainer}>
            <Text style={[styles.xpValue, isCurrentUser && styles.currentUserXp]}>
              {formatXp(item.xp || item.lifetimeXp || 0)}
            </Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>
        </View>
      </Card>
    );
  };

  const formatXp = (xp: number) => {
    if (xp >= 1000000) {
      return `${(xp / 1000000).toFixed(1)}M`;
    }
    if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}K`;
    }
    return xp.toString();
  };

  const ListHeader = () => (
    <View style={styles.header}>
      {/* Current user ranking summary */}
      {leaderboard?.currentUserRank && (
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your Ranking</Text>
          <View style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>#{leaderboard.currentUserRank.rank}</Text>
              <Text style={styles.summaryLabel}>Rank</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatXp(leaderboard.currentUserRank.xp || 0)}</Text>
              <Text style={styles.summaryLabel}>Total XP</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>Lvl {leaderboard.currentUserRank.level}</Text>
              <Text style={styles.summaryLabel}>Level</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Leaderboard type tabs */}
      <View style={styles.tabsContainer}>
        {LEADERBOARD_TABS.map((tab) => (
          <Pressable
            key={tab.value}
            style={[styles.tab, selectedType === tab.value && styles.tabActive]}
            onPress={() => setSelectedType(tab.value)}
          >
            <Text style={[styles.tabText, selectedType === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Time frame pills */}
      <View style={styles.timeFrameContainer}>
        {TIME_FRAMES.map((tf) => (
          <Pressable
            key={tf.value}
            style={[styles.timeFramePill, selectedTimeFrame === tf.value && styles.timeFramePillActive]}
            onPress={() => setSelectedTimeFrame(tf.value)}
          >
            <Text
              style={[
                styles.timeFrameText,
                selectedTimeFrame === tf.value && styles.timeFrameTextActive,
              ]}
            >
              {tf.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const ListEmpty = () => (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyText}>
        {selectedType === 'FRIENDS'
          ? 'Add friends to see them on the leaderboard'
          : 'No rankings available yet'}
      </Text>
    </Card>
  );

  const ListError = () => (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyText}>Unable to load leaderboard right now.</Text>
      <Pressable onPress={() => refetch()} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </Card>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={error ? [] : leaderboard?.entries || []}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item.accountId.toString()}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={error ? ListError : ListEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
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
  listContent: {
    padding: tokens.spacing.md,
  },
  header: {
    marginBottom: tokens.spacing.md,
  },
  summaryCard: {
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    backgroundColor: tokens.colors.primary,
  },
  summaryTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: tokens.spacing.md,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: '#fff',
  },
  summaryLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: tokens.spacing.xs,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.xs,
    marginBottom: tokens.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    borderRadius: tokens.borderRadius.md,
  },
  tabActive: {
    backgroundColor: tokens.colors.primary,
  },
  tabText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
    color: tokens.colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  timeFrameContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
  },
  timeFramePill: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  timeFramePillActive: {
    backgroundColor: tokens.colors.primaryLight,
    borderColor: tokens.colors.primary,
  },
  timeFrameText: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
  },
  timeFrameTextActive: {
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  leaderboardItem: {
    marginBottom: tokens.spacing.sm,
    padding: tokens.spacing.md,
  },
  currentUserItem: {
    borderWidth: 2,
    borderColor: tokens.colors.primary,
    backgroundColor: `${tokens.colors.primary}10`,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: tokens.spacing.md,
  },
  rankBadgeText: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
    color: '#fff',
  },
  rankNumber: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: tokens.spacing.md,
  },
  rankNumberText: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: tokens.colors.textSecondary,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: tokens.spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: tokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: '#fff',
  },
  youBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: tokens.colors.success,
    borderRadius: tokens.borderRadius.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  youBadgeText: {
    fontSize: 8,
    fontWeight: tokens.typography.fontWeights.bold,
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  displayName: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: tokens.colors.text,
    marginBottom: 2,
  },
  currentUserText: {
    color: tokens.colors.primary,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  levelText: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
    backgroundColor: tokens.colors.backgroundSecondary,
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.xs,
  },
  titleText: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textMuted,
  },
  xpContainer: {
    alignItems: 'flex-end',
  },
  xpValue: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
  },
  currentUserXp: {
    color: tokens.colors.primary,
  },
  xpLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
  },
  emptyCard: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
  },
  retryButton: {
    marginTop: tokens.spacing.md,
  },
  retryText: {
    color: tokens.colors.primary,
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
  },
});
