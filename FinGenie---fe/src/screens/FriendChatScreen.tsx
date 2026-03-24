import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tokens } from '../theme';
import { friendsApi } from '../api/modules';
import type { FriendChatMessage } from '../api/modules';
import type { AppStackParamList } from '../navigation/types';

type RouteType = RouteProp<AppStackParamList, 'FriendChat'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

export function FriendChatScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  
  const { friendId, friendName } = route.params;
  const [message, setMessage] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      headerTitle: friendName || 'Chat',
    });
  }, [navigation, friendName]);

  // Get or create conversation
  const { error: conversationError } = useQuery({
    queryKey: ['conversation', friendId],
    queryFn: async () => {
      const response = await friendsApi.chat.getOrCreateConversation(friendId);
      setConversationId(response.data.conversationId ?? response.data.id ?? null);
      return response.data;
    },
  });

  // Fetch messages
  const { data: messagesData, isLoading, error: messagesError, refetch } = useQuery({
    queryKey: ['friendChat', conversationId],
    queryFn: async () => {
      if (!conversationId) return { content: [] };
      const response = await friendsApi.chat.getMessages(conversationId, 0, 50);
      return { content: response.data };
    },
    enabled: !!conversationId,
  });

  const messages = messagesData?.content || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => {
      if (!conversationId) throw new Error('No conversation');
      return friendsApi.chat.sendMessage({ conversationId, content });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['friendChat', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Unable to send this message right now.');
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: () => {
      if (!conversationId) return Promise.resolve({ data: { markedCount: 0 } });
      return friendsApi.chat.markAsRead(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Mark as read on mount and when new messages arrive
  useEffect(() => {
    if (conversationId) {
      markAsReadMutation.mutate();
    }
  }, [conversationId, messages.length]);

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sendMessageMutation.isPending || !conversationId) return;
    sendMessageMutation.mutate(trimmedMessage);
  }, [message, sendMessageMutation, conversationId]);

  const loadMore = useCallback(() => {
    // Simplified - just refetch for now
    if (!isFetchingMore) {
      setIsFetchingMore(true);
      refetch().finally(() => setIsFetchingMore(false));
    }
  }, [isFetchingMore, refetch]);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const shouldShowDate = (currentMsg: FriendChatMessage, prevMsg?: FriendChatMessage) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.createdAt || '').toDateString();
    const prevDate = new Date(prevMsg.createdAt || '').toDateString();
    return currentDate !== prevDate;
  };

  const renderMessage = ({ item, index }: { item: FriendChatMessage; index: number }) => {
    const isOwn = item.senderId !== friendId;
    const prevMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
    const showDate = shouldShowDate(item, prevMessage);

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
          <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
              {item.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
                {formatTime(item.createdAt)}
              </Text>
              {isOwn && item.isRead && (
                <Text style={styles.readIndicator}>✓✓</Text>
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  if (conversationError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Unable to open this chat right now.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (messagesError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Unable to load messages right now.</Text>
          <Pressable onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          inverted
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>Start a conversation!</Text>
              <Text style={styles.emptySubtext}>
                Say hi to {friendName}
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingMore ? (
              <ActivityIndicator
                size="small"
                color={tokens.colors.primary}
                style={styles.loadingMore}
              />
            ) : null
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={tokens.colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!message.trim() || sendMessageMutation.isPending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: tokens.spacing.md,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scaleY: -1 }], // Because list is inverted
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: tokens.spacing.md,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  emptySubtext: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
  },
  retryButton: {
    marginTop: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    backgroundColor: tokens.colors.primary,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  loadingMore: {
    paddingVertical: tokens.spacing.md,
  },
  dateSeparator: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
  },
  dateText: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textMuted,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.md,
    overflow: 'hidden',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.sm,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    maxWidth: '100%',
  },
  ownBubble: {
    backgroundColor: tokens.colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: tokens.colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textMuted,
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  readIndicator: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.surface,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    gap: tokens.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
    maxHeight: 100,
    minHeight: 42,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: tokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: tokens.colors.border,
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
  },
});
