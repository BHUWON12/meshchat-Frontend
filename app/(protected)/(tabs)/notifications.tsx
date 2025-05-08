import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, MessageSquare, UserPlus, CheckCircle, XCircle } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { debounce } from 'lodash';

import Colors from '../../../constants/Colors';
import { formatMessageDate } from '../../../utils/helpers';

import { Notification, useNotifications, NotificationType } from '../../../context/NotificationContext';
import NotificationItem from '../../../components/NotificationItem';

export default function NotificationsScreen() {
  const { notifications, unreadCount, loading, error, fetchNotifications, markAllAsRead, markAsRead } = useNotifications?.() || {};

  // Debounce the fetchNotifications function to prevent rapid successive calls
  const debouncedFetchNotifications = useCallback(debounce(fetchNotifications, 500), [fetchNotifications]);

  // Fetch notifications and mark all as read when the screen comes into focus
 // In NotificationsScreen.tsx
useFocusEffect(
  useCallback(() => {
    console.log("NotificationsScreen: Screen focused.");
    if (!notifications || notifications.length === 0) {
      debouncedFetchNotifications();
    }

    const markReadTimer = setTimeout(() => {
      if (unreadCount > 0) {
        console.log(`NotificationsScreen: Marking ${unreadCount} notifications as read on focus.`);
        markAllAsRead?.();
      } else {
        console.log("NotificationsScreen: No unread notifications to mark as read on focus.");
      }
    }, 500);

    return () => {
      console.log("NotificationsScreen: Screen blurred.");
      clearTimeout(markReadTimer);
      debouncedFetchNotifications.cancel();
    };
  }, [debouncedFetchNotifications, markAllAsRead, unreadCount, notifications])
);


  const renderNotificationItem = useCallback(({ item }: { item: Notification }) => {
    return (
      <NotificationItem
        notification={item}
      />
    );
  }, []);

  const isEmpty = !loading && !error && notifications?.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: Colors.common.error }]}>Error: {error}</Text>
          <TouchableOpacity onPress={debouncedFetchNotifications} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && isEmpty && !error && (
        <View style={styles.emptyStateContainer}>
          <Bell size={80} color={Colors.common.gray[400]} />
          <Text style={styles.emptyStateText}>No notifications yet.</Text>
          <Text style={styles.emptyStateSubText}>You'll see connection requests, messages, and other alerts here.</Text>
        </View>
      )}

      {!loading && !error && notifications && notifications.length > 0 && (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          onRefresh={debouncedFetchNotifications}
          refreshing={loading}
        />
      )}
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
    padding: 16,
    backgroundColor: Colors.common.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[200],
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.common.gray[900],
    fontFamily: 'Poppins-Bold',
    flex: 1,
  },
  headerBadge: {
    backgroundColor: Colors.common.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 10,
  },
  headerBadgeText: {
    color: Colors.common.white,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: Colors.primary[500],
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  retryButtonText: {
    color: Colors.common.white,
    fontSize: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.common.gray[700],
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubText: {
    fontSize: 14,
    color: Colors.common.gray[500],
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
