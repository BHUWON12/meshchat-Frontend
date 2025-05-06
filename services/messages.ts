import axiosClient from './axiosClient';
import { Message, MessageType } from '../types/index';

export async function getMessages(chatId: string): Promise<Message[]> {
  const { data } = await axiosClient.get<{ status: string; data: Message[] }>(
    `/api/v1/chats/${chatId}/messages`
  );
  return data.data.map(msg => ({
    ...msg,
    timestamp: new Date(msg.createdAt || msg.timestamp),
  }));
}

export async function sendMessage(
  chatId: string,
  message: { content: string; type: MessageType; caption?: string }
): Promise<Message> {
  const { data } = await axiosClient.post<{ status: string; data: Message }>(
    `/api/v1/chats/${chatId}/messages`,
    message
  );
  return {
    ...data.data,
    timestamp: new Date(data.data.createdAt ?? data.data.timestamp ?? new Date()),
  };
}

export async function markMessageRead(messageId: string): Promise<{ success: boolean }> {
  const { data } = await axiosClient.patch<{ status: string }>(`/api/v1/messages/${messageId}/read`);
  return { success: data.data.status === 'success' };
}

export async function deleteMessage(messageId: string): Promise<{ success: boolean }> {
  const { data } = await axiosClient.delete<{ status: string }>(`/messages/${messageId}`);
  return { success: data.status === 'success' };
}
