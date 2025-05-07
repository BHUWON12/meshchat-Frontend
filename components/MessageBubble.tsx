import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';

interface Message {
  _id: string;
  chatId: string;
  sender: {
    _id: string;
    name?: string;
    username?: string;
    avatar?: string;
  };
  content: string;
  type: string;
  createdAt: string;
  timestamp?: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  isConsecutive?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwn, 
  showAvatar = false,
  isConsecutive = false
}) => {
  // Format timestamp
  const formattedTime = () => {
    try {
      const date = message.timestamp || new Date(message.createdAt);
      return format(date, 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  // Get status icon based on message status
  const getStatusIndicator = () => {
    switch (message.status) {
      case 'sending':
        return <ActivityIndicator size="small" color="#97C27F" style={styles.statusIndicator} />;
      case 'failed':
        return <Text style={[styles.status, styles.failed]}>!</Text>;
      case 'sent':
        return <Text style={styles.status}>✓</Text>;
      case 'delivered':
        return <Text style={styles.status}>✓✓</Text>;
      case 'read':
        return <Text style={[styles.status, styles.read]}>✓✓</Text>;
      default:
        return <Text style={styles.status}>✓</Text>;
    }
  };

  // Get sender name (try different properties that might exist)
  const getSenderName = () => {
    return message.sender?.name || message.sender?.username || 'Unknown';
  };

  return (
    <View style={[
      styles.container,
      isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
      isConsecutive && styles.consecutive
    ]}>
      {showAvatar && !isOwn && (
        <View style={styles.avatarContainer}>
          {/* You can replace this with an avatar component */}
          <View style={styles.avatarPlaceholder}>
            <Text>{getSenderName().charAt(0)}</Text>
          </View>
        </View>
      )}
      
      <View style={[
        styles.bubble,
        isOwn ? styles.ownBubble : styles.otherBubble,
        isConsecutive && styles.consecutiveBubble,
        message.status === 'failed' && styles.failedBubble
      ]}>
        {!isOwn && !isConsecutive && (
          <Text style={styles.senderName}>{getSenderName()}</Text>
        )}
        
        <Text style={styles.messageText}>{message.content}</Text>
        
        <View style={styles.metaContainer}>
          <Text style={styles.timestamp}>{formattedTime()}</Text>
          {isOwn && getStatusIndicator()}
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
  consecutive: {
    marginTop: 2, // Less margin for consecutive messages
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    elevation: 1,
  },
  consecutiveBubble: {
    borderTopLeftRadius: isOwnMessage => isOwnMessage ? 16 : 4,
    borderTopRightRadius: isOwnMessage => isOwnMessage ? 4 : 16,
  },
  ownBubble: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  failedBubble: {
    backgroundColor: '#FFDDDD',
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
    alignItems: 'center',
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
  statusIndicator: {
    width: 12,
    height: 12,
  },
  failed: {
    color: '#FF6B6B',
  },
  read: {
    color: '#4082DB', // Blue for read messages
  },
});

export default MessageBubble;