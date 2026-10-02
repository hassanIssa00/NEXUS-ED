import { apiClient } from '../api/client';

export interface UserPreview {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface ConversationParticipant {
  id: string;
  userId: string;
  role: string;
  lastReadAt: string;
  user: UserPreview;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  attachments?: string;
  createdAt: string;
  sender: UserPreview;
}

export interface Conversation {
  id: string;
  type: string;
  title?: string;
  description?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  messages: Message[];
}

function unwrap<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

export const messagingService = {
  getContacts: async (): Promise<Array<UserPreview & { firstName?: string; lastName?: string }>> => {
    const response = await apiClient.get<unknown>('/messages/contacts');
    return unwrap<Array<UserPreview & { firstName?: string; lastName?: string }>>(response.data) || [];
  },

  getConversations: async (): Promise<Conversation[]> => {
    const response = await apiClient.get<unknown>('/messages/conversations');
    return unwrap<Conversation[]>(response.data) || [];
  },

  startConversation: async (targetUserId: string): Promise<Conversation> => {
    const response = await apiClient.post<unknown>('/messages/start', { targetUserId });
    return unwrap<Conversation>(response.data);
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    const response = await apiClient.get<unknown>(`/messages/${encodeURIComponent(conversationId)}`);
    return unwrap<Message[]>(response.data) || [];
  },

  sendMessage: async (conversationId: string, content: string, attachments?: string): Promise<Message> => {
    const response = await apiClient.post<unknown>(`/messages/${encodeURIComponent(conversationId)}/send`, {
      content,
      attachments,
    });
    return unwrap<Message>(response.data);
  },
};
