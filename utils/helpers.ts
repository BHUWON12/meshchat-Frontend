import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { DEFAULT_AVATAR } from './constants';

// Format a date based on how recent it is
export const formatMessageDate = (date: string | Date): string => {
  const messageDate = new Date(date);
  
  if (isToday(messageDate)) {
    return format(messageDate, 'h:mm a');
  } else if (isYesterday(messageDate)) {
    return 'Yesterday';
  } else if (messageDate.getFullYear() === new Date().getFullYear()) {
    return format(messageDate, 'MMM d');
  } else {
    return format(messageDate, 'MMM d, yyyy');
  }
};

// Get time ago format (e.g., "5 minutes ago", "2 hours ago")
export const getTimeAgo = (date: string | Date): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// Get the first letter as an avatar fallback
export const getInitials = (name: string): string => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

// Get user avatar with fallback
export const getUserAvatar = (avatar?: string): string => {
  return avatar || DEFAULT_AVATAR;
};

// Truncate text to a certain length
export const truncateText = (text: string, maxLength: number = 30): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Extract the recipient from a chat
export const getChatRecipient = (participants: any[], currentUserId: string) => {
  return participants.find(user => user.id !== currentUserId || user._id !== currentUserId);
};

// Generate a chat name from participants
export const getChatName = (chat: any, currentUserId: string): string => {
  if (chat.name) return chat.name;
  
  const otherParticipant = chat.participants?.find(
    (p: any) => p.id !== currentUserId && p._id !== currentUserId
  );
  
  return otherParticipant?.username || 'Unknown Chat';
};

// Check if a message is from the current user
export const isOwnMessage = (message: any, userId: string): boolean => {
  return message.sender === userId || message.sender?._id === userId;
};

// Debounce function for search inputs etc.
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function(...args: Parameters<T>): void {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}