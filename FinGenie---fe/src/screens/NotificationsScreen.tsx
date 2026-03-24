import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { tokens } from '../theme';
import { Card } from '../components/ui';
import { notificationsApi } from '../api/modules';
import type { NotificationResponse } from '../api/modules';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const NOTIFICATION_ICONS: Record<string, string> = {
  BUDGET_WARNING: '⚠️',
  STREAK_REMINDER: '🔥',
  ACHIEVEMENT: '🏆',
  GOAL_PROGRESS: '🎯',
  FRIEND_REQUEST: '👥',
  AI_GUESS: '🤖',
  SYSTEM: '🔔',
};

const NOTIFICATION_COLORS: Record<string, string> = {
  BUDGET_WARNING: tokens.colors.warning,
  STREAK_REMINDER: '#FF6B00',
  ACHIEVEMENT: tokens.colors.primary,
  GOAL_PROGRESS: tokens.colors.success,
  FRIEND_REQUEST: '#3B82F6',
  AI_GUESS: '#8B5CF6',
  SYSTEM: tokens.colors.textSecondary,
};

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationsApi.getAll(0, 20);
      return response.data;
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: { message?: string }) => {
      Alert.alert('Error', error.message || 'Failed to delete notification');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleNotificationPress = useCallback((notification: NotificationResponse) => {
    // Mark as read if unread
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on notification type or actionType
    if (notification.actionType === 'NAVIGATE_TO' && notification.actionData) {
      const screen = notification.actionData.screen as string;
      if (screen) {
        navigation.navigate(screen as any);
      }
      return;
    }

    // Default navigation based on notification type
    switch (notification.type) {
      case 'ACHIEVEMENT':
        navigation.navigate('Achievements');
        break;
      case 'BUDGET_WARNING':
        navigation.navigate('Budget');
        break;
      case 'FRIEND_REQUEST':
        navigation.navigate('Friends');
        break;
      case 'GOAL_PROGRESS':
        navigation.navigate('Budget');
        break;
      default:
        // Just mark as read for other types
        break;
    }
  }, [navigation, markAsReadMutation]);

  const handleDelete = useCallback((notification: NotificationResponse) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(notification.id),
        },
      ]
    );
  }, [deleteMutation]);

  const handleMarkAllAsRead = useCallback(() => {
    const unreadCount = notificationsData?.content.filter(n => !n.isRead).length || 0;
    if (unreadCount === 0) return;

    Alert.alert(
      'Mark All as Read',
      `Mark ${unreadCount} notifications as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All Read',
          onPress: () => markAllAsReadMutation.mutate(),
        },
      ]
    );
  }, [notificationsData, markAllAsReadMutation]);

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Just now';
    }
  };

  const renderNotification = ({ item }: { item: NotificationResponse }) => (
    <Pressable
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => handleDelete(item)}
    >
      <Card style={[styles.notificationCard, !item.isRead && styles.unreadCard]}>
        <View style={styles.notificationContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${NOTIFICATION_COLORS[item.type] || tokens.colors.primary}20` },
            ]}
          >
            <Text style={styles.icon}>{NOTIFICATION_ICONS[item.type] || '🔔'}</Text>
          </View>

          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.message} numberOfLines={2}>
              {item.body || item.message}
            </Text>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  const ListHeader = () => {
    const unreadCount = notificationsData?.content.filter(n => !n.isRead).length || 0;
    
    return (
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>
            {unreadCount > 0 ? `${unreadCount} Unread` : 'All Caught Up!'}
          </Text>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllAsRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Mark All Read</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>
        You're all caught up! New notifications will appear here.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={notificationsData?.content || []}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
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
    flexGrow: 1,
  },
  header: {
    marginBottom: tokens.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
  },
  markAllButton: {
    padding: tokens.spacing.xs,
  },
  markAllText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  notificationCard: {
    marginBottom: tokens.spacing.sm,
    padding: tokens.spacing.md,
  },
  unreadCard: {
    backgroundColor: `${tokens.colors.primary}08`,
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.primary,
  },
  notificationContent: {
    flexDirection: 'row',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: tokens.spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.medium,
    color: tokens.colors.text,
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  unreadTitle: {
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.primary,
  },
  message: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    marginTop: tokens.spacing.xs,
    lineHeight: 18,
  },
  time: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textMuted,
    marginTop: tokens.spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: tokens.spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: tokens.spacing.md,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: tokens.spacing.xl,
  },
  footer: {
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
  },
  loadMoreText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.medium,
  },
});
