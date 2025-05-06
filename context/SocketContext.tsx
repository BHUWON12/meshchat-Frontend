// context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_URL } from '../utils/constants';

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  isOnlineMode: boolean;
  setIsOnlineMode: (mode: boolean) => void;
  sendMessage: (data: any, callback?: (response: any) => void) => void;
  markMessageAsRead: (messageId: string, callback?: (response: any) => void) => void;
};

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { authToken, isAuthenticated } = useAuth(); // Use the updated context properties
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(true);

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
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
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

  const sendMessage = (data: any, callback?: (response: any) => void) => {
    if (!socket || !isConnected) {
      console.error('Socket not connected');
      return;
    }
    socket.emit('send-message', data, callback);
  };

  const markMessageAsRead = (messageId: string, callback?: (response: any) => void) => {
    if (!socket || !isConnected) return;
    socket.emit('mark-as-read', { messageId }, callback);
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