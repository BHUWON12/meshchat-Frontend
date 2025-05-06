import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import Colors from '../constants/Colors';
import { truncateText, formatMessageDate, getChatName } from '../utils/helpers';

type ChatListItemProps = {
  chat: any;
};

export default function ChatListItem({ chat }: ChatListItemProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  if (!user || !chat) return null;
  
  const chatName = getChatName(chat, user._id);
  
  // Find the recipient
  const recipient = chat.participants?.find(
    (p: any) => p._id !== user._id && p.id !== user._id
  );
  
  const isOnline = recipient?.isOnline || false;
  const lastMessage = chat.lastMessage ? truncateText(chat.lastMessage.content, 40) : 'No messages yet';
  const timestamp = chat.lastMessage ? formatMessageDate(chat.lastMessage.createdAt) : '';
  
  const handlePress = () => {
    router.push(`/(protected)/(tabs)/chat/${chat._id}`);
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <UserAvatar 
        uri={recipient?.avatar}
        name={recipient?.username}
        size={50}
        showStatus={true}
        isOnline={isOnline}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{chatName}</Text>
          {timestamp && <Text style={styles.time}>{timestamp}</Text>}
        </View>
        
        <Text style={styles.message} numberOfLines={1}>
          {lastMessage}
        </Text>
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
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.common.gray[900],
  },
  time: {
    fontSize: 12,
    color: Colors.common.gray[500],
  },
  message: {
    fontSize: 14,
    color: Colors.common.gray[600],
  },
});