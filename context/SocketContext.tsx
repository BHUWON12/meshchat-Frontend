// context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Socket, io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_URL } from '../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  isOnlineMode: boolean;
  setIsOnlineMode: (mode: boolean) => void;
  sendMessage: (data: any, callback?: (response: any) => void) => void;
  markMessageAsRead: (messageId: string, callback?: (response: any) => void) => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
};

const SocketContext = createContext<SocketContextType | null>(null);

// Key for storing active chats in AsyncStorage
const ACTIVE_CHATS_KEY = 'active_chats';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { authToken, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(true);
  const activeChats = useRef<Set<string>>(new Set());

  // Load active chats from AsyncStorage when component mounts
  useEffect(() => {
    const loadActiveChats = async () => {
      try {
        const savedChats = await AsyncStorage.getItem(ACTIVE_CHATS_KEY);
        if (savedChats) {
          activeChats.current = new Set(JSON.parse(savedChats));
        }
      } catch (error) {
        console.error('Error loading active chats:', error);
      }
    };
    
    loadActiveChats();
  }, []);

  // Save active chats to AsyncStorage whenever they change
  const updateActiveChats = async (chats: Set<string>) => {
    try {
      activeChats.current = chats;
      await AsyncStorage.setItem(ACTIVE_CHATS_KEY, JSON.stringify([...chats]));
    } catch (error) {
      console.error('Error saving active chats:', error);
    }
  };

  // Join a chat room
  const joinChat = (chatId: string) => {
    if (!socket || !isConnected) {
      console.error('Socket not connected');
      return;
    }
    
    socket.emit('join-chat', chatId);
    const newChats = new Set(activeChats.current);
    newChats.add(chatId);
    updateActiveChats(newChats);
  };

  // Leave a chat room
  const leaveChat = (chatId: string) => {
    if (!socket || !isConnected) {
      console.error('Socket not connected');
      return;
    }
    
    socket.emit('leave-chat', chatId);
    const newChats = new Set(activeChats.current);
    newChats.delete(chatId);
    updateActiveChats(newChats);
  };

  // Initialize or reinitialize socket
  useEffect(() => {
    if (!isAuthenticated || !authToken || !isOnlineMode) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Initialize socket connection
    const newSocket = io(API_URL, {
      auth: { token: authToken },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected with ID:', newSocket.id);
      setIsConnected(true);
      
      // Rejoin all active chats after reconnection
      const chats = [...activeChats.current];
      if (chats.length > 0) {
        console.log('Rejoining chats:', chats);
        newSocket.emit('rejoin-chats', chats);
        
        // Also join each chat individually to ensure joined status is tracked properly
        chats.forEach(chatId => {
          newSocket.emit('join-chat', chatId);
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, authToken, isOnlineMode]);

  // Send a message with improved error handling
  const sendMessage = (data: any, callback?: (response: any) => void) => {
    if (!socket || !isConnected) {
      console.error('Socket not connected, cannot send message');
      callback?.({ status: 'error', message: 'Socket not connected' });
      return;
    }
    
    // Make sure we're in the chat room before sending
    if (!activeChats.current.has(data.chatId)) {
      joinChat(data.chatId);
    }
    
    console.log('Emitting send-message event:', data);
    socket.timeout(5000).emit('send-message', data, (err: any, response: any) => {
      if (err) {
        console.error('Send message timeout:', err);
        callback?.({ status: 'error', message: 'Request timed out' });
        return;
      }
      callback?.(response);
    });
  };

  // Mark message as read with improved error handling and socket usage
  const markMessageAsRead = (messageId: string, callback?: (response: any) => void) => {
    if (!socket || !isConnected) {
      console.error('Socket not connected, cannot mark message as read');
      callback?.({ status: 'error', message: 'Socket not connected' });
      return;
    }
    
    console.log('Marking message as read via socket:', messageId);
    
    // Only use socket for read status - never try HTTP for this
    socket.emit('mark-as-read', { messageId }, (response: any) => {
      if (response?.status === 'error') {
        console.error('Error marking message as read:', response.message);
      } else {
        console.log('Message marked as read successfully');
      }
      
      if (callback && typeof callback === 'function') {
        callback(response);
      }
    });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isOnlineMode,
        setIsOnlineMode,
        sendMessage,
        markMessageAsRead,
        joinChat,
        leaveChat,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};