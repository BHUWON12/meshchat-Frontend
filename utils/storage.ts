// utils/storage.ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const storage = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        const value = localStorage.getItem(key);
        console.log(`[Storage] Retrieved ${key} (web):`, value ? 'exists' : 'null');
        return value;
      }
      const value = await SecureStore.getItemAsync(key);
      console.log(`[Storage] Retrieved ${key} (native):`, value ? 'exists' : 'null');
      return value;
    } catch (error) {
      console.error(`[Storage] Failed to get ${key}:`, error);
      return null;
    }
  },

  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        console.log(`[Storage] Stored ${key} (web):`, value.substring(0, 5) + '...');
        return;
      }
      await SecureStore.setItemAsync(key, value);
      console.log(`[Storage] Stored ${key} (native):`, value.substring(0, 5) + '...');
    } catch (error) {
      console.error(`[Storage] Failed to set ${key}:`, error);
    }
  },

  deleteItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        console.log(`[Storage] Deleted ${key} (web)`);
        return;
      }
      await SecureStore.deleteItemAsync(key);
      console.log(`[Storage] Deleted ${key} (native)`);
    } catch (error) {
      console.error(`[Storage] Failed to delete ${key}:`, error);
    }
  },
};
