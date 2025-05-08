import { Platform } from 'react-native';

// API configuration
export const API_URL = 'http://192.168.1.11:5000';

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  SETTINGS: 'settings',
};

// Default values
export const DEFAULT_AVATAR = 'https://images.pexels.com/photos/1089438/pexels-photo-1089438.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

export enum MessageStatus {
  PENDING = 'pending',   // Message is being sent
  SENT = 'sent',         // Message sent to server
  DELIVERED = 'delivered', // Message delivered to recipient's device(s)
  READ = 'read',         // Message has been read by recipient(s)
  FAILED = 'failed',     // Message failed to send
}

// Define MessageType enum
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  // Add other types like VIDEO, FILE, etc.
}

// Define ConnectionStatus enum (if used elsewhere)
export enum ConnectionStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  // Add other statuses like PENDING, ACCEPTED, REJECTED, BLOCKED
}

// Platform-specific values
export const IS_WEB = Platform.OS === 'web';
export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';

// Application settings
export const APP_SETTINGS = {
  DEFAULT_THEME: 'light',
  NOTIFICATION_ENABLED: true,
};