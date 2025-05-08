// components/AppEventListeners.tsx
import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useMessages } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications, Notification } from '../context/NotificationContext';
// Import Audio module from expo-av
// Ensure expo-av is installed: npx expo install expo-av
import { Audio } from 'expo-av';
// Import the sound files based on your project structure
// Double-check these paths are correct relative to THIS file (AppEventListeners.tsx)
import notificationSound from '../assets/sounds/notification.mp3';
import chatSound from '../assets/sounds/chat.mp3'; // Import the chat sound

// Define an async function to load and play the notification sound
async function playNotificationSound() {
  try {
    console.log('AppEventListeners: Loading notification sound...');
    // Audio.Sound.createAsync loads the sound into memory
    const { sound } = await Audio.Sound.createAsync(
       notificationSound
    );
    console.log('AppEventListeners: Playing notification sound...');
    // Play the sound
    await sound.playAsync();
    // It's a good practice to unload the sound when done to free up resources,
    // especially if sounds play frequently or overlap.
    // await sound.unloadAsync();
  } catch (error) {
    // Log errors during sound loading or playback
    console.error('AppEventListeners: Error playing notification sound:', error);
  }
}

// Define an async function to load and play the chat sound
async function playChatSound() {
  try {
    console.log('AppEventListeners: Loading chat sound...');
     // Audio.Sound.createAsync loads the sound into memory
    const { sound } = await Audio.Sound.createAsync(
       chatSound
    );
    console.log('AppEventListeners: Playing chat sound...');
     // Play the sound
    await sound.playAsync();
     // Optional: await sound.unloadAsync();
  } catch (error) {
     // Log errors during sound loading or playback
    console.error('AppEventListeners: Error playing chat sound:', error);
  }
}


export function AppEventListeners() {
  // Use optional chaining (?) when accessing context values in case context is not available
  const socketContext = useSocket?.();
  const messagesContext = useMessages?.();
  const notificationsContext = useNotifications?.();
  const { user } = useAuth(); // Assuming useAuth always returns an object, even if user is null

  // Get the current user's ID safely
  const currentUserId = user?._id || user?.id;

  useEffect(() => {
    // Destructure values from contexts after checking if contexts exist
    const socket = socketContext?.socket;
    const isConnected = socketContext?.isConnected;
    const setMessages = messagesContext?.setMessages;
    const setChats = messagesContext?.setChats;
    const setUserOnlineStatus = messagesContext?.setUserOnlineStatus;
    const updateMessageReadStatus = messagesContext?.updateMessageReadStatus;
    const addNotification = notificationsContext?.addNotification;
    const markNotificationAsReadInContext = notificationsContext?.markAsRead;

    // Check if all necessary context values and functions are available
    if (!socket || !isConnected || !setMessages || !setChats || !setUserOnlineStatus || !updateMessageReadStatus || !addNotification || !markNotificationAsReadInContext) {
      console.log("AppEventListeners: Socket or essential context functions not available. Skipping listeners setup.");
      // Log specific missing dependencies for easier debugging
      if (!socket) console.log("AppEventListeners: Socket is null/undefined.");
      if (!isConnected) console.log("AppEventListeners: Socket is not connected.");
      if (!setMessages) console.log("AppEventListeners: setMessages is undefined.");
      if (!setChats) console.log("AppEventListeners: setChats is undefined.");
      if (!setUserOnlineStatus) console.log("AppEventListeners: setUserOnlineStatus is undefined.");
      if (!updateMessageReadStatus) console.log("AppEventListeners: updateMessageReadStatus is undefined.");
      if (!addNotification) console.log("AppEventListeners: addNotification is undefined.");
      if (!markNotificationAsReadInContext) console.log("AppEventListeners: markNotificationAsReadInContext is undefined.");

      return; // Exit useEffect if dependencies are missing
    }

    console.log("AppEventListeners: Socket and essential context functions available. Setting up socket listeners...");

    // Handler for new message events
    const onNewMessage = (message: any) => {
      console.log("AppEventListeners: Received 'new-message' event", message);
      // Validate message structure
      if (!message || !message.chatId) {
        console.error("AppEventListeners: Received invalid 'new-message' event:", message);
        return;
      }
       // Get sender ID from the message object, checking both _id and id
      const messageSenderId = message.sender?._id || message.sender?.id || message.sender;

      if (!messageSenderId) {
        console.error("AppEventListeners: Received 'new-message' event without sender info:", message);
        // Decide if you want to return here or process the message without sender info
        // return;
      }

      // Update messages state using functional update
      setMessages(prev => {
        const chatMessages = prev[message.chatId] || [];
        // Prevent adding duplicate messages
        if (chatMessages.some(msg => msg._id === message._id)) {
          console.log(`AppEventListeners: Message with ID ${message._id} already exists. Skipping.`);
          return prev;
        }

        let updatedChatMessages = chatMessages;
        let replacedOptimistic = false;

        // Handle optimistic message replacement if tempId is present
        if (message.tempId) {
          updatedChatMessages = chatMessages.map(msg => {
            if ((msg.status as string) === 'pending' && (msg.tempId === message.tempId)) {
              console.log(`AppEventListeners: Replacing optimistic message ${msg.tempId} with real message ${message._id} (matched by tempId).`);
              replacedOptimistic = true;
              return {
                ...message,
                sender: message.sender,
                senderId: message.sender?._id || message.sender?.id || message.sender,
                status: message.status || 'delivered', // Default status
                readBy: message.readBy || [], // Ensure readBy is an array
                tempId: undefined, // Remove tempId
              };
            }
            return msg; // Return original message if no match
          });
        }

        // If no optimistic message was replaced, add the new message
        if (!replacedOptimistic) {
          console.log(`AppEventListeners: Adding new message ${message._id} to state (no optimistic replacement or tempId).`);
          return {
            ...prev,
            [message.chatId]: [...updatedChatMessages, {
              ...message,
              sender: message.sender,
              senderId: message.sender?._id || message.sender?.id || message.sender,
              timestamp: new Date(message.createdAt || message.timestamp), // Ensure timestamp is a Date object
              status: message.status || 'delivered', // Default status
              readBy: message.readBy || [], // Ensure readBy is an array
            }]
          };
        }

        // Return updated state if optimistic message was replaced
        return {
          ...prev,
          [message.chatId]: updatedChatMessages
        };
      });

      // Update chats state to reflect the last message
      setChats(prev => {
        if (!Array.isArray(prev)) {
          console.warn("AppEventListeners: setChats expected array state, but received:", prev);
          return prev;
        }
        return prev.map(chat =>
          chat.id === message.chatId || chat._id === message.chatId ? { // Match chat by id or _id
            ...chat,
            lastMessage: { // Update last message details
              content: message.content,
              timestamp: new Date(message.createdAt || message.timestamp),
              senderId: messageSenderId, // Use the resolved sender ID
            },
            lastMessageAt: new Date(message.createdAt || message.timestamp), // Update last message timestamp
            // You might also want to increment an unread count here for the chat if needed
            // e.g., unreadCount: (chat.unreadCount || 0) + 1, // Assuming chat object has unreadCount
          } : chat // Return original chat if no match
        );
      });

      // *** Play the chat sound if the message is from another user ***
      // Ensure currentUserId is available before comparing
      if (currentUserId && messageSenderId !== currentUserId) {
         console.log(`AppEventListeners: New message received from ${messageSenderId}. Playing chat sound.`);
         playChatSound();
      } else if (currentUserId) {
          console.log(`AppEventListeners: New message received from self (${messageSenderId}). Not playing chat sound.`);
      } else {
          console.warn("AppEventListeners: Cannot determine current user ID to decide on playing chat sound.");
      }
    };

    // Handler for message read updates
    const onMessageRead = (data: { messageId: string, readerId: string, chatId: string, readAt: string, status?: string }) => {
      console.log("AppEventListeners: Received 'message-read' event", data);
      // Validate data structure
      if (!data || !data.messageId || !data.readerId || !data.chatId) {
        console.error("AppEventListeners: Received invalid 'message-read' event:", data);
        return;
      }
      // Call the context function to update the message read status in state
      updateMessageReadStatus(data.messageId, data.readerId);

      // You might also want to update the unread count for the chat here if needed
      // This would involve finding the chat and decrementing its unread count.
    };

    // Handler for user online status updates
    const onUserOnline = (data: { userId: string, isOnline: boolean }) => {
      console.log(`AppEventListeners: Received 'user-online' event: ${data.userId}`);
      // Validate data structure
      if (!data || !data.userId) {
        console.error("AppEventListeners: Received 'user-online' event without userId.");
        return;
      }
      // Call the context function to update user online status in state
      setUserOnlineStatus(data.userId, true);
      // Send notifications when user comes online (This logic seems misplaced here,
      // typically presence updates are for displaying status, not sending notifications)
      if (currentUserId && data.userId === currentUserId) {
        console.log(`AppEventListeners: User ${data.userId} is online. (Logic to send notifications here seems unusual).`);
        // Add logic to send notifications here if this is the intended behavior
      }
    };

    // Handler for user offline status updates
    const onUserOffline = (data: { userId: string, isOnline: boolean }) => {
      console.log(`AppEventListeners: Received 'user-offline' event: ${data.userId}`);
       // Validate data structure
      if (!data || !data.userId) {
        console.error("AppEventListeners: Received 'user-offline' event without userId.");
        return;
      }
      // Call the context function to update user offline status in state
      setUserOnlineStatus(data.userId, false);
    };

    // Handler for new notification events
    const onNewNotification = (notification: Notification) => {
      console.log("AppEventListeners: Received 'new-notification' event", notification);
       // Validate notification structure
      if (!notification || !notification._id || !notification.type || !notification.user) {
        console.error("AppEventListeners: Received invalid 'new-notification' event:", notification);
        return;
      }
      // Call the context function to add the new notification to state
      addNotification(notification); // Add notification to context state

      // *** Play the notification sound here ***
      console.log("AppEventListeners: New notification received. Playing notification sound.");
      playNotificationSound();
    };

    // Handler for notification read updates
    const onNotificationReadUpdate = (data: { notificationId: string, read: boolean }) => {
      console.log("AppEventListeners: Received 'notification-read-update' event", data);
      // Validate data structure
      if (!data || !data.notificationId) {
        console.error("AppEventListeners: Received invalid 'notification-read-update' event:", data);
        return;
      }
      // Call the context function to mark the notification as read in state
      markNotificationAsReadInContext(data.notificationId, true);
    };


    // --- Socket Event Listeners Setup ---
    // Attach handlers to socket events
    socket.on('new-message', onNewMessage);
    socket.on('message-read', onMessageRead);
    socket.on('user-online', onUserOnline);
    socket.on('user-offline', onUserOffline);
    socket.on('new-notification', onNewNotification);
    socket.on('notification-read-update', onNotificationReadUpdate);

    // --- Cleanup Function ---
    // This function runs when the component unmounts or dependencies change
    return () => {
      console.log("AppEventListeners: Cleaning up socket listeners.");
      // Remove handlers from socket events to prevent memory leaks
      socket.off('new-message', onNewMessage);
      socket.off('message-read', onMessageRead);
      socket.off('user-online', onUserOnline);
      socket.off('user-offline', onUserOffline);
      socket.off('new-notification', onNewNotification);
      socket.off('notification-read-update', onNotificationReadUpdate);
    };
  }, [
    socketContext, // Dependency on socket context
    messagesContext, // Dependency on messages context
    notificationsContext, // Dependency on notifications context
    currentUserId, // Dependency on current user ID (if it changes)
    // Include any other external values used inside the effect that might change
    // and require re-setting listeners (e.g., specific user settings for sounds)
  ]);

  // This component does not render any UI
  return null;
}
