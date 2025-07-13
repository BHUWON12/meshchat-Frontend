// frontend/chat/[id].tsx
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
import { ArrowLeft, Send, Plus, Image as ImageIcon, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
// Check if Audio is available before importing or using
import * as Audio from 'expo-av'; // Use expo-av for consistency, expo-audio might be deprecated or an alias


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
  const { socket, isConnected, sendMessage: sendSocketMessage, markMessageAsRead, isOnlineMode } = useSocket?.() || {}; // Use optional chaining
  // Access MessageContext state (messages object) and state update functions (setters)
  const { messages: globalMessagesObject, fetchMessages, setUserOnlineStatus, updateMessageReadStatus } = useMessages?.() || {}; // Use optional chaining
  // Access ToastContext
  const { showToast } = useToast?.() || {}; // Use optional chaining

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Derived state
  const isEmpty = !loading && currentChatMessages.length === 0;

  // --- Sound Loading ---
  useEffect(() => {
    async function loadSound() {
      // FIX: Check if Audio and Audio.Sound are defined before using
      if (Audio && Audio.Sound) { // ADDED CHECK
          try {
            // Use require for local assets
            const { sound } = await Audio.Sound.createAsync(require("../../../assets/sounds/chat.mp3"));
            chatSoundRef.current = sound;
            console.log("ChatScreen: Chat sound loaded.");
          } catch (error) {
            console.error('ChatScreen: Error loading chat sound:', error);
          }
      } else {
           console.warn("ChatScreen: expo-av Audio.Sound not available. Skipping sound loading."); // ADDED WARNING
      }
    }
    loadSound();

    return () => {
      console.log("ChatScreen: Unloading chat sound.");
      chatSoundRef.current?.unloadAsync();
      chatSoundRef.current = null;
    };
  }, []); // Empty dependency array

  // --- Keyboard handling for auto-scroll ---
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      // Auto-scroll when keyboard appears
      setTimeout(() => {
        if (flatListRef.current && currentChatMessages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [currentChatMessages.length]);

  // --- Enhanced auto-scroll functionality ---
  const scrollToBottom = useCallback((animated = true) => {
    if (flatListRef.current && currentChatMessages.length > 0) {
      console.log("ChatScreen: Scrolling to bottom");
      flatListRef.current.scrollToEnd({ animated });
    }
  }, [currentChatMessages.length]);

  // Auto-scroll when new messages arrive - ALWAYS scroll for new messages
  useEffect(() => {
    if (currentChatMessages.length > 0) {
      // Use a small delay to ensure the message is rendered
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentChatMessages, scrollToBottom]);

  // Initial scroll to bottom when chat first loads
  useEffect(() => {
    if (!loading && currentChatMessages.length > 0 && flatListRef.current) {
      console.log("ChatScreen: Initial scroll to bottom");
      // Use a longer delay for initial load to ensure everything is rendered
      const timer = setTimeout(() => {
        scrollToBottom(false); // No animation for initial load
        setShouldAutoScroll(true); // Ensure auto-scroll is enabled
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [loading, currentChatMessages.length, scrollToBottom]);

  // Handle scroll events to determine if user is at bottom
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const paddingToBottom = 20; // Threshold for considering user at bottom
    
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom;
    setShouldAutoScroll(isAtBottom);
    setShowScrollToBottom(!isAtBottom && currentChatMessages.length > 5); // Show button if not at bottom and have enough messages
  }, [currentChatMessages.length]);

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
          // Assuming getChat service function is correct and returns chat object
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
          showToast?.("Failed to load chat.");
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

    }, [id, user, socket, isConnected, fetchMessages, showToast])
  );

  // Focus effect to scroll to bottom when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!loading && currentChatMessages.length > 0) {
        console.log("ChatScreen: Screen focused, scrolling to bottom");
        setShouldAutoScroll(true);
        setTimeout(() => scrollToBottom(false), 300);
      }
    }, [loading, currentChatMessages.length, scrollToBottom])
  );

    // --- Derive messages for the current chat from the global messages object ---
    useEffect(() => {
        console.log("ChatScreen: Running effect to filter messages for current chat.");
        if (globalMessagesObject && id && globalMessagesObject[id]) {
            const messagesForCurrentChat: ChatMessage[] = globalMessagesObject[id];
            const sortedMessages = messagesForCurrentChat.sort((a, b) =>
                 new Date(a.createdAt || a.timestamp || 0).getTime() - new Date(b.createdAt || b.timestamp || 0).getTime()
            );
            setCurrentChatMessages(sortedMessages);
            console.log(`ChatScreen: Found ${sortedMessages.length} messages for chat ${id}.`);
        } else {
             console.log(`ChatScreen: No messages found for chat ${id} or global messages object is empty.`);
            setCurrentChatMessages([]);
        }
    }, [globalMessagesObject, id]);


  // --- Socket Listeners specific to the Chat Screen (for UI updates like status, sound, mark as read) ---
  useEffect(() => {
      if (!socket || !id || !user || !chatSoundRef.current || !markMessageAsRead) {
          console.log("ChatScreen: Prerequisites missing for chat screen listeners setup. Skipping.");
          return;
      }

      const currentUserId = user._id || user.id;

      const onNewMessage = async (message: ChatMessage) => {
          console.log('ChatScreen: Received new message event (local listener).', message);
          if (message.chatId === id) {
               console.log(`ChatScreen: New message ${message._id || message.tempId} is for the current chat.`);

              // Play chat sound *only* if it's not our own message AND the sound is loaded AND Audio is available
              // FIX: Add Audio check before playing sound
              if (!isOwnMessage(message, currentUserId) && chatSoundRef.current && Audio && Audio.Sound) { // ADDED Audio check
                console.log('ChatScreen: Playing chat sound...');
                try {
                  await chatSoundRef.current.replayAsync();
                } catch (error) {
                  console.error('ChatScreen: Error playing chat sound:', error);
                }
              }

              if (!isOwnMessage(message, currentUserId) && message._id) {
                 console.log(`ChatScreen: Marking message ${message._id} as read via socket.`);
                 // Pass the chat ID as well
                 markMessageAsRead(message._id, id); // Ensure markMessageAsRead expects chatId
              }

              // Force auto-scroll for new incoming messages
              console.log('ChatScreen: New message received, forcing auto-scroll');
              setShouldAutoScroll(true);
              setTimeout(() => scrollToBottom(true), 150);
          } else {
               console.log(`ChatScreen: Received message ${message._id || message.tempId} is NOT for the current chat ${id}.`);
          }
      };


       const onUserStatusChange = (statusUpdate: { userId: string, isOnline: boolean }) => {
          if (recipient && (recipient._id === statusUpdate.userId || recipient.id === statusUpdate.userId)) {
              console.log(`ChatScreen: Recipient ${statusUpdate.userId} status changed to ${statusUpdate.isOnline}. Updating local state.`);
              setRecipient(prev => prev ? { ...prev, isOnline: statusUpdate.isOnline } : null);
          }
      };

       socket.on('new-message', onNewMessage);
       socket.on('user-online', onUserStatusChange);
       socket.on('user-offline', onUserStatusChange);


      return () => {
        console.log("ChatScreen: Running cleanup for local socket listeners.");
        socket.off('new-message', onNewMessage);
        socket.off('user-online', onUserStatusChange);
        socket.off('user-offline', onUserStatusChange);
      };

    }, [socket, id, user, chatSoundRef.current, markMessageAsRead, recipient, updateMessageReadStatus]);


  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = messageText.trim();
    const currentUserId = user?._id || user?.id;

    if (!trimmedMessage) {
         console.warn("ChatScreen: Cannot send message: Message text is empty.");
         return;
    }
     if (!id || !currentUserId) {
         console.warn("ChatScreen: Cannot send message: Chat ID or User ID is missing.");
         showToast?.("Failed to send message: User or chat missing.");
         return;
     }
    if (!socket || !isConnected) {
        console.warn("ChatScreen: Cannot send message: Socket not available or not connected.");
        showToast?.("Cannot send message: Not connected to server.");
        setSending(false);
        return;
    }


    try {
      setSending(true);

      const tempMessageId = `temp-${Date.now()}-${Math.random()}`;
      const tempMessageForUI: ChatMessage = {
          _id: tempMessageId,
          id: tempMessageId,
          chatId: id,
          sender: {
             _id: currentUserId,
             id: currentUserId,
             username: user?.username || 'You',
             avatar: user?.avatar,
          },
          content: trimmedMessage,
          type: 'text',
          createdAt: new Date().toISOString(),
          timestamp: new Date(),
          status: 'pending',
          readBy: [{ readerId: currentUserId, readAt: new Date().toISOString() }],
          tempId: tempMessageId,
      };

      setCurrentChatMessages(prev => [...prev, tempMessageForUI]);
      console.log(`ChatScreen: Optimistically added message ${tempMessageForUI._id} (tempId) to local state.`);

      setMessageText('');
      Keyboard.dismiss();

      // Force scroll to bottom for own messages
      setShouldAutoScroll(true);
      setTimeout(() => scrollToBottom(true), 50);

      const messagePayloadForBackend = {
           chatId: id,
           content: trimmedMessage,
           type: 'text',
           metadata: { /* caption */ },
           tempId: tempMessageId
       };


      console.log("ChatScreen: Emitting 'send-message' via useSocket().sendMessage...", messagePayloadForBackend);
      sendSocketMessage(messagePayloadForBackend, (response: any) => {
          console.log('ChatScreen: Backend acknowledgment received for message:', response);

          if (response?.status === 'success') {
              console.log(`ChatScreen: Message ${tempMessageId} successfully emitted and acknowledged by backend.`);
          } else {
              console.error('ChatScreen: Failed to send message (backend acknowledgment):', response?.message || 'Unknown acknowledgment error');
               setCurrentChatMessages(prev =>
                   prev.map(msg =>
                       (msg.tempId === tempMessageId && msg.status === 'pending')
                           ? { ...msg, status: 'failed' as DeliveryStatus }
                           : msg
                   )
                );
               showToast?.(`Failed to send message: ${response?.message || 'Server error'}`);
          }
          setSending(false);

      });

    } catch (error) {
      console.error('ChatScreen: Client-side error sending message:', error);
      setSending(false);
       setCurrentChatMessages(prev =>
           prev.map(msg =>
               (msg.tempId === tempMessageId && msg.status === 'pending')
                   ? { ...msg, status: 'failed' as DeliveryStatus }
                   : msg
           )
        );
       showToast?.("Error sending message due to app issue or network.");
    }
  }, [messageText, id, user, socket, isConnected, sendSocketMessage, showToast, setCurrentChatMessages, scrollToBottom]);


  const handleSendImage = async () => {
     if (!socket || !isConnected) {
        console.warn("ChatScreen: Cannot send image: Socket not available or not connected.");
        showToast?.("Cannot send image: Not connected to server.");
        return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        Alert.alert('Feature not available', 'Image sharing will be implemented in a future update.');
      }
    } catch (error) {
      console.error('ChatScreen: Error picking image:', error);
      showToast?.("Error picking image.");
    }
  };

  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const currentUserId = user?._id || user?.id || '';
    const isOwn = isOwnMessage(item, currentUserId);
    const prevMessage = currentChatMessages[index - 1];
    const isConsecutive = index > 0 && prevMessage !== undefined && isOwnMessage(prevMessage, currentUserId) === isOwn;

    const senderInfo = item.sender && (item.sender._id || item.sender.id) ? item.sender : (isOwn ? user : recipient);

    return (
      <ChatBubble
        message={item}
        isOwn={isOwn}
        isConsecutive={isConsecutive}
        senderInfo={senderInfo}
      />
    );
  }, [currentChatMessages, user, recipient]);

  // Memoize the keyExtractor function
  const keyExtractor = useCallback((item: ChatMessage) => {
    return item._id || item.id || item.tempId || item.createdAt?.toString() || Math.random().toString();
  }, []);

  // Memoize the getItemLayout function
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // Approximate height of each message
    offset: 80 * index,
    index,
  }), []);

  // Memoize the onContentSizeChange function
  const onContentSizeChange = useCallback(() => {
    if (shouldAutoScroll) {
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [shouldAutoScroll, scrollToBottom]);

  // Memoize the onLayout function
  const onLayout = useCallback(() => {
    if (shouldAutoScroll && currentChatMessages.length > 0) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [shouldAutoScroll, currentChatMessages.length, scrollToBottom]);

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
              showStatus
              isOnline={recipient?.isOnline}
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
                   {recipient.isOnline ? 'Online' : 'Offline'}
                 </Text>
            ) : (
                 <View style={{ width: 80, height: 14, backgroundColor: Colors.common.gray[300] }} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Content Area (Messages and Input) */}
      <KeyboardAvoidingView
        style={styles.content}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
            <View style={styles.messagesWrapper}>
              <FlatList
                ref={flatListRef}
                data={currentChatMessages}
                renderItem={renderMessage}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.messagesContainer}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
                initialNumToRender={10}
                getItemLayout={getItemLayout}
                onContentSizeChange={onContentSizeChange}
                onLayout={onLayout}
              />
              
              {/* Scroll to bottom button */}
              {showScrollToBottom && (
                <TouchableOpacity
                  style={styles.scrollToBottomButton}
                  onPress={() => {
                    setShouldAutoScroll(true);
                    scrollToBottom(true);
                  }}
                  activeOpacity={0.8}
                >
                  <ChevronDown size={20} color={Colors.common.white} />
                </TouchableOpacity>
              )}
            </View>
         )}


        {/* Input Container */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={handleSendImage}>
            <Plus size={24} color={Colors.common.gray[600]} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            placeholderTextColor={Colors.common.gray[500]}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            underlineColorAndroid="transparent"
            textAlignVertical="center"
            editable={!sending && isConnected}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending || !isConnected) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
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
    backgroundColor: Colors.light.background,
  },
   loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.common.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[200],
    zIndex: 10,
  },
  backButton: {
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTexts: {
    marginLeft: 12,
    flexShrink: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.common.gray[900],
    fontFamily: 'Inter-SemiBold',
  },
  status: {
    fontSize: 12,
    color: Colors.common.gray[500],
    fontFamily: 'Inter-Regular',
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
     flexGrow: 1,
     justifyContent: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: Colors.common.white,
    borderTopWidth: 1,
    borderTopColor: Colors.common.gray[200],
    alignItems: 'flex-end',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.common.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: Colors.common.gray[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    color: Colors.common.gray[800],
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.primary[300],
  },
  messagesWrapper: {
    position: 'relative',
    flex: 1,
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 80, // Adjust as needed, position it above the input area
    right: 20, // Adjust as needed, position it to the right of the input area
    backgroundColor: Colors.primary[500],
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
