import React, { useCallback } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Alert } from 'react-native';
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
  const { markAsRead } = useNotifications?.() || {};

  const timestamp = notification.createdAt ? formatMessageDate(notification.createdAt) : '';

  const getNotificationContent = useCallback(() => {
    switch (notification.type) {
      case 'message':
        return {
          title: `New message from ${notification.sender?.username || 'User'}`,
          message: notification.message?.content || notification.data?.messageContent || 'Sent you a message',
          action: () => handleMessagePress()
        };
      case 'connection_request':
        return {
          title: 'Connection Request',
          message: `${notification.sender?.username || 'User'} wants to connect with you`,
          action: () => handleConnectionPress()
        };
      case 'connection_accepted':
        return {
          title: 'Connection Accepted',
          message: `${notification.sender?.username || 'User'} accepted your connection request`,
          action: () => handleProfilePress()
        };
      default:
        return {
          title: 'System Notification',
          message: notification.data?.content || 'You have a new notification',
          action: () => handleMarkAsRead()
        };
    }
  }, [notification]);

  const content = getNotificationContent();

  const handleMessagePress = useCallback(() => {
    const chatId = notification.message?.chat || notification.data?.chatId;
    if (chatId) {
      markAsRead?.(notification._id);
      router.push(`/(protected)/(tabs)/chat/${chatId}`);
    } else {
      console.warn("NotificationItem: Message notification missing chat ID:", notification);
      Alert.alert("Error", "Chat ID not found for this message notification.");
      handleMarkAsRead();
    }
  }, [notification, markAsRead, router]);

  const handleConnectionPress = useCallback(() => {
    markAsRead?.(notification._id);
    router.push('/(protected)/(tabs)/connections');
  }, [notification, markAsRead, router]);

  const handleProfilePress = useCallback(() => {
    markAsRead?.(notification._id);
    const senderId = notification.sender?._id || notification.sender?.id;
    if (senderId) {
      router.push('/(protected)/(tabs)/connections');
    } else {
      console.warn("NotificationItem: Notification missing sender ID for profile/chat action:", notification);
      handleMarkAsRead();
    }
  }, [notification, markAsRead, router]);

  const handleMarkAsRead = useCallback(() => {
    markAsRead?.(notification._id);
    console.log("NotificationItem: Manually marked notification as read:", notification._id);
  }, [notification, markAsRead]);

  const handleAccept = useCallback(async () => {
    const requestId = notification.data?.requestId;
    if (requestId) {
      try {
        console.log("NotificationItem: Accepting connection request:", requestId);
        await respondToRequest(requestId, 'accept');
        markAsRead?.(notification._id);
        console.log("NotificationItem: Connection request accepted.");
      } catch (error) {
        console.error('NotificationItem: Failed to accept request:', error);
        Alert.alert("Error", "Failed to accept connection request.");
      }
    } else {
      console.warn("NotificationItem: Connection request notification missing requestId:", notification);
      Alert.alert("Error", "Invalid connection request notification.");
      handleMarkAsRead();
    }
  }, [notification, markAsRead]);

  const handleReject = useCallback(async () => {
    const requestId = notification.data?.requestId;
    if (requestId) {
      try {
        console.log("NotificationItem: Rejecting connection request:", requestId);
        await respondToRequest(requestId, 'reject');
        markAsRead?.(notification._id);
        console.log("NotificationItem: Connection request rejected.");
      } catch (error) {
        console.error('NotificationItem: Failed to reject request:', error);
        Alert.alert("Error", "Failed to reject connection request.");
      }
    } else {
      console.warn("NotificationItem: Connection request notification missing requestId:", notification);
      Alert.alert("Error", "Invalid connection request notification.");
      handleMarkAsRead();
    }
  }, [notification, markAsRead]);

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
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: Colors.common.gray[500],
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
    justifyContent: 'center',
    alignItems: 'center',
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
