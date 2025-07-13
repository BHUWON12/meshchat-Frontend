// frontend/context/MessageContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import {
  getChats as apiGetChats,
  getMessages as apiGetMessages,
  initiateChat as apiInitiateChat,
} from '../services/chats';
// Import necessary types
import { User, Chat, Message, ConnectionStatus, MessageType, DeliveryStatus } from '../types/index';
// Import AuthContext to get the current user
import { useAuth } from './AuthContext';
// Removed import for useSocket to break the circular dependency within the Provider component
// import { useSocket } from './SocketContext';

// Define the shape of the context value provided by MessageProvider
interface MessageContextType {
  chats: Chat[];
  messages: { [chatId: string]: Message[] }; // Messages nested by chat ID
  userOnlineStatuses: { [userId: string]: boolean }; // Dedicated state for user online status
  loading: boolean; // Loading state for initial data fetch
  fetchChats: () => Promise<void>; // Function to fetch all chats
  fetchMessages: (chatId: string) => Promise<void>; // Function to fetch messages for a specific chat
  getChat: (chatId: string) => Chat | undefined; // Getter for a single chat
  getChatMessages: (chatId: string) => Message[]; // Getter for messages of a specific chat
  getChatByParticipant: (userId: string) => Chat | undefined; // Getter for chat by participant ID
  initiateChat: (user: User, connectionStatus?: ConnectionStatus) => Promise<Chat>; // Function to initiate a chat (REST)

  // State setters and update functions provided for AppEventListeners or other components
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>; // Direct setter for chats state
  setMessages: React.Dispatch<React.SetStateAction<{ [chatId: string]: Message[] }>>; // Direct setter for messages state
  setUserOnlineStatus: (userId: string, isOnline: boolean) => void; // Function to update user online status state
  updateMessageReadStatus: (messageId: string, readerId: string) => void; // Function to update message read status state

  // Removed action functions (sendMessage, markMessageAsRead) as they now use useSocket directly in the calling component/orchestrator
  // sendMessage: (chatId: string, content: string, type?: MessageType, caption?: string) => Promise<void>;
  // markMessageAsRead: (messageId: string) => Promise<void>;

  // Keeping updateConnectionStatus if it has a specific use case beyond isOnline
  updateConnectionStatus: (userId: string, status: ConnectionStatus) => void;
}

// Create the context with an initial undefined value
const MessageContext = createContext<MessageContextType | undefined>(undefined);

// Message Provider component that manages chat, message, and user status state
export function MessageProvider({ children }: { children: ReactNode }) {
  // Access the current authenticated user
  const { user } = useAuth();
  
  // Memoize current user ID to prevent unnecessary re-renders
  const currentUserId = useMemo(() => user?._id || user?.id, [user?._id, user?.id]);

  // --- State ---
  // State for the list of chats
  const [chats, setChats] = useState<Chat[]>([]);
  // State for messages, organized by chat ID
  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({});
  // State for tracking user online/offline status
  const [userOnlineStatuses, setUserOnlineStatuses] = useState<{ [userId: string]: boolean }>({});
  // State for loading indicator
  const [loading, setLoading] = useState(false);

  // Memoize getter functions to prevent unnecessary re-renders
  const getChat = useCallback((chatId: string) => {
     if (!chatId) return undefined;
    return chats.find(chat => chat.id === chatId || chat._id === chatId); // Check both 'id' and '_id'
  }, [chats]); // Recreate if chats state changes

  // Get the array of messages for a specific chat ID from the messages state
  const getChatMessages = useCallback((chatId: string) => {
     if (!chatId) return [];
    return messages[chatId] || []; // Return the messages array for the chat ID, or empty array if none
  }, [messages]); // Recreate if messages state changes

  // Get a chat object by one of its participant's user ID from the chats state
  const getChatByParticipant = useCallback((userId: string) => {
     if (!userId) return undefined;
    return chats.find(chat =>
      chat.participants.some((p: any) => (p._id || p.id) === userId) // Check participants array
    );
  }, [chats]); // Recreate if chats state changes

  // --- Data Fetching Functions (useCallback for memoization) ---

  // Fetch the list of chats for the current user from the backend (REST API)
  const fetchChats = useCallback(async () => {
    if (!currentUserId) {
        console.warn("MessageContext: fetchChats called without current user ID.");
        return; // Do not fetch if user ID is not available
    }
    setLoading(true); // Set loading state
    try {
      console.log("MessageContext: Fetching chats from API...");
      // Call the API service to get chats
      const chatsData = await apiGetChats(currentUserId);
      // Update the chats state
      setChats(chatsData);
      console.log(`MessageContext: Successfully fetched ${chatsData.length} chats.`);

      // Initialize user online statuses from fetched participant data
      const initialOnlineStatuses: { [userId: string]: boolean } = {};
      chatsData.forEach(chat => {
          chat.participants.forEach(p => {
              if (p._id || p.id) {
                   // Assume participant object includes an isOnline property
                   initialOnlineStatuses[p._id || p.id] = p.isOnline || false;
              }
          });
      });
      // Update the userOnlineStatuses state, merging with any existing data
      setUserOnlineStatuses(prev => ({ ...prev, ...initialOnlineStatuses }));
      console.log(`MessageContext: Initialized online statuses for ${Object.keys(initialOnlineStatuses).length} participants from chats.`);

    } catch (error) {
      console.error('MessageContext: Failed to fetch chats:', error);
      // TODO: Handle error state or display error to user
    } finally {
      setLoading(false); // Clear loading state
    }
  }, [currentUserId]); // Recreate fetchChats function if currentUserId changes

  // Fetch messages for a specific chat from the backend (REST API)
  const fetchMessages = useCallback(async (chatId: string) => {
     if (!chatId) {
         console.warn("MessageContext: fetchMessages called without chatId.");
         return; // Do not fetch if chat ID is missing
     }
    try {
       console.log(`MessageContext: Fetching messages for chat ${chatId} from API...`);
      // Call the API service to get messages for the chat
      const messagesData = await apiGetMessages(chatId);
      // Update the messages state for the specific chat ID
      setMessages(prev => ({
        ...prev,
        [chatId]: messagesData // Store messages array nested under the chatId key
      }));
       console.log(`MessageContext: Successfully fetched ${messagesData.length} messages for chat ${chatId}.`);
    } catch (error) {
      console.error(`MessageContext: Failed to fetch messages for chat ${chatId}:`, error);
      // TODO: Handle error
    }
  }, []); // No dependencies needed if apiGetMessages is stable

  // --- State Update Functions (Called by AppEventListeners or other components) ---
  // These functions update the state within this context based on external events (like socket events).

  // Update a specific user's online status in the userOnlineStatuses state
  const setUserOnlineStatus = useCallback((userId: string, isOnline: boolean) => {
      if (!userId) {
           console.warn("MessageContext: setUserOnlineStatus called without userId.");
           return;
      }
      console.log(`MessageContext: Setting user ${userId} online status to ${isOnline}`);
      // Update the dedicated user online statuses state using functional update
      setUserOnlineStatuses(prev => ({
          ...prev,
          [userId]: isOnline
      }));
      // Also update the isOnline status directly within the participants array in the chats state
       setChats(prev => prev.map(chat => ({
           ...chat,
           participants: chat.participants.map(p =>
               // Find the participant by ID and update their isOnline status
               (p._id || p.id) === userId ? { ...p, isOnline: isOnline } : p
           )
       })));
  }, [setUserOnlineStatuses, setChats]); // Recreate if state setters change (stable identities)

  // Update the read status of a specific message in the messages state
  // This function is called by AppEventListeners when a 'message-read' event is received
  const updateMessageReadStatus = useCallback((messageId: string, readerId: string) => {
      if (!messageId || !readerId) {
          console.warn("MessageContext: updateMessageReadStatus called without messageId or readerId.");
          return;
      }
      console.log(`MessageContext: Updating read status for message ${messageId} by user ${readerId}`);

      setMessages(prev => {
          const updated = { ...prev }; // Create a mutable copy of the messages state object
          let messageFound = false; // Flag to track if the message was found and updated

          // Iterate through each chat's messages to find the target message
          Object.keys(updated).forEach(chatId => {
               if (updated[chatId]) { // Check if messages exist for this chatId
                 updated[chatId] = updated[chatId].map(msg => {
                   // Check if the current message is the target message AND
                   // the reader is not already in the message's readBy array
                   if (
                       (msg._id === messageId || msg.id === messageId) && // Match by _id or id
                       !(msg.readBy || []).some(r => (r.readerId === readerId || r.reader?._id === readerId)) // Check if readerId exists
                       ) {
                       messageFound = true; // Mark that the message was found

                       // Create the updated message object
                       const updatedMsg = {
                           ...msg,
                           // Add the new reader to the readBy array
                           readBy: [...(msg.readBy || []), { readerId, readAt: new Date().toISOString() }],
                       };
                       // Mark the message as read and set delivery status to 'read'
                       updatedMsg.read = true;
                       updatedMsg.status = 'read' as DeliveryStatus;

                       console.log(`Message ${messageId} in chat ${chatId} marked as read by ${readerId}.`);
                       return updatedMsg; // Return the updated message
                   }
                   return msg; // Return original message if no match or already read by this user
                 });
               }
           });

           if (!messageFound) {
               console.warn(`MessageContext: Message ${messageId} not found in state or already read by ${readerId}. No state update needed.`);
           }
          // Return the updated messages state (or previous state if no message was found/changed)
          return messageFound ? updated : prev;
      });

       // TODO: Implement unread count decrement logic here if needed
       // Requires finding the specific chat containing messageId and decrementing its unread count.
       // This is complex with the current state structure. Consider if backend handles this.

  }, [setMessages, setChats]); // Recreate if state setters change

   // --- Action Functions (Initiated from UI/Orchestrator - REST based) ---

  // Initiate a new chat with a participant using the REST API
  const initiateChat = useCallback(async (participantUser: User, connectionStatus: ConnectionStatus = 'online') => {
    if (!currentUserId) throw new Error('MessageContext: Cannot initiate chat. No current user.');
    if (!participantUser?._id && !participantUser?.id) throw new Error('MessageContext: Cannot initiate chat. Participant user has no ID.');

    try {
      // Check if a chat already exists with this participant using the getter
      const existingChat = getChatByParticipant(participantUser._id || participantUser.id);
      if (existingChat) {
          console.log(`MessageContext: Chat with participant ${participantUser.username} already exists: ${existingChat._id || existingChat.id}. Returning existing chat.`);
          return existingChat; // Return the existing chat object
      }

      console.log(`MessageContext: Initiating new chat with participant: ${participantUser.username} via API...`);
      // Call the API service to initiate the chat
      const newChat = await apiInitiateChat(participantUser._id || participantUser.id, currentUserId);

      // Add the newly created chat to the chats state
      setChats(prev => [...prev, newChat]);
      console.log(`MessageContext: New chat initiated and added to state: ${newChat._id || newChat.id}`);

      // Optionally trigger a fetch of initial messages for this new chat if needed immediately
      // fetchMessages(newChat._id || newChat.id); // Decide if you need to fetch immediately on chat creation

      return newChat; // Return the newly created chat object from the API response
    } catch (error) {
      console.error('MessageContext: Chat initiation failed:', error);
       // TODO: Handle error (e.g., show toast)
      throw error; // Re-throw the error for the calling component to handle
    }
  }, [getChatByParticipant, currentUserId, setChats]); // Dependencies


   // Keeping updateConnectionStatus if it has a specific use case beyond setUserOnlineStatus (e.g., updating connection type status)
   // Otherwise, consider removing it. If used, it updates the 'chats' state.
   const updateConnectionStatus = useCallback((userId: string, status: ConnectionStatus) => {
    console.log(`MessageContext: updateConnectionStatus called for user ${userId} with status ${status}`);
    // This function likely updates a 'connectionType' property on the participant within the chat
     setChats(prev => prev.map(chat => ({
       ...chat,
       participants: chat.participants.map(p =>
           // Find the participant by ID and update their connectionType status
           (p._id || p.id) === userId ? { ...p, connectionType: status } : p // Assume participant has connectionType
       )
     })));
   }, [setChats]); // Dependency on setChats


  // --- Initial Data Fetch ---
  // Effect to fetch chats when the component mounts or fetchChats dependency changes
  useEffect(() => {
    console.log("MessageContext: Running initial fetchChats useEffect.");
    // Call the memoized fetchChats function
    fetchChats();
  }, [fetchChats]); // Dependency on the memoized fetchChats function

  // Removed socket event listeners useEffect from here

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    chats,
    messages,
    userOnlineStatuses,
    loading,
    fetchChats,
    fetchMessages,
    getChat,
    getChatMessages,
    getChatByParticipant,
    initiateChat,
    setChats,
    setMessages,
    setUserOnlineStatus,
    updateMessageReadStatus,
    updateConnectionStatus,
  }), [
    chats,
    messages,
    userOnlineStatuses,
    loading,
    fetchChats,
    fetchMessages,
    getChat,
    getChatMessages,
    getChatByParticipant,
    initiateChat,
    setChats,
    setMessages,
    setUserOnlineStatus,
    updateMessageReadStatus,
    updateConnectionStatus,
  ]);

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
    </MessageContext.Provider>
  );
}

// Custom hook to consume the MessageContext
export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) {
    // This error means the component calling useMessages is not wrapped by MessageProvider
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};