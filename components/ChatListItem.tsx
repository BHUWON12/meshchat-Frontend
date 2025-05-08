// Frontend/components/ChatListItem.tsx
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
// import { useRouter } from 'expo-router'; // Not used directly in this component
// import { useAuth } from '../context/AuthContext'; // Not used directly here
import UserAvatar from './UserAvatar';
import Colors from '../constants/Colors';
import { truncateText, formatMessageDate } from '../utils/helpers'; // Ensure these utils handle Date objects for timestamp

// Define props based on what MappedChat will provide via renderChatListItem
interface ChatListItemProps {
  chatId: string;
  recipientName: string;
  recipientAvatar?: string;
  isOnline: boolean;
  lastMessageContent?: string;
  lastMessageTimestamp?: Date; // Expect a Date object
  unreadCount?: number; // Example, if you want to show unread count
  onPress: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  chatId, // For key or navigation if needed, not directly displayed here unless desired
  recipientName,
  recipientAvatar,
  isOnline,
  lastMessageContent,
  lastMessageTimestamp,
  unreadCount,
  onPress,
}) => {
  const displayLastMessage = lastMessageContent
    ? truncateText(lastMessageContent, 40)
    : 'No messages yet';

  const displayTimestamp = lastMessageTimestamp
    ? formatMessageDate(lastMessageTimestamp.toISOString()) // formatMessageDate might need ISO string or Date
    : '';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <UserAvatar
        uri={recipientAvatar}
        name={recipientName}
        size={50}
        showStatus={true} // Assuming UserAvatar can show status
        isOnline={isOnline}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{recipientName}</Text>
          {displayTimestamp && <Text style={styles.time}>{displayTimestamp}</Text>}
        </View>
        <Text style={styles.message} numberOfLines={1}>
          {displayLastMessage}
        </Text>
        {/* Optionally display unreadCount */}
        {/* {unreadCount && unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )} */}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center', // Vertically align items in the center
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[100], // Softer border
    backgroundColor: Colors.common.white,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center', // Ensure content within this view is centered if needed
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600', // Poppins-SemiBold equivalent
    fontFamily: 'Poppins-SemiBold', // Use your font
    color: Colors.common.gray[900],
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter_18pt-Regular', // Use your font
    color: Colors.common.gray[500],
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter_18pt-Regular', // Use your font
    color: Colors.common.gray[600],
  },
  // Optional unread badge styles
  // unreadBadge: {
  //   position: 'absolute',
  //   right: 0,
  //   bottom: 0,
  //   backgroundColor: Colors.primary[500],
  //   borderRadius: 10,
  //   paddingHorizontal: 5,
  //   paddingVertical: 1,
  // },
  // unreadText: {
  //   color: Colors.common.white,
  //   fontSize: 10,
  //   fontWeight: 'bold',
  // },
});

export default ChatListItem;