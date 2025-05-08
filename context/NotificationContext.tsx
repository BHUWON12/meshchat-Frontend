import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import axiosClient from '../services/axiosClient';

export type NotificationType = 'message' | 'connection_request' | 'connection_accepted' | 'system';

export interface Notification {
  _id: string;
  user: string;
  type: NotificationType;
  read: boolean;
  data?: any;
  createdAt: string;
  sender?: {
    _id: string;
    username: string;
    avatar?: string;
  };
  message?: {
    _id: string;
    content: string;
    chat: string;
    sender?: {
      _id: string;
      username: string;
      avatar?: string;
    };
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string, skipBackendUpdate?: boolean) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("NotificationContext: Authenticated, fetching notifications...");
      fetchNotifications();
    } else {
      console.log("NotificationContext: Not authenticated or user logged out, clearing notifications.");
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setLoading(false);
    }
    return () => {
      console.log("NotificationContext: Provider unmounting, clearing notifications.");
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setLoading(false);
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
    console.log("NotificationContext: Unread count updated:", count);
  }, [notifications]);

  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      console.log("NotificationContext: Not authenticated, skipping fetch.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("NotificationContext: Calling API to get notifications...");
      const { data } = await axiosClient.get('/api/v1/notifications');

      if (Array.isArray(data)) {
        const sortedNotifications = data.sort((a: Notification, b: Notification) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotifications(sortedNotifications);
        console.log("NotificationContext: Notifications fetched successfully.", sortedNotifications.length);
      } else {
        console.warn("NotificationContext: Received non-array data when fetching notifications:", data);
        setNotifications([]);
        setError("Received unexpected data format.");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch notifications';
      setError(errorMessage);
      console.error('NotificationContext: Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string, skipBackendUpdate = false) => {
    console.log(`NotificationContext: Marking notification ${notificationId} as read (skipBackendUpdate: ${skipBackendUpdate}).`);
    if (!notificationId) {
      console.warn("NotificationContext: markAsRead called with null/undefined notificationId.");
      return;
    }

    setNotifications(prev => {
      const notificationIndex = prev.findIndex(n => n._id === notificationId);
      if (notificationIndex === -1 || prev[notificationIndex].read) {
        console.log(`NotificationContext: Notification ${notificationId} not found or already read locally. Skipping local update.`);
        return prev;
      }

      const newNotifications = [...prev];
      newNotifications[notificationIndex] = {
        ...newNotifications[notificationIndex],
        read: true,
      };
      console.log(`NotificationContext: Optimistically marked notification ${notificationId} as read locally.`);
      return newNotifications;
    });

    if (!skipBackendUpdate && isAuthenticated) {
      console.log(`NotificationContext: Sending backend request to mark ${notificationId} as read.`);
      try {
        await axiosClient.patch(`/api/v1/notifications/${notificationId}/read`);
        console.log(`NotificationContext: Backend update successful for notification ${notificationId}.`);
      } catch (err: any) {
        console.error('NotificationContext: Error marking notification as read on backend:', err);
      }
    } else if (!isAuthenticated && !skipBackendUpdate) {
      console.warn("NotificationContext: Not authenticated, skipping backend markAsRead update.");
    }
  };

  const markAllAsRead = async () => {
    if (!isAuthenticated) {
      console.log("NotificationContext: Not authenticated, skipping markAllAsRead.");
      return;
    }
    if (unreadCount === 0) {
      console.log("NotificationContext: No unread notifications, skipping markAllAsRead.");
      return;
    }

    console.log("NotificationContext: Marking all notifications as read.");
    setNotifications(prev => {
      const hasUnread = prev.some(n => !n.read);
      if (!hasUnread) {
        console.log("NotificationContext: No unread notifications locally. Skipping local markAllAsRead.");
        return prev;
      }
      const newNotifications = prev.map(n => ({ ...n, read: true }));
      console.log("NotificationContext: Optimistically marked all notifications as read locally.");
      return newNotifications;
    });

    try {
      console.log("NotificationContext: Sending backend request to mark all as read.");
      await axiosClient.patch('/api/v1/notifications/read-all');
      console.log("NotificationContext: Backend update successful for markAllAsRead.");
    } catch (err: any) {
      console.error('NotificationContext: Error marking all notifications as read on backend:', err);
    }
  };

  const addNotification = (notification: Notification) => {
    console.log("NotificationContext: Adding new notification locally:", notification);
    setNotifications(prev => {
      if (notification._id && prev.some(n => n._id === notification._id)) {
        console.log(`NotificationContext: Notification with ID ${notification._id} already exists. Skipping.`);
        return prev;
      }
      return [notification, ...prev].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
