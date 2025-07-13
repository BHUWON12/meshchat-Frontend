import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_KEY = 'offline_chats';
const USERNAME_MAP_KEY = 'device_username_map';

export type OfflineMessage = {
  id: string;
  text: string;
  isOwn: boolean;
  timestamp: number;
};

export async function getChatHistory(deviceId: string): Promise<OfflineMessage[]> {
  const allChats = await AsyncStorage.getItem(CHAT_KEY);
  if (!allChats) return [];
  const parsed = JSON.parse(allChats);
  return parsed[deviceId] || [];
}

export async function saveMessage(deviceId: string, message: OfflineMessage) {
  const allChats = await AsyncStorage.getItem(CHAT_KEY);
  let parsed = allChats ? JSON.parse(allChats) : {};
  if (!parsed[deviceId]) parsed[deviceId] = [];
  parsed[deviceId].push(message);
  await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(parsed));
}

export async function clearChatHistory(deviceId: string) {
  const allChats = await AsyncStorage.getItem(CHAT_KEY);
  if (!allChats) return;
  const parsed = JSON.parse(allChats);
  delete parsed[deviceId];
  await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(parsed));
}

export async function getRecentChats(): Promise<Array<{ deviceId: string; lastMessage: OfflineMessage | null }>> {
  const allChats = await AsyncStorage.getItem(CHAT_KEY);
  if (!allChats) return [];
  const parsed = JSON.parse(allChats);
  return Object.keys(parsed).map(deviceId => {
    const messages: OfflineMessage[] = parsed[deviceId];
    return {
      deviceId,
      lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
    };
  });
}

// Username mapping
export async function saveDeviceUsername(deviceId: string, username: string) {
  const mapStr = await AsyncStorage.getItem(USERNAME_MAP_KEY);
  const map = mapStr ? JSON.parse(mapStr) : {};
  map[deviceId] = username;
  await AsyncStorage.setItem(USERNAME_MAP_KEY, JSON.stringify(map));
}

export async function getDeviceUsername(deviceId: string): Promise<string | null> {
  const mapStr = await AsyncStorage.getItem(USERNAME_MAP_KEY);
  if (!mapStr) return null;
  const map = JSON.parse(mapStr);
  return map[deviceId] || null;
} 