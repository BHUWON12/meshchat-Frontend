import { Platform } from 'react-native';

// API configuration
export const API_URL = 'http://localhost:5000';

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  SETTINGS: 'settings',
};

// Default values
export const DEFAULT_AVATAR = 'https://images.pexels.com/photos/1089438/pexels-photo-1089438.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';

// Define message statuses
export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

// Define message types
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
  LOCATION = 'location',
}

// Connection statuses
export enum ConnectionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
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