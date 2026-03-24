import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tokens } from '../theme';
import type { ApiError } from '../api/client';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import type { AppStackParamList } from '../navigation/types';
import { useAIConversations, useBehaviorProfile, useSurveyStatus } from '../hooks';
import { aiApi, petApi, type PetMood } from '../api/modules';
import { savingsKeys } from '../queryKeys/savings.keys';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { MarkdownMessage } from '../components/chat/MarkdownMessage';

type AppNav = NativeStackNavigationProp<AppStackParamList>;

interface ChatMessageItem {
  id: string;
  sender: string;
  text: string;
  createdAt: string;
  kind?: 'normal' | 'optimistic_user' | 'optimistic_ai' | 'typing' | 'error';
}

interface ChatConversationItem {
  id: number;
  title: string;
  updatedAt?: string;
  createdAt?: string;
  messageCount?: number;
}

function formatMessageTime(value: string, locale: string): string {
  if (!value) {
    return '--';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }
  return parsed.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeMessageText(value: string): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeSender(value: string): 'USER' | 'AI' {
  return String(value ?? '').trim().toUpperCase() === 'USER' ? 'USER' : 'AI';
}

function toTimestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeRounded(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return Math.round(num);
}

function getMoodEmoji(mood?: PetMood | string): string {
  switch (mood) {
    case 'HAPPY':
      return '😊';
    case 'EXCITED':
      return '🤩';
    case 'CONTENT':
      return '😌';
    case 'NEUTRAL':
      return '😐';
    case 'WORRIED':
      return '😟';
    case 'SAD':
      return '😢';
    case 'ANGRY':
      return '😠';
    case 'SLEEPY':
    case 'SLEEPING':
      return '😴';
    default:
      return '🐾';
  }
}

export function PetChatScreen() {
  const navigation = useNavigation<AppNav>();
  const { colors } = useThemeStore();
  const { t, language, locale } = useI18n();
  const themedStyles = useMemo(() => getThemedStyles(colors), [colors]);
  const messageListRef = useRef<FlatList<ChatMessageItem>>(null);
  const languageName = ({ vi: 'Vietnamese', en: 'English' } as const)[language];

  const petText = useMemo(
    () => ({
      title: t('petChat.title'),
      subtitle: t('petChat.subtitle'),
      moodLabel: t('petChat.moodLabel'),
      energyLabel: t('petChat.energyLabel'),
      emptyTitle: t('petChat.emptyTitle'),
      emptySubtitle: t('petChat.emptySubtitle'),
      inputPlaceholder: t('petChat.inputPlaceholder'),
    }),
    [t]
  );

  const {
    data: surveyStatus,
    isLoading: isSurveyLoading,
    isError: isSurveyError,
    refetch: refetchSurveyStatus,
  } = useSurveyStatus();

  const hasCompletedSurvey = Boolean(surveyStatus?.hasCompletedSurvey);

  const {
    data: behaviorProfile,
    isLoading: isProfileLoading,
  } = useBehaviorProfile(hasCompletedSurvey);

  const { data: monthlyPlan } = useQuery({
    queryKey: savingsKeys.monthlySavingPlan('optimized'),
    queryFn: async () => {
      const response = await aiApi.monthlyPlan.getPlan('optimized');
      return response.data;
    },
    enabled: hasCompletedSurvey,
  });

  const { data: petState } = useQuery({
    queryKey: ['petState'],
    queryFn: async () => {
      const response = await petApi.getState();
      return response.data;
    },
  });

  const {
    conversations,
    isLoadingList,
    isLoadingDetail,
    isSending,
    isCreating,
    isRenaming,
    isArchiving,
    isDeleting,
    listError,
    detailError,
    activeConversation,
    activeConversationId,
    createConversation,
    selectConversation,
    sendMessage,
    updateTitle,
    archiveConversation,
    deleteConversation,
    refetchList,
    refetchDetail,
  } = useAIConversations();

  const [input, setInput] = useState('');
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renamingConversationId, setRenamingConversationId] = useState<number | null>(null);
  const [pendingMessages, setPendingMessages] = useState<ChatMessageItem[]>([]);
  const isActionBusy = isSending || isCreating || isRenaming || isArchiving || isDeleting || isLoadingDetail;
  const sendErrorBubbleText = t('petChat.error.sendFailed');
  const quotaErrorBubbleText = t('petChat.error.quotaExceeded');
  const lockedErrorBubbleText = t('petChat.error.locked');
  const historyText = useMemo(
    () => ({
      history: t('petChat.history.title'),
      close: t('common.close'),
      empty: t('petChat.history.empty'),
      metaLabel: t('petChat.history.messages'),
    }),
    [t]
  );

  const getFriendlySendError = useCallback(
    (error: unknown): string => {
      const apiError = error as ApiError | undefined;
      if (apiError?.status === 429) {
        return quotaErrorBubbleText;
      }
      if (apiError?.status === 403) {
        return lockedErrorBubbleText;
      }
      return sendErrorBubbleText;
    },
    [lockedErrorBubbleText, quotaErrorBubbleText, sendErrorBubbleText]
  );

  useEffect(() => {
    if (conversations.length === 0) {
      if (activeConversationId !== null) {
        selectConversation(null);
      }
      return;
    }

    const hasActiveConversation = conversations.some((item) => item.id === activeConversationId);
    if (!hasActiveConversation) {
      selectConversation(conversations[0].id);
    }
  }, [activeConversationId, conversations, selectConversation]);

  const chatContext = useMemo(() => {
    const contextLines: string[] = [];
    const addContextLine = (key: string, value: unknown) => {
      const normalized = String(value ?? '').trim();
      if (!normalized || ['undefined', 'null', 'none', 'nan', 'n/a'].includes(normalized.toLowerCase())) {
        return;
      }
      contextLines.push(`${key}=${normalized}`);
    };

    addContextLine('assistant_persona', 'FinGenie Pet Companion');
    addContextLine('preferred_response_language', languageName);
    addContextLine('response_language_strict', `Reply only in ${languageName}`);
    addContextLine('app_language', language);

    if (behaviorProfile) {
      addContextLine('segment', behaviorProfile.segmentDisplayName || t('advisor.unknown'));
      addContextLine('risk', behaviorProfile.riskLevel || t('advisor.unknown'));

      const overspending = safeRounded(behaviorProfile.overspendingScore);
      const debtRisk = safeRounded(behaviorProfile.debtRiskScore);
      const savingCapacity = safeRounded(behaviorProfile.savingsCapacityScore);

      if (overspending != null) {
        addContextLine('overspending_score', overspending);
      }
      if (debtRisk != null) {
        addContextLine('debt_risk_score', debtRisk);
      }
      if (savingCapacity != null) {
        addContextLine('saving_capacity_score', savingCapacity);
      }
    }

    if (monthlyPlan) {
      const planCapacity = safeRounded(monthlyPlan.savingCapacity);
      const planFeasibility = safeRounded(monthlyPlan.overallFeasibilityScore);
      const planRequired = safeRounded(monthlyPlan.totalRequired);

      if (planCapacity != null) {
        addContextLine('saving_capacity', planCapacity);
      }
      if (planFeasibility != null) {
        addContextLine('plan_feasibility', planFeasibility);
      }
      if (planRequired != null) {
        addContextLine('plan_total_required', planRequired);
      }
    }

    if (petState) {
      addContextLine('pet_name', petState.petName);
      addContextLine('pet_mood', petState.mood);
      addContextLine('pet_energy', petState.energy);
    }

    return contextLines.join('\n');
  }, [behaviorProfile, language, languageName, monthlyPlan, petState, t]);

  const defaultSuggestions = useMemo(
    () => [
      t('advisor.quick.savingTip'),
      t('advisor.quick.reduceExpense'),
      t('advisor.quick.planReview'),
    ],
    [t]
  );

  const suggestionChips = quickSuggestions.length > 0 ? quickSuggestions : defaultSuggestions;

  const apiMessages: ChatMessageItem[] = useMemo(() => {
    const fromApi = activeConversation?.recentMessages ?? [];
    return fromApi.map((item) => ({
      id: String(item.id),
      sender: item.sender || 'AI',
      text: item.text?.trim() ? item.text : t('advisor.emptyReplyFallback'),
      createdAt: item.createdAt || '',
      kind: 'normal',
    }));
  }, [activeConversation?.recentMessages, t]);

  useEffect(() => {
    if (apiMessages.length === 0) {
      return;
    }

    setPendingMessages((prev) =>
      prev.filter((item) => {
        if (item.kind !== 'optimistic_user' && item.kind !== 'optimistic_ai') {
          return true;
        }

        const normalizedText = normalizeMessageText(item.text);
        const normalizedSender = normalizeSender(item.sender);
        const localTime = toTimestamp(item.createdAt);
        const existsInApi = apiMessages.some(
          (apiItem) =>
            normalizeSender(apiItem.sender) === normalizedSender &&
            normalizeMessageText(apiItem.text) === normalizedText &&
            toTimestamp(apiItem.createdAt) >= (localTime - 5000)
        );
        return !existsInApi;
      })
    );
  }, [apiMessages]);

  const messages: ChatMessageItem[] = useMemo(
    () => [...apiMessages, ...pendingMessages],
    [apiMessages, pendingMessages]
  );

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      messageListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  const startNewConversation = async () => {
    if (isActionBusy) {
      return;
    }

    try {
      const created = await createConversation();
      selectConversation(created.data.id);
      setQuickSuggestions(defaultSuggestions);
      setShowHistoryModal(false);
    } catch {
      Alert.alert(t('common.error'), t('advisor.createConversationError'));
    }
  };

  const handleSend = async (presetMessage?: string) => {
    if (isActionBusy) {
      return;
    }

    const message = (presetMessage ?? input).trim();
    if (!message) {
      return;
    }

    if (!presetMessage) {
      setInput('');
    }

    const localSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticUserId = `local-user-${localSeed}`;
    const typingId = `local-typing-${localSeed}`;
    const baseTime = Date.now();

    setPendingMessages((prev) => [
      ...prev,
      {
        id: optimisticUserId,
        sender: 'USER',
        text: message,
        createdAt: new Date(baseTime).toISOString(),
        kind: 'optimistic_user',
      },
      {
        id: typingId,
        sender: 'AI',
        text: '',
        createdAt: new Date(baseTime + 1).toISOString(),
        kind: 'typing',
      },
    ]);
    scrollToBottom(true);

    let conversationId = activeConversationId;
    if (!conversationId) {
      try {
        const created = await createConversation();
        conversationId = created.data.id;
        selectConversation(conversationId);
      } catch (error) {
        const friendlyError = getFriendlySendError(error);
        setPendingMessages((prev) => [
          ...prev.filter((item) => item.id !== typingId),
          {
            id: `local-error-${localSeed}`,
            sender: 'AI',
            text: friendlyError,
            createdAt: new Date().toISOString(),
            kind: 'error',
          },
        ]);
        return;
      }
    }

    try {
      const response = await sendMessage(message, {
        context: chatContext,
        conversationId,
      });
      setPendingMessages((prev) => {
        const withoutTyping = prev.filter((item) => item.id !== typingId);
        const aiText = response.data.aiMessage?.text?.trim();
        if (!aiText) {
          return withoutTyping;
        }

        return [
          ...withoutTyping,
          {
            id: `local-ai-${localSeed}`,
            sender: 'AI',
            text: aiText,
            createdAt: response.data.aiMessage?.createdAt || new Date().toISOString(),
            kind: 'optimistic_ai',
          },
        ];
      });
      setQuickSuggestions(response.data.suggestions ?? []);
      scrollToBottom(true);
    } catch (error) {
      const friendlyError = getFriendlySendError(error);
      setPendingMessages((prev) => [
        ...prev.filter((item) => item.id !== typingId),
        {
          id: `local-error-${localSeed}`,
          sender: 'AI',
          text: friendlyError,
          createdAt: new Date().toISOString(),
            kind: 'error',
        },
      ]);
      scrollToBottom(true);
    }
  };

  const openRename = (conversationId: number) => {
    if (isActionBusy) {
      return;
    }

    const target = conversations.find((item) => item.id === conversationId);
    if (!target) {
      return;
    }
    setRenamingConversationId(target.id);
    setRenameValue(target.title);
    setShowRenameModal(true);
  };

  const submitRename = async () => {
    if (!renamingConversationId || isActionBusy) {
      return;
    }

    const title = renameValue.trim();
    if (!title) {
      Alert.alert(t('common.error'), t('advisor.renameValidation'));
      return;
    }

    try {
      await updateTitle(renamingConversationId, title);
      setShowRenameModal(false);
      setRenamingConversationId(null);
    } catch {
      Alert.alert(t('common.error'), t('advisor.renameError'));
    }
  };

  const confirmArchive = (conversationId: number) => {
    if (!conversationId || isActionBusy) {
      return;
    }

    Alert.alert(t('advisor.archiveTitle'), t('advisor.archiveMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('advisor.archiveAction'),
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveConversation(conversationId);
            setQuickSuggestions(defaultSuggestions);
          } catch {
            Alert.alert(t('common.error'), t('advisor.archiveError'));
          }
        },
      },
    ]);
  };

  const confirmDelete = (conversationId: number) => {
    if (!conversationId || isActionBusy) {
      return;
    }

    Alert.alert(t('advisor.deleteTitle'), t('advisor.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteConversation(conversationId);
            setQuickSuggestions(defaultSuggestions);
          } catch {
            Alert.alert(t('common.error'), t('advisor.deleteError'));
          }
        },
      },
    ]);
  };

  const handleSelectConversation = (conversationId: number) => {
    selectConversation(conversationId);
    setShowHistoryModal(false);
  };

  if (isSurveyLoading || isProfileLoading) {
    return (
      <SafeAreaView style={[styles.centerContainer, themedStyles.container]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, themedStyles.mutedText]}>{t('advisor.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (isSurveyError) {
    return (
      <SafeAreaView style={[styles.centerContainer, themedStyles.container]}>
        <Text style={[styles.errorText, themedStyles.errorText]}>{t('common.loadingError')}</Text>
        <Pressable
          style={[styles.primaryButton, themedStyles.primaryButton]}
          onPress={() => {
            void refetchSurveyStatus();
          }}
        >
          <Text style={[styles.primaryButtonText, themedStyles.primaryButtonText]}>{t('common.retry')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!hasCompletedSurvey) {
    return (
      <SafeAreaView style={[styles.centerContainer, themedStyles.container]}>
        <Text style={[styles.title, themedStyles.title]}>{t('advisor.surveyRequiredTitle')}</Text>
        <Text style={[styles.subtitle, themedStyles.mutedText]}>{t('advisor.surveyRequiredSubtitle')}</Text>
        <Pressable
          style={[styles.primaryButton, themedStyles.primaryButton]}
          onPress={() => navigation.navigate('BehaviorSurvey')}
        >
          <Text style={[styles.primaryButtonText, themedStyles.primaryButtonText]}>{t('advisor.completeSurvey')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          style={[styles.smallButton, themedStyles.smallButton, isActionBusy && themedStyles.actionButtonDisabled]}
          onPress={() => setShowHistoryModal(true)}
          disabled={isActionBusy}
        >
          <Text style={[styles.smallButtonLabel, themedStyles.smallButtonLabel]}>{historyText.history}</Text>
        </Pressable>
        <Pressable
          style={[styles.smallButton, themedStyles.smallButton, isActionBusy && themedStyles.actionButtonDisabled]}
          onPress={() => void startNewConversation()}
          disabled={isActionBusy}
        >
          <Text style={[styles.smallButtonLabel, themedStyles.smallButtonLabel]}>{t('advisor.newConversation')}</Text>
        </Pressable>
      </View>

      <View style={[styles.headerCard, themedStyles.headerCard]}>
        <View style={styles.petHeaderRow}>
          <Text style={styles.petEmoji}>{getMoodEmoji(petState?.mood)}</Text>
          <View style={styles.petInfoWrap}>
            <Text style={[styles.petName, themedStyles.title]}>
              {petState?.petName || petText.title}
            </Text>
            <Text style={[styles.petSubtitle, themedStyles.mutedText]}>
              {petText.subtitle}
            </Text>
          </View>
        </View>

        <Text style={[styles.headerMeta, themedStyles.mutedText]}>
          {petText.moodLabel}: {petState?.mood || t('advisor.unknown')} |{' '}
          {petText.energyLabel}: {petState?.energy ?? 0}%
        </Text>
        <Text style={[styles.headerMeta, themedStyles.mutedText]}>
          {t('advisor.segmentLabel')}: {behaviorProfile?.segmentDisplayName ?? t('advisor.unknown')}
        </Text>
        <Text style={[styles.headerMeta, themedStyles.mutedText]}>
          {t('advisor.riskLabel')}: {behaviorProfile?.riskLevel ?? t('advisor.unknown')}
        </Text>
        <Text style={[styles.headerMeta, themedStyles.mutedText]}>
          {monthlyPlan?.overallFeasibilityScore != null
            ? `${t('advisor.planFeasibility')}: ${Math.round(monthlyPlan.overallFeasibilityScore)}%`
            : t('advisor.contextLimited')}
        </Text>
        {!behaviorProfile ? (
          <Text style={[styles.headerMeta, themedStyles.mutedText]}>{t('advisor.profileUnavailable')}</Text>
        ) : null}
      </View>

      <View style={[styles.messagesWrap, themedStyles.messagesWrap]}>
        {isLoadingDetail ? (
          <View style={styles.loadingInlineRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.inlineMessage, themedStyles.mutedText]}>{t('advisor.loadingMessages')}</Text>
          </View>
        ) : null}

        {detailError ? (
          <View style={styles.loadingInlineRow}>
            <Text style={[styles.inlineError, themedStyles.errorText]}>{t('advisor.loadMessagesError')}</Text>
            <Pressable onPress={() => {
              void refetchDetail();
            }}>
              <Text style={[styles.inlineRetry, themedStyles.retryText]}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoadingDetail && messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🐾</Text>
            <Text style={[styles.emptyTitle, themedStyles.title]}>{petText.emptyTitle}</Text>
            <Text style={[styles.emptySubtitle, themedStyles.mutedText]}>
              {petText.emptySubtitle}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={messageListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            renderItem={({ item }) => {
              const isUser = normalizeSender(item.sender) === 'USER';
              return (
                <View
                  style={[
                    styles.messageBubble,
                    isUser
                      ? [styles.messageBubbleUser, themedStyles.messageBubbleUser]
                      : [styles.messageBubbleAssistant, themedStyles.messageBubbleAssistant],
                  ]}
                >
                  {item.kind === 'typing' ? (
                    <TypingIndicator dotColor={colors.textMuted} />
                  ) : isUser ? (
                    <Text style={themedStyles.messageUserText}>{item.text}</Text>
                  ) : (
                    <MarkdownMessage
                      text={item.text}
                      style={themedStyles.messageAssistantText}
                      boldStyle={styles.messageAssistantBold}
                    />
                  )}
                  <Text style={[styles.messageTime, themedStyles.messageTime]}>
                    {formatMessageTime(item.createdAt, locale)}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>

      <View style={styles.suggestionsWrap}>
        <FlatList
          horizontal
          data={suggestionChips}
          keyExtractor={(item, index) => `${item}-${index}`}
          contentContainerStyle={styles.suggestionsList}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                void handleSend(item);
              }}
              disabled={isActionBusy}
              style={[styles.suggestionChip, themedStyles.suggestionChip]}
            >
              <Text style={[styles.suggestionChipText, themedStyles.suggestionChipText]}>{item}</Text>
            </Pressable>
          )}
        />
      </View>

      <View style={[styles.inputRow, themedStyles.inputRow]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={petText.inputPlaceholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, themedStyles.input]}
          multiline
        />
        <Pressable
          onPress={() => {
            void handleSend();
          }}
          style={[
            styles.sendButton,
            themedStyles.sendButton,
            (isActionBusy || !input.trim()) && themedStyles.sendButtonDisabled,
          ]}
          disabled={isActionBusy || !input.trim()}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary ?? colors.text} />
          ) : (
            <Text style={[styles.sendButtonText, themedStyles.sendButtonText]}>{t('advisor.send')}</Text>
          )}
        </Pressable>
      </View>

      <Modal
        visible={showHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={[styles.modalOverlay, themedStyles.modalOverlay]}>
          <View style={[styles.historySheet, themedStyles.modalCard]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.modalTitle, themedStyles.title]}>{t('advisor.conversations')}</Text>
              <Pressable
                style={[styles.modalButton, themedStyles.actionButton]}
                onPress={() => setShowHistoryModal(false)}
              >
                <Text style={[styles.modalButtonText, themedStyles.actionButtonLabel]}>{historyText.close}</Text>
              </Pressable>
            </View>

            <View style={styles.historyToolbar}>
              <Pressable
                style={[styles.smallButton, themedStyles.smallButton, isActionBusy && themedStyles.actionButtonDisabled]}
                onPress={() => void startNewConversation()}
                disabled={isActionBusy}
              >
                <Text style={[styles.smallButtonLabel, themedStyles.smallButtonLabel]}>
                  {t('advisor.newConversation')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, themedStyles.actionButton]}
                onPress={() => {
                  void refetchList();
                }}
              >
                <Text style={[styles.actionButtonLabel, themedStyles.actionButtonLabel]}>{t('common.retry')}</Text>
              </Pressable>
            </View>

            {isLoadingList ? (
              <View style={styles.loadingInlineRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.inlineMessage, themedStyles.mutedText]}>{t('advisor.loadingConversations')}</Text>
              </View>
            ) : null}

            {listError ? (
              <View style={styles.loadingInlineRow}>
                <Text style={[styles.inlineError, themedStyles.errorText]}>{t('advisor.loadConversationsError')}</Text>
              </View>
            ) : null}

            {!isLoadingList && !listError && conversations.length === 0 ? (
              <View style={styles.loadingInlineRow}>
                <Text style={[styles.inlineMessage, themedStyles.mutedText]}>{historyText.empty}</Text>
              </View>
            ) : null}

            <FlatList<ChatConversationItem>
              data={conversations}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.historyList}
              renderItem={({ item }) => {
                const isActive = item.id === activeConversationId;
                const updatedTime = formatMessageTime(item.updatedAt || item.createdAt || '', locale);
                return (
                  <View
                    style={[
                      styles.historyItem,
                      themedStyles.conversationChip,
                      isActive && themedStyles.conversationChipActive,
                    ]}
                  >
                    <Pressable
                      onPress={() => handleSelectConversation(item.id)}
                      disabled={isActionBusy}
                      style={styles.historyItemSelect}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.conversationChipText,
                          themedStyles.conversationChipText,
                          isActive && themedStyles.conversationChipTextActive,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={[styles.historyMetaText, themedStyles.mutedText]}>
                        {historyText.metaLabel}: {item.messageCount ?? 0} · {updatedTime}
                      </Text>
                    </Pressable>

                    <View style={styles.historyActions}>
                      <Pressable
                        style={[styles.historyActionButton, themedStyles.actionButton, isActionBusy && themedStyles.actionButtonDisabled]}
                        onPress={() => openRename(item.id)}
                        disabled={isActionBusy}
                      >
                        <Text style={[styles.actionButtonLabel, themedStyles.actionButtonLabel]}>{t('advisor.rename')}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.historyActionButton, themedStyles.actionButton, isActionBusy && themedStyles.actionButtonDisabled]}
                        onPress={() => confirmArchive(item.id)}
                        disabled={isActionBusy}
                      >
                        <Text style={[styles.actionButtonLabel, themedStyles.actionButtonLabel]}>{t('advisor.archive')}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.historyActionButton, themedStyles.actionButton, isActionBusy && themedStyles.actionButtonDisabled]}
                        onPress={() => confirmDelete(item.id)}
                        disabled={isActionBusy}
                      >
                        <Text style={[styles.actionButtonLabel, themedStyles.actionButtonLabel]}>{t('common.delete')}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRenameModal(false);
          setRenamingConversationId(null);
        }}
      >
        <View style={[styles.modalOverlay, themedStyles.modalOverlay]}>
          <View style={[styles.modalCard, themedStyles.modalCard]}>
            <Text style={[styles.modalTitle, themedStyles.title]}>{t('advisor.renameTitle')}</Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder={t('advisor.renamePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.modalInput, themedStyles.input]}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, themedStyles.actionButton]}
                onPress={() => {
                  setShowRenameModal(false);
                  setRenamingConversationId(null);
                }}
                disabled={isActionBusy}
              >
                <Text style={[styles.modalButtonText, themedStyles.actionButtonLabel]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, themedStyles.primaryButton, isActionBusy && themedStyles.actionButtonDisabled]}
                onPress={() => void submitRename()}
                disabled={isActionBusy}
              >
                <Text style={[styles.modalButtonText, themedStyles.primaryButtonText]}>{t('common.save')}</Text>
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
    headerCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
    },
    mutedText: {
      color: colors.textSecondary,
    },
    smallButton: {
      backgroundColor: colors.primary,
    },
    smallButtonLabel: {
      color: colors.textOnPrimary ?? colors.text,
    },
    conversationChip: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    conversationChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.backgroundSecondary,
    },
    conversationChipText: {
      color: colors.textSecondary,
    },
    conversationChipTextActive: {
      color: colors.primary,
    },
    actionButton: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionButtonLabel: {
      color: colors.text,
    },
    messagesWrap: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    messageBubbleUser: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
    },
    messageBubbleAssistant: {
      alignSelf: 'flex-start',
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
    },
    messageUserText: {
      color: colors.textOnPrimary ?? colors.text,
      fontSize: tokens.typography.fontSizes.sm,
      lineHeight: 20,
    },
    messageAssistantText: {
      color: colors.text,
      fontSize: tokens.typography.fontSizes.sm,
      lineHeight: 20,
    },
    messageTime: {
      color: colors.textMuted,
    },
    suggestionChip: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
    },
    suggestionChipText: {
      color: colors.text,
    },
    inputRow: {
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    input: {
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
    },
    sendButton: {
      backgroundColor: colors.primary,
    },
    sendButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    sendButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    errorText: {
      color: colors.error,
    },
    retryText: {
      color: colors.primary,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    primaryButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    modalOverlay: {
      backgroundColor: colors.overlay,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  errorText: {
    fontSize: tokens.typography.fontSizes.sm,
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  headerCard: {
    margin: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  petHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  petEmoji: {
    fontSize: 34,
  },
  petInfoWrap: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  petName: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  petSubtitle: {
    fontSize: tokens.typography.fontSizes.xs,
    lineHeight: 18,
  },
  headerMeta: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  conversationListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  smallButton: {
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  smallButtonLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  loadingInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  inlineMessage: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  inlineError: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  inlineRetry: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  conversationList: {
    paddingHorizontal: tokens.spacing.md,
    gap: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
  },
  conversationChip: {
    minWidth: 120,
    maxWidth: 220,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  conversationChipText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.xs,
    alignItems: 'center',
  },
  actionButtonLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  messagesWrap: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  messagesList: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.xs,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: tokens.spacing.xs,
  },
  emptyTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  messageBubbleUser: {},
  messageBubbleAssistant: {
    borderWidth: 1,
  },
  messageAssistantBold: {
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  messageTime: {
    fontSize: tokens.typography.fontSizes.xs,
    alignSelf: 'flex-end',
  },
  suggestionsWrap: {
    paddingTop: tokens.spacing.xs,
  },
  suggestionsList: {
    paddingHorizontal: tokens.spacing.md,
    gap: tokens.spacing.sm,
    paddingBottom: tokens.spacing.xs,
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.full,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  suggestionChipText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.fontSizes.sm,
    minHeight: 44,
    maxHeight: 110,
  },
  sendButton: {
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  sendButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  primaryButton: {
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  primaryButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  historySheet: {
    width: '100%',
    maxHeight: '82%',
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  historyToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  historyList: {
    gap: tokens.spacing.sm,
    paddingBottom: tokens.spacing.md,
  },
  historyItem: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  historyItemSelect: {
    gap: tokens.spacing.xs,
  },
  historyMetaText: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  historyActions: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  historyActionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.xs,
  },
  modalTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.fontSizes.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
  },
  modalButton: {
    minWidth: 90,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
  modalButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
