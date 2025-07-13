import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCheck, Check } from 'lucide-react-native';
import Colors from '../constants/Colors';
import { formatMessageDate } from '../utils/helpers';
import { MessageStatus, MessageType } from '../utils/constants';

type ChatBubbleProps = {
  message: any;
  isOwn: boolean;
  showAvatar?: boolean;
  isConsecutive?: boolean;
};

export default function ChatBubble({
  message,
  isOwn,
  showAvatar = false,
  isConsecutive = false,
}: ChatBubbleProps) {
  // Format timestamp
  const timestamp = formatMessageDate(message.createdAt);

  // Get status icon
  const getStatusIcon = () => {
    switch (message.status) {
      case MessageStatus.READ:
        return <CheckCheck size={16} color={Colors.common.white} />;
      case MessageStatus.DELIVERED:
      case MessageStatus.SENT:
        return <Check size={16} color={Colors.common.white} />;
      default:
        return null;
    }
  };

  // Render different content based on message type
  const renderMessageContent = () => {
    switch (message.type) {
      case MessageType.IMAGE:
        return (
          <Image
            source={{ uri: message.metadata?.url }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        );
      case MessageType.TEXT:
      default:
        return (
          <Text style={isOwn ? styles.ownMessageText : styles.otherMessageText}>
            {message.content ? String(message.content) : ''}
          </Text>
        );
    }
  };

  // Bubble container with gradient for own messages
  const MessageContainer = ({ children }: { children: React.ReactNode }) => {
    if (isOwn) {
      return (
        <LinearGradient
          colors={Colors.chat.sent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.messageBubble,
            styles.ownMessageBubble,
            isConsecutive && styles.consecutiveMessage,
          ]}
        >
          {children}
        </LinearGradient>
      );
    }

    return (
      <View
        style={[
          styles.messageBubble,
          styles.otherMessageBubble,
          isConsecutive && styles.consecutiveMessage,
        ]}
      >
        {children}
      </View>
    );
  };

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      <MessageContainer>
        {renderMessageContent()}
        <View style={[styles.footer, isOwn ? styles.ownFooter : styles.otherFooter]}>
          <Text style={isOwn ? styles.ownTimestamp : styles.otherTimestamp}>
            {timestamp ? String(timestamp) : ''}
          </Text>
          {isOwn && getStatusIcon()}
        </View>
      </MessageContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    maxWidth: '80%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  ownMessageBubble: {
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: Colors.common.white,
    borderBottomLeftRadius: 4,
  },
  consecutiveMessage: {
    marginTop: 2,
  },
  ownMessageText: {
    color: Colors.common.white,
    fontSize: 15,
  },
  otherMessageText: {
    color: Colors.common.gray[900],
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ownFooter: {
    justifyContent: 'flex-end',
  },
  otherFooter: {
    justifyContent: 'flex-start',
  },
  ownTimestamp: {
    fontSize: 11,
    color: Colors.common.white,
    opacity: 0.8,
    marginRight: 4,
  },
  otherTimestamp: {
    fontSize: 11,
    color: Colors.common.gray[500],
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
});