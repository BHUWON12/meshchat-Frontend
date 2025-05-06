// components/ChatScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, TextInput, Button, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import MessageBubble from './MessageBubble'; // Create this component for displaying messages

// Define message type
interface Message {
  _id: string;
  chatId: string;
  sender: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  type: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'read';
}

interface ChatScreenProps {
  chatId: string;
  // You might have other props like navigation, etc.
}

const ChatScreen: React.FC<ChatScreenProps> = ({ chatId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, isConnected, joinChat, leaveChat, sendMessage, markMessageAsRead } = useSocket();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const messagesReceived = useRef(new Set<string>());

  // Fetch initial messages and set up socket listeners
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    // Function to fetch messages from API
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/chats/${chatId}/messages`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        
        const data = await response.json();
        if (isMounted) {
          // Store message IDs to prevent duplication
          data.forEach((msg: Message) => messagesReceived.current.add(msg._id));
          setMessages(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        if (isMounted) {
          setError('Failed to load messages. Please try again.');
          setLoading(false);
        }
      }
    };

    // Join the chat room
    if (isConnected && socket) {
      console.log(`Joining chat room: ${chatId}`);
      joinChat(chatId);
      
      // Set up socket event listeners
      const newMessageHandler = (message: Message) => {
        console.log('Received new message:', message);
        
        // Prevent duplicate messages
        if (!messagesReceived.current.has(message._id)) {
          messagesReceived.current.add(message._id);
          setMessages(prev => [...prev, message]);
          
          // Mark the message as read if it's from someone else
          if (message.sender._id !== user?._id) {
            markMessageAsRead(message._id);
          }
        }
      };
      
      socket.on('new-message', newMessageHandler);

      socket.on('message-read', ({ messageId, userId }) => {
        if (userId !== user?._id) {
          setMessages(prev => 
            prev.map(msg => 
              msg._id === messageId ? { ...msg, status: 'read' } : msg
            )
          );
        }
      });

      // Fetch initial messages
      fetchMessages();
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (socket) {
        // Make sure we remove ALL event listeners to prevent duplicates
        socket.off('new-message');
        socket.off('message-read');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('reconnect');
        
        // Leave the chat room
        leaveChat(chatId);
      }
    };
  }, [chatId, isConnected, socket, user?._id, joinChat, leaveChat, markMessageAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Generate a unique client ID for message deduplication
  const generateClientId = () => {
    return `${user?._id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Handle sending a new message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;
    
    const messageData = {
      chatId,
      content: newMessage.trim(),
      type: 'text',
      clientId: generateClientId(), // Add client-side ID to prevent duplicate processing
    };
    
    // Clear the input right away for better UX
    setNewMessage('');
    
    sendMessage(messageData, (response) => {
      if (response.status === 'error') {
        console.error('Error sending message:', response.message);
        setError('Failed to send message. Please try again.');
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={() => window.location.reload()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You are offline. Reconnecting...</Text>
        </View>
      )}
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <MessageBubble 
            message={item}
            isOwnMessage={item.sender._id === user?._id}
          />
        )}
        contentContainerStyle={styles.messageList}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
        />
        <Button
          title="Send"
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || !isConnected}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  offlineBanner: {
    backgroundColor: '#ffcc00',
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#333',
    fontWeight: 'bold',
  },
});

export default ChatScreen;