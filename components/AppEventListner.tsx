// components/AppEventListeners.tsx
import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext'; // To listen to socket events
import { useMessages } from '../context/MessageContext'; // To update message state
import { useAuth } from '../context/AuthContext'; // If needed to check current user

export function AppEventListeners() {
  // Get the socket instance and relevant data/functions from SocketContext
  const { socket, isConnected, notifications, clearNotifications } = useSocket();
  // Get the state update functions from MessageContext
  const {
    setMessages, // To directly update messages state
    setChats,    // To directly update chats state (e.g., last message, unread count)
    setUserOnlineStatus, // To update user online status state
    updateMessageReadStatus, // To update message read status state
    // Add other state update functions from MessageContext if needed
  } = useMessages();

   const { user } = useAuth();
   const currentUserId = user?._id || user?.id;


  // Effect to set up listeners when the socket becomes available
  useEffect(() => {
    if (!socket) {
      console.log("AppEventListeners: Socket not available. Skipping listeners setup.");
      return;
    }

    console.log("AppEventListeners: Setting up socket listeners...");

    // Listener for 'new-message' events
    const onNewMessage = (message: any) => {
      console.log("AppEventListeners: Received 'new-message' event", message);
       if (!message || !message.chatId) {
           console.error("AppEventListeners: Received invalid 'new-message' event:", message);
           return;
       }

      // Update the global messages state in MessageContext
      setMessages(prev => {
        const chatMessages = prev[message.chatId] || [];

        // Prevent adding duplicates based on real _id
        if (chatMessages.some(msg => msg._id === message._id)) {
             console.log(`AppEventListeners: Message with ID ${message._id} already exists. Skipping.`);
             return prev;
        }

         let updatedChatMessages = chatMessages;
         let replacedOptimistic = false;

         // Attempt to replace optimistic message if tempId is provided by backend
         if (message.tempId) {
             updatedChatMessages = chatMessages.map(msg => {
                 if ((msg.status as string) === 'pending' && (msg._id === message.tempId || msg.id === message.tempId)) {
                     console.log(`AppEventListeners: Replacing optimistic message ${msg._id} with real message ${message._id} (matched by tempId).`);
                      replacedOptimistic = true;
                     return {
                         ...message, // Use real message data
                         sender: message.sender, // Ensure sender structure
                         senderId: message.sender?._id || message.sender?.id || message.sender,
                         status: 'delivered', // Set status
                          // Keep client-side optimistic read status if backend doesn't send it
                         read: msg.read || false,
                     };
                 }
                 return msg;
             });
         }


        // If no optimistic message was replaced, add the new message
         if (!replacedOptimistic) {
             console.log(`AppEventListeners: Adding new message ${message._id} to state (no optimistic replacement or tempId).`);
             return {
               ...prev,
               [message.chatId]: [...updatedChatMessages, {
                   ...message,
                    sender: message.sender, // Ensure sender structure
                   senderId: message.sender?._id || message.sender?.id || message.sender,
                   timestamp: new Date(message.createdAt || message.timestamp),
                   status: 'delivered',
                   // Ensure readBy is initialized if needed
                   readBy: message.readBy || [],
                }]
             };
         }

         // If replaced, return the updated state for that chat
         return {
              ...prev,
              [message.chatId]: updatedChatMessages
         };

      });

      // Update last message in the chat list state in MessageContext
      setChats(prev =>
        prev.map(chat =>
          chat.id === message.chatId || chat._id === message.chatId ? {
              ...chat,
              lastMessage: message, // Use the real message
              lastMessageAt: new Date(message.createdAt || message.timestamp), // Update timestamp
               // TODO: Handle unread count increment here if the user is not in this chat screen
          } : chat
        )
      );

      // TODO: Decide where to play the notification sound for messages
      // If the user is NOT in the chat screen for this message, maybe play notification sound?
      // This check requires knowing the currently active chat route ID.
      // Could be done here or in a separate notification handling component.
       // Example (requires knowing currentRoute or activeChatId):
       // const currentRoute = router.pathname; // Need access to router or route state
       // const activeChatId = useLocalSearchParams().id; // Need access to route params
       // if (currentRoute !== '/(protected)/(tabs)/chat/[id]' || activeChatId !== message.chatId) {
       //    // Play notification sound
       // }

    }; // End onNewMessage function


    // Listener for 'message-read' events
    const onMessageRead = (data: { messageId: string, userId: string }) => {
        console.log("AppEventListeners: Received 'message-read' event", data);
        if (!data || !data.messageId || !data.userId) {
            console.error("AppEventListeners: Received invalid 'message-read' event:", data);
            return;
        }
        // Call the state update function in MessageContext
        updateMessageReadStatus(data.messageId, data.userId);
         // TODO: Decrement unread count in chats list if needed
    };

    // Listener for 'user-online' events
    const onUserOnline = (userId: string) => {
         console.log(`AppEventListeners: Received 'user-online' event: ${userId}`);
         if (!userId) {
             console.error("AppEventListeners: Received 'user-online' event without userId.");
             return;
         }
         // Call the state update function in MessageContext
         setUserOnlineStatus(userId, true);
     };

    // Listener for 'user-offline' events
    const onUserOffline = (userId: string) => {
         console.log(`AppEventListeners: Received 'user-offline' event: ${userId}`);
          if (!userId) {
             console.error("AppEventListeners: Received 'user-offline' event without userId.");
             return;
         }
         // Call the state update function in MessageContext
         setUserOnlineStatus(userId, false);
     };

     // Note: Connection notification listeners are already in SocketContext.tsx


    // --- Add Listeners ---
    socket.on('new-message', onNewMessage);
    socket.on('message-read', onMessageRead);
    socket.on('user-online', onUserOnline);
    socket.on('user-offline', onUserOffline);


    // Clean up listeners when component unmounts or socket changes
    return () => {
      console.log("AppEventListeners: Cleaning up socket listeners.");
      // Use specific off calls with the function reference
      socket.off('new-message', onNewMessage);
      socket.off('message-read', onMessageRead);
      socket.off('user-online', onUserOnline);
      socket.off('user-offline', onUserOffline);
      // Note: Socket connection/disconnection handling is in SocketContext
    };

  }, [socket, setMessages, setChats, setUserOnlineStatus, updateMessageReadStatus, currentUserId]); // Dependencies


  // This component doesn't render anything visible
  return null;
}