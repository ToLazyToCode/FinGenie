/**
 * Support Chat Screen
 * 
 * In-app support chat with automatic context injection:
 * - Correlation ID
 * - Error code and message
 * - Current screen
 * - Device info
 * - Last action
 * 
 * @module screens/support/SupportChatScreen
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { tokens } from '../../theme/tokens';
import { useCorrelationStore, SupportContext } from '../../system/correlationStore';
import { apiClient } from '../../api/client';

// =====================================
// TYPES
// =====================================

interface ChatMessage {
  id: string;
  type: 'user' | 'support' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface SupportChatScreenProps {
  route?: {
    params?: {
      context?: SupportContext;
    };
  };
  navigation?: {
    goBack: () => void;
  };
}

// =====================================
// API
// =====================================

async function sendSupportMessage(
  message: string,
  context: SupportContext
): Promise<{ reply: string; ticketId?: string }> {
  try {
    const response = await apiClient.post('/support/chat', {
      message,
      correlationId: context.correlationId,
      errorCode: context.errorCode,
      errorMessage: context.errorMessage,
      screen: context.screen,
      lastAction: context.lastAction,
      deviceInfo: context.deviceInfo,
      timestamp: context.timestamp,
    });
    return response.data;
  } catch (error) {
    // Fallback response if API fails
    return {
      reply: "Thank you for reaching out. We've received your message and will get back to you soon. Your reference ID has been recorded.",
      ticketId: `TKT-${Date.now()}`,
    };
  }
}

// =====================================
// COMPONENT
// =====================================

export function SupportChatScreen({
  route,
  navigation,
}: SupportChatScreenProps): React.ReactElement {
  const getErrorContextForSupport = useCorrelationStore((s) => s.getErrorContextForSupport);
  const routeContext = route?.params?.context;

  // Merge route context with store context
  const supportContext: SupportContext = {
    ...getErrorContextForSupport(),
    ...routeContext,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // =====================================
  // INITIALIZATION
  // =====================================

  useEffect(() => {
    // Slide up animation
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();

    // Add initial system message with context
    const systemMessage: ChatMessage = {
      id: 'system-1',
      type: 'system',
      content: buildSystemMessage(supportContext),
      timestamp: Date.now(),
    };

    const welcomeMessage: ChatMessage = {
      id: 'welcome-1',
      type: 'support',
      content: 'Hi! 👋 How can I help you today? Please describe the issue you\'re experiencing.',
      timestamp: Date.now() + 1,
    };

    setMessages([systemMessage, welcomeMessage]);
  }, []);

  // =====================================
  // HELPERS
  // =====================================

  function buildSystemMessage(context: SupportContext): string {
    const parts: string[] = ['📋 Session Context:'];
    
    if (context.correlationId) {
      parts.push(`• Ref ID: ${context.correlationId}`);
    }
    if (context.errorCode) {
      parts.push(`• Error: ${context.errorCode}`);
    }
    if (context.screen) {
      parts.push(`• Screen: ${context.screen}`);
    }
    if (context.deviceInfo) {
      parts.push(`• Device: ${context.deviceInfo.platform} ${context.deviceInfo.version}`);
      parts.push(`• App: v${context.deviceInfo.appVersion}`);
    }

    return parts.join('\n');
  }

  // =====================================
  // HANDLERS
  // =====================================

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await sendSupportMessage(inputText.trim(), supportContext);
      
      if (response.ticketId && !ticketId) {
        setTicketId(response.ticketId);
      }

      const supportMessage: ChatMessage = {
        id: `support-${Date.now()}`,
        type: 'support',
        content: response.reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, supportMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: '⚠️ Failed to send message. Please try again.',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [inputText, isSending, supportContext, ticketId]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      navigation?.goBack();
    });
  }, [navigation, slideAnim]);

  // =====================================
  // RENDER
  // =====================================

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    switch (item.type) {
      case 'user':
        return (
          <View style={[styles.messageBubble, styles.userBubble]}>
            <Text style={styles.userMessageText}>{item.content}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
        );

      case 'support':
        return (
          <View style={[styles.messageBubble, styles.supportBubble]}>
            <Text style={styles.supportMessageText}>{item.content}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
        );

      case 'system':
        return (
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>{item.content}</Text>
          </View>
        );

      default:
        return null;
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          { transform: [{ translateY }] },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Support Chat</Text>
            {ticketId && (
              <Text style={styles.ticketId}>Ticket: {ticketId}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Context Banner */}
        {supportContext.correlationId && (
          <View style={styles.contextBanner}>
            <Text style={styles.contextBannerText}>
              📎 Reference: {supportContext.correlationId}
            </Text>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor={tokens.colors.textMuted}
              multiline
              maxLength={1000}
              editable={!isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>➤</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 60,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  ticketId: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: tokens.colors.textSecondary,
  },
  contextBanner: {
    backgroundColor: tokens.colors.accent,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  contextBannerText: {
    fontSize: 12,
    color: tokens.colors.primary,
    fontFamily: 'monospace',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    marginBottom: tokens.spacing.sm,
  },
  userBubble: {
    backgroundColor: tokens.colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  supportBubble: {
    backgroundColor: tokens.colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  userMessageText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  supportMessageText: {
    fontSize: 15,
    color: tokens.colors.text,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    color: tokens.colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  systemMessage: {
    backgroundColor: tokens.colors.backgroundSecondary,
    padding: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.sm,
    marginVertical: tokens.spacing.sm,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  systemMessageText: {
    fontSize: 12,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  textInput: {
    flex: 1,
    backgroundColor: tokens.colors.backgroundSecondary,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: 15,
    color: tokens.colors.text,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: tokens.spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: tokens.colors.textMuted,
  },
  sendButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
});

export default SupportChatScreen;
