import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { chatsApi } from '../../../services/index';
import { useAuth } from '../../../context/AuthContext';
import Colors from '../../../constants/Colors';
import ChatListItem from '../../../components/ChatListItem';
import EmptyState from '../../../components/EmptyState';
import ConnectionToggle from '../../../components/ConnectionToggle';
import { useSocket } from '../../../context/SocketContext';
import { formatMessageDate } from '../../../utils/helpers';

export default function ChatsScreen() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await chatsApi.getChats(user.id);
      setChats(response.data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  };
  
  useEffect(() => {
    fetchChats();
  }, []);
  
  // Listen for new messages
  useEffect(() => {
    if (!socket) return;
    
    socket.on('new-message', (message) => {
      // Update chats list with the new message
      setChats(currentChats => 
        currentChats.map(chat => {
          if (chat._id === message.chatId) {
            return {
              ...chat,
              lastMessage: message
            };
          }
          return chat;
        })
      );
    });
    
    return () => {
      socket.off('new-message');
    };
  }, [socket]);
  
  const navigateToConnections = () => {
    router.push('/(protected)/(tabs)/connections');
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Search size={24} color={Colors.common.gray[700]} />
        </TouchableOpacity>
      </View>
      
      <ConnectionToggle />
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={({ item }) => <ChatListItem chat={item} />}
          keyExtractor={(item) => item._id}
          contentContainerStyle={chats.length === 0 ? styles.emptyListContent : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary[500]]}
              tintColor={Colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <EmptyState 
              type="chats" 
              onAction={navigateToConnections} 
              actionLabel="Connect with Friends"
            />
          }
        />
      )}
      
      <TouchableOpacity 
        style={styles.fabButton}
        onPress={navigateToConnections}
      >
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
  emptyListContent: {
    flexGrow: 1,
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});