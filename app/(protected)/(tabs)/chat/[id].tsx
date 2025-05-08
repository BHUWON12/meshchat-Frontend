import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Plus, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-audio';

// Correctly import services using the aliases from services/index.ts
import { chatsApi, messagesApi } from '../../../../services/index'; // Assuming these are REST APIs

import { useAuth } from '../../../../context/AuthContext';
import { useSocket } from '../../../../context/SocketContext'; // Import the full useSocket context
import { useMessages } from '../../../../context/MessageContext'; // Import MessageContext
// Assuming you have a ToastContext
import { useToast } from '../../../../context/ToastContext'; // Import ToastContext


import Colors from '../../../../constants/Colors';

// Adjust component import paths based on your structure
import UserAvatar from '../../../../components/UserAvatar';
import ChatBubble from '../../../../components/ChatBubble';
import EmptyState from '../../../../components/EmptyState';

import { isOwnMessage } from '../../../../utils/helpers'; // Adjust the import path as needed
import { API_URL } from '../../../../utils/constants'; // Use constants if needed, though socket manages endpoint

// Define a type for message delivery status for clarity
type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

// Extend the message type to include temporary ID and status for optimistic updates
interface ChatMessage {
    _id?: string; // Real message ID from backend
    id?: string; // Alias for _id or another identifier
    chatId: string;
    sender: {
        _id: string;
        id?: string;
        username: string;
        avatar?: string;
        // Add other sender properties if needed
    };
    content: string;
    type: 'text' | 'image' | 'audio'; // Add other types as needed
    createdAt?: string; // Server timestamp
    timestamp?: Date; // Client or server timestamp
    status?: DeliveryStatus; // Delivery status (client-side)
    tempId?: string; // Temporary ID for optimistic updates (client-side)
    readBy?: { readerId: string; readAt: string }[]; // Array of user IDs who read the message
    metadata?: { [key: string]: any }; // For image captions, audio duration, etc.
}


export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  // Access the socket context value including functions to emit events
  const { socket, isConnected, sendMessage: sendSocketMessage, markMessageAsRead, isOnlineMode } = useSocket?.() || {}; // Add null/undefined check
  // Access MessageContext state (messages object) and state update functions (setters)
  const { messages: globalMessagesObject, fetchMessages, setUserOnlineStatus, updateMessageReadStatus } = useMessages?.() || {}; // Add null/undefined check
  // Access ToastContext
  const { showToast } = useToast?.() || {}; // Add null/undefined check

  const router = useRouter();

  const [chat, setChat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false); // State for indicating if a message is *currently* being sent
  const [messageText, setMessageText] = useState('');
  const [recipient, setRecipient] = useState<any>(null);

  // State for messages specific to *this* chat, filtered/derived from globalMessagesObject
  const [currentChatMessages, setCurrentChatMessages] = useState<ChatMessage[]>([]); // Use the defined type

  const flatListRef = useRef<FlatList<ChatMessage>>(null); // Use ChatMessage type with FlatList ref
  const chatSoundRef = useRef<Audio.Sound | null>(null); // Ref for chat sound instance

  // --- Sound Loading ---
  useEffect(() => {
    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(require("../../../../assets/sounds/chat.mp3"));
        chatSoundRef.current = sound;
        console.log("ChatScreen: Chat sound loaded.");
      } catch (error) {
        console.error('ChatScreen: Error loading chat sound:', error);
      }
    }
    loadSound();

    return () => {
      console.log("ChatScreen: Unloading chat sound.");
      chatSoundRef.current?.unloadAsync();
      chatSoundRef.current = null; // Explicitly nullify the ref
    };
  }, []);

  // --- Fetch chat details and messages ---
  useFocusEffect(
    useCallback(() => {
      const fetchChatDetails = async () => {
        try {
          setLoading(true);
          const currentUserId = user?._id || user?.id;

          if (!id || !currentUserId) {
              console.warn("ChatScreen: Chat ID or User ID is missing, cannot fetch chat details.");
              setLoading(false);
              return;
          }

          console.log(`ChatScreen: Fetching details for chat ID: ${id}`);
          const chatResponse = await chatsApi.getChat(id, currentUserId);
          setChat(chatResponse);

          if (chatResponse && chatResponse.participants) {
            const otherUser = chatResponse.participants.find(
              (p: any) => (p._id || p.id) !== currentUserId
            );
            setRecipient(otherUser);
             console.log("ChatScreen: Recipient identified:", otherUser?.username);
          }

           console.log(`ChatScreen: Calling fetchMessages from MessageContext for chat ID: ${id}`);
           // Ensure fetchMessages exists before calling
           fetchMessages?.(id);

          // Join chat room via socket *after* essential data is fetched and component is mounted
          // and only if socket and isConnected are available
          if (socket && isConnected && id) {
            console.log(`ChatScreen: Emitting 'join-chat' for chatId: ${id}`);
            socket.emit('join-chat', id);
          } else {
             console.log(`ChatScreen: Skipping 'join-chat' emit. Socket available: ${!!socket}, Connected: ${isConnected}, ChatId: ${id}`);
          }


        } catch (error) {
          console.error('ChatScreen: Error fetching chat details:', error);
          // TODO: Optionally set an error state to display in the UI
          showToast?.("Failed to load chat."); // Show toast on fetch error
        } finally {
          setLoading(false);
        }
      };

      fetchChatDetails();

       return () => {
         // Only emit 'leave-chat' if socket is available and connected on cleanup
         if (socket && isConnected && id) {
           console.log(`ChatScreen: Emitting 'leave-chat' for chatId: ${id}`);
           socket.emit('leave-chat', id);
         } else {
             console.log(`ChatScreen: Skipping 'leave-chat' emit on cleanup. Socket available: ${!!socket}, Connected: ${isConnected}, ChatId: ${id}`);
         }
       };

    }, [id, user, socket, isConnected, fetchMessages, showToast]) // Added showToast to deps if used in callback
  );

    // --- Derive messages for the current chat from the global messages object ---
    useEffect(() => {
        console.log("ChatScreen: Running effect to filter messages for current chat.");
        if (globalMessagesObject && id && globalMessagesObject[id]) {
            // Access the specific messages array for this chat ID and cast it
            const messagesForCurrentChat: ChatMessage[] = globalMessagesObject[id];
            // Sort messages by timestamp/createdAt to ensure correct order
            const sortedMessages = messagesForCurrentChat.sort((a, b) =>
                 new Date(a.createdAt || a.timestamp || 0).getTime() - new Date(b.createdAt || b.timestamp || 0).getTime()
            );
            setCurrentChatMessages(sortedMessages);
            console.log(`ChatScreen: Found ${sortedMessages.length} messages for chat ${id}.`);
        } else {
             console.log(`ChatScreen: No messages found for chat ${id} or global messages object is empty.`);
            setCurrentChatMessages([]);
        }
    }, [globalMessagesObject, id]); // Rerun when global messages object or chat ID changes


  // --- Socket Listeners specific to the Chat Screen (for UI updates like status, sound, mark as read) ---
  useEffect(() => {
      if (!socket || !id || !user || !chatSoundRef.current || !markMessageAsRead) {
          console.log("ChatScreen: Prerequisites missing for chat screen listeners setup. Skipping.");
          return;
      }

      const currentUserId = user._id || user.id;

      // Listener for incoming messages - handles sound and marking as read IF in this chat
      const onNewMessage = async (message: ChatMessage) => {
          console.log('ChatScreen: Received new message event (local listener).', message);
          // Check if the received message belongs to the current chat being viewed
          if (message.chatId === id) {
               console.log(`ChatScreen: New message ${message._id || message.tempId} is for the current chat.`);
              // AppEventListeners already adds/replaces this message in the global state,
              // which triggers the effect above to update currentChatMessages.

              // Play chat sound *only* if it's not our own message AND the sound is loaded
              if (!isOwnMessage(message, currentUserId) && chatSoundRef.current) {
                console.log('ChatScreen: Playing chat sound...');
                try {
                  await chatSoundRef.current.replayAsync();
                } catch (error) {
                  console.error('ChatScreen: Error playing chat sound:', error);
                }
              }

              // Mark message as read via socket if it's not our own and has a valid ID from backend
              // Only mark as read if the message has a real _id, not just a tempId
              if (!isOwnMessage(message, currentUserId) && message._id) { // Check for _id specifically
                 console.log(`ChatScreen: Marking message ${message._id} as read via socket.`);
                 // Use the socket context function to emit the read event
                 // Pass the chat ID as well if your backend read logic needs it
                 markMessageAsRead(message._id, id);
              }
          } else {
               console.log(`ChatScreen: Received message ${message._id || message.tempId} is NOT for the current chat ${id}.`);
               // If the message is NOT for this chat, AppEventListeners handles it.
          }
      };


       // --- Listener for recipient online status updates ---
       // Update the local recipient state when their online status changes
       // Note: AppEventListeners also updates the global state, but updating local recipient state is good for immediate UI reaction in header
      const onUserStatusChange = (statusUpdate: { userId: string, isOnline: boolean }) => {
          if (recipient && (recipient._id === statusUpdate.userId || recipient.id === statusUpdate.userId)) {
              console.log(`ChatScreen: Recipient ${statusUpdate.userId} status changed to ${statusUpdate.isOnline}. Updating local state.`);
              // Update the local recipient state with the new online status
              setRecipient(prev => prev ? { ...prev, isOnline: statusUpdate.isOnline } : null); // Ensure prev is not null
          }
      };

      // Add Listeners specific to this Chat Screen
       socket.on('new-message', onNewMessage);
       socket.on('user-online', onUserStatusChange);
       socket.on('user-offline', onUserStatusChange);


      // Clean up listeners when component unmounts or dependencies change
      return () => {
        console.log("ChatScreen: Running cleanup for local socket listeners.");
        socket.off('new-message', onNewMessage);
        socket.off('user-online', onUserStatusChange);
        socket.off('user-offline', onUserStatusChange);
      };

      // Dependencies for the effect: rerun when socket, id, user, sound, markAsRead, or recipient changes
      // Added updateMessageReadStatus to dependencies if markMessageAsRead depends on it internally
    }, [socket, id, user, chatSoundRef.current, markMessageAsRead, recipient, updateMessageReadStatus]);


    // Scroll to bottom on new messages in the current chat
    useEffect(() => {
      if (currentChatMessages.length > 0 && flatListRef.current) {
         // Only auto-scroll if the latest message is owned by the current user
         // OR if the user is already scrolled near the bottom.
         // For simplicity here, we scroll on any new message IF the user is near the bottom.
         // A more robust solution would involve checking scroll position.
         // For now, let's just scroll on any new message after a short delay.
         setTimeout(() => {
             console.log("ChatScreen: Scrolling to end.");
             flatListRef.current?.scrollToEnd({ animated: true });
         }, 100); // Increased delay slightly
      }
       console.log("ChatScreen: messages state updated, possibly triggering scroll.");
    }, [currentChatMessages]);


  // Send text message function using socket
  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = messageText.trim();
    const currentUserId = user?._id || user?.id;

    // --- IMPORTANT CHECK ---
    // Check for required data AND active socket connection BEFORE proceeding
    if (!trimmedMessage) {
         console.warn("ChatScreen: Cannot send message: Message text is empty.");
         return; // Exit if no text
    }
     if (!id || !currentUserId) {
         console.warn("ChatScreen: Cannot send message: Chat ID or User ID is missing.");
         showToast?.("Failed to send message: User or chat missing."); // User feedback
         return; // Exit if missing crucial IDs
     }
    // The critical check: Is the socket available and connected?
    if (!socket || !isConnected) {
        console.warn("ChatScreen: Cannot send message: Socket not available or not connected.");
        // Provide user feedback using Toast
        showToast?.("Cannot send message: Not connected to server.");
        setSending(false); // Ensure sending state is false if we exit here
        // Do NOT add optimistic message if we can't even emit
        return; // Exit if socket is not ready
    }
    // --- End of IMPORTANT CHECK ---


    try {
      setSending(true); // Indicate that message sending is in progress

      // Construct a temporary message object for optimistic UI update
      // Use a temporary client-side ID that you expect the backend to send back in the 'new-message' event
      const tempMessageId = `temp-${Date.now()}-${Math.random()}`;
      const tempMessageForUI: ChatMessage = {
          _id: tempMessageId, // Use the temporary ID for optimistic display initially
          id: tempMessageId, // Also keep id for consistency
          chatId: id,
          sender: { // Structure sender info correctly
             _id: currentUserId,
             id: currentUserId, // Include both if your components expect either
             username: user?.username || 'You',
             avatar: user?.avatar,
          },
          content: trimmedMessage,
          type: 'text',
          // Add a client-side timestamp
          createdAt: new Date().toISOString(), // Use ISO string for consistency
          timestamp: new Date(),
          // Set initial status to pending
          status: 'pending',
          // Optimistically mark as read by the sender
          readBy: [{ readerId: currentUserId, readAt: new Date().toISOString() }],
          tempId: tempMessageId, // Explicitly include tempId for backend reference
      };

      // Optimistically add the temporary message to the *local* state for the current chat
      // This provides instant feedback. AppEventListeners handles adding the real message to global state later.
      setCurrentChatMessages(prev => [...prev, tempMessageForUI]);
      console.log(`ChatScreen: Optimistically added message ${tempMessageForUI._id} (tempId) to local state.`);

      // Clear the input field immediately after showing the optimistic message
      setMessageText('');
      Keyboard.dismiss(); // Dismiss the keyboard


      // Construct the message payload to be sent via the socket
      const messagePayloadForBackend = {
           chatId: id,
           content: trimmedMessage,
           type: 'text',
           // Add metadata like caption if applicable for other message types
           metadata: { /* caption */ },
           tempId: tempMessageId // <-- Include temporary ID for backend reference (Crucial!)
       };


      console.log("ChatScreen: Emitting 'send-message' via useSocket().sendMessage...", messagePayloadForBackend);
      // Emit the 'send-message' event via the socket using the useSocket hook function
      // Include a callback function to handle acknowledgment from the backend
      // The callback confirms the backend received/processed the message emission, NOT final delivery to recipient.
      sendSocketMessage(messagePayloadForBackend, (response: any) => {
          console.log('ChatScreen: Backend acknowledgment received for message:', response);

          // Note: The 'new-message' event is the primary way to get the final message object
          // with the real _id and server timestamp. That event should be handled by
          // AppEventListeners and MessageContext to update the global state.
          // This acknowledgment callback can be used for immediate feedback on emission success/failure.

          if (response?.status === 'success') {
              console.log(`ChatScreen: Message ${tempMessageId} successfully emitted and acknowledged by backend.`);
              // No need to update local status to 'sent' here if AppEventListeners handles replacement
              // based on the tempId when the 'new-message' comes back.
              // The 'pending' status will remain locally until the 'new-message' event arrives.

          } else {
              // Backend returned an error (e.g., validation failed on server)
              console.error('ChatScreen: Failed to send message (backend acknowledgment):', response?.message || 'Unknown acknowledgment error');
              // Update the status of the optimistically added message to 'failed' in the *local* state
               setCurrentChatMessages(prev =>
                   prev.map(msg =>
                       // Find the message by its temporary ID and check it's still pending
                       (msg.tempId === tempMessageId && msg.status === 'pending')
                           ? { ...msg, status: 'failed' as DeliveryStatus } // Update status to 'failed'
                           : msg
                   )
                );
               showToast?.(`Failed to send message: ${response?.message || 'Server error'}`);
          }
          setSending(false); // Set sending to false after acknowledgment (success or failure)

      });

      // Do NOT set sending(false) or clear input field immediately after emit.
      // Clearing input should happen immediately for responsiveness (done above).
      // Setting sending(false) should wait for the socket acknowledgment callback.

    } catch (error) {
      // Handle client-side error *before* emitting via socket (e.g., code error, network error preventing emit)
      console.error('ChatScreen: Client-side error sending message:', error);
      setSending(false); // Stop the sending indicator

      // Find the optimistically added message by its tempId and update its status to 'failed'
      // This handles cases where the error happens *before* the socket emit even completes.
       setCurrentChatMessages(prev =>
           prev.map(msg =>
               // Find the message by its temporary ID and status 'pending'
               (msg.tempId === tempMessageId && msg.status === 'pending')
                   ? { ...msg, status: 'failed' as DeliveryStatus } // Update status to 'failed'
                   : msg
           )
        );
       showToast?.("Error sending message due to app issue or network.");
    }
  }, [messageText, id, user, socket, isConnected, sendSocketMessage, showToast, setCurrentChatMessages]); // Added setCurrentChatMessages and showToast to dependencies


  // Send image message (mocked) - Keep as is for now, real implementation needs file upload
  const handleSendImage = async () => {
    // Add the same connection check here
     if (!socket || !isConnected) {
        console.warn("ChatScreen: Cannot send image: Socket not available or not connected.");
        showToast?.("Cannot send image: Not connected to server.");
        return; // Exit if socket is not ready
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // In a real app, you would upload the image to a server here
        // and then send a socket message with type: 'image' and the image URL
        Alert.alert('Feature not available', 'Image sharing will be implemented in a future update.');
         // TODO: Implement actual image sending logic via socket after upload
      }
    } catch (error) {
      console.error('ChatScreen: Error picking image:', error);
      showToast?.("Error picking image.");
    }
  };

  // Render message item for FlatList
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const currentUserId = user?._id || user?.id || '';
    const isOwn = isOwnMessage(item, currentUserId);
    // Use currentChatMessages for checking the previous message in the *rendered* list
    const prevMessage = currentChatMessages[index - 1];
    // Check if the previous message is from the same user (owned or not) to determine if avatar is needed
    // Also check if the previous message exists
    const isConsecutive = index > 0 && prevMessage !== undefined && isOwnMessage(prevMessage, currentUserId) === isOwn;

    // Find the actual sender object from item.sender or determine if it's current user/recipient
    const senderInfo = item.sender && (item.sender._id || item.sender.id) ? item.sender : (isOwn ? user : recipient);

    return (
      <ChatBubble
        message={item} // Pass the message object
        isOwn={isOwn} // Is this message from the current user?
        showAvatar={!isConsecutive} // Show avatar if it's not a consecutive message from the same user
        isConsecutive={isConsecutive}
        sender={senderInfo} // Pass sender info
        // You might want to pass the current user's ID to ChatBubble if it needs to know it internally
        currentUserId={currentUserId}
      />
    );
  };

  const isEmpty = currentChatMessages.length === 0 && !loading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.common.gray[800]} />
        </TouchableOpacity>

        {/* Recipient Info */}
        <TouchableOpacity style={styles.userInfo} onPress={() => { /* TODO: Navigate to recipient profile? */ }}>
          {recipient ? (
            <UserAvatar
              uri={recipient?.avatar}
              name={recipient?.username}
              size={36}
              showStatus // Assuming UserAvatar component can show online status
              isOnline={recipient?.isOnline} // Pass the recipient's online status
            />
          ) : (
             <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.common.gray[300] }} />
          )}
          <View style={styles.userTexts}>
            {recipient ? (
                <Text style={styles.username} numberOfLines={1}>{recipient?.username || 'Loading...'}</Text>
            ) : (
                 <View style={{ width: 120, height: 18, backgroundColor: Colors.common.gray[300], marginBottom: 4 }} />
            )}
            {recipient ? (
                 <Text style={styles.status}>
                   {/* Display online status, maybe add last active timestamp if offline */}
                   {recipient.isOnline ? 'Online' : 'Offline'}
                 </Text>
            ) : (
                 <View style={{ width: 80, height: 14, backgroundColor: Colors.common.gray[300] }} />
            )}
          </View>
        </TouchableOpacity>
        {/* TODO: Add more header icons like video call, call etc. here */}
      </View>

      {/* Content Area (Messages and Input) */}
      <KeyboardAvoidingView
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // Adjust as needed based on your header height
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Conditional Rendering for Loading, Empty State, or Messages List */}
        {loading ? (
             <View style={styles.loadingOverlay}>
               <ActivityIndicator size="large" color={Colors.primary[500]} />
             </View>
        ) : isEmpty ? (
            <EmptyState type="messages" />
        ) : (
            <FlatList
              ref={flatListRef}
              data={currentChatMessages} // Use the filtered messages for this chat
              renderItem={renderMessage}
              // Use a robust key extractor, prioritizing _id, then id, then tempId, then a unique fallback
              keyExtractor={(item) => item._id || item.id || item.tempId || item.createdAt?.toString() || Math.random().toString()}
              contentContainerStyle={styles.messagesContainer}
              // inverted={true} // Uncomment and adjust logic if you want newest at top
            />
         )}


        {/* Input Container */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={handleSendImage}>
            <Plus size={24} color={Colors.common.gray[600]} />
          </TouchableOpacity>

          {/* Message Input Field */}
          <TextInput
            style={styles.input}
            placeholder={isConnected ? "Type a message..." : "Connecting..."} // Indicate connection status
            placeholderTextColor={Colors.common.gray[500]}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            underlineColorAndroid="transparent"
            textAlignVertical="center"
            // Disable input if sending or if the socket is NOT connected
            editable={!sending && isConnected}
          />

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              // Apply disabled styles if input is empty, sending, or socket is NOT connected
              (!messageText.trim() || sending || !isConnected) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            // Disable button based on the same conditions
            disabled={!messageText.trim() || sending || !isConnected}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.common.white} />
            ) : (
              <Send size={20} color={Colors.common.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


// --- Stylesheet ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background, // Use background color from constants
  },
  // Style for loading indicator overlay
   loadingOverlay: {
    ...StyleSheet.absoluteFillObject, // Position over the entire screen
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent white background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Ensure it appears above other content
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.common.white, // Use white color from constants
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[200], // Use gray color from constants
    zIndex: 10, // Give header a higher zIndex if needed (e.g., above loading overlay)
  },
  backButton: {
    marginRight: 16,
  },
  userInfo: {
    flex: 1, // Take available space
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTexts: {
    marginLeft: 12,
    flexShrink: 1, // Allow text to shrink to prevent overflow
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.common.gray[900], // Use gray color from constants
    fontFamily: 'Inter-SemiBold', // Use font from assets
  },
  status: {
    fontSize: 12,
    color: Colors.common.gray[500], // Use gray color from constants
    fontFamily: 'Inter-Regular', // Use font from assets
  },
  content: {
    flex: 1, // Take available space
  },
  messagesContainer: {
    padding: 16, // Padding around messages
     flexGrow: 1, // Allows content to grow to fill space when list is short
     justifyContent: 'flex-end', // Aligns content to the bottom if list is short
  },
  // emptyMessages: { // Style for empty state container (consider removing if EmptyState is rendered directly)
  //   flex: 1,
  //   justifyContent: 'center',
  // },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: Colors.common.white, // Use white color from constants
    borderTopWidth: 1,
    borderTopColor: Colors.common.gray[200], // Use gray color from constants
    alignItems: 'flex-end', // Align items to the bottom (good for multiline input)
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Make it round
    backgroundColor: Colors.common.gray[100], // Light gray background
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4, // Adjust margin for bottom alignment
  },
  input: {
    flex: 1, // Take available space
    minHeight: 40, // Minimum height for input
    maxHeight: 120, // Maximum height before scrolling
    backgroundColor: Colors.common.gray[100], // Light gray background
    borderRadius: 20, // Rounded corners
    paddingHorizontal: 16, // Horizontal padding
    paddingVertical: Platform.OS === 'ios' ? 10 : 8, // Adjust vertical padding based on platform
    fontSize: 16,
    fontFamily: 'Inter-Regular', // Use font from assets
    lineHeight: 20, // Set line height for better multiline appearance
    color: Colors.common.gray[800], // Text color
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Make it round
    backgroundColor: Colors.primary[500], // Primary color background
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 4, // Adjust margin for bottom alignment
  },
  sendButtonDisabled: {
    backgroundColor: Colors.primary[300], // Lighter primary color when disabled
  },
});