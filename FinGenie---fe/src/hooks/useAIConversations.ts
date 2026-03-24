import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  aiApi,
  AIChatRequest,
  AIConversationResponse,
  ConversationList,
  ChatMode,
  gamificationApi,
} from '../api/modules';
import { aiRuntimeStore } from '../store/aiRuntimeStore';
import { gamificationStore } from '../store/gamificationStore';
import { useI18n } from '../i18n/useI18n';
import { aiKeys } from '../queryKeys/ai.keys';

const INVALID_CONTEXT_VALUES = new Set(['', 'undefined', 'null', 'none', 'nan', 'n/a']);

function sanitizeContextBlock(raw: string): string {
  const seen = new Set<string>();
  const lines: string[] = [];

  raw.split(/\r?\n/).forEach((rawLine) => {
    const line = String(rawLine ?? '').trim();
    if (!line) {
      return;
    }

    if (!line.includes('=')) {
      const normalized = line.toLowerCase();
      if (INVALID_CONTEXT_VALUES.has(normalized) || seen.has(line)) {
        return;
      }
      seen.add(line);
      lines.push(line);
      return;
    }

    const separatorIndex = line.indexOf('=');
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '').trim();
    const normalizedValue = value.toLowerCase();

    if (!key || INVALID_CONTEXT_VALUES.has(normalizedValue)) {
      return;
    }

    const normalizedLine = `${key}=${value}`;
    if (seen.has(normalizedLine)) {
      return;
    }
    seen.add(normalizedLine);
    lines.push(normalizedLine);
  });

  return lines.join('\n');
}

/**
 * AI Conversations Hook
 * 
 * Manages AI chat conversations with history persistence.
 * Supports multiple conversation threads.
 */
export function useAIConversations() {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const { language } = useI18n();

  // Store actions
  const setTyping = aiRuntimeStore((state) => state.setTyping);
  const setLastResponse = aiRuntimeStore((state) => state.setLastResponse);
  const queueXpAnimation = gamificationStore((state) => state.queueXpAnimation);
  const syncProfile = gamificationStore((state) => state.syncProfile);

  const awardConversationXp = useCallback(async () => {
    const xpAmount = 3;
    queueXpAnimation(xpAmount, 'AI conversation');

    try {
      const response = await gamificationApi.addXp(xpAmount, 'AI conversation');
      syncProfile(response.data);
      queryClient.setQueryData(['gamificationProfile'], response.data);
    } catch (error) {
      if (__DEV__) {
        console.warn('[useAIConversations] Failed to award backend XP for AI conversation.', error);
      }
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile'] });
    }
  }, [queryClient, queueXpAnimation, syncProfile]);

  // Fetch all conversations
  const {
    data: conversations,
    isLoading: isLoadingList,
    error: listError,
    refetch: refetchList,
  } = useQuery<ConversationList['conversations']>({
    queryKey: aiKeys.conversations(),
    queryFn: async () => {
      const response = await aiApi.conversations.list();
      return response.data.conversations;
    },
  });

  // Fetch active conversation detail
  const {
    data: activeConversation,
    isLoading: isLoadingDetail,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery<AIConversationResponse | null>({
    queryKey: aiKeys.conversationDetail(activeConversationId),
    queryFn: async () => {
      if (!activeConversationId) return null;
      const response = await aiApi.conversations.getById(activeConversationId);
      return response.data;
    },
    enabled: !!activeConversationId,
  });

  // Create conversation mutation
  const createMutation = useMutation<Awaited<ReturnType<typeof aiApi.conversations.create>>>({
    mutationFn: () => aiApi.conversations.create(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: aiKeys.conversations() });
      setActiveConversationId(response.data.id);
    },
  });

  // Chat mutation
  const chatMutation = useMutation<Awaited<ReturnType<typeof aiApi.conversations.chat>>, Error, AIChatRequest>({
    mutationFn: (data: AIChatRequest) => aiApi.conversations.chat(data),
    onMutate: () => {
      setTyping(true);
    },
    onSuccess: (response, request) => {
      void awardConversationXp();

      const conversationId =
        response.data?.conversationId ?? request.conversationId ?? activeConversationId;
      if (conversationId) {
        setActiveConversationId(conversationId);
      }
      
      // Update last response in store
      const aiMessage = response.data?.aiMessage;
      if (aiMessage) {
        const confidence = aiMessage.confidence ?? 0.85;
        setLastResponse({
          id: aiMessage.id,
          reply: aiMessage.text || '',
          confidenceScore: confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence),
          suggestions: (response.data.suggestions || []).map((text) => ({ text })),
          timestamp: aiMessage.createdAt,
        });
      }

      // Refresh conversation detail
      queryClient.invalidateQueries({
        queryKey: aiKeys.conversationDetail(conversationId ?? activeConversationId),
      });
      queryClient.invalidateQueries({ queryKey: aiKeys.conversations() });
    },
    onSettled: () => {
      setTyping(false);
    },
  });

  // Update title mutation
  const updateTitleMutation = useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: number; title: string }) =>
      aiApi.conversations.updateTitle(conversationId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.conversations() });
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (conversationId: number) => aiApi.conversations.archive(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: aiKeys.conversations() });
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (conversationId: number) => aiApi.conversations.delete(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: aiKeys.conversations() });
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }
    },
  });

  // Clear all mutation
  const clearAllMutation = useMutation({
    mutationFn: () => aiApi.conversations.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.conversations() });
      setActiveConversationId(null);
    },
  });

  // Public API
  const createConversation = useCallback(() => {
    return createMutation.mutateAsync();
  }, [createMutation]);

  const sendMessage = useCallback((message: string, options?: {
    mode?: ChatMode;
    context?: string;
    startNewConversation?: boolean;
    conversationId?: number | null;
  }) => {
    if (chatMutation.isPending) {
      return Promise.reject(new Error('Message is already sending'));
    }

    const targetConversationId = options?.conversationId ?? activeConversationId;
    if (!targetConversationId && !options?.startNewConversation) {
      return Promise.reject(new Error('No active conversation'));
    }

    const request: AIChatRequest = {
      conversationId: targetConversationId,
      message,
      language,
    };
    if (options?.mode || options?.context) {
      const contextParts: string[] = [];
      if (options?.mode) {
        contextParts.push(`mode=${options.mode}`);
      }
      if (options?.context) {
        const sanitizedContext = sanitizeContextBlock(options.context);
        if (sanitizedContext) {
          contextParts.push(sanitizedContext);
        }
      }
      if (contextParts.length > 0) {
        request.context = contextParts.join('\n');
      }
    }
    if (options?.startNewConversation) {
      request.startNewConversation = true;
    }

    return chatMutation.mutateAsync(request);
  }, [activeConversationId, chatMutation, language]);

  const selectConversation = useCallback((conversationId: number | null) => {
    setActiveConversationId(conversationId);
  }, []);

  const updateTitle = useCallback((conversationId: number, title: string) => {
    return updateTitleMutation.mutateAsync({ conversationId, title });
  }, [updateTitleMutation]);

  const archiveConversation = useCallback((conversationId: number) => {
    return archiveMutation.mutateAsync(conversationId);
  }, [archiveMutation]);

  const deleteConversation = useCallback((conversationId: number) => {
    return deleteMutation.mutateAsync(conversationId);
  }, [deleteMutation]);

  const clearAllConversations = useCallback(() => {
    return clearAllMutation.mutateAsync();
  }, [clearAllMutation]);

  return {
    // List
    conversations: conversations || [],
    isLoadingList,
    listError: listError?.message || null,
    refetchList,

    // Active conversation
    activeConversationId,
    activeConversation,
    isLoadingDetail,
    detailError: detailError?.message || null,
    refetchDetail,

    // Actions
    createConversation,
    selectConversation,
    sendMessage,
    updateTitle,
    archiveConversation,
    deleteConversation,
    clearAllConversations,

    // States
    isCreating: createMutation.isPending,
    isSending: chatMutation.isPending,
    isTyping: chatMutation.isPending,
    isRenaming: updateTitleMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isClearingAll: clearAllMutation.isPending,
  };
}
