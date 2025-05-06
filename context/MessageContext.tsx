import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import {
  getChats as apiGetChats,
  getMessages as apiGetMessages,
  initiateChat as apiInitiateChat,
  // Removed apiSendMessage and apiMarkMessageAsRead imports
} from '../services/chats';
import { User, Chat, Message, ConnectionStatus, MessageType, DeliveryStatus } from '../types/index';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext'; // Import useSocket

interface MessageContextType {
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  getChat: (chatId: string) => Chat | undefined;
  getChatMessages: (chatId: string) => Message[];
  sendMessage: (chatId: string, content: string, type?: MessageType, caption?: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  initiateChat: (user: User, connectionStatus: ConnectionStatus) => Promise<Chat>;
  getChatByParticipant: (userId: string) => Chat | undefined;
  updateConnectionStatus: (userId: string, status: ConnectionStatus) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({});
  const [loading, setLoading] = useState(false);
  const { socket, sendMessage: sendSocketMessage, markMessageAsRead: markSocketMessageAsRead } = useSocket(); // Get socket and functions

  const fetchChats = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const chatsData = await apiGetChats(currentUserId);
      setChats(chatsData);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      const messagesData = await apiGetMessages(chatId);
      setMessages(prev => ({
        ...prev,
        [chatId]: messagesData
      }));
    } catch (error) {
      console.error(`Failed to fetch messages for chat ${chatId}:`, error);
    }
  }, []);

  const getChat = useCallback((chatId: string) => {
    return chats.find(chat => chat.id === chatId);
  }, [chats]);

  const getChatMessages = useCallback((chatId: string) => {
    return messages[chatId] || [];
  }, [messages]);

  const getChatByParticipant = useCallback((userId: string) => {
    return chats.find(chat =>
      chat.participants.some((p: any) => (p._id || p.id) === userId)
    );
  }, [chats]);

  const updateConnectionStatus = useCallback((userId: string, status: ConnectionStatus) => {
    setChats(prev => prev.map(chat =>
      chat.participants.some((p: any) => (p._id || p.id) === userId)
        ? {
            ...chat,
            connectionType: status,
            isOnline: status === 'online'
          }
        : chat
    ));
  }, []);

  const sendMessage = useCallback(async (
    chatId: string,
    content: string,
    type: MessageType = 'text',
    caption?: string
  ) => {
    console.log("sendMessage function in MessageContext called"); // --- LOG 1 ---
    if (!currentUserId || !socket) return; // Ensure socket is available
    const chat = getChat(chatId);
    if (!chat) return;

    const recipient = chat.participants.find((p: any) => (p._id || p.id) !== currentUserId);

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      chatId,
      senderId: currentUserId,
      receiverId: recipient?._id || recipient?.id || '',
      content,
      type,
      caption,
      timestamp: new Date(),
      status: 'pending', // Initially pending
      read: false
    };

    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), tempMessage]
    }));

    try {
      console.log("Calling sendSocketMessage from MessageContext"); // --- LOG 2 ---
      sendSocketMessage({ chatId, content, type, metadata: { caption } }, (response: any) => {
        if (response?.status === 'success') {
          const newMessage = response.message;
          setMessages(prev => ({
            ...prev,
            [chatId]: prev[chatId].map(m =>
              m.id === tempMessage.id ? { ...newMessage, senderId: newMessage.sender?._id || newMessage.sender?.id || currentUserId, status: 'delivered' as DeliveryStatus } : m
            )
          }));
          setChats(prev => prev.map(c =>
            c.id === chatId ? {
              ...c,
              lastMessage: {
                _id: newMessage._id,
                content: type === 'text' ? content : `Sent ${type}`,
                timestamp: new Date(newMessage.createdAt), // Use createdAt as timestamp
                sender: { _id: currentUserId },
              },
              // unreadCount: c.unreadCount + 1 // Backend should handle this
            } : c
          ));
        } else {
          console.error('Error sending message:', response?.message);
          setMessages(prev => ({
            ...prev,
            [chatId]: prev[chatId].map(m =>
              m.id === tempMessage.id ? { ...m, status: 'failed' as DeliveryStatus } : m
            )
          }));
        }
      });
    } catch (error) {
      console.error('Failed to send message via socket:', error);
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId].map(m =>
          m.id === tempMessage.id ? { ...m, status: 'failed' as DeliveryStatus } : m
        )
      }));
    }
  }, [getChat, currentUserId, socket, sendSocketMessage]);

  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!socket) return;
    try {
      markSocketMessageAsRead(messageId, (response: any) => {
        if (response?.status !== 'success') {
          console.error('Error marking message as read:', response?.message);
        }
      });
      setMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(chatId => {
          updated[chatId] = updated[chatId].map(msg =>
            msg.id === messageId ? { ...msg, read: true, status: 'read' } : msg
          );
        });
        return updated;
      });
      // Unread count should be handled by the backend and pushed via socket
    } catch (error) {
      console.error('Failed to mark message as read via socket:', error);
    }
  }, [socket, markSocketMessageAsRead]);

  const initiateChat = useCallback(async (user: User, connectionStatus: ConnectionStatus = 'online') => {
    if (!currentUserId) throw new Error('No current user');
    try {
      const existingChat = getChatByParticipant(user.id);
      if (existingChat) return existingChat;

      const newChat = await apiInitiateChat(user.id, currentUserId);
      setChats(prev => [...prev, newChat]);
      return newChat;
    } catch (error) {
      console.error('Chat initiation failed:', error);
      throw error;
    }
  }, [getChatByParticipant, currentUserId]);

  useEffect(() => {
    console.log("useEffect for new-message in MessageContext running"); // --- LOG 3 ---
    if (!socket) {
      console.log("Socket is not available in new-message useEffect"); // --- LOG 4 ---
      return;
    }

    socket.on('new-message', (message: any) => {
      console.log("Received 'new-message' event on frontend:", message); // --- LOG 5 ---
      const { chatId } = message;
      setMessages(prev => {
        const chatMessages = prev[chatId] || [];
        if (!chatMessages.some(msg => msg.id === message._id)) {
          return {
            ...prev,
            [chatId]: [...chatMessages, { ...message, senderId: message.sender?._id || message.sender }]
          };
        }
        return prev;
      });
      setChats(prev =>
        prev.map(chat =>
          chat.id === chatId ? { ...chat, lastMessage: message } : chat
        )
      );
    });

    return () => {
      console.log("Cleaning up 'new-message' listener in MessageContext"); // --- LOG 6 ---
      socket.off('new-message');
    };
  }, [socket, setMessages, setChats]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return (
    <MessageContext.Provider
      value={{
        chats,
        messages,
        fetchChats,
        fetchMessages,
        getChat,
        getChatMessages,
        sendMessage,
        markMessageAsRead,
        initiateChat,
        getChatByParticipant,
        updateConnectionStatus
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};