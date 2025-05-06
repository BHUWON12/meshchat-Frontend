import React, { useState, useEffect, useRef } from 'react';
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
  Alert, // Import Alert for the image picker mock
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Plus, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

// FIX: Correctly import services using the aliases from services/index.ts
import { chatsApi, messagesApi } from '../../../../services/index';

import { useAuth } from '../../../../context/AuthContext';
import { useSocket } from '../../../../context/SocketContext';
import Colors from '../../../../constants/Colors';
// FIX: Adjust component import paths based on the previous refactoring suggestion
// Assuming these components were moved to components/common
import UserAvatar from '../../../../components/UserAvatar';
import ChatBubble from '../../../../components/ChatBubble';
import EmptyState from '../../../../components/EmptyState';

import { isOwnMessage } from '../../../../utils/helpers'; // Adjust the import path as needed

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  // Assuming sendMessage from useSocket is designed to emit the message via socket
  const { socket, isConnected, sendMessage: sendSocketMessage } = useSocket();
  const router = useRouter();

  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [recipient, setRecipient] = useState<any>(null);

  const flatListRef = useRef<FlatList>(null);

  // Fetch chat details and messages
  const fetchChatDetails = async () => {
    try {
      setLoading(true);
      // FIX: Use chatsApi and the correct function name from services/chats.ts (getChat)
      // Also pass the currentUserId as required by your getChat function
      const chatResponse = await chatsApi.getChat(id, user?._id || ''); // Ensure user?._id is passed

      // FIX: Use messagesApi and the correct function name from services/messages.ts (getMessages)
      const messagesResponse = await messagesApi.getMessages(id);

      // Assuming chatResponse.data is the chat object as per your mapChatResponse
      setChat(chatResponse); // Set the mapped chat object directly
      // Assuming messagesResponse is the array of messages as per your getMessages function return
      setMessages(messagesResponse || []); // Set the array of messages

      // Find recipient from the fetched chatResponse object
      if (chatResponse && chatResponse.participants) {
        const currentUserId = user?._id || user?.id; // Use either _id or id for comparison
        const otherUser = chatResponse.participants.find(
          (p: any) => (p._id || p.id) !== currentUserId
        );
        setRecipient(otherUser);
      }

      // Join chat room
      if (socket && isConnected) {
        socket.emit('join-chat', id);
      }
    } catch (error) {
      console.error('Error fetching chat details:', error);
      // Optionally set an error state to display in the UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchChatDetails();
    }
    // Add user dependency if fetchChatDetails relies on user being available
  }, [id, user]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    // Ensure the event listener is only added once
    const onNewMessage = (message: any) => {
      console.log('Received new message:', message);
      if (message.chatId === id) {
        // Add the new message to the state and ensure it has a timestamp
         const messageWithTimestamp = {
             ...message,
             timestamp: new Date(message.createdAt || message.timestamp || Date.now()),
         };
        setMessages(prev => [...prev, messageWithTimestamp]);

        // Mark message as read if it's not our own
        if (!isOwnMessage(message, user?._id || user?.id || '')) {
           // Assuming your socket context or a separate service handles marking as read via socket
           // Or you might need to use the REST API here if socket isn't for marking read
           messagesApi.markMessageRead(message._id || message.id).catch(console.error);
        }
      }
    };

    socket.on('new-message', onNewMessage);

    // Clean up listeners
    return () => {
      socket.off('new-message', onNewMessage);
      // You might also want to emit a 'leave-chat' event here
      if (socket && isConnected) {
         socket.emit('leave-chat', id);
      }
    };
    // Add socket and id as dependencies
  }, [socket, id, user, isConnected, messagesApi]); // Add messagesApi as dependency if used inside effect


  // Send text message
  const handleSendMessage = async () => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || !id || !user) return;

    try {
      setSending(true);

      // Construct the message payload
      const messagePayload = {
         content: trimmedMessage,
         type: 'text',
         chatId: id, // Include chatId in the payload
         // Add sender info if needed by the backend socket handler
         sender: {
             _id: user._id || user.id,
             username: user.username, // Or other relevant user info
         },
         createdAt: new Date().toISOString(), // Client-side timestamp for immediate display
         // Add a temporary _id for optimistic updates if needed
         _id: `temp-${Date.now()}-${Math.random()}`,
      };


      if (socket && isConnected) {
        // Send via socket
        // Assuming sendSocketMessage function in your useSocket context handles emitting the message
        sendSocketMessage(messagePayload); // Use the function provided by SocketContext

        // Optimistically update the UI
        // Add the message with a temporary ID, it will be replaced by the real message from the 'new-message' event
        setMessages(prev => [...prev, {...messagePayload, sender: user}]); // Assuming sender structure matches ChatBubble expectation

      } else {
        // Send via REST API
        // FIX: Use messagesApi and the correct function name from services/messages.ts (sendMessage)
        const newMessage = await messagesApi.sendMessage(id, {
          content: trimmedMessage,
          type: 'text',
        });
        // Update state with the actual message from the backend if not using socket
        setMessages(prev => [...prev, newMessage]);
      }

      // Clear input
      setMessageText('');
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally display an error to the user
    } finally {
      setSending(false);
    }
  };

  // Send image message (mocked)
  const handleSendImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // In a real app, you would upload the image to a server here
        // and then send the message with the image URL

        // For now, we'll just mock it
        Alert.alert('Feature not available', 'Image sharing will be implemented in a future update.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    // Use setTimeout to ensure the FlatList has rendered the new message before scrolling
    if (messages.length > 0 && flatListRef.current) {
       setTimeout(() => {
           flatListRef.current?.scrollToEnd({ animated: true });
       }, 100); // Small delay
    }
  }, [messages]); // Scroll when messages array changes

  // Render message item
  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    // Ensure message sender ID is compared correctly against current user's ID
    const isOwn = isOwnMessage(item, user?._id || user?.id || '');
    const prevMessage = messages[index - 1];
    const isConsecutive = index > 0 && isOwnMessage(prevMessage, user?._id || user?.id || '') === isOwn;

    return (
      <ChatBubble
        message={item}
        isOwn={isOwn}
        // Only show avatar if it's not a consecutive message from the same user and it's not the current user's message
        showAvatar={!isConsecutive && !isOwn}
        isConsecutive={isConsecutive}
        // Pass sender info if needed for avatar/name in ChatBubble
        sender={item.sender}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </SafeAreaView>
    );
  }

   // Optional: Show empty state even if not strictly in the center
   if (messages.length === 0 && !loading) {
       // You might render the header and input bar, with EmptyState in the middle
   }


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.common.gray[800]} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.userInfo} onPress={() => { /* Navigate to recipient profile? */ }}>
          <UserAvatar
            uri={recipient?.avatar}
            name={recipient?.username}
            size={36}
            showStatus
            isOnline={recipient?.isOnline} // Assuming recipient object has isOnline property
          />
          <View style={styles.userTexts}>
            <Text style={styles.username}>{recipient?.username || 'Loading...'}</Text>
            <Text style={styles.status}>
              {recipient ? (recipient.isOnline ? 'Online' : 'Offline') : '...'}
            </Text>
          </View>
        </TouchableOpacity>
        {/* Add more header icons like video call, call etc. here */}
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Use 'height' on Android
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // Adjust offset as needed
      >
        {/* Render EmptyState directly if no messages */}
        {messages.length === 0 && !loading ? (
            <EmptyState type="messages" />
        ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item._id || item.id || item.createdAt} // Use a robust key
              contentContainerStyle={styles.messagesContainer}
              // Invert the list if you want newest messages at the bottom and load older on scroll up
              // inverted={true}
              // onEndReached={} // Implement pagination if needed
              // onEndReachedThreshold={0.5}
            />
         )}


        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={handleSendImage}>
            <Plus size={24} color={Colors.common.gray[600]} />
            {/* Or maybe ImageIcon here depending on desired icon */}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            underlineColorAndroid="transparent" // For Android TextInput style
            textAlignVertical="center" // Vertically align text on Android
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
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


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.common.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[200],
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
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: Colors.common.white,
    borderTopWidth: 1,
    borderTopColor: Colors.common.gray[200],
    alignItems: 'center',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.common.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: Colors.common.gray[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.primary[300],
  },
});