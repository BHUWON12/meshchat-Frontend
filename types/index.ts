  // Core User Profile
  export interface User {
    id: string;
    email: string;
    username: string;
    bio: string;
    avatar: string | null;
    stats: UserStats;
    token: string;
  }

  interface UserStats {
    totalChats: number;
    connections: number;
  }

  // Chat System
  export interface Chat {
    id: string;
    name: string;
    avatar: string;
    participants: string[];
    isOnline: boolean;
    unreadCount: number;
    lastMessage?: LastMessage;
    connectionType: ConnectionStatus;
  }

  export type ConnectionStatus = 'online' | 'offline';

  export interface LastMessage {
    content: string;
    timestamp: Date;
  }
  // Messaging System
  export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    receiverId: string;
    content: string;
    type: MessageType;
    caption?: string;
    timestamp: Date;
    status: DeliveryStatus;
    read: boolean;
  }

  export type MessageType = 'text' | 'image' | 'file';
  export type DeliveryStatus = 'sent' | 'delivered' | 'read';

  // Device Management
  export interface Device {
    id: string;
    name: string;
    type: DeviceType;
    status: DeviceStatus;
    signal?: string;
    avatar?: string;
  }

  type DeviceType = 'bluetooth' | 'wifi';
  type DeviceStatus = 'available' | 'busy' | 'unavailable';

  // Theme System
  export interface Theme {
    colors: ThemeColors;
  }

  interface ThemeColors {
    primary: ColorScale;
    secondary: ColorScale;
    accent: ColorScale;
    success: ColorScale;
    warning: ColorScale;
    error: ColorScale;
    gray: ColorScale;
    text: TextColors;
    background: string;
    card: string;
    border: string;
    shadow: string;
    white: string;
    black: string;
  }

  interface ColorScale {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  }

  interface TextColors {
    primary: string;
    secondary: string;
    tertiary: string;
  }
  export type Connection= 'pending' | 'accepted' | 'rejected';
  export interface ConnectionItemProps {
    connection: Connection;
    variant: 'connection' | 'received' | 'sent';
    onStartChat?: () => void;
    onRemove?: () => void;
    onAccept?: () => void;
    onReject?: () => void;
    chatButtonColor?: string; // Added chatButtonColor property
  }
  export interface AuthContextType {
    // other properties
    authState?: {
      authenticated: boolean;
    };
  }