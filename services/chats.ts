import axiosClient from './axiosClient';
import { Chat, ConnectionStatus, Message } from '../types/index';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to map API response to Chat
function mapChatResponse(chat: any, currentUserId: string): Chat {
  // Find the recipient (the participant who is not the current user)
  const recipient = chat.participants?.find((p: any) =>
    (p._id || p.id) !== currentUserId
  ) || chat.participants?.[0];

  return {
    id: chat._id || chat.id,
    name: recipient?.username || 'Unknown',
    avatar: recipient?.avatar || 'https://placehold.co/400',
    participants: chat.participants,
    isOnline: recipient?.isOnline || false,
    connectionType: recipient?.connectionType || 'offline',
    lastMessage: chat.lastMessage ? {
      content: chat.lastMessage.content,
      timestamp: new Date(chat.lastMessage.createdAt || chat.lastMessage.timestamp)
    } : undefined,
    unreadCount: chat.unreadCount || 0,
    recipient, // for easy access in header
  } as any;
}

export async function getChats(currentUserId: string): Promise<Chat[]> {
  const { data } = await axiosClient.get('/api/v1/chats');
  return data.map((chat: any) => mapChatResponse(chat, currentUserId));
}

export async function getChat(chatId: string, currentUserId: string): Promise<Chat> {
  const { data } = await axiosClient.get(`/api/v1/chats/${chatId}`);
  return mapChatResponse(data, currentUserId);
}

export async function createChat(payload: {
  participants: string[];
  name?: string;
  avatar?: string;
  connectionStatus?: ConnectionStatus;
}, currentUserId: string): Promise<Chat> {
  const { data } = await axiosClient.post('/api/v1/chats', {
    ...payload,
    connectionType: payload.connectionStatus || 'offline',
  });
  return mapChatResponse({
    ...data,
    lastMessage: undefined,
  }, currentUserId);
}

export async function initiateChat(userId: string, currentUserId: string): Promise<Chat> {
  // Use AsyncStorage for token (works on native)
  const token = await AsyncStorage.getItem('token');
  const { data } = await axiosClient.post(`/api/v1/chats/initiate/${userId}`, {}, {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined
    }
  });
  return mapChatResponse({
    ...data,
    connectionType: 'offline',
    lastMessage: undefined,
  }, currentUserId);
}

export async function updateChatStatus(
  chatId: string,
  status: ConnectionStatus,
  currentUserId: string
): Promise<Chat> {
  const { data } = await axiosClient.patch(`/api/v1/chats/${chatId}/status`, {
    connectionType: status,
  });
  return mapChatResponse(data, currentUserId);
}

export async function deleteChat(chatId: string): Promise<{ success: boolean }> {
  const { data } = await axiosClient.delete<{ success: boolean }>(`/api/v1/chats/${chatId}`);
  return data;
}

export async function getMessages(chatId: string, limit: number = 1000): Promise<Message[]> {
  const { data } = await axiosClient.get(`/api/v1/chats/${chatId}/messages?limit=${limit}`);
  // If backend wraps in { status, data }, unwrap
  const messages = Array.isArray(data) ? data : data.data;
  return messages.map((message: any) => ({
    ...message,
    timestamp: new Date(message.createdAt || message.timestamp),
  }));
}

export async function sendMessage(
  chatId: string,
  content: string,
  type: 'text' | 'image' | 'file' = 'text',
  caption?: string
): Promise<Message> {
  const { data } = await axiosClient.post(`/api/v1/chats/${chatId}/messages`, {
    content,
    type,
    caption,
  });
  // If backend wraps in { status, data }, unwrap
  const msg = data.data || data;
  return {
    ...msg,
    timestamp: new Date(msg.createdAt || msg.timestamp),
  };
}

export async function markMessageAsRead(messageId: string): Promise<{ success: boolean }> {
  const { data } = await axiosClient.patch<{ success: boolean }>(`/api/v1/messages/${messageId}/read`);
  return data;
}

// Add to chats.ts
export async function getChatPartners(): Promise<User[]> {
  const { data } = await axiosClient.get('/api/v1/chats/partners');
  return data.map((user: any) => ({
    id: user._id,
    username: user.username,
    avatar: user.avatar,
    isOnline: user.isOnline,
    lastActive: user.lastActive
  }));
}