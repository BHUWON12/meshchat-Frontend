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
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

// Import services
import { chatsApi, messagesApi } from '../../../../services/index';

import { useAuth } from '../../../../context/AuthContext';
import { useSocket } from '../../../../context/SocketContext';
import Colors from '../../../../constants/Colors';
import UserAvatar from '../../../../components/UserAvatar';
import ChatBubble from '../../../../components/ChatBubble';
import EmptyState from '../../../../components/EmptyState';

import { isOwnMessage } from '../../../../utils/helpers';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { socket, isConnected, sendMessage: sendSocketMessage } = useSocket();
  const router = useRouter();

  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [recipient, setRecipient] = useState<any>(null);
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(new Set());

  const flatListRef = useRef<FlatList>(null);

  // Fetch chat details and messages
  const fetchChatDetails = async () => {
    try {
      setLoading(true);
      const chatResponse = await chatsApi.getChat(id, user?._id || '');
      const messagesResponse = await messagesApi.getMessages(id);

      setChat(chatResponse);
      setMessages(messagesResponse || []);

      // Find recipient from the fetched chatResponse object
      if (chatResponse && chatResponse.participants) {
        const currentUserId = user?._id || user?.id;
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchChatDetails();
    }
  }, [id, user]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (message: any) => {
      console.log('Received new message:', message);
      if (message.chatId === id) {
        const messageId = message._id || message.id;

        // IMPORTANT: Check if this is a message we're already tracking as pending
        // If so, update the pending message rather than add a new one
        if (pendingMessages.has(messageId)) {
          setPendingMessages(prev => {
            const updated = new Set(prev);
            updated.delete(messageId);
            return updated;
          });
          
          // Update the message status rather than adding a duplicate
          setMessages(prev => prev.map(msg => 
            msg._id === messageId || msg.id === messageId ? 
              { ...message, timestamp: new Date(message.createdAt || message.timestamp || Date.now()) } : 
              msg
          ));
        } else {
          // This is a new message (likely from the other user)
          const messageWithTimestamp = {
            ...message,
            timestamp: new Date(message.createdAt || message.timestamp || Date.now()),
          };
          
          // Only add if it's not already in the messages array
          setMessages(prev => {
            const exists = prev.some(m => (m._id === messageId || m.id === messageId));
            return exists ? prev : [...prev, messageWithTimestamp];
          });

          // Mark message as read if it's not our own
          if (!isOwnMessage(message, user?._id || user?.id || '')) {
            messagesApi.markMessageRead(messageId).catch(console.error);
          }
        }
      }
    };

    socket.on('new-message', onNewMessage);

    // Clean up listeners
    return () => {
      socket.off('new-message', onNewMessage);
      if (socket && isConnected) {
        socket.emit('leave-chat', id);
      }
    };
  }, [socket, id, user, isConnected, pendingMessages]);

  // Send text message
  const handleSendMessage = async () => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || !id || !user) return;

    try {
      setSending(true);

      // Create a temporary ID for optimistic update tracking
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      // Construct the message payload
      const messagePayload = {
        _id: tempId, // Temporary ID to track this message
        id: tempId,  // Some systems use id instead of _id
        content: trimmedMessage,
        type: 'text',
        chatId: id,
        sender: {
          _id: user._id || user.id,
          username: user.username,
        },
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      // Add message to UI immediately (optimistic update)
      setMessages(prev => [...prev, {...messagePayload, sender: user}]);
      
      // Track this as a pending message
      setPendingMessages(prev => new Set(prev).add(tempId));

      if (socket && isConnected) {
        // Send via socket
        sendSocketMessage({
          content: trimmedMessage,
          type: 'text',
          chatId: id,
          tempId: tempId, // Include tempId so we can match it later
        });
        
        // NOTE: We don't add the message again here
        // The socket 'new-message' event will handle updating this message
        // with the real ID from the server
      } else {
        // Send via REST API as fallback
        const newMessage = await messagesApi.sendMessage(id, {
          content: trimmedMessage,
          type: 'text',
        });
        
        // Replace our temporary message with the real one from the server
        setMessages(prev => prev.map(msg => 
          msg._id === tempId ? newMessage : msg
        ));
        
        // Remove from pending
        setPendingMessages(prev => {
          const updated = new Set(prev);
          updated.delete(tempId);
          return updated;
        });
      }

      // Clear input
      setMessageText('');
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error sending message:', error);
      // Update the message to show it failed
      setMessages(prev => prev.map(msg => 
        msg._id === tempId ? {...msg, status: 'failed'} : msg
      ));
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
        Alert.alert('Feature not available', 'Image sharing will be implemented in a future update.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Render message item
  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isOwn = isOwnMessage(item, user?._id || user?.id || '');
    const prevMessage = messages[index - 1];
    const isConsecutive = index > 0 && isOwnMessage(prevMessage, user?._id || user?.id || '') === isOwn;

    return (
      <ChatBubble
        message={item}
        isOwn={isOwn}
        showAvatar={!isConsecutive && !isOwn}
        isConsecutive={isConsecutive}
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
            isOnline={recipient?.isOnline}
          />
          <View style={styles.userTexts}>
            <Text style={styles.username}>{recipient?.username || 'Loading...'}</Text>
            <Text style={styles.status}>
              {recipient ? (recipient.isOnline ? 'Online' : 'Offline') : '...'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 && !loading ? (
          <EmptyState type="messages" />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id || item.id || item.createdAt}
            contentContainerStyle={styles.messagesContainer}
          />
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={handleSendImage}>
            <Plus size={24} color={Colors.common.gray[600]} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            underlineColorAndroid="transparent"
            textAlignVertical="center"
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