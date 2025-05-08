import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import UserAvatar from './UserAvatar';
import { Notification, NotificationType, useNotifications } from '../context/NotificationContext';
import { respondToRequest } from '../services/contacts';
import Colors from '../constants/Colors';
import { formatMessageDate } from '../utils/helpers';

type NotificationItemProps = {
  notification: Notification;
};

export default function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();
  const { markAsRead } = useNotifications();
  
  // Format timestamp
  const timestamp = notification.createdAt ? formatMessageDate(notification.createdAt) : '';
  
  // Get notification content based on type
  const getNotificationContent = () => {
    switch (notification.type) {
      case 'message':
        return {
          title: `New message from ${notification.sender?.username}`,
          message: notification.message?.content || 'Sent you a message',
          action: () => handleMessagePress()
        };
      case 'connection_request':
        return {
          title: 'Connection Request',
          message: `${notification.sender?.username} wants to connect with you`,
          action: () => handleConnectionPress()
        };
      case 'connection_accepted':
        return {
          title: 'Connection Accepted',
          message: `${notification.sender?.username} accepted your connection request`,
          action: () => handleProfilePress()
        };
      default:
        return {
          title: 'Notification',
          message: 'You have a new notification',
          action: () => handleMarkAsRead()
        };
    }
  };
  
  const content = getNotificationContent();
  
  const handleMessagePress = () => {
    if (notification.message?.chat) {
      markAsRead(notification._id);
      router.push(`/(protected)/(tabs)/chat/${notification.message.chat}`);
    }
  };
  
  const handleConnectionPress = () => {
    markAsRead(notification._id);
    router.push('/(protected)/(tabs)/connections');
  };
  
  const handleProfilePress = () => {
    markAsRead(notification._id);
    if (notification.sender?._id) {
      // Navigate to profile or start chat
      router.push(`/(protected)/(tabs)/notifications/${notification.sender._id}`);
    }
  };
  
  const handleMarkAsRead = () => {
    markAsRead(notification._id);
  };
  
  // Handle connection request actions
  const handleAccept = async () => {
    if (notification.data?.requestId) {
      try {
        await respondToRequest(notification.data.requestId, 'accept');
        markAsRead(notification._id);
      } catch (error) {
        console.error('Failed to accept request:', error);
      }
    }
  };
  
  const handleReject = async () => {
    if (notification.data?.requestId) {
      try {
        await respondToRequest(notification.data.requestId, 'reject');
        markAsRead(notification._id);
      } catch (error) {
        console.error('Failed to reject request:', error);
      }
    }
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        !notification.read && styles.unread
      ]}
      onPress={content.action}
      activeOpacity={0.7}
    >
      <UserAvatar 
        uri={notification.sender?.avatar}
        name={notification.sender?.username || 'User'}
        size={50}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {content.title}
          </Text>
          {timestamp && <Text style={styles.time}>{timestamp}</Text>}
        </View>
        
        <Text style={styles.message} numberOfLines={1}>
          {content.message}
        </Text>
        
        {/* Connection request actions */}
        {notification.type === 'connection_request' && !notification.read && (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton]} 
              onPress={handleAccept}
            >
              <Text style={styles.actionText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]} 
              onPress={handleReject}
            >
              <Text style={[styles.actionText, styles.rejectText]}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[200],
    backgroundColor: Colors.common.white,
  },
  unread: {
    backgroundColor: Colors.common.blue[50],
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.common.gray[900],
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: Colors.common.gray[500],
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.common.gray[600],
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 8,
  },
  acceptButton: {
    backgroundColor: Colors.common.blue[500],
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.common.gray[300],
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.common.white,
  },
  rejectText: {
    color: Colors.common.gray[700],
  }
});