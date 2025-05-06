import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChevronRight, MessageSquare, Users } from 'lucide-react-native';
import Button from './ui/Button';
import Colors from '../constants/Colors';

type EmptyStateProps = {
  type: 'chats' | 'connections' | 'messages' | 'search';
  onAction?: () => void;
  actionLabel?: string;
};

export default function EmptyState({ 
  type, 
  onAction,
  actionLabel
}: EmptyStateProps) {
  // Content based on type
  const getContent = () => {
    switch (type) {
      case 'chats':
        return {
          icon: <MessageSquare size={48} color={Colors.primary[400]} />,
          title: 'No conversations yet',
          message: 'Connect with friends to start chatting',
          action: actionLabel || 'Find Friends',
        };
      case 'connections':
        return {
          icon: <Users size={48} color={Colors.primary[400]} />,
          title: 'No connections yet',
          message: 'Search for people to connect with',
          action: actionLabel || 'Search',
        };
      case 'messages':
        return {
          icon: <MessageSquare size={48} color={Colors.primary[400]} />,
          title: 'No messages yet',
          message: 'Start the conversation by sending a message',
          action: null,
        };
      case 'search':
        return {
          icon: <Users size={48} color={Colors.primary[400]} />,
          title: 'No results found',
          message: 'Try different search terms',
          action: null,
        };
      default:
        return {
          icon: null,
          title: 'Nothing here yet',
          message: 'Check back later',
          action: null,
        };
    }
  };

  const content = getContent();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {content.icon}
      </View>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.message}>{content.message}</Text>
      
      {content.action && onAction && (
        <Button
          title={content.action}
          onPress={onAction}
          variant="primary"
          size="medium"
          style={styles.actionButton}
          icon={<ChevronRight size={16} color="#fff" style={styles.actionIcon} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.common.gray[900],
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: Colors.common.gray[600],
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButton: {
    paddingHorizontal: 24,
  },
  actionIcon: {
    marginLeft: 8,
  },
});