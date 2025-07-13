import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  SafeAreaView,
  Image,
  Animated,
  RefreshControl,
} from 'react-native';
import { Wifi, WifiOff, Send, Search, Users, MessageCircle, RefreshCw, User, ChevronRight, Plus } from 'lucide-react-native';
import Colors from '../../../constants/Colors';
import wifiDirectService, { WifiDirectDevice, WifiDirectEvent, WifiDirectStatus } from '../../../services/wifiDirect';
import { getChatHistory, saveMessage, clearChatHistory, getRecentChats, OfflineMessage } from '../../../utils/localChatStorage';
import { useAuth } from '../../../context/AuthContext';
import { getOrCreateDeviceId } from '../../../utils/deviceId';
import { getDeviceUsername, saveDeviceUsername } from '../../../utils/localChatStorage';
import WifiDirectStatusChecker from '../../../components/WifiDirectStatusChecker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PingNearScreen() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<WifiDirectDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<WifiDirectDevice | null>(null);
  const [currentChatDevice, setCurrentChatDevice] = useState<WifiDirectDevice | null>(null);
  const [messages, setMessages] = useState<OfflineMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [recentChats, setRecentChats] = useState<Array<{ deviceAddress: string; lastMessage: OfflineMessage | null }>>([]);
  const { user } = useAuth();
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);
  const [wifiDirectStatus, setWifiDirectStatus] = useState<WifiDirectStatus | null>(null);
  const insets = useSafeAreaInsets();

  // Helper to check if all requirements are met for discovery/chat
  const canDiscoverOrChat = wifiDirectStatus && wifiDirectStatus.isWifiEnabled && wifiDirectStatus.hasLocationPermission && wifiDirectStatus.isLocationEnabled;

  useEffect(() => {
    initializeWifiDirect();
    setupEventListeners();
    return () => {
      wifiDirectService.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    if (isInitialized && canDiscoverOrChat) {
      startDiscovery();
    }
  }, [isInitialized, canDiscoverOrChat]);

  // Load recent chats on mount and when a message is sent/received/cleared
  const loadRecentChats = async () => {
    const chats = await getRecentChats();
    const convertedChats = chats.map(chat => ({
      deviceAddress: chat.deviceId,
      lastMessage: chat.lastMessage
    }));
    setRecentChats(convertedChats);
  };
  useEffect(() => { loadRecentChats(); }, []);
  useEffect(() => { loadRecentChats(); }, [messages]);

  useEffect(() => { getOrCreateDeviceId().then(setMyDeviceId); }, []);

  // Username mapping
  const [usernameMap, setUsernameMap] = useState<{ [deviceId: string]: string }>({});
  const refreshUsernameMap = async () => {
    const recent = await getRecentChats();
    const map: { [deviceId: string]: string } = {};
    for (const chat of recent) {
      const name = await getDeviceUsername(chat.deviceId);
      if (name) map[chat.deviceId] = name;
    }
    setUsernameMap(map);
  };
  useEffect(() => { refreshUsernameMap(); }, [recentChats]);

  // Load chat history when a device is selected for chat
  const openChatWithDevice = async (device: WifiDirectDevice) => {
    setCurrentChatDevice(device);
    const history = await getChatHistory(device.deviceAddress);
    setMessages(history);
  };

  // Send message handler
  const handleSendMessage = async () => {
    if (!currentChatDevice || !messageText.trim()) return;
    const msg: OfflineMessage = {
      id: Date.now().toString(),
      text: messageText.trim(),
      isOwn: true,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, msg]);
    await saveMessage(currentChatDevice.deviceAddress, msg);
    setMessageText('');
    try {
      await wifiDirectService.sendMessage(msg.text);
    } catch (error) {}
  };

  // Receive message handler
  const handleReceiveMessage = async (text: string) => {
    if (!currentChatDevice) return;
    const msg: OfflineMessage = {
      id: Date.now().toString(),
      text,
      isOwn: false,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, msg]);
    await saveMessage(currentChatDevice.deviceAddress, msg);
  };

  useEffect(() => {
    const sub = wifiDirectService.addEventListener('onMessageReceived', (event: WifiDirectEvent) => {
      if (event.data && currentChatDevice) {
        handleReceiveMessage(event.data);
      }
    });
    return () => sub.remove();
  }, [currentChatDevice]);

  // Clear chat history
  const handleClearChat = async () => {
    if (!currentChatDevice) return;
    await clearChatHistory(currentChatDevice.deviceAddress);
    setMessages([]);
  };

  const initializeWifiDirect = async () => {
    try {
      await wifiDirectService.initialize();
      setIsInitialized(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize Wi-Fi Direct. Please check your device settings.');
    }
  };

  const setupEventListeners = () => {
    wifiDirectService.addEventListener('onPeersDiscovered', (event: WifiDirectEvent) => {
      if (event.data) setDevices(event.data);
    });
    wifiDirectService.addEventListener('onDiscoveryStarted', () => setIsDiscovering(true));
    wifiDirectService.addEventListener('onDiscoveryStopped', () => setIsDiscovering(false));
    wifiDirectService.addEventListener('onConnectedToHost', (event: WifiDirectEvent) => {
      setIsConnected(true);
      setConnectedDevice(event.data ? { deviceName: event.data, deviceAddress: event.data, status: 'CONNECTED' } : null);
    });
    wifiDirectService.addEventListener('onClientConnected', (event: WifiDirectEvent) => {
      setIsConnected(true);
      setConnectedDevice(event.data ? { deviceName: event.data, deviceAddress: event.data, status: 'CONNECTED' } : null);
    });
    wifiDirectService.addEventListener('onDisconnected', () => {
      setIsConnected(false);
      setConnectedDevice(null);
    });
    wifiDirectService.addEventListener('onConnectionLost', () => {
      setIsConnected(false);
      setConnectedDevice(null);
    });
  };

  const startDiscovery = async () => {
    if (!canDiscoverOrChat) return;
    try { await wifiDirectService.startDiscovery(); } catch {}
  };
  const stopDiscovery = async () => { try { await wifiDirectService.stopDiscovery(); } catch {} };
  const disconnect = async () => { try { await wifiDirectService.disconnect(); } catch {} };

  // Helper to get device name from address (from discovery or fallback to address)
  const getDeviceName = (deviceId: string) => {
    return usernameMap[deviceId] || 'Unknown';
  };

  // --- UI RENDERING ---
  return (
    <SafeAreaView style={styles.container}>
      {/* Non-blocking status banners at the top */}
      <WifiDirectStatusChecker onStatusChange={setWifiDirectStatus} />
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 10 }]}> {/* Add top inset + margin */}
        <View style={styles.headerIconWrap}><Wifi size={28} color={Colors.primary[500]} /></View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Ping Near</Text>
          <Text style={styles.headerSubtitle}>Find and chat with nearby devices instantly.</Text>
        </View>
      </View>
      {/* Recent Chats Horizontal List */}
      {recentChats.length > 0 && (
        <View style={styles.recentChatsWrap}>
          <Text style={styles.sectionTitle}>Recent Chats</Text>
          <FlatList
            data={recentChats}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.deviceAddress}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.recentChatCard} onPress={() => openChatWithDevice({ deviceName: getDeviceName(item.deviceAddress), deviceAddress: item.deviceAddress, status: 'UNKNOWN' })}>
                <View style={styles.avatarCircle}>
                  <User size={24} color={Colors.primary[500]} />
                </View>
                <Text style={styles.recentChatName} numberOfLines={1}>{getDeviceName(item.deviceAddress)}</Text>
                {item.lastMessage && (
                  <Text style={styles.recentChatMsg} numberOfLines={1}>{item.lastMessage.isOwn ? 'You: ' : ''}{item.lastMessage.text}</Text>
                )}
              </TouchableOpacity>
            )}
            style={styles.recentChatsList}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          />
        </View>
      )}
      {/* Nearby Devices List */}
      <View style={styles.sectionHeaderRow}>
        <Users size={22} color={Colors.primary[500]} />
        <Text style={styles.sectionTitle}>Nearby Devices</Text>
      </View>
      <FlatList
        data={devices}
        keyExtractor={item => item.deviceAddress}
        renderItem={({ item }) => (
          <View style={styles.deviceCard}>
            <View style={styles.avatarCircle}><User size={24} color={Colors.primary[500]} /></View>
            <View style={styles.deviceInfoWrap}>
              <Text style={styles.deviceName}>{getDeviceName(item.deviceAddress)}</Text>
              <Text style={styles.deviceStatus}>{item.status}</Text>
            </View>
            <TouchableOpacity
              style={[styles.deviceChatBtn, (!canDiscoverOrChat || isConnected) && styles.deviceChatBtnDisabled]}
              onPress={() => openChatWithDevice(item)}
              disabled={!canDiscoverOrChat || isConnected}
            >
              <MessageCircle size={18} color={Colors.common.white} />
              <Text style={styles.deviceChatBtnText}>Chat</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          isDiscovering && canDiscoverOrChat ? (
            <View style={styles.skeletonWrap}>
              {[...Array(3)].map((_, i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
              <Text style={styles.skeletonText}>Searching for devices...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No nearby devices found.</Text>
            </View>
          )
        }
        style={styles.deviceList}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isDiscovering}
            onRefresh={startDiscovery}
            colors={[Colors.primary[500]]}
            tintColor={Colors.primary[500]}
          />
        }
      />
      {/* Floating Action Button for Discover/Refresh */}
      <TouchableOpacity
        style={styles.fab}
        onPress={isDiscovering ? stopDiscovery : startDiscovery}
        disabled={!canDiscoverOrChat}
        activeOpacity={0.8}
      >
        {isDiscovering ? <RefreshCw size={28} color={Colors.common.white} /> : <Search size={28} color={Colors.common.white} />}
      </TouchableOpacity>
      {/* Chat Modal/Screen */}
      {currentChatDevice && (
        <View style={styles.simpleChatModalWrap}>
          <View style={styles.simpleChatHeaderRow}>
            <TouchableOpacity onPress={() => setCurrentChatDevice(null)} style={styles.chatBackBtn}>
              <ChevronRight size={24} color={Colors.primary[500]} style={{ transform: [{ scaleX: -1 }] }} />
            </TouchableOpacity>
            <Text style={styles.simpleChatHeaderTitle}>
              Chat with {currentChatDevice.deviceName} ({currentChatDevice.deviceAddress})
            </Text>
            <TouchableOpacity onPress={handleClearChat} style={styles.chatClearBtn}>
              <Text style={{ color: Colors.common.error, fontWeight: 'bold' }}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => (
              <View style={[styles.simpleMsgRow, item.isOwn ? styles.simpleOwnMsg : styles.simpleOtherMsg]}>
                <Text style={[styles.simpleMsgText, item.isOwn ? styles.simpleOwnMsgText : styles.simpleOtherMsgText]}>{item.text}</Text>
              </View>
            )}
            keyExtractor={item => item.id}
            style={styles.simpleMsgList}
            contentContainerStyle={styles.simpleMsgListContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyChatWrap}>
                <Text style={styles.emptyChatText}>Start chatting!</Text>
                <Text style={styles.emptyChatSubtext}>Messages will appear here</Text>
              </View>
            }
          />
          <View style={styles.simpleInputBarWrap}>
            <TextInput
              style={styles.simpleInputBar}
              placeholder="Type a message..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
              editable={isConnected}
            />
            <TouchableOpacity
              style={[styles.simpleSendBtn, (!messageText.trim() || sending) && styles.simpleSendBtnDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sending || !isConnected}
            >
              <Send size={22} color={Colors.common.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.common.white,
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    backgroundColor: Colors.common.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[100],
    gap: 12,
  },
  headerIconWrap: {
    backgroundColor: Colors.primary[100],
    borderRadius: 16,
    padding: 8,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary[700],
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.common.gray[600],
    marginTop: 2,
  },
  recentChatsWrap: {
    marginTop: 8,
    marginBottom: 4,
  },
  recentChatsList: {
    minHeight: 90,
  },
  recentChatCard: {
    width: 80,
    marginRight: 12,
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    borderRadius: 16,
    padding: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  recentChatName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary[700],
    marginBottom: 2,
  },
  recentChatMsg: {
    fontSize: 11,
    color: Colors.common.gray[600],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary[700],
    marginLeft: 6,
  },
  deviceList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  deviceInfoWrap: {
    flex: 1,
    marginLeft: 10,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary[700],
  },
  deviceStatus: {
    fontSize: 12,
    color: Colors.common.gray[600],
    marginTop: 2,
  },
  deviceChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginLeft: 10,
    gap: 4,
  },
  deviceChatBtnDisabled: {
    backgroundColor: Colors.common.gray[300],
  },
  deviceChatBtnText: {
    color: Colors.common.white,
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 4,
  },
  skeletonWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  skeletonCard: {
    width: 80,
    height: 60,
    backgroundColor: Colors.common.gray[100],
    borderRadius: 16,
    marginHorizontal: 8,
    opacity: 0.5,
  },
  skeletonText: {
    position: 'absolute',
    bottom: -24,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: Colors.common.gray[500],
    fontSize: 13,
  },
  emptyWrap: {
    alignItems: 'center',
    marginVertical: 24,
  },
  emptyText: {
    color: Colors.common.gray[500],
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: Colors.primary[500],
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  chatModalWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.common.white,
    zIndex: 200,
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 44,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[200],
    gap: 8,
  },
  chatBackBtn: {
    padding: 4,
    marginRight: 8,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary[700],
    flex: 1,
  },
  chatClearBtn: {
    marginLeft: 8,
    padding: 4,
  },
  messageList: {
    flex: 1,
    backgroundColor: Colors.common.gray[50],
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ownMsgRow: {
    justifyContent: 'flex-end',
  },
  otherMsgRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: Colors.primary[500],
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: Colors.common.gray[200],
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownMsgText: {
    color: Colors.common.white,
  },
  otherMsgText: {
    color: Colors.common.gray[900],
  },
  messageTime: {
    fontSize: 10,
    color: Colors.common.gray[500],
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyChatWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyChatText: {
    fontSize: 16,
    color: Colors.common.gray[600],
    textAlign: 'center',
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: Colors.common.gray[500],
    textAlign: 'center',
    marginTop: 8,
  },
  inputBarWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.common.gray[200],
    gap: 8,
    backgroundColor: Colors.common.white,
  },
  inputBar: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Colors.common.gray[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.common.gray[900],
  },
  sendBtn: {
    backgroundColor: Colors.primary[500],
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.common.gray[300],
  },
  simpleChatModalWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.common.white,
    zIndex: 200,
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 44,
  },
  simpleChatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[200],
    gap: 8,
  },
  simpleChatHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary[700],
    flex: 1,
  },
  simpleMsgList: {
    flex: 1,
    backgroundColor: Colors.common.gray[50],
  },
  simpleMsgListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  simpleMsgRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  simpleOwnMsg: {
    justifyContent: 'flex-end',
  },
  simpleOtherMsg: {
    justifyContent: 'flex-start',
  },
  simpleMsgText: {
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    maxWidth: '80%',
  },
  simpleOwnMsgText: {
    backgroundColor: Colors.primary[100],
    color: Colors.primary[800],
    alignSelf: 'flex-end',
  },
  simpleOtherMsgText: {
    backgroundColor: Colors.common.gray[200],
    color: Colors.common.gray[800],
    alignSelf: 'flex-start',
  },
  simpleInputBarWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.common.gray[200],
    backgroundColor: Colors.common.white,
    gap: 8,
  },
  simpleInputBar: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Colors.common.gray[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.common.gray[900],
  },
  simpleSendBtn: {
    backgroundColor: Colors.primary[500],
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleSendBtnDisabled: {
    backgroundColor: Colors.common.gray[300],
  },
}); 
