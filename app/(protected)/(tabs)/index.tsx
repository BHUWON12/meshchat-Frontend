// frontend/app/(protected)/(tabs)/index.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform, // <-- Import Platform for conditional logic
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router'; // <-- Import useFocusEffect
import { Audio } from 'expo-av'; // <-- Import Audio for sound

// Import necessary API services
import { chatsApi } from '../../../services/index'; // Adjust path if needed

// Import necessary contexts
import { useAuth } from '../../../context/AuthContext'; // Adjust path if needed
import { useSocket } from '../../../context/SocketContext'; // Adjust path if needed
// Although MessageContext holds global messages, we'll manage the chat list state locally here
// import { useMessages } from '../../../context/MessageContext'; // Not directly used in this file's logic

// Import components
import ChatListItem from '../../../components/ChatListItem'; // Adjust path if needed
import EmptyState from '../../../components/EmptyState'; // Adjust path if needed
import ConnectionToggle from '../../../components/ConnectionToggle'; // Adjust path if needed

// Import constants and helpers
import Colors from '../../../constants/Colors'; // Adjust path if needed
import { formatMessageDate, isOwnMessage } from '../../../utils/helpers'; // Adjust path if needed
// Import MessageStatus if you need to check status within this component (e.g., for optimistic updates)
// import { MessageStatus } from '../../../utils/constants'; // Adjust path if needed


// Define the structure of a Chat object as expected by this component
// This should match the structure returned by your backend's getAllChats endpoint
interface Chat {
  _id: string;
  id?: string; // Optional: if your backend uses 'id' as well
  participants: Array<{
    _id: string;
    id?: string;
    username: string;
    avatar?: string;
    isOnline?: boolean; // Include online status from backend
    lastActive?: string; // Include last active timestamp from backend
  }>;
  lastMessage?: {
    _id: string;
    id?: string;
    content: string;
    createdAt: string;
    sender: string | { _id: string; id?: string; username: string; /* other sender fields */ }; // Can be ID or populated object
    status: string; // e.g., 'sent', 'delivered', 'read'
    readBy?: Array<{ readerId: string; readAt: string }>; // Array of readers
  };
  lastMessageAt: string; // Timestamp of the last message for sorting
  createdAt: string;
  updatedAt: string;
  // Add other chat properties if needed (e.g., name, isGroup)
}

// Define the structure of a New Message event payload from the socket
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
  }; // Sender should be populated
  content: string;
  createdAt: string; // Server timestamp
  status: string; // e.g., 'sent'
  readBy: Array<{ readerId: string; readAt: string }>;
  tempId?: string; // Temporary ID from frontend for optimistic updates
  // Include other message properties like type, metadata, etc.
  type: string;
  metadata?: any;
}


export default function ChatsScreen() { // Renamed from IndexScreen to ChatsScreen based on your code
  const { user } = useAuth(); // Get the current authenticated user
  const { socket, isConnected } = useSocket(); // Get socket instance and connection status
  const router = useRouter(); // Router for navigation

  // State to hold the list of chats
  const [chats, setChats] = useState<Chat[]>([]); // Use Chat[] type
  // Loading state for fetching chats
  const [loading, setLoading] = useState(true);
  // State for refresh control
  const [refreshing, setRefreshing] = useState(false);
  // Ref for the chat sound instance
  const chatSoundRef = useRef<Audio.Sound | null>(null);

  // --- Sound Loading Effect ---
  // Loads the chat sound file once when the component mounts.
  useEffect(() => {
    async function loadSound() {
      try {
        // !!! VERIFY THIS PATH IS CORRECT RELATIVE TO THIS FILE AND YOUR ASSETS/SOUNDS DIRECTORY !!!
        const { sound } = await Audio.Sound.createAsync(require("../../../../assets/sounds/chat.mp3"));
        chatSoundRef.current = sound;
        console.log("ChatsScreen: Chat sound loaded.");
      } catch (error) {
        console.error('ChatsScreen: Error loading chat sound:', error);
      }
    }
    // --- ADDED PLATFORM CHECK FOR SOUND LOADING ---
    // Only attempt to load sound on native platforms to avoid potential web issues early
    if (Platform.OS !== 'web') {
       loadSound();
    } else {
        console.log("ChatsScreen: Skipping sound loading on web.");
    }
    // --- END ADDED PLATFORM CHECK ---


    // Cleanup function to unload sound when the component unmounts.
    return () => {
      console.log("ChatsScreen: Unloading chat sound.");
      // Use optional chaining in case chatSoundRef.current was never set
      chatSoundRef.current?.unloadAsync();
    };
    // Effect dependencies: Empty array means it runs once on mount and cleans up on unmount.
  }, []);


  // --- Fetch Chats Function ---
  // Function to fetch chats from the backend.
  const fetchChats = async () => {
    try {
      // Do not set loading(true) here if it's called by handleRefresh, as refreshing state covers it.
      // Set loading only for the initial load if not already refreshing.
      if (!refreshing) {
         setLoading(true);
      }
      console.log("ChatsScreen: Fetching all chats...");
      // Call the API service to get all chats for the current user
      // ASSUMPTION: chatsApi.getChats() calls your backend endpoint (e.g., /api/v1/chats)
      // and the backend sorts by lastMessageAt descending and populates participants/lastMessage.
      const response = await chatsApi.getChats(); // Assuming getChats doesn't need user.id param if auth is used
      const fetchedChats: Chat[] = response.data || []; // Assuming response has a 'data' property

      // Ensure fetched chats have participants populated correctly by the backend
      // and the lastMessage is populated.
      console.log(`ChatsScreen: Fetched ${fetchedChats.length} chats.`);
      // console.log("ChatsScreen: Fetched chats data:", fetchedChats); // Log fetched data for debugging

      setChats(fetchedChats); // Update the chats state with the fetched data

    } catch (error) {
      console.error('ChatsScreen: Error fetching chats:', error);
      // TODO: Optionally show an error message to the user using a toast
      // showToast?.(`Failed to load chats: ${error.message || 'Server error'}`);
       setChats([]); // Clear chats state on error
    } finally {
      // Do not set loading(false) here if it's called by handleRefresh, as refreshing state covers it.
       if (!refreshing) {
         setLoading(false);
       }
    }
  };

  // --- Handle Refresh ---
  // Function triggered by the RefreshControl.
  const handleRefresh = async () => {
    setRefreshing(true); // Set refreshing state to true
    await fetchChats(); // Fetch chats
    setRefreshing(false); // Set refreshing state to false after fetch
  };

  // --- Initial Fetch Effect ---
  // Use useFocusEffect to fetch chats whenever the screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      console.log("ChatsScreen: Screen focused, fetching chats...");
      fetchChats(); // Call the fetch function

      // Cleanup function: This runs when the screen loses focus.
      // No specific cleanup needed here for the fetch itself.
      return () => {
          console.log("ChatsScreen: Screen losing focus.");
          // Optional: Cancel any pending API requests if your API service supports it
      };
      // Dependencies for useCallback: Rerun this effect if user changes.
    }, [user]) // user is a dependency as chats are specific to the user
  );


  // --- Socket Listener Effect for New Messages ---
  // This effect sets up a listener for 'new-message' events to update the chat list in real-time.
  useEffect(() => {
      // Only set up the listener if the socket is available and connected
      if (!socket || !isConnected || !user) {
          console.log("ChatsScreen: Prerequisites missing for new message listener setup. Skipping.");
          return;
      }

      const currentUserId = user._id || user.id; // Get current user ID

      // Listener function for 'new-message' event
      const onNewMessage = async (message: NewMessageEventPayload) => {
          console.log('ChatsScreen: Received new message event.', message);

          // Check if the message is from the current user.
          // We typically don't play sound or reorder the list for messages we send ourselves.
          const isOwn = (message.sender?._id || message.sender?.id) === currentUserId;

          // --- Update Chat List Order and Last Message ---
          // Use the functional update form of setChats to ensure we work with the latest state.
          setChats(prevChats => {
              // Find the index of the chat this message belongs to in the current chats list state.
              const chatIndex = prevChats.findIndex(chat => chat._id === message.chatId);

              // If the chat exists in the current list:
              if (chatIndex > -1) {
                  const chatToUpdate = prevChats[chatIndex];
                  console.log(`ChatsScreen: Found chat ${message.chatId} in list. Updating...`);

                  // Create a new chat object with the updated last message and timestamp.
                  // Ensure the sender in lastMessage is structured correctly if needed by ChatListItem.
                  const updatedChat = {
                      ...chatToUpdate, // Copy existing chat properties
                      lastMessage: { // Update lastMessage with the new message details
                          _id: message._id,
                          id: message.id,
                          content: message.content,
                          createdAt: message.createdAt,
                          sender: message.sender, // Use populated sender from socket event
                          status: message.status,
                          readBy: message.readBy,
                          type: message.type,
                          metadata: message.metadata,
                      },
                      lastMessageAt: message.createdAt, // Update lastMessageAt to the new message's timestamp
                  };

                  // Remove the updated chat from its current position and add it to the top.
                  const remainingChats = prevChats.filter((_, index) => index !== chatIndex);
                  const newChats = [updatedChat, ...remainingChats]; // Place updated chat at the beginning

                  console.log(`ChatsScreen: Chat ${message.chatId} updated and moved to top.`);
                  return newChats; // Return the new array to update state

              } else {
                  // If the chat does NOT exist in the current list (e.g., a new chat was initiated elsewhere).
                  // In a full implementation, you might want to fetch the new chat details here
                  // and add it to the list. For this example, we'll just log a warning.
                  console.warn(`ChatsScreen: Received new message for chat ${message.chatId} not found in current list.`);
                  // Optional: Trigger a re-fetch of all chats to include the new one
                  // fetchChats(); // Be cautious with frequent re-fetches - needs to be defined outside this effect
                  return prevChats; // Return previous state if chat not found
              }
          });

          // --- Play Chat Sound ---
          // Play sound *only* if:
          // 1. It's NOT a message from the current user (`!isOwn`).
          // 2. The sound file has been loaded (`chatSoundRef.current` is not null).
          // 3. The current platform is NOT 'web' (to avoid browser autoplay restrictions).
          // --- ADDED PLATFORM CHECK FOR SOUND PLAYBACK ---
          if (Platform.OS !== 'web' && !isOwn && chatSoundRef.current) {
              console.log('ChatsScreen: Playing chat sound for new incoming message...');
              try {
                  // Use replayAsync() to play the sound from the beginning.
                  await chatSoundRef.current.replayAsync();
              } catch (error) {
                  console.error('ChatsScreen: Error playing chat sound:', error);
              }
          }
          // --- END ADDED PLATFORM CHECK ---
      };


      // Attach the 'new-message' listener to the socket.
      socket.on('new-message', onNewMessage);
      console.log("ChatsScreen: 'new-message' socket listener attached.");

      // --- Cleanup function for the socket listener ---
      // This runs when the component unmounts or the effect's dependencies change.
      return () => {
        console.log("ChatsScreen: Removing 'new-message' socket listener.");
        // Remove the specific listener using the exact function reference used when attaching.
        socket.off('new-message', onNewMessage);
      };

      // Dependencies for the effect: Re-run this effect if socket, isConnected, user, or chatSoundRef.current changes.
      // Including 'chats' in dependencies here would cause an infinite loop because setChats updates chats.
      // The state update logic inside onNewMessage uses `setChats(prevChats => ...)`, which correctly uses the previous state.
    }, [socket, isConnected, user, chatSoundRef.current]);


  // --- Render Item Function for FlatList ---
  // Uses useCallback for performance optimization.
  const renderChatListItem = useCallback(({ item }: { item: Chat }) => {
    // Find the other participant (the one who is not the current user)
    const currentUserId = user?._id || user?.id;
    const otherParticipant = item.participants.find(
      (p: any) => (p._id || p.id) !== currentUserId
    );

    // Ensure we have the other participant before rendering
    if (!otherParticipant) {
        console.warn("ChatsScreen: Could not find other participant for chat:", item._id);
        return null; // Don't render this item if the other participant is missing
    }

    // Render the ChatListItem component
    return (
      <ChatListItem
        chat={item} // Pass the full chat object
        otherParticipant={otherParticipant} // Pass the other participant's info
        // Pass the last message details
        lastMessage={item.lastMessage}
        // Pass a function to navigate to the chat screen when an item is pressed
        onPress={() => {
          console.log(`ChatsScreen: Navigating to chat ${item._id}`);
          // Navigate to the dynamic chat screen route using the chat ID
          router.push(`/chat/${item._id}`);
        }}
      />
    );
    // Dependencies for useCallback: Re-create renderChatListItem if user changes.
    // This ensures the isOwnMessage logic within ChatListItem (if it uses user ID) is correct.
  }, [user, router]); // Added router as dependency


  // Determine if the list is empty after loading
  const isEmpty = chats.length === 0 && !loading && !refreshing; // Account for refreshing state

  // Navigate to connections screen (used by EmptyState and FAB)
  const navigateToConnections = () => {
    router.push('/(protected)/(tabs)/connections');
  };


  // --- Main Render Function ---
  return (
    // Use SafeAreaView to ensure content is not hidden by notches or status bars
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        {/* Search Button - Keep as is */}
        <TouchableOpacity style={styles.searchButton}>
          <Search size={24} color={Colors.common.gray[700]} />
        </TouchableOpacity>
      </View>

      {/* Connection Toggle - Keep as is */}
      <ConnectionToggle />

      {/* Conditional Rendering: Show Loading, Empty State, or Chat List */}
      {/* Show loading only if it's the initial load and not refreshing */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={chats} // Provide the sorted chats array as data source
          renderItem={renderChatListItem} // Use the memoized render function
          // Use the chat ID as the key for FlatList optimization
          keyExtractor={(item) => item._id}
          // Apply empty list styles only if the list is empty
          contentContainerStyle={isEmpty ? styles.emptyListContent : null}
          // Add RefreshControl for pull-to-refresh functionality
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh} // Call handleRefresh function
              colors={[Colors.primary[500]]} // Customize spinner color (Android)
              tintColor={Colors.primary[500]} // Customize spinner color (iOS)
            />
          }
          // Show EmptyState component when the list is empty
          ListEmptyComponent={
            isEmpty ? ( // Only render EmptyState if isEmpty is true
              <EmptyState
                type="chats" // Specify the type of empty state
                onAction={navigateToConnections} // Action when the button is pressed
                actionLabel="Connect with Friends" // Label for the action button
              />
            ) : null // Render nothing if not empty
          }
        />
      )}

      {/* FAB Button - Keep as is */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={navigateToConnections} // Navigate to connections screen
      >
        <Plus size={24} color={Colors.common.white} /> {/* Plus icon */}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// --- Stylesheet Definitions ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background, // Use background color from your palette
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.common.white,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.common.gray[900],
    fontFamily: 'Poppins-Bold', // Ensure this font is loaded
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.common.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListContent: {
    flexGrow: 1, // Allows EmptyState to fill the container height
    justifyContent: 'center', // Center EmptyState vertically
    alignItems: 'center', // Center EmptyState horizontally
  },
  loadingContainer: {
    flex: 1, // Occupy the full space
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
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
    elevation: 5, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 }, // iOS shadow
    shadowOpacity: 0.25, // iOS shadow
    shadowRadius: 3.84, // iOS shadow
  },
});
