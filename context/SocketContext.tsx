// context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { Socket, io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { API_URL } from "../utils/constants";
import Audio from 'expo-av';

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  isOnlineMode: boolean;
  setIsOnlineMode: (mode: boolean) => void;
  emit: (event: string, ...args: any[]) => void;
  sendMessage: (data: any, callback?: (response: any) => void) => void;
  markMessageAsRead: (messageId: string, callback?: (response: any) => void) => void;
  notifications: any[];
  clearNotifications: () => void;
};

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { authToken, isAuthenticated, user } = useAuth();
  const { showToast } = useToast?.() || {};

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    async function loadNotificationSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(require("../assets/sounds/notification.mp3"));
        notificationSoundRef.current = sound;
        console.log("SocketContext: Notification sound loaded.");
      } catch (error) {
        console.error('SocketContext: Error loading notification sound:', error);
      }
    }
    loadNotificationSound();

    return () => {
      console.log("SocketContext: Unloading notification sound.");
      notificationSoundRef.current?.unloadAsync();
    };
  }, []);

  // In SocketContext.tsx
useEffect(() => {
  const backendUrl = API_URL;

  if (!isAuthenticated || !authToken || !isOnlineMode) {
    if (socket?.connected) {
      socket.disconnect();
      console.log("SocketContext: Socket disconnecting (unauthenticated, no token, or online mode off)");
    }
    if (socket) {
      setSocket(null);
    }
    setIsConnected(false);
    return;
  }

  if (socket?.connected) {
    console.log("SocketContext: Socket already connected. Skipping new connection attempt.");
    return;
  }

  if (socket && !socket.connected) {
    console.log("SocketContext: Existing socket found but not connected. Attempting to reconnect...");
    socket.connect();
    return;
  }

  console.log(`SocketContext: Attempting to create new socket instance and connect to ${backendUrl}...`);
  const newSocket = io(backendUrl, {
    auth: { token: authToken },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket'],
  });

  newSocket.on("connect", () => {
    console.log("SocketContext: Socket connected successfully!");
    setIsConnected(true);
    const userId = user?._id || user?.id;
    if (userId) {
      console.log(`SocketContext: Emitting 'presence' true for user ${userId}`);
      newSocket.emit('presence', true);
    }
  });

  newSocket.on("disconnect", (reason) => {
    console.log("SocketContext: Socket disconnected. Reason:", reason);
    setIsConnected(false);
    const userId = user?._id || user?.id;
    if (userId) {
      console.log(`SocketContext: Emitting 'presence' false for user ${userId}`);
    }
  });

  newSocket.on("connect_error", (error) => {
    console.error("SocketContext: Socket connection error:", error.message);
    setIsConnected(false);
    if (error.message.startsWith('Authentication error:')) {
      console.error("SocketContext: Authentication failed. Triggering logout?");
    }
  });

  setSocket(newSocket);

  return () => {
    console.log("SocketContext: Running cleanup. Disconnecting socket...");
    newSocket.offAny();
    newSocket.disconnect();
    setSocket(null);
    setIsConnected(false);
  };
}, [isAuthenticated, authToken, isOnlineMode, user]);

  const emit = useCallback((event: string, ...args: any[]) => {
    if (!socket || !isConnected) {
      console.warn(`SocketContext: Socket not connected. Cannot emit event: ${event}`);
      return;
    }
    console.log(`SocketContext: Emitting event "${event}" with data:`, args);
    socket.emit(event, ...args);
  }, [socket, isConnected]);

  const sendMessage = useCallback((data: any, callback?: (response: any) => void) => {
    if (!socket || !isConnected) {
      console.warn("SocketContext: Socket not connected. Cannot send message.");
      callback?.({ status: 'error', message: 'Socket not connected' });
      return;
    }
    console.log("SocketContext: Emitting 'send-message'", data);
    socket.emit("send-message", data, callback);
  }, [socket, isConnected]);

  const markMessageAsRead = useCallback((messageId: string, callback?: (response: any) => void) => {
    if (!socket || !isConnected || !messageId) {
      console.warn("SocketContext: Socket not connected or message ID missing. Cannot mark as read.");
      callback?.({ status: 'error', message: 'Socket not connected or missing ID' });
      return;
    }
    console.log(`SocketContext: Emitting 'mark-as-read' for ${messageId}`);
    socket.emit("mark-as-read", { messageId }, callback);
  }, [socket, isConnected]);

  const clearNotifications = useCallback(() => {
    console.log("SocketContext: Clearing notifications.");
    setNotifications([]);
  }, [setNotifications]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isOnlineMode,
        setIsOnlineMode,
        emit,
        sendMessage,
        markMessageAsRead,
        notifications,
        clearNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
