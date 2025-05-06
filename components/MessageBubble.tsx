// components/MessageBubble.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns'; // Install this package for date formatting

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

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage }) => {
  // Format timestamp
  const formattedTime = () => {
    try {
      return format(new Date(message.createdAt), 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓ '; // Add a space to differentiate from 'delivered'
      default:
        return '';
    }
  };

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
    ]}>
      <View style={[
        styles.bubble,
        isOwnMessage ? styles.ownBubble : styles.otherBubble
      ]}>
        {!isOwnMessage && (
          <Text style={styles.senderName}>{message.sender.name}</Text>
        )}
        
        <Text style={styles.messageText}>{message.content}</Text>
        
        <View style={styles.metaContainer}>
          <Text style={styles.timestamp}>{formattedTime()}</Text>
          {isOwnMessage && (
            <Text style={styles.status}>{getStatusIcon()}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 8,
    flexDirection: 'row',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    elevation: 1,
  },
  ownBubble: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 2,
    color: '#333',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
    marginRight: 4,
  },
  status: {
    fontSize: 11,
    color: '#97C27F',
  },
});

export default MessageBubble;