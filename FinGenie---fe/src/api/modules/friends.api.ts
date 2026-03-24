import { apiClient } from '../client';

// ============ Friendship Types ============

export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';

export interface FriendshipResponse {
  friendshipId: number;
  requesterId: number;
  requesterName: string;
  requesterAvatar: string | null;
  addresseeId: number;
  addresseeName: string;
  addresseeAvatar: string | null;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FriendshipRequest {
  addresseeId: number;
}

// ============ Friend Chat Types ============

export interface ConversationResponse {
  conversationId?: number;
  id?: number;
  friendId?: number;
  participantIds?: number[];
  friendName?: string;
  partnerName?: string;
  friendAvatar?: string | null;
  partnerAvatar?: string | null;
  lastMessage?: string | null;
  lastMessagePreview?: string | null;
  lastMessageTime?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  isOnline?: boolean;
}

export interface FriendChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface SendMessageRequest {
  conversationId: number;
  content: string;
}

// ============ Friendships API ============

export const friendshipsApi = {
  getAll: () => 
    apiClient.get<FriendshipResponse[]>('/friendships'),

  getByStatus: (status: FriendshipStatus) => 
    apiClient.get<FriendshipResponse[]>(`/friendships/status/${status}`),

  getById: (friendshipId: number) => 
    apiClient.get<FriendshipResponse>(`/friendships/${friendshipId}`),

  create: (data: FriendshipRequest) => 
    apiClient.post<FriendshipResponse>('/friendships', data),

  updateStatus: (friendshipId: number, status: FriendshipStatus) =>
    apiClient.put<FriendshipResponse>(`/friendships/${friendshipId}/status`, null, {
      params: { status },
    }),

  delete: (friendshipId: number) => 
    apiClient.delete(`/friendships/${friendshipId}`),
};

// ============ Friend Chat API ============

export const friendChatApi = {
  getConversations: async () => {
    try {
      return await apiClient.get<ConversationResponse[]>('/chat/conversations');
    } catch (error) {
      console.error('[friendChatApi.getConversations] Request failed', { error });
      throw error;
    }
  },

  getOrCreateConversation: async (friendId: number) => {
    try {
      return await apiClient.post<ConversationResponse>(`/chat/conversations/with/${friendId}`);
    } catch (error) {
      console.error('[friendChatApi.getOrCreateConversation] Request failed', { friendId, error });
      throw error;
    }
  },

  getMessages: async (conversationId: number, page = 0, size = 50) => {
    try {
      return await apiClient.get<FriendChatMessage[]>(`/chat/conversations/${conversationId}/messages`, {
        params: { page, size },
      });
    } catch (error) {
      console.error('[friendChatApi.getMessages] Request failed', { conversationId, page, size, error });
      throw error;
    }
  },

  sendMessage: async (data: SendMessageRequest) => {
    try {
      return await apiClient.post<FriendChatMessage>('/chat/messages', data);
    } catch (error) {
      console.error('[friendChatApi.sendMessage] Request failed', {
        conversationId: data.conversationId,
        error,
      });
      throw error;
    }
  },

  markAsRead: async (conversationId: number) => {
    try {
      return await apiClient.post<{ markedCount: number }>(`/chat/conversations/${conversationId}/read`);
    } catch (error) {
      console.error('[friendChatApi.markAsRead] Request failed', { conversationId, error });
      throw error;
    }
  },

  getTotalUnreadCount: () => 
    apiClient.get<{ count: number }>('/chat/unread/count'),
};

// ============ Combined Friends API ============

export const friendsApi = {
  friendships: friendshipsApi,
  chat: friendChatApi,
};
