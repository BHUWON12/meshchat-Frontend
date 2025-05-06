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
import { Audio } from 'expo-av'; // Import Audio for sound

// Correctly import services using the aliases from services/index.ts
import { chatsApi, messagesApi } from '../../../../services/index';

import { useAuth } from '../../../../context/AuthContext';
// Import the full useSocket context
import { useSocket } from '../../../../context/SocketContext';
// Import MessageContext to access global message state and update functions
import { useMessages } from '../../../../context/MessageContext';
import Colors from '../../../../constants/Colors';

// Adjust component import paths based on your structure
import UserAvatar from '../../../../components/UserAvatar';
import ChatBubble from '../../../../components/ChatBubble';
import EmptyState from '../../../../components/EmptyState';

import { isOwnMessage } from '../../../../utils/helpers'; // Adjust the import path as needed
// No need to import API_URL here if socket is managed in context

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  // Access the socket context value including functions to emit events
  const { socket, isConnected, sendMessage: sendSocketMessage, markMessageAsRead, isOnlineMode } = useSocket();
  // Access MessageContext state (messages object) and state update functions (setters)
  // Note: 'messages' here is the object { chatId: messages[] } from MessageContext
  const { messages: globalMessagesObject, fetchMessages, setUserOnlineStatus, updateMessageReadStatus } = useMessages?.() || {};
  const router = useRouter();

  // Consider managing chat and recipient state locally, but messages ideally globally
  const [chat, setChat] = useState<any>(null);
  // Removed local messages state, we now derive from globalMessagesObject
  // const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [recipient, setRecipient] = useState<any>(null);

  // State for messages specific to *this* chat, filtered/derived from globalMessagesObject
  const [currentChatMessages, setCurrentChatMessages] = useState<any[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const chatSoundRef = useRef<Audio.Sound | null>(null); // Ref for chat sound instance

  // --- Sound Loading ---
  // Load the chat sound once when the component mounts
  useEffect(() => {
    async function loadSound() {
      try {
        // !!! VERIFY THIS PATH IS CORRECT RELATIVE TO THIS FILE !!!
        const { sound } = await Audio.Sound.createAsync(require("../../../../assets/sounds/chat.mp3"));
        chatSoundRef.current = sound;
        console.log("ChatScreen: Chat sound loaded.");
      } catch (error) {
        console.error('ChatScreen: Error loading chat sound:', error);
      }
    }
    loadSound();

    // Cleanup function to unload sound
    return () => {
      console.log("ChatScreen: Unloading chat sound.");
      chatSoundRef.current?.unloadAsync();
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // --- Fetch chat details and messages ---
  // Use useFocusEffect to refetch when the screen comes into focus (good for tabs/navigation)
  useFocusEffect(
    useCallback(() => {
      const fetchChatDetails = async () => {
        try {
          setLoading(true);
          const currentUserId = user?._id || user?.id;

          if (!id || !currentUserId) {
              console.warn("ChatScreen: Chat ID or User ID is missing, cannot fetch chat details.");
              setLoading(false);
              return; // Exit if prerequisites are not met
          }

          console.log(`ChatScreen: Fetching details for chat ID: ${id}`);
          // Fetch chat details via REST API
          const chatResponse = await chatsApi.getChat(id, currentUserId);
          setChat(chatResponse); // Set the mapped chat object

          // Find recipient from the fetched chatResponse object
          if (chatResponse && chatResponse.participants) {
            const otherUser = chatResponse.participants.find(
              (p: any) => (p._id || p.id) !== currentUserId
            );
            setRecipient(otherUser);
             console.log("ChatScreen: Recipient identified:", otherUser?.username);
          }

          // Fetch initial messages for this chat via REST API (handled by MessageContext)
           console.log(`ChatScreen: Calling fetchMessages from MessageContext for chat ID: ${id}`);
           fetchMessages?.(id); // Call fetchMessages from MessageContext if available


          // Join chat room via socket *after* essential data is fetched and component is mounted
          // Ensure socket is connected and we have a valid chat ID
          if (socket && isConnected && id) {
            console.log(`ChatScreen: Emitting 'join-chat' for chatId: ${id}`);
            socket.emit('join-chat', id);
          }

        } catch (error) {
          console.error('ChatScreen: Error fetching chat details:', error);
          // TODO: Optionally set an error state to display in the UI
        } finally {
          setLoading(false); // Clear loading state
        }
      };

      fetchChatDetails(); // Call the fetch function

      // Optional cleanup: Emit 'leave-chat' when the screen goes out of focus
       return () => {
         if (socket && isConnected && id) {
           console.log(`ChatScreen: Emitting 'leave-chat' for chatId: ${id}`);
           socket.emit('leave-chat', id);
         }
       };

    }, [id, user, socket, isConnected, fetchMessages]) // Dependencies for useCallback: rerun if these change
  );

    // --- Derive messages for the current chat from the global messages object ---
    // This effect updates currentChatMessages whenever the global messages object or chat ID changes
    useEffect(() => {
        console.log("ChatScreen: Running effect to filter messages for current chat.");
        // Check if the global messages object exists and if there's an array for the current chat ID
        if (globalMessagesObject && id && globalMessagesObject[id]) {
            // Access the specific messages array for this chat ID
            // Sort messages by timestamp/createdAt to ensure correct order
            const messagesForCurrentChat = globalMessagesObject[id].sort((a, b) =>
                 new Date(a.createdAt || a.timestamp).getTime() - new Date(b.createdAt || b.timestamp).getTime()
            );
            setCurrentChatMessages(messagesForCurrentChat); // Set the filtered and sorted messages
            console.log(`ChatScreen: Found ${messagesForCurrentChat.length} messages for chat ${id}.`);
        } else {
             // Clear messages if no global messages object, no chat ID, or no messages for this chat
             console.log(`ChatScreen: No messages found for chat ${id} or global messages object is empty.`);
            setCurrentChatMessages([]);
        }
        // This effect depends on the globalMessagesObject from MessageContext and the current 'id'
    }, [globalMessagesObject, id]); // Rerun when global messages object or chat ID changes


  // --- Socket Listeners specific to the Chat Screen (for UI updates like status) ---
  // Note: Primary data state updates (new message added, read status changed, online status)
  // are handled by AppEventListeners which listens globally and updates MessageContext.
  // This effect *could* be used for specific UI reactions not handled by state derivation.
  // However, playing sound and marking as read based on *this* screen being open is needed here.

  useEffect(() => {
      // Only set up listeners if socket is available, we have a chat ID, and user
      if (!socket || !id || !user || !chatSoundRef.current || !markMessageAsRead) {
          console.log("ChatScreen: Prerequisites missing for chat screen listeners setup. Skipping.");
          return;
      }

      const currentUserId = user._id || user.id;

      // Listener for incoming messages (primary handling is in AppEventListeners, but sound and mark-as-read are specific to UI)
      const onNewMessage = async (message: any) => {
          console.log('ChatScreen: Received new message event (local listener).', message);
          // Check if the received message belongs to the current chat being viewed
          if (message.chatId === id) {
               console.log(`ChatScreen: New message ${message._id} is for the current chat.`);
              // AppEventListeners already adds this message to the global state,
              // which will trigger the effect above to update currentChatMessages.

              // Play chat sound *only* if it's not our own message AND the sound is loaded
              if (!isOwnMessage(message, currentUserId) && chatSoundRef.current) {
                console.log('ChatScreen: Playing chat sound...');
                try {
                  await chatSoundRef.current.replayAsync(); // Use replayAsync to play the sound immediately
                } catch (error) {
                  console.error('ChatScreen: Error playing chat sound:', error);
                }
              }

              // Mark message as read via socket if it's not our own and has a valid ID
              // Ensure markMessageAsRead function exists from useSocket context
              if (!isOwnMessage(message, currentUserId) && (message._id || message.id)) { // Check for _id or id
                 console.log(`ChatScreen: Marking message ${message._id || message.id} as read via socket.`);
                 markMessageAsRead(message._id || message.id); // Use the socket context function
              }
          } else {
               console.log(`ChatScreen: Received message ${message._id} is NOT for the current chat ${id}.`);
               // If the message is NOT for this chat, the global listener in AppEventListeners
               // should handle updating the global state and potentially showing a notification (e.g., toast, badge).
          }
      };


      // --- Add Listeners specific to this Chat Screen ---
      // We only need the 'new-message' listener here for sound/mark-as-read logic specific to the UI
      // User online status updates for the recipient are also handled here directly.
       socket.on('new-message', onNewMessage);


       // --- Listener for recipient online status updates ---
       // Update the local recipient state when their online status changes
       // Note: AppEventListeners also updates the global state, but updating local recipient state is good for immediate UI reaction
      const onUserStatusChange = (statusUpdate: { userId: string, isOnline: boolean }) => {
          if (recipient && (recipient._id === statusUpdate.userId || recipient.id === statusUpdate.userId)) {
              console.log(`ChatScreen: Recipient ${statusUpdate.userId} status changed to ${statusUpdate.isOnline}. Updating local state.`);
              // Update the local recipient state with the new online status
              setRecipient(prev => ({ ...prev, isOnline: statusUpdate.isOnline }));
          }
      };
      // Listen for general user online/offline events that might affect the recipient
      // Assumes backend emits user-online/user-offline with userId
      socket.on('user-online', onUserStatusChange);
      socket.on('user-offline', onUserStatusChange);


      // Clean up listeners when component unmounts or dependencies change
      return () => {
        console.log("ChatScreen: Running cleanup for local socket listeners.");
        // Remove specific listeners using the function reference
        socket.off('new-message', onNewMessage);
        socket.off('user-online', onUserStatusChange);
        socket.off('user-offline', onUserStatusChange);
        // Note: 'leave-chat' is emitted in the useFocusEffect cleanup
      };

      // Dependencies for the effect: rerun when socket, id, user, sound, markAsRead, or recipient changes
    }, [socket, id, user, chatSoundRef.current, markMessageAsRead, recipient, updateMessageReadStatus]); // Added updateMessageReadStatus if it's a dependency of markMessageAsRead internal logic


    // Scroll to bottom on new messages in the current chat
    useEffect(() => {
      // Check if currentChatMessages has data and flatListRef is available
      if (currentChatMessages.length > 0 && flatListRef.current) {
         // Use a small timeout to allow the FlatList to render the new message before scrolling
         // You might add logic here to only auto-scroll if the user is already near the bottom
         setTimeout(() => {
             console.log("ChatScreen: Scrolling to end.");
             flatListRef.current?.scrollToEnd({ animated: true });
         }, 50); // Short delay
      }
       console.log("ChatScreen: messages state updated, possibly triggering scroll.");
    }, [currentChatMessages]); // Trigger scroll when the filtered messages array changes

  // Send text message function using socket
  // Send text message function using socket
  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = messageText.trim();
    const currentUserId = user?._id || user?.id;

    // Add checks for required data and active socket connection before sending
    if (!trimmedMessage || !id || !currentUserId || !socket || !isConnected) {
        console.warn("ChatScreen: Cannot send message: missing data or socket not connected.");
        // TODO: Optionally use useToast() to show feedback
        return; // Exit if prerequisites are not met
    }

    try {
      setSending(true); // Indicate that message sending is in progress

      // Construct a temporary message object for optimistic UI update
      // Use a temporary client-side ID that you expect the backend to send back
      const tempMessageId = `temp-${Date.now()}-${Math.random()}`;
      const tempMessageForUI = {
          // Use the temporary ID for optimistic display
          _id: tempMessageId, // Using _id to match backend expected structure
          id: tempMessageId, // Also keep id for consistency if used elsewhere
          chatId: id,
          sender: { // Structure sender info as your ChatBubble component expects
             _id: currentUserId,
             username: user?.username || 'You', // Use optional chaining for safety
             avatar: user?.avatar,
             // Include other sender info if needed by ChatBubble (e.g., color)
          },
          content: trimmedMessage,
          type: 'text',
          // Add a client-side timestamp
          createdAt: new Date().toISOString(),
          timestamp: new Date(), // Keep both if needed downstream
          // Set initial status to pending
          status: 'pending' as DeliveryStatus, // e.g., 'pending', 'delivered', 'read', 'failed'
          // Optimistically mark as read by the sender (might be overwritten by backend/message-read event)
          readBy: [{ readerId: currentUserId, readAt: new Date().toISOString() }],
          // Include the temporary ID explicitly for backend acknowledgment
          tempId: tempMessageId, // Pass tempId in optimistic object
      };

      // Optimistically add the temporary message to the *local* state for the current chat
      // This provides instant feedback. AppEventListeners handles adding the real message to global state later.
      setCurrentChatMessages(prev => [...prev, tempMessageForUI]); // <-- Use setCurrentChatMessages here
      console.log(`ChatScreen: Optimistically added message ${tempMessageForUI._id} to local state.`);

      // Clear the input field immediately after showing the optimistic message
      setMessageText('');
      Keyboard.dismiss(); // Dismiss the keyboard

      // Construct the message payload to be sent via the socket
      const messagePayloadForBackend = {
           chatId: id,
           content: trimmedMessage,
           type: 'text',
           // Include metadata like caption if applicable for other message types
           metadata: { /* caption */ },
           tempId: tempMessageId // <-- Include temporary ID for backend reference (Crucial!)
       };


      console.log("ChatScreen: Emitting 'send-message' via useSocket().sendMessage...", messagePayloadForBackend);
      // Emit the 'send-message' event via the socket using the useSocket hook function
      // Include a callback function to handle acknowledgment from the backend
      sendSocketMessage(messagePayloadForBackend, (response: any) => {
          // This callback is executed when the backend acknowledges receiving/processing the message
          console.log('ChatScreen: Backend acknowledgment received for message:', response);
          setSending(false); // Set sending to false after acknowledgment is received

          if (response?.status === 'success') {
              // Backend successfully processed and saved the message.
              // The 'new-message' event from the backend (handled by AppEventListeners)
              // will contain the final message object with the real _id and server timestamp.
              // AppEventListeners/MessageContext handles replacing the optimistic message
              // using the tempId in the *global* state.

              // Optional: Update the status of the optimistic message in the *local* state
              // This provides immediate visual feedback on the UI before the global state syncs.
               setCurrentChatMessages(prev =>
                   prev.map(msg =>
                       // Find the message by its temporary ID in the local state
                       (msg._id === tempMessageForUI._id || msg.id === tempMessageForUI.id) && msg.status === 'pending'
                           ? {
                               // Merge with real data if available (though AppEventListeners should handle replacement)
                               ...(response.message || msg),
                               // Explicitly set status to 'sent' or 'delivered' based on acknowledgment
                               status: 'sent' as DeliveryStatus,
                               // Use the real _id from the backend if available, otherwise keep tempId
                               _id: response.message?._id || msg._id,
                               id: response.message?.id || msg.id, // Update id as well if needed
                           }
                           : msg // Keep other messages as they are
                   )
                );
               console.log(`ChatScreen: Optimistic message ${tempMessageForUI.id} status updated to 'sent' based on acknowledgment in local state.`);

          } else {
              // Backend returned an error (e.g., validation failed)
              console.error('ChatScreen: Failed to send message (backend acknowledgment):', response?.message || 'Unknown error');
              // Update the status of the optimistically added message to 'failed' in the *local* state
               setCurrentChatMessages(prev =>
                   prev.map(msg =>
                       // Find the message by its temporary ID and status 'pending'
                       (msg._id === tempMessageForUI._id || msg.id === tempMessageForUI.id) && msg.status === 'pending'
                           ? { ...msg, status: 'failed' as DeliveryStatus } // Update status to 'failed'
                           : msg
                   )
                );
               // TODO: Optionally use useToast() to show an error message
               // showToast?.(`Failed to send message: ${response.message || 'Server error'}`);
          }
      });

      // Do NOT set sending(false) or clear input immediately after emit.
      // Do it inside the socket callback (or a timeout if no callback).

    } catch (error) {
      // Handle client-side error before emitting via socket (e.g., network down, code error)
      console.error('ChatScreen: Client-side error sending message:', error);
      setSending(false); // Stop the sending indicator

      // If the optimistic message was added, update its status to failed in the *local* state
       setCurrentChatMessages(prev =>
           prev.map(msg =>
               // Find the message by its temporary ID and status 'pending'
               (msg._id === tempMessageForUI._id || msg.id === tempMessageForUI.id) && msg.status === 'pending'
                   ? { ...msg, status: 'failed' as DeliveryStatus } // Update status to 'failed'
                   : msg
           )
        );
        // TODO: Optionally use useToast() to show an error message
        // showToast?.("Error sending message due to app issue.");
    }
  }, [messageText, id, user, socket, isConnected, sendSocketMessage]); // Dependencies
  // Note: Added messageText as dependency for useCallback
  // Removed setMessages from dependencies as it's not used in this function anymore // Added dependencies


  // Send image message (mocked) - Keep as is for now, real implementation needs file upload
  const handleSendImage = async () => {
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
      }
    } catch (error) {
      console.error('ChatScreen: Error picking image:', error);
    }
  };

  // Render message item for FlatList
  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    // Ensure message sender ID is compared correctly against current user's ID
    const isOwn = isOwnMessage(item, user?._id || user?.id || '');
    // Use currentChatMessages for checking the previous message in the *rendered* list
    const prevMessage = currentChatMessages[index - 1];
    // Check if the previous message is from the same user (owned or not) to determine if avatar is needed
    const isConsecutive = index > 0 && isOwnMessage(prevMessage, user?._id || user?.id || '') === isOwn;

    // Find the actual sender object from item.sender or determine if it's current user/recipient
    // item.sender should be populated by backend or structured correctly by optimistic update
    // Fallback to local user/recipient if item.sender is just an ID or missing properties
    const senderInfo = item.sender && (item.sender._id || item.sender.id) ? item.sender : (isOwn ? user : recipient);

    return (
      <ChatBubble
        message={item} // Pass the message object
        isOwn={isOwn} // Is this message from the current user?
        // Show avatar if it's not a consecutive message from the same user
        // For recipient's messages, show avatar always if not consecutive.
        // For own messages, show only if not consecutive.
        showAvatar={!isConsecutive} // Show avatar for recipient's messages always if not consecutive, and for own if not consecutive
        isConsecutive={isConsecutive} // Is this message immediately after one from the same sender?
        // Pass sender info to ChatBubble if it needs avatar/name/etc.
        sender={senderInfo}
      />
    );
  };

  // Determine if the chat is empty (only after initial loading)
  const isEmpty = currentChatMessages.length === 0 && !loading;

  // The main render function for the Chat Screen
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

        {/* Recipient Info (UserAvatar and Text) */}
        <TouchableOpacity style={styles.userInfo} onPress={() => { /* TODO: Navigate to recipient profile? */ }}>
          {/* Ensure recipient object exists before accessing properties */}
          {recipient ? (
            <UserAvatar
              uri={recipient?.avatar}
              name={recipient?.username}
              size={36}
              showStatus // Assuming UserAvatar component can show online status
              isOnline={recipient?.isOnline} // Pass the recipient's online status
            />
          ) : (
             // Placeholder or empty view while recipient loads
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.common.gray[300] }} />
          )}
          <View style={styles.userTexts}>
            {recipient ? (
                <Text style={styles.username} numberOfLines={1}>{recipient?.username || '...'}</Text>
            ) : (
                 // Placeholder text while recipient loads
                 <View style={{ width: 120, height: 18, backgroundColor: Colors.common.gray[300], marginBottom: 4 }} />
            )}
            {recipient ? (
                 <Text style={styles.status}>
                    {/* Display online status, maybe add last active timestamp if offline */}
                   {recipient.isOnline ? 'Online' : 'Offline'}
                 </Text>
            ) : (
                 // Placeholder status while recipient loads
                 <View style={{ width: 80, height: 14, backgroundColor: Colors.common.gray[300] }} />
            )}
          </View>
        </TouchableOpacity>
        {/* TODO: Add more header icons like video call, call etc. here */}
      </View>

      {/* Content Area (Messages and Input) */}
      <KeyboardAvoidingView
        style={styles.content}
        // Adjust offset based on header height and potentially tab bar height if applicable
        // Fine-tune keyboardVerticalOffset based on your UI layout
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Use 'height' on Android for better behavior
      >
        {/* Conditional Rendering for Loading, Empty State, or Messages List */}
        {loading ? (
             // Show a loading overlay while initial data is being fetched
             <View style={styles.loadingOverlay}>
               <ActivityIndicator size="large" color={Colors.primary[500]} />
             </View>
        ) : isEmpty ? (
            // Show empty state if there are no messages after loading
            <EmptyState type="messages" />
        ) : (
            // Render the message list using FlatList
            <FlatList
              ref={flatListRef} // Attach ref for scrolling
              data={currentChatMessages} // Use the filtered messages for this chat
              renderItem={renderMessage} // Render each message using ChatBubble
              // Use a robust key extractor, prioritizing _id, then id, then a unique fallback
              keyExtractor={(item) => item._id || item.id || item.createdAt?.toString() || Math.random().toString()}
              contentContainerStyle={styles.messagesContainer} // Apply styles for padding and layout
              // inverted={true} // Uncomment and adjust message loading/display if you want newest at bottom
              // onEndReached={} // Implement pagination to load older messages when scrolling up
              // onEndReachedThreshold={0.5}
            />
         )}


        {/* Input Container (Message Input Field and Send Button) */}
        <View style={styles.inputContainer}>
          {/* Attach Button (for images, files, etc.) */}
          <TouchableOpacity style={styles.attachButton} onPress={handleSendImage}>
            <Plus size={24} color={Colors.common.gray[600]} />
            {/* Or use ImageIcon here depending on desired icon */}
          </TouchableOpacity>

          {/* Message Input Field */}
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.common.gray[500]} // Set placeholder color
            value={messageText}
            onChangeText={setMessageText}
            multiline // Allow multiple lines of text
            maxLength={1000} // Optional: Set max length for input
            underlineColorAndroid="transparent" // For Android styling to remove underline
            textAlignVertical="center" // Vertically align text input content on Android
            // Disable input while sending or if the socket is not connected
            editable={!sending && isConnected}
          />

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              // Apply disabled styles if input is empty, sending, or socket is not connected
              (!messageText.trim() || sending || !isConnected) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            // Disable button based on the same conditions
            disabled={!messageText.trim() || sending || !isConnected}
          >
            {sending ? (
              // Show activity indicator while sending
              <ActivityIndicator size="small" color={Colors.common.white} />
            ) : (
              // Show send icon
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