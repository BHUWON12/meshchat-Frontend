import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, MessageSquare, UserPlus } from 'lucide-react-native';
import Colors from '../../../constants/Colors';
import { formatMessageDate } from '../../../utils/helpers';

const DEMO_NOTIFICATIONS = [
  {
    id: '1',
    type: 'message',
    title: 'New Message',
    content: 'Alice sent you a message',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    read: false,
  },
  {
    id: '2',
    type: 'connection',
    title: 'Connection Request',
    content: 'Bob wants to connect with you',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    read: false,
  },
  {
    id: '3',
    type: 'message',
    title: 'New Message',
    content: 'Carol mentioned you in a message',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: true,
  },
];

type NotificationItemProps = {
  item: typeof DEMO_NOTIFICATIONS[0];
  onPress: () => void;
};

const NotificationItem = ({ item, onPress }: NotificationItemProps) => {
  const getIcon = () => {
    switch (item.type) {
      case 'message':
        return <MessageSquare size={24} color={Colors.primary[500]} />;
      case 'connection':
        return <UserPlus size={24} color={Colors.primary[500]} />;
      default:
        return <Bell size={24} color={Colors.primary[500]} />;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadItem]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>{getIcon()}</View>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.content}>{item.content}</Text>
        <Text style={styles.timestamp}>{formatMessageDate(item.timestamp)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const handleNotificationPress = (notification: typeof DEMO_NOTIFICATIONS[0]) => {
    // Handle notification press based on type
    console.log('Pressed notification:', notification);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <FlatList
        data={DEMO_NOTIFICATIONS}
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onPress={() => handleNotificationPress(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: 16,
    backgroundColor: Colors.common.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[200],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.common.gray[900],
    fontFamily: 'Poppins-Bold',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.common.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  unreadItem: {
    backgroundColor: Colors.primary[50],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.common.gray[900],
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    fontSize: 14,
    color: Colors.common.gray[600],
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  timestamp: {
    fontSize: 12,
    color: Colors.common.gray[500],
    fontFamily: 'Inter-Regular',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary[500],
    marginLeft: 8,
  },
});