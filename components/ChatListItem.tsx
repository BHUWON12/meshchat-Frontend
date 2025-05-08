// Frontend/components/ChatListItem.tsx
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import UserAvatar from './UserAvatar'; // This component might be the source of the error
import Colors from '../constants/Colors';
// Ensure these utils handle potential undefined/null inputs gracefully
import { truncateText, formatMessageDate } from '../utils/helpers';

// Define props based on what MappedChat will provide via renderChatListItem
interface ChatListItemProps {
  chatId: string;
  recipientName: string;
  recipientAvatar?: string;
  isOnline: boolean;
  lastMessageContent?: string;
  lastMessageTimestamp?: Date | string | null; // Accept Date, string, null, or undefined
  unreadCount?: number;
  onPress: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  chatId,
  recipientName,
  recipientAvatar,
  isOnline,
  lastMessageContent,
  lastMessageTimestamp, // This can now be Date, string, null, or undefined
  unreadCount,
  onPress,
}) => {
  const displayLastMessage = lastMessageContent
    ? truncateText(lastMessageContent, 40)
    : 'No messages yet';

  // Safely format the timestamp only if it exists
  // formatMessageDate utility should ideally handle Date, string, or null/undefined
  const displayTimestamp = lastMessageTimestamp
    ? formatMessageDate(lastMessageTimestamp) // Pass the value directly
    : ''; // Display empty string if no timestamp

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* This UserAvatar component is a potential source if it renders text incorrectly */}
      <UserAvatar
        uri={recipientAvatar}
        name={recipientName}
        size={50}
        showStatus={true}
        isOnline={isOnline}
      />
      <View style={styles.content}>
        {/* Check for any accidental whitespace immediately inside this View */}
        <View style={styles.header}>
          {/* Check for accidental whitespace here */}
          <Text style={styles.name} numberOfLines={1}>{recipientName}</Text> {/* Text is correctly wrapped */}
          {/* Check for accidental whitespace here */}
          {/* Only render the timestamp Text component if displayTimestamp is not empty */}
          {displayTimestamp ? <Text style={styles.time}>{displayTimestamp}</Text> : null}
          {/* Check for accidental whitespace here */}
        </View>
        {/* Check for accidental whitespace immediately inside this View */}
        <Text style={styles.message} numberOfLines={1}> {/* Text is correctly wrapped */}
          {displayLastMessage}
        </Text>
        {/* Check for accidental whitespace immediately inside this View */}
        {/* Commented out unread badge - not the issue */}
      </View>
      {/* Check for any accidental whitespace immediately inside this TouchableOpacity */}
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
    // Removed justifyContent: 'center' as it can cause alignment issues with header/message combo
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Vertically align items in the header row
    marginBottom: 4,
    // Allows name and time to flex and potentially wrap if needed
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    color: Colors.common.gray[900],
    flexShrink: 1, // Allow name to shrink if space is limited
    marginRight: 5, // Add a small margin between name and time
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter_18pt-Regular',
    color: Colors.common.gray[500],
    // Ensures time doesn't shrink and pushes name if needed
    flexShrink: 0,
    marginLeft: 'auto', // Pushes time to the right
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter_18pt-Regular',
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