// frontend/context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { Socket, io } from "socket.io-client";
import { useAuth } from "./AuthContext";
// Removed import for useMessages to break the circular dependency within the Provider component
// import { useMessages } from "./MessageContext";
import { useToast } from "./ToastContext"; // Assuming ToastProvider wraps SocketProvider
import { API_URL } from "../utils/constants";
import  Audio  from 'expo-av';

// Define the shape of the context value provided by SocketProvider
type SocketContextType = {
  socket: Socket | null; // Expose the socket instance (use with caution)
  isConnected: boolean;
  isOnlineMode: boolean;
  setIsOnlineMode: (mode: boolean) => void;
  // Expose functions to emit common events, used by other contexts/components
  emit: (event: string, ...args: any[]) => void; // Generic emit function
  sendMessage: (data: any, callback?: (response: any) => void) => void; // Wrapper for 'send-message'
  markMessageAsRead: (messageId: string, callback?: (response: any) => void) => void; // Wrapper for 'mark-as-read'

  // State and functions for global notifications managed within SocketContext
  notifications: any[];
  clearNotifications: () => void;
};

// Create the context with an initial null value
const SocketContext = createContext<SocketContextType | null>(null);

// Socket Provider component that manages the socket connection lifecycle
export function SocketProvider({ children }: { children: React.ReactNode }) {
  // Access authentication state and user info
  const { authToken, isAuthenticated, user } = useAuth();
  // useMessages is NOT called here within the Provider component to break the cycle
  // Access toast functions (assuming ToastProvider is higher in the tree)
  const { showToast } = useToast?.() || {};

  // State for socket instance, connection status, and online mode preference
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(true);

  // State and ref for global notifications and sound (managed here)
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationSoundRef = useRef<Audio.Sound | null>(null);

  // --- Sound Loading ---
  // Load the notification sound once when the provider mounts
  useEffect(() => {
    async function loadNotificationSound() {
      try {
        // !!! VERIFY THIS PATH IS CORRECT RELATIVE TO THIS FILE !!!
        const { sound } = await Audio.Sound.createAsync(require("../assets/sounds/notification.mp3"));
        notificationSoundRef.current = sound;
        console.log("SocketContext: Notification sound loaded.");
      } catch (error) {
        console.error('SocketContext: Error loading notification sound:', error);
      }
    }
    loadNotificationSound();

    // Cleanup function to unload sound
    return () => {
      console.log("SocketContext: Unloading notification sound.");
      notificationSoundRef.current?.unloadAsync();
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // --- Socket Connection and Lifecycle Management ---
  // Effect to manage the socket connection based on auth state and online mode
  useEffect(() => {
    // Determine the backend URL for the socket connection
    const backendUrl = API_URL; // Ensure API_URL is the correct websocket endpoint (e.g., ws://your-backend.com or wss://...)

    // Disconnect if not authenticated, no token, or online mode is disabled
    if (!isAuthenticated || !authToken || !isOnlineMode) {
      if (socket?.connected) { // Check if socket exists and is connected before disconnecting
        socket.disconnect();
        console.log("SocketContext: Socket disconnecting (unauthenticated, no token, or online mode off)");
      }
      if (socket) { // Clear socket state regardless if disconnect was called
          setSocket(null);
      }
      setIsConnected(false);
      return; // Stop here if connection is not needed
    }

    // If a socket instance already exists and is connected, do nothing
    if (socket?.connected) {
         console.log("SocketContext: Socket already connected. Skipping new connection attempt.");
         return;
    }

     // If a socket instance exists but is NOT connected, attempt to reconnect it
    if (socket && !socket.connected) {
        console.log("SocketContext: Existing socket found but not connected. Attempting to reconnect...");
         socket.connect(); // Attempt to connect the existing socket instance
         return; // Stop here, connect logic will be handled by 'connect' event
    }


    // --- Create a NEW socket instance if none exists or previous one was cleared ---
    console.log(`SocketContext: Attempting to create new socket instance and connect to ${backendUrl}...`);
    const newSocket = io(backendUrl, {
      auth: { token: authToken }, // Pass JWT for authentication
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'], // Explicitly use websockets
    });

    // --- Socket Event Listeners (Connection Status) ---
    newSocket.on("connect", () => {
        console.log("SocketContext: Socket connected successfully!");
        setIsConnected(true);
        // Emit presence online status on successful connection
        const userId = user?._id || user?.id;
        if (userId) {
             console.log(`SocketContext: Emitting 'presence' true for user ${userId}`);
             newSocket.emit('presence', true);
        }
    });

    newSocket.on("disconnect", (reason) => {
        console.log("SocketContext: Socket disconnected. Reason:", reason);
        setIsConnected(false);
         // Emit presence offline status on disconnection
         const userId = user?._id || user?.id;
         if (userId) {
              console.log(`SocketContext: Emitting 'presence' false for user ${userId}`);
              // Use a short timeout for emitting offline status on clean disconnect
              // to allow backend time to process disconnect before receiving offline status.
              // However, backend socket.on('disconnect') is more reliable for offline status.
             // newSocket.emit('presence', false); // Usually handled by backend disconnect listener
         }
    });

    newSocket.on("connect_error", (error) => {
       console.error("SocketContext: Socket connection error:", error.message);
       setIsConnected(false);
        // Handle authentication errors specifically
       if (error.message.startsWith('Authentication error:')) {
           console.error("SocketContext: Authentication failed. Triggering logout?");
           // TODO: Implement logout logic here if authentication fails during connection
           // For example: if (isAuthenticated && error.message === 'Authentication error: Invalid token') { logout(); }
       }
    });

    // --- Real-time Event Listeners (Data Events - Handled by AppEventListeners) ---
    // These listeners are defined here, but their actions (state updates in MessageContext)
    // are triggered by the AppEventListeners component which listens to these events
    // via the socket instance provided by this context.

    // newSocket.on("new-message", (message) => { console.log("SocketContext: Received 'new-message' event", message); }); // Handled by AppEventListeners
    // newSocket.on("message-read", (data) => { console.log("SocketContext: Received 'message-read' event", data); }); // Handled by AppEventListeners
    // newSocket.on("user-online", (userId) => { console.log("SocketContext: Received 'user-online' event", userId); }); // Handled by AppEventListeners
    // newSocket.on("user-offline", (userId) => { console.log("SocketContext: Received 'user-offline' event", userId); }); // Handled by AppEventListeners


    // --- Real-time Event Listeners (Notification Events - Handled here) ---
    // These events trigger UI notifications (toasts, sounds) which can be handled directly in this context.
    newSocket.on("new-connection-request", async (notification) => {
      console.log("SocketContext: Received 'new-connection-request' event", notification);
      // Update local notifications state
      setNotifications((prev) => [notification, ...prev]);
      // Play notification sound if loaded
      if (notificationSoundRef.current) {
           await notificationSoundRef.current.replayAsync();
      }
      // Show a toast notification
      showToast?.("New connection request received!");
    });
    newSocket.on("connection-request-accepted", async (notification) => {
      console.log("SocketContext: Received 'connection-request-accepted' event", notification);
      // Update local notifications state
      setNotifications((prev) => [notification, ...prev]);
       // Play notification sound if loaded
       if (notificationSoundRef.current) {
           await notificationSoundRef.current.replayAsync();
      }
      // Show a toast notification
      showToast?.("Your connection request was accepted!");
    });


    // Set the new socket instance in state
    setSocket(newSocket);

    // --- Cleanup function for useEffect ---
    return () => {
      console.log("SocketContext: Running cleanup. Disconnecting socket...");
      // Remove ALL listeners associated with this socket instance
      newSocket.offAny(); // Important to prevent memory leaks and duplicate listeners
      // Disconnect the socket connection
      newSocket.disconnect();
      // Clear the socket state
      setSocket(null);
      setIsConnected(false);
       // Note: The backend's 'disconnect' listener is responsible for marking the user offline
    };

    // Dependencies for the effect: rerun when auth token, authentication status,
    // online mode preference, toast function, or user ID changes.
  }, [isAuthenticated, authToken, isOnlineMode, showToast, user]);


  // --- Action Functions (Exposed via Context Value) ---
  // These functions are wrappers around socket.emit, allowing other components
  // to send events without direct access to the socket instance (mostly).

  // Generic emit function to send any event
   const emit = useCallback((event: string, ...args: any[]) => {
       if (!socket || !isConnected) {
           console.warn(`SocketContext: Socket not connected. Cannot emit event: ${event}`);
            // Optionally show a toast or handle error
           return;
       }
       console.log(`SocketContext: Emitting event "${event}" with data:`, args);
       socket.emit(event, ...args);
   }, [socket, isConnected]); // Depends on socket instance and connection status


  // Wrapper function for sending messages ('send-message' event)
   const sendMessage = useCallback((data: any, callback?: (response: any) => void) => {
    if (!socket || !isConnected) {
        console.warn("SocketContext: Socket not connected. Cannot send message.");
        callback?.({ status: 'error', message: 'Socket not connected' }); // Call callback with error if provided
        return;
    }
     console.log("SocketContext: Emitting 'send-message'", data);
    socket.emit("send-message", data, callback); // Emit the event with data and callback
  }, [socket, isConnected]); // Depends on socket instance and connection status


  // Wrapper function for marking messages as read ('mark-as-read' event)
   const markMessageAsRead = useCallback((messageId: string, callback?: (response: any) => void) => {
    if (!socket || !isConnected || !messageId) {
         console.warn("SocketContext: Socket not connected or message ID missing. Cannot mark as read.");
         callback?.({ status: 'error', message: 'Socket not connected or missing ID' }); // Call callback with error
         return;
    }
     console.log(`SocketContext: Emitting 'mark-as-read' for ${messageId}`);
    socket.emit("mark-as-read", { messageId }, callback); // Emit the event with messageId and callback
  }, [socket, isConnected]); // Depends on socket instance and connection status


    // Clear the local notifications state
  const clearNotifications = useCallback(() => {
      console.log("SocketContext: Clearing notifications.");
      setNotifications([]);
  }, [setNotifications]); // Depends on setNotifications state setter


  // --- Context value provided to consumers ---
  return (
    <SocketContext.Provider
      value={{
        socket, // Expose the socket instance (use with caution in child components)
        isConnected,
        isOnlineMode,
        setIsOnlineMode,
        emit, // Provide the generic emit function
        sendMessage, // Provide the sendMessage wrapper
        markMessageAsRead, // Provide the markMessageAsRead wrapper
        notifications, // Provide the local notifications state
        clearNotifications, // Provide function to clear notifications
      }}
    >
      {children} {/* Render child components */}
    </SocketContext.Provider>
  );
}

// Custom hook to consume the SocketContext
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    // This error means the component calling useSocket is not wrapped by SocketProvider
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};