import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import { Card, GradientButton } from '../components/ui';
import { SharedPiggyInvitationsSection } from '../components/social/SharedPiggyInvitationsSection';
import { friendsApi, leaderboardApi, UserSearchResult } from '../api/modules';
import type { FriendshipResponse, ConversationResponse, LeaderboardEntry, LeaderboardType as APILeaderboardType, LeaderboardPeriod } from '../api/modules';
import type { AppStackParamList } from '../navigation/types';
import { authStore, gamificationStore } from '../store';
import { useUserSearch } from '../hooks';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type TabType = 'FRIENDS' | 'LEADERBOARD' | 'CHATS';
type DisplayLeaderboardPeriod = Extract<LeaderboardPeriod, 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'>;

interface SocialScreenProps {
  headerTitleOverride?: string;
  initialTab?: TabType;
}

interface FriendDisplayInfo {
  friendshipId: number;
  friendId: number;
  friendName: string;
  friendAvatar: string | null;
  streak?: number;
}

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function buildDisplayName(primary: string | null | undefined, fallback: string): string {
  const normalizedPrimary = normalizeText(primary);
  return normalizedPrimary || fallback;
}

function buildEmailFallback(email: string | null | undefined, fallback: string): string {
  const normalizedEmail = normalizeText(email);
  if (!normalizedEmail) {
    return fallback;
  }
  return normalizedEmail.split('@')[0] || normalizedEmail || fallback;
}

function getAvatarInitial(value: string | null | undefined, fallback: string): string {
  return buildDisplayName(value, fallback).charAt(0).toUpperCase() || '?';
}

function resolveConversationId(conversation: ConversationResponse): number {
  return conversation.conversationId ?? conversation.id ?? 0;
}

function resolveConversationFriendId(
  conversation: ConversationResponse,
  currentUserId: number
): number {
  if (conversation.friendId) {
    return conversation.friendId;
  }
  return conversation.participantIds?.find((participantId) => participantId !== currentUserId) ?? 0;
}

function resolveConversationFriendName(
  conversation: ConversationResponse,
  fallback: string
): string {
  return buildDisplayName(conversation.friendName ?? conversation.partnerName, fallback);
}

function resolveConversationAvatar(conversation: ConversationResponse): string | null {
  return conversation.friendAvatar ?? conversation.partnerAvatar ?? null;
}

function resolveConversationLastMessage(conversation: ConversationResponse): string | null {
  return conversation.lastMessage ?? conversation.lastMessagePreview ?? null;
}

const getFriendInfo = (friendship: FriendshipResponse, currentUserId: number): FriendDisplayInfo => {
  const isRequester = friendship.requesterId === currentUserId;
  return {
    friendshipId: friendship.friendshipId,
    friendId: isRequester ? friendship.addresseeId : friendship.requesterId,
    friendName: normalizeText(isRequester ? friendship.addresseeName : friendship.requesterName),
    friendAvatar: isRequester ? friendship.addresseeAvatar : friendship.requesterAvatar,
  };
};

export function SocialScreen({
  headerTitleOverride,
  initialTab = 'FRIENDS',
}: SocialScreenProps = {}) {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const themedStyles = getThemedStyles(colors);
  const unknownLabel = t('behavior.unknown');
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>(initialTab);
  const [addFriendModalVisible, setAddFriendModalVisible] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState<'GLOBAL' | 'FRIENDS'>('GLOBAL');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<DisplayLeaderboardPeriod>('WEEKLY');

  const currentUserId = authStore((state) => state.user?.accountId) || 0;
  const { setLeaderboard } = gamificationStore();
  const tabs = useMemo(
    () => [
      { label: t('social.tab.friends'), value: 'FRIENDS' as const },
      { label: t('social.tab.leaderboard'), value: 'LEADERBOARD' as const },
      { label: t('social.tab.chats'), value: 'CHATS' as const },
    ],
    [t]
  );
  const leaderboardTypeLabels = useMemo(
    () => ({
      GLOBAL: t('social.filter.global'),
      FRIENDS: t('social.filter.friends'),
    }),
    [t]
  );
  const leaderboardPeriodLabels = useMemo(
    (): Record<DisplayLeaderboardPeriod, string> => ({
      WEEKLY: t('social.filter.weekly'),
      MONTHLY: t('social.filter.monthly'),
      ALL_TIME: t('social.filter.allTime'),
    }),
    [t]
  );

  // User search hook
  const {
    searchQuery,
    setSearchQuery,
    results: searchResults,
    isLoading: isSearching,
    clearSearch,
  } = useUserSearch();

  // Fetch friends
  const { data: friendships, isLoading: friendsLoading, refetch: refetchFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const response = await friendsApi.friendships.getByStatus('ACCEPTED');
      return response.data;
    },
  });

  const friends = useMemo(() =>
    friendships?.map(f => getFriendInfo(f, currentUserId)) || [],
    [friendships, currentUserId]
  );

  // Fetch pending requests
  const { data: pendingRequestsRaw, refetch: refetchRequests } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: async () => {
      const response = await friendsApi.friendships.getByStatus('PENDING');
      return response.data;
    },
  });

  const pendingRequests = useMemo(() =>
    pendingRequestsRaw?.filter(f => f.addresseeId === currentUserId).map(f => getFriendInfo(f, currentUserId)) || [],
    [pendingRequestsRaw, currentUserId]
  );

  // Fetch conversations
  const { data: conversations, error: conversationsError, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await friendsApi.chat.getConversations();
      return response.data;
    },
  });

  // Fetch leaderboard
  const {
    data: leaderboard,
    error: leaderboardError,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useQuery({
    queryKey: ['leaderboard', leaderboardType, leaderboardPeriod],
    queryFn: async () => {
      const apiType: APILeaderboardType = 'XP';
      const response = leaderboardType === 'FRIENDS'
        ? await leaderboardApi.getFriends(apiType, leaderboardPeriod)
        : await leaderboardApi.getGlobal(apiType, leaderboardPeriod);
      setLeaderboard(leaderboardType === 'FRIENDS' ? 'friends' : 'global', response.data.entries);
      return response.data;
    },
  });

  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: (addresseeId: number) => friendsApi.friendships.create({ addresseeId }),
    onSuccess: () => {
      Alert.alert(t('social.alert.successTitle'), t('social.alert.requestSent'));
      setAddFriendModalVisible(false);
      clearSearch();
    },
    onError: (error: any) => {
      Alert.alert(
        t('social.alert.errorTitle'),
        error.message || t('social.alert.requestFailed')
      );
    },
  });

  // Accept friend request mutation
  const acceptRequestMutation = useMutation({
    mutationFn: (friendshipId: number) => friendsApi.friendships.updateStatus(friendshipId, 'ACCEPTED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });

  // Decline friend request mutation
  const declineRequestMutation = useMutation({
    mutationFn: (friendshipId: number) => friendsApi.friendships.updateStatus(friendshipId, 'REJECTED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchFriends(),
      refetchRequests(),
      refetchConversations(),
      refetchLeaderboard(),
    ]);
    setRefreshing(false);
  }, [refetchFriends, refetchRequests, refetchConversations, refetchLeaderboard]);

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.value}
          style={[
            styles.tab,
            selectedTab === tab.value ? themedStyles.tabActive : themedStyles.tab,
          ]}
          onPress={() => setSelectedTab(tab.value)}
        >
          <Text style={[
            styles.tabText,
            selectedTab === tab.value ? styles.tabTextActive : themedStyles.tabTextInactive,
          ]}>
            {tab.label}
          </Text>
          {tab.value === 'FRIENDS' && pendingRequests.length > 0 && (
            <View style={[styles.badge, themedStyles.badge]}>
              <Text style={styles.badgeText}>{pendingRequests.length}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );

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
        <Text style={[styles.rankNumberText, themedStyles.rankNumberText]}>{rank}</Text>
      </View>
    );
  };

  const renderFriendItem = ({ item }: { item: FriendDisplayInfo }) => (
    <Card style={styles.friendCard}>
      <Pressable
        style={styles.friendContent}
        onPress={() => navigation.navigate('FriendChat', {
          friendId: item.friendId,
          friendName: buildDisplayName(item.friendName, unknownLabel),
        })}
      >
        <View style={styles.avatarContainer}>
          {item.friendAvatar ? (
            <Image source={{ uri: item.friendAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, themedStyles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{getAvatarInitial(item.friendName, unknownLabel)}</Text>
            </View>
          )}
        </View>
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, themedStyles.friendName]}>{buildDisplayName(item.friendName, unknownLabel)}</Text>
          <Text style={[styles.streakText, themedStyles.streakText]}>
            {t('social.friend.tapToChat')}
          </Text>
        </View>
        <View style={styles.chatIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
        </View>
      </Pressable>
    </Card>
  );

  const renderRequestItem = ({ item }: { item: FriendDisplayInfo }) => (
    <Card style={[styles.requestCard, themedStyles.requestCard]}>
      <View style={styles.requestContent}>
        <View style={styles.avatarContainer}>
          {item.friendAvatar ? (
            <Image source={{ uri: item.friendAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, themedStyles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{getAvatarInitial(item.friendName, unknownLabel)}</Text>
            </View>
          )}
        </View>
        <View style={styles.requestInfo}>
          <Text style={[styles.friendName, themedStyles.friendName]}>{buildDisplayName(item.friendName, unknownLabel)}</Text>
          <Text style={[styles.requestLabel, themedStyles.requestLabel]}>
            {t('social.friend.requestIncoming')}
          </Text>
        </View>
        <View style={styles.requestActions}>
          <Pressable
            style={[styles.actionBtn, styles.acceptBtn, themedStyles.acceptBtn]}
            onPress={() => acceptRequestMutation.mutate(item.friendshipId)}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.declineBtn, themedStyles.declineBtn]}
            onPress={() => declineRequestMutation.mutate(item.friendshipId)}
          >
            <Ionicons name="close" size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>
    </Card>
  );

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = item.isCurrentUser;
    const rank = item.rank || index + 1;

    return (
      <Card style={[styles.leaderboardItem, isCurrentUser && styles.currentUserItem, isCurrentUser && themedStyles.currentUserItem]}>
        <View style={styles.leaderboardContent}>
          {renderRankBadge(rank)}
          <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, themedStyles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{getAvatarInitial(item.accountName, unknownLabel)}</Text>
              </View>
            )}
          </View>
          <View style={styles.leaderboardInfo}>
            <Text style={[styles.leaderboardName, themedStyles.leaderboardName]}>{buildDisplayName(item.accountName, unknownLabel)}</Text>
            <Text style={[styles.leaderboardXp, themedStyles.leaderboardXp]}>{item.xp.toLocaleString()} XP</Text>
          </View>
          {isCurrentUser && (
            <View style={[styles.youBadge, themedStyles.youBadge]}>
              <Text style={styles.youBadgeText}>{t('social.you')}</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const renderConversationItem = ({ item }: { item: ConversationResponse }) => (
    <Card style={styles.chatCard}>
      <Pressable
        style={styles.chatContent}
        onPress={() => {
          const resolvedFriendId = resolveConversationFriendId(item, currentUserId);
          if (!resolvedFriendId) {
            return;
          }
          navigation.navigate('FriendChat', {
            friendId: resolvedFriendId,
            friendName: resolveConversationFriendName(item, unknownLabel),
          });
        }}
      >
        <View style={styles.avatarContainer}>
          {resolveConversationAvatar(item) ? (
            <Image source={{ uri: resolveConversationAvatar(item) ?? undefined }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, themedStyles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {getAvatarInitial(resolveConversationFriendName(item, unknownLabel), unknownLabel)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.chatInfo}>
          <Text style={[styles.chatName, themedStyles.chatName]}>
            {resolveConversationFriendName(item, unknownLabel)}
          </Text>
          <Text style={[styles.lastMessage, themedStyles.lastMessage]} numberOfLines={1}>
            {resolveConversationLastMessage(item) || t('social.chat.startConversation')}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={[styles.unreadBadge, themedStyles.unreadBadge]}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </Pressable>
    </Card>
  );

  const renderFriendsTab = () => (
    <View style={styles.tabContent}>
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>
            {t('social.section.friendRequests')}
          </Text>
          <FlatList
            data={pendingRequests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.friendshipId.toString()}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>
            {t('social.section.myFriends')}
          </Text>
          <Pressable
            style={[styles.addButton, themedStyles.addButton]}
            onPress={() => setAddFriendModalVisible(true)}
          >
            <Text style={styles.addButtonText}>{t('social.action.addCompact')}</Text>
          </Pressable>
        </View>

        <SharedPiggyInvitationsSection compact />

        {friendsLoading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : friends.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, themedStyles.emptyTitle]}>
              {t('social.empty.noFriendsTitle')}
            </Text>
            <Text style={[styles.emptySubtitle, themedStyles.emptySubtitle]}>
              {t('social.empty.noFriendsSubtitle')}
            </Text>
            <GradientButton
              title={t('social.action.addFriend')}
              onPress={() => setAddFriendModalVisible(true)}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.friendshipId.toString()}
            scrollEnabled={false}
          />
        )}
      </View>
    </View>
  );

  const renderLeaderboardTab = () => (
    <View style={styles.tabContent}>
      {/* Type toggle */}
      <View style={styles.toggleRow}>
        {(['GLOBAL', 'FRIENDS'] as const).map((type) => (
          <Pressable
            key={type}
            style={[styles.toggleBtn, themedStyles.toggleBtn, leaderboardType === type && styles.toggleBtnActive, leaderboardType === type && themedStyles.toggleBtnActive]}
            onPress={() => setLeaderboardType(type)}
          >
            <Text style={[styles.toggleText, themedStyles.toggleText, leaderboardType === type && styles.toggleTextActive]}>
              {leaderboardTypeLabels[type]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Period toggle */}
      <View style={styles.periodRow}>
        {(['WEEKLY', 'MONTHLY', 'ALL_TIME'] as const satisfies DisplayLeaderboardPeriod[]).map((period) => (
          <Pressable
            key={period}
            style={[styles.periodBtn, leaderboardPeriod === period && styles.periodBtnActive, leaderboardPeriod === period && themedStyles.periodBtnActive]}
            onPress={() => setLeaderboardPeriod(period)}
          >
            <Text style={[styles.periodText, themedStyles.periodText, leaderboardPeriod === period && styles.periodTextActive, leaderboardPeriod === period && themedStyles.periodTextActive]}>
              {leaderboardPeriodLabels[period]}
            </Text>
          </Pressable>
        ))}
      </View>

      {leaderboardLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : leaderboardError ? (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyTitle, themedStyles.emptyTitle]}>
            {t('social.leaderboard.loadError')}
          </Text>
          <Pressable onPress={() => refetchLeaderboard()} style={styles.retryInlineButton}>
            <Text style={[styles.retryInlineText, { color: colors.primary }]}>{t('common.retry')}</Text>
          </Pressable>
        </Card>
      ) : (
        <FlatList
          data={leaderboard?.entries || []}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.accountId.toString()}
          scrollEnabled={false}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, themedStyles.emptyTitle]}>
                {t('social.empty.noRankingsTitle')}
              </Text>
              <Text style={[styles.emptySubtitle, themedStyles.emptySubtitle]}>
                {t('social.empty.noRankingsSubtitle')}
              </Text>
            </Card>
          }
        />
      )}
    </View>
  );

  const renderChatsTab = () => (
    <View style={styles.tabContent}>
      {conversationsError ? (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyTitle, themedStyles.emptyTitle]}>
            {t('social.chat.loadError')}
          </Text>
          <Pressable onPress={() => refetchConversations()} style={styles.retryInlineButton}>
            <Text style={[styles.retryInlineText, { color: colors.primary }]}>{t('common.retry')}</Text>
          </Pressable>
        </Card>
      ) : !conversations || conversations.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyTitle, themedStyles.emptyTitle]}>
            {t('social.empty.noChatsTitle')}
          </Text>
          <Text style={[styles.emptySubtitle, themedStyles.emptySubtitle]}>
            {t('social.empty.noChatsSubtitle')}
          </Text>
        </Card>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => resolveConversationId(item).toString()}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  const renderSearchResult = ({ item }: { item: UserSearchResult }) => (
    <Pressable
      style={[styles.searchResultItem, themedStyles.searchResultItem]}
      onPress={() => sendRequestMutation.mutate(item.userId)}
      disabled={sendRequestMutation.isPending}
    >
      <View style={styles.avatarContainer}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, themedStyles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{getAvatarInitial(item.name, buildEmailFallback(item.email, unknownLabel))}</Text>
          </View>
        )}
      </View>
      <View style={styles.searchResultInfo}>
        <Text style={[styles.searchResultName, themedStyles.searchResultName]}>
          {buildDisplayName(item.name, buildEmailFallback(item.email, unknownLabel))}
        </Text>
        <Text style={[styles.searchResultEmail, themedStyles.searchResultEmail]}>{normalizeText(item.email)}</Text>
      </View>
      <View style={[styles.addIcon, themedStyles.addIcon]}>
        <Text style={styles.addIconText}>+</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, themedStyles.headerTitle]}>
          {headerTitleOverride ?? t('nav.social')}
        </Text>
      </View>

      {renderTabs()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'FRIENDS' && renderFriendsTab()}
        {selectedTab === 'LEADERBOARD' && renderLeaderboardTab()}
        {selectedTab === 'CHATS' && renderChatsTab()}
      </ScrollView>

      {/* Add Friend Modal */}
      <Modal
        visible={addFriendModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setAddFriendModalVisible(false);
          clearSearch();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, themedStyles.modalContainer]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, themedStyles.modalTitle]}>
                {t('social.modal.addFriendTitle')}
              </Text>
              <Pressable
                style={[styles.closeButton, themedStyles.closeButton]}
                onPress={() => {
                  setAddFriendModalVisible(false);
                  clearSearch();
                }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <TextInput
              style={[styles.searchInput, themedStyles.searchInput]}
              placeholder={t('social.search.placeholder')}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {isSearching ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.searchLoader} />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.userId.toString()}
                style={styles.searchResults}
              />
            ) : searchQuery.length > 0 ? (
              <Text style={[styles.noResults, themedStyles.noResults]}>
                {t('social.search.noResults')}
              </Text>
            ) : (
              <Text style={[styles.searchHint, themedStyles.searchHint]}>
                {t('social.search.hint')}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Dynamic themed styles - must be before static styles
const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    headerTitle: {
      color: colors.text,
    },
    tab: {
      backgroundColor: colors.surface,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabTextInactive: {
      color: colors.textSecondary,
    },
    badge: {
      backgroundColor: colors.error,
    },
    sectionTitle: {
      color: colors.text,
    },
    addButton: {
      backgroundColor: colors.primary,
    },
    avatarPlaceholder: {
      backgroundColor: colors.primary,
    },
    friendName: {
      color: colors.text,
    },
    streakText: {
      color: colors.textSecondary,
    },
    requestCard: {
      backgroundColor: colors.primaryLight,
    },
    requestLabel: {
      color: colors.textSecondary,
    },
    acceptBtn: {
      backgroundColor: colors.success,
    },
    declineBtn: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    declineBtnText: {
      color: colors.textSecondary,
    },
    toggleBtn: {
      backgroundColor: colors.surface,
    },
    toggleBtnActive: {
      backgroundColor: colors.primary,
    },
    toggleText: {
      color: colors.textSecondary,
    },
    periodBtnActive: {
      backgroundColor: `${colors.primary}1A`,
    },
    periodText: {
      color: colors.textSecondary,
    },
    periodTextActive: {
      color: colors.primary,
    },
    currentUserItem: {
      borderColor: colors.primary,
    },
    rankNumberText: {
      color: colors.textSecondary,
    },
    leaderboardName: {
      color: colors.text,
    },
    leaderboardXp: {
      color: colors.primary,
    },
    youBadge: {
      backgroundColor: colors.primary,
    },
    chatName: {
      color: colors.text,
    },
    lastMessage: {
      color: colors.textSecondary,
    },
    unreadBadge: {
      backgroundColor: colors.primary,
    },
    emptyTitle: {
      color: colors.text,
    },
    emptySubtitle: {
      color: colors.textSecondary,
    },
    modalContent: {
      backgroundColor: colors.background,
    },
    modalContainer: {
      backgroundColor: colors.background,
    },
    modalTitle: {
      color: colors.text,
    },
    closeButton: {
      backgroundColor: colors.surface,
    },
    closeButtonText: {
      color: colors.textSecondary,
    },
    searchInput: {
      backgroundColor: colors.surface,
      color: colors.text,
    },
    searchResultItem: {
      borderBottomColor: colors.border,
    },
    searchResultName: {
      color: colors.text,
    },
    searchResultEmail: {
      color: colors.textSecondary,
    },
    addIcon: {
      backgroundColor: colors.primary,
    },
    noResults: {
      color: colors.textSecondary,
    },
    searchHint: {
      color: colors.textMuted,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
  },
  headerTitle: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.full,
  },
  tabActive: {},
  tabText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: tokens.typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    marginBottom: tokens.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.semibold,
    marginBottom: tokens.spacing.sm,
  },
  addButton: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.full,
  },
  addButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: '#FFFFFF',
  },
  friendCard: {
    marginBottom: tokens.spacing.sm,
  },
  friendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.sm,
  },
  avatarContainer: {
    marginRight: tokens.spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  streakText: {
    fontSize: tokens.typography.fontSizes.sm,
    marginTop: 2,
  },
  chatIcon: {
    padding: tokens.spacing.sm,
  },
  chatIconText: {
    fontSize: 20,
  },
  requestCard: {
    marginBottom: tokens.spacing.sm,
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.sm,
  },
  requestInfo: {
    flex: 1,
  },
  requestLabel: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  requestActions: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {},
  declineBtn: {
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: tokens.typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  declineBtnText: {
    fontSize: 16,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  // Leaderboard styles
  toggleRow: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    borderRadius: tokens.borderRadius.md,
  },
  toggleBtnActive: {},
  toggleText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  periodRow: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: tokens.spacing.xs,
    alignItems: 'center',
    borderRadius: tokens.borderRadius.sm,
  },
  periodBtnActive: {},
  periodText: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  periodTextActive: {
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  leaderboardItem: {
    marginBottom: tokens.spacing.sm,
  },
  currentUserItem: {
    borderWidth: 2,
  },
  leaderboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.sm,
  },
  rankBadgeText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  rankNumber: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.sm,
  },
  rankNumberText: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  leaderboardXp: {
    fontSize: tokens.typography.fontSizes.sm,
    marginTop: 2,
  },
  youBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: tokens.borderRadius.full,
  },
  youBadgeText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: '#FFFFFF',
  },
  loader: {
    marginTop: tokens.spacing.xl,
  },
  // Chat styles
  chatCard: {
    marginBottom: tokens.spacing.sm,
  },
  chatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.sm,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  lastMessage: {
    fontSize: tokens.typography.fontSizes.sm,
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  // Empty state
  emptyCard: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.semibold,
    marginBottom: tokens.spacing.xs,
  },
  emptySubtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    textAlign: 'center',
  },
  retryInlineButton: {
    marginTop: tokens.spacing.md,
  },
  retryInlineText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  emptyButton: {
    marginTop: tokens.spacing.md,
    minWidth: 150,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: tokens.borderRadius.xl,
    borderTopRightRadius: tokens.borderRadius.xl,
    padding: tokens.spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  modalTitle: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
  },
  searchInput: {
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    fontSize: tokens.typography.fontSizes.md,
    marginBottom: tokens.spacing.md,
  },
  searchLoader: {
    marginVertical: tokens.spacing.lg,
  },
  searchResults: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.sm,
    borderBottomWidth: 1,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  searchResultEmail: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconText: {
    fontSize: 20,
    fontWeight: tokens.typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  noResults: {
    textAlign: 'center',
    marginVertical: tokens.spacing.lg,
  },
  searchHint: {
    textAlign: 'center',
    marginVertical: tokens.spacing.lg,
  },
});


