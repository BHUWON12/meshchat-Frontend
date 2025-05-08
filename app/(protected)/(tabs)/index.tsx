import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
// import Audio from 'expo-audio'; // Corrected import if expo-av is used
import { Audio } from 'expo-av'; // Common package for Audio

import { chatsApi } from '../../../services/index';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import ChatListItem from '../../../components/ChatListItem';
import EmptyState from '../../../components/EmptyState';
import ConnectionToggle from '../../../components/ConnectionToggle';
import Colors from '../../../constants/Colors';
import { Chat as MappedChat, User as ParticipantInfo } from '../../../types'; // Use the MappedChat from types/index.ts

// Remove the local Chat interface, use MappedChat from types/index.ts
// interface Chat { ... }

interface NewMessageEventPayload {
  _id: string;
  id?: string;
  chatId: string;
  sender: {
    _id: string;
    id?: string;
    username: string;
    avatar?: string;
    isOnline?: boolean;
  };
  content: string;
  createdAt: string;
  status: string;
  readBy: Array<{ readerId: string; readAt: string }>;
  tempId?: string;
  type: string; // Added from your 'new-message' handler
  metadata?: any; // Added from your 'new-message' handler
}

export default function ChatsScreen() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const router = useRouter();

  const [chats, setChats] = useState<MappedChat[]>([]); // Use MappedChat type
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const chatSoundRef = useRef<Audio.Sound | null>(null);

  // getChatPartners can be removed if MappedChat already contains necessary recipient info
  // Or, if you still need it for a separate list, ensure types match.

  useEffect(() => {
    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../../../assets/sounds/chat.mp3')
        );
        chatSoundRef.current = sound;
      } catch (error) {
        console.error('Error loading chat sound:', error);
      }
    }
    if (Platform.OS !== 'web') {
      loadSound();
    }
    return () => {
      chatSoundRef.current?.unloadAsync();
    };
  }, []);

  const fetchChats = async () => {
    if (!user || !(user._id || user.id)) { // Ensure user and its ID is loaded
      console.warn('fetchChats: User or user ID not available. Aborting.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const currentUserId = user._id || user.id;

    try {
      if (!refreshing) setLoading(true);
      // Call getChats WITH currentUserId
      const fetchedMappedChats = await chatsApi.getChats(currentUserId);
      console.log('Fetched Mapped Chats:', fetchedMappedChats); // Important: Check this log
      setChats(fetchedMappedChats || []); // The service now returns the array directly
    } catch (error) {
      console.error('Error fetching chats:', error);
      setChats([]); // Set to empty array on error
    } finally {
      setLoading(false); // Always set loading to false in finally
      setRefreshing(false); // Always set refreshing to false
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChats(); // fetchChats will setRefreshing(false) in its finally block
  };

  useFocusEffect(
    useCallback(() => {
      if (user && (user._id || user.id)) { // Check if user is loaded
        fetchChats();
      } else {
        // Optionally, set loading to true if you want an indicator while user is loading
        console.log("ChatsScreen focused, but user data not yet available.");
      }
      return () => {};
    }, [user]) // Depend on user object
  );

  useEffect(() => {
    if (!socket || !isConnected || !user || !(user._id || user.id)) return;
    const currentUserId = user._id || user.id;

    const onNewMessage = async (message: NewMessageEventPayload) => {
      const isOwn = (message.sender?._id || message.sender?.id) === currentUserId;

      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(chat => chat.id === message.chatId); // Use chat.id for MappedChat

        if (chatIndex > -1) {
          const updatedChat = {
            ...prevChats[chatIndex],
            lastMessage: { // Adapt to MappedChat's LastMessage structure
              content: message.content,
              timestamp: new Date(message.createdAt), // MappedChat expects Date object
              // Add other fields if your MappedChat.LastMessage has them
            },
            // Potentially update unreadCount or other fields on MappedChat
          };
          const remainingChats = prevChats.filter((_, index) => index !== chatIndex);
          return [updatedChat, ...remainingChats];
        }
        // TODO: Handle new message for a brand new chat (not in prevChats)
        // This might involve fetching the chat details or constructing a new MappedChat object.
        return prevChats;
      });

      if (Platform.OS !== 'web' && !isOwn && chatSoundRef.current) {
        try {
          await chatSoundRef.current.replayAsync();
        } catch (error) {
          console.error('Error playing chat sound:', error);
        }
      }
    };

    socket.on('new-message', onNewMessage);
    return () => {
      socket.off('new-message', onNewMessage);
    };
  }, [socket, isConnected, user, chatSoundRef.current]);


  // renderChatListItem needs to be adapted for MappedChat
  const renderChatListItem = useCallback(
    ({ item }: { item: MappedChat }) => { // item is now MappedChat
      console.log('Rendering MappedChat item:', item); // Log to see the structure

      // With MappedChat, participant info (name, avatar, isOnline)
      // should ideally be directly on the 'item' object,
      // or on item.recipient if your mapChatResponse adds it.

      // Assuming mapChatResponse puts recipient details onto MappedChat:
      // (e.g., item.name is recipient's name, item.avatar is recipient's avatar)

      if (!item || !item.id) { // Basic check for a valid mapped chat item
          console.warn("Invalid MappedChat item for rendering:", item);
          return null;
      }

      // The 'recipient' field in your mapChatResponse is key.
      // Let's assume types/index.ts#Chat includes a recipient field like:
      // recipient: { _id: string, username: string, avatar?: string, isOnline?: boolean }
      // And that mapChatResponse populates this.

      const recipient = item.recipient as ParticipantInfo; // Cast if necessary, ensure type safety

      if (!recipient) {
          console.warn("MappedChat item is missing recipient details:", item);
          // Fallback or render differently if recipient info is missing
          // This shouldn't happen if mapChatResponse works correctly.
          return (
            <View style={{ padding: 10, backgroundColor: 'orange' }}>
              <Text>Chat item {item.id} missing recipient data.</Text>
            </View>
          );
      }

      return (
        <ChatListItem
          // Pass props compatible with ChatListItem's expectations
          // You'll need to adjust ChatListItem's props interface
          chatId={item.id} // Pass ID
          recipientName={recipient.username}
          recipientAvatar={recipient.avatar}
          isOnline={item.isOnline || recipient.isOnline || false} // Get isOnline status
          lastMessageContent={item.lastMessage?.content}
          lastMessageTimestamp={item.lastMessage?.timestamp} // Pass timestamp (Date object)
          unreadCount={item.unreadCount}
          onPress={() => router.push(`/chat/${item.id}`)} // Use item.id for navigation
        />
      );
    },
    [router] // user no longer needed here if recipient info is on item
  );

  const isEmpty = !loading && !refreshing && chats.length === 0; // Simplified isEmpty
  const navigateToConnections = () => router.push('/(protected)/(tabs)/connections');

  if (loading && chats.length === 0 && !refreshing) { // Initial loading state
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>Messages</Text>
            <TouchableOpacity style={styles.searchButton}>
              <Search size={24} color={Colors.common.gray[700]} />
            </TouchableOpacity>
          </View>
          <ConnectionToggle />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[500]} />
          </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Search size={24} color={Colors.common.gray[700]} />
        </TouchableOpacity>
      </View>
      <ConnectionToggle />
      <FlatList
        data={chats}
        renderItem={renderChatListItem}
        keyExtractor={(item) => item.id} // Use item.id for MappedChat
        contentContainerStyle={isEmpty ? styles.emptyListContent : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary[500]]}
            tintColor={Colors.primary[500]}
          />
        }
        ListEmptyComponent={ // Only show if not loading and chats are empty
          isEmpty ? (
            <EmptyState
              type="chats"
              onAction={navigateToConnections}
              actionLabel="Connect with Friends"
            />
          ) : null
        }
      />
      <TouchableOpacity style={styles.fabButton} onPress={navigateToConnections}>
        <Plus size={24} color={Colors.common.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.common.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[100],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.common.gray[900],
    fontFamily: 'Poppins-Bold',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.common.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { // Added for non-empty list padding etc. if needed
    paddingBottom: 80, // Space for FAB
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5, // Android
    shadowColor: '#000', // iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
