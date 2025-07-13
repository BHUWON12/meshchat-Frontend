// frontend/context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Socket, io } from "socket.io-client";
import { Platform } from 'react-native'; // Import Platform
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { API_URL } from "../utils/constants";
import * as Audio from 'expo-av'; // Correct import for expo-av

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  isOnlineMode: boolean;
  setIsOnlineMode: (mode: boolean) => void;
  emit: (event: string, ...args: any[]) => void;
  sendMessage: (data: any, callback?: (response: any) => void) => void;
  markMessageAsRead: (messageId: string, chatId?: string, callback?: (response: any) => void) => void; // Added optional chatId
  notifications: any[]; // Consider defining a proper type for notifications
  clearNotifications: () => void;
  playNotificationSound: () => Promise<void>; // Added function to play sound
};

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { authToken, isAuthenticated, user } = useAuth();
  const { showToast } = useToast?.() || {};

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]); // Use proper type for notifications

  const notificationSoundRef = useRef<Audio.Sound | null>(null);

  // Memoize user ID to prevent unnecessary re-renders
  const userId = useMemo(() => user?._id || user?.id, [user?._id, user?.id]);

  // Memoize backend URL
  const backendUrl = useMemo(() => API_URL, []);

  // Function to manually disconnect socket
  const disconnectSocket = useCallback(() => {
    if (socket?.connected) {
      console.log("SocketContext: Manually disconnecting socket");
      socket.disconnect();
    }
    setSocket(null);
    setIsConnected(false);
  }, [socket]);

  // Enhanced setIsOnlineMode function
  const handleSetIsOnlineMode = useCallback((mode: boolean) => {
    console.log(`SocketContext: Setting online mode to ${mode}`);
    setIsOnlineMode(mode);
    
    if (!mode) {
      // If switching to offline mode, immediately disconnect
      disconnectSocket();
    }
  }, [disconnectSocket]);

  // Memoize socket configuration
  const socketConfig = useMemo(() => ({
    auth: { token: authToken },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket'],
    autoConnect: true,
  }), [authToken]);

  // Effect to load the notification sound
  useEffect(() => {
    async function loadNotificationSound() {
      // Check if Audio and Audio.Sound are defined before using
      if (Audio && Audio.Sound) {
        try {
          console.log("SocketContext: Attempting to load notification sound.");
          // --- CORRECTED: Use Audio.Sound.createAsync for loading assets ---
          const { sound } = await Audio.Sound.createAsync(
            require("../assets/sounds/notification.mp3") // Verify this path
          );
          notificationSoundRef.current = sound;
          console.log("SocketContext: Notification sound loaded successfully.");
        } catch (error) {
          console.error('SocketContext: Error loading notification sound:', error);
          // Handle sound loading errors - e.g., show a toast or log
        }
      } else {
        console.warn("SocketContext: expo-av Audio.Sound not available. Skipping sound loading.");
      }
    }

    // Only attempt to load sound on native platforms where expo-av is fully supported
    if (Platform.OS !== 'web') {
      loadNotificationSound();
    } else {
      console.log("SocketContext: Running on web, skipping native sound loading.");
    }


    // Cleanup function to unload the sound
    return () => {
      console.log("SocketContext: Unloading notification sound.");
      notificationSoundRef.current?.unloadAsync();
      notificationSoundRef.current = null; // Explicitly nullify the ref
    };
    // Re-run effect if Platform changes (unlikely scenario)
  }, [Platform.OS]);


  // Function to play the notification sound
  const playNotificationSound = useCallback(async () => {
    // Check if on a native platform and the sound is loaded
    if (Platform.OS !== 'web' && notificationSoundRef.current) {
      try {
        console.log("SocketContext: Attempting to play notification sound.");
        // Stop any existing playback and play from the beginning
        await notificationSoundRef.current.stopAsync();
        await notificationSoundRef.current.playFromPositionAsync(0);
        console.log("SocketContext: Notification sound played.");
      } catch (error) {
        console.error("SocketContext: Error playing notification sound:", error);
        // Handle playback errors
      }
    } else {
      console.log("SocketContext: Cannot play notification sound (web platform or sound not loaded).");
    }
  }, [notificationSoundRef, Platform.OS]); // Depend on ref and Platform.OS

  // Effect to manage socket connection
  useEffect(() => {
    // Disconnect if not authenticated, no token, or online mode is off
    if (!isAuthenticated || !authToken || !isOnlineMode) {
      if (socket?.connected) {
        console.log("SocketContext: Disconnecting socket (unauthenticated, no token, or online mode off).");
        socket.disconnect();
      }
      // Only set socket to null if it exists to avoid unnecessary state updates
      if (socket) {
        setSocket(null);
      }
      setIsConnected(false);
      return; // Stop further connection logic
    }

    // If a socket instance already exists and is connected, do nothing
    if (socket?.connected) {
      console.log("SocketContext: Socket already connected. Skipping new connection attempt.");
      return;
    }

    // If a socket instance exists but is NOT connected, attempt to reconnect it
    if (socket && !socket.connected) {
        console.log("SocketContext: Existing socket found but not connected. Attempting to reconnect...");
        try {
            socket.connect();
            console.log("SocketContext: connect() called on existing socket.");
        } catch (error) {
             console.error("SocketContext: Error calling connect() on existing socket:", error);
        }
        return; // Stop further creation logic
    }

    // If no socket instance exists, create a new one and connect
    console.log(`SocketContext: Attempting to create NEW socket instance and connect to ${backendUrl}...`);
    const newSocket = io(backendUrl, socketConfig);

    // Set up socket event listeners
    newSocket.on("connect", () => {
      console.log("SocketContext: Socket connected successfully!");
      setIsConnected(true);
      if (userId) {
        console.log(`SocketContext: Emitting 'presence' true for user ${userId}`);
        newSocket.emit('presence', true);
      }
    });

    newSocket.on("disconnect", (reason) => {
      console.log("SocketContext: Socket disconnected. Reason:", reason);
      setIsConnected(false);
      const userId = user?._id || user?.id;
       // Only emit presence false if the disconnect wasn't intentional (like user logging out)
       // This logic might need refinement based on how you handle logout
       if (reason !== 'io client disconnect' && userId) {
           console.log(`SocketContext: Emitting 'presence' false for user ${userId}`);
           // You might need to emit presence false *before* disconnecting on logout
       }
    });

    newSocket.on("connect_error", (error) => {
      console.error("SocketContext: Socket connection error:", error.message);
      setIsConnected(false);
      if (error.message.startsWith('Authentication error:')) {
        console.error("SocketContext: Authentication failed. Consider logging out the user.");
        // You might want to trigger a logout action here or show an error screen
      }
      // Optionally show a toast for connection errors
       showToast?.(`Socket connection failed: ${error.message}`);
    });

    // Add listeners for other events like 'new-notification' here if applicable to SocketContext
    // Example:
    // newSocket.on('new-notification', (notificationData) => {
    //    console.log('SocketContext: New notification received via socket:', notificationData);
    //    setNotifications(prev => [...prev, notificationData]);
    //    playNotificationSound(); // Play the sound for new notifications
    //    showToast?.({ message: notificationData.message, type: 'info' }); // Example toast
    // });


    // Set the new socket instance to state
    setSocket(newSocket);

    // Cleanup function for this effect
    return () => {
      console.log("SocketContext: Running cleanup for socket connection effect.");
      if (newSocket) {
        // Remove all listeners before disconnecting
        newSocket.offAny();
        // Disconnect the socket instance
        newSocket.disconnect();
        console.log("SocketContext: New socket instance disconnected in cleanup.");
      }
      // Set state back to initial values
      
      setIsConnected(false);
    };
    // Dependencies for this effect
    // Include socket in dependencies only if you handle reconnect logic based on the socket instance itself
  }, [isAuthenticated, authToken, isOnlineMode, user, showToast, socketConfig, backendUrl, userId]); // Removed socket from dependencies to prevent infinite loops

  // Utility functions for emitting specific events
  const emit = useCallback((event: string, ...args: any[]) => {
    if (!socket || !isConnected) {
      console.warn(`SocketContext: Socket not connected or isConnected is false. Cannot emit event: ${event}`);
      // Optionally provide feedback to the user that the action failed
       showToast?.(`Failed to send. Socket not connected.`);
      return;
    }
    console.log(`SocketContext: Emitting event "${event}" with data:`, args);
    socket.emit(event, ...args);
  }, [socket, isConnected, showToast]); // Depend on socket, isConnected, showToast

  const sendMessage = useCallback((data: any, callback?: (response: any) => void) => {
    // Ensure data is valid if needed
    if (!socket || !isConnected || !data) {
      console.warn("SocketContext: Socket not connected or data missing. Cannot send message.");
      callback?.({ status: 'error', message: 'Socket not connected or missing data' });
      // Provide user feedback
       showToast?.(`Failed to send message. Socket not connected.`);
      return;
    }
    console.log("SocketContext: Emitting 'send-message'", data);
    socket.emit("send-message", data, callback);
  }, [socket, isConnected, showToast]); // Depend on socket, isConnected, showToast

  // Added optional chatId parameter based on usage in chat/[id].tsx
  const markMessageAsRead = useCallback((messageId: string, chatId?: string, callback?: (response: any) => void) => {
    if (!socket || !isConnected || !messageId) {
      console.warn("SocketContext: Socket not connected or message ID missing. Cannot mark as read.");
      callback?.({ status: 'error', message: 'Socket not connected or missing ID' });
      // Provide user feedback
       showToast?.(`Failed to update read status. Socket not connected.`);
      return;
    }
    console.log(`SocketContext: Emitting 'mark-as-read' for ${messageId} in chat ${chatId}`);
    // Include chatId in the payload if needed by your backend
    socket.emit("mark-as-read", { messageId, chatId }, callback);
  }, [socket, isConnected, showToast]); // Depend on socket, isConnected, showToast


  // Function to clear notifications state (as seen in your logs)
  const clearNotifications = useCallback(() => {
    console.log("SocketContext: Clearing notifications state.");
    setNotifications([]);
  }, [setNotifications]); // Depend on setNotifications

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    socket,
    isConnected,
    isOnlineMode,
    setIsOnlineMode: handleSetIsOnlineMode,
    emit,
    sendMessage,
    markMessageAsRead,
    notifications,
    clearNotifications,
    playNotificationSound,
  }), [
    socket,
    isConnected,
    isOnlineMode,
    handleSetIsOnlineMode,
    emit,
    sendMessage,
    markMessageAsRead,
    notifications,
    clearNotifications,
    playNotificationSound,
  ]);

  // Provide the context value
  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook to consume the SocketContext
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    // This error indicates useSocket is called outside of SocketProvider
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
