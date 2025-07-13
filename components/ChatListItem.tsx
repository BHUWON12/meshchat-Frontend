// Frontend/components/ChatListItem.tsx
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import UserAvatar from './UserAvatar';
import Colors from '../constants/Colors';
import { truncateText, formatMessageDate } from '../utils/helpers';

interface ChatListItemProps {
  chatId: string;
  recipientName?: string; // Make optional and handle undefined
  recipientAvatar?: string;
  isOnline?: boolean; // Make optional and handle undefined
  lastMessageContent?: string;
  lastMessageTimestamp?: Date | string | null;
  unreadCount?: number;
  onPress: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  chatId,
  recipientName,
  recipientAvatar,
  isOnline,
  lastMessageContent,
  lastMessageTimestamp,
  unreadCount,
  onPress,
}) => {
  const displayName = recipientName || 'Unknown User';
  const displayLastMessage = lastMessageContent
    ? truncateText(lastMessageContent, 40)
    : 'No messages yet';

  const displayTimestamp = lastMessageTimestamp
    ? formatMessageDate(lastMessageTimestamp)
    : '';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <UserAvatar
        uri={recipientAvatar}
        name={displayName}
        size={50}
        showStatus={true}
        isOnline={isOnline}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          {displayTimestamp ? <Text style={styles.time}>{displayTimestamp}</Text> : null}
        </View>
        <Text style={styles.message} numberOfLines={1}>
          {displayLastMessage}
        </Text>
        {/* Optional unread badge */}
        {/* {unreadCount > 0 && (
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
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[100],
    backgroundColor: Colors.common.white,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    color: Colors.common.gray[900],
    flexShrink: 1,
    marginRight: 5,
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter_18pt-Regular',
    color: Colors.common.gray[500],
    flexShrink: 0,
    marginLeft: 'auto',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter_18pt-Regular',
    color: Colors.common.gray[600],
  },
  // unreadBadge: {
  //   backgroundColor: Colors.primary[500],
  //   borderRadius: 10,
  //   paddingHorizontal: 5,
  //   paddingVertical: 1,
  //   marginLeft: 8,
  // },
  // unreadText: {
  //   color: Colors.common.white,
  //   fontSize: 10,
  //   fontWeight: 'bold',
  // },
});

export default ChatListItem;