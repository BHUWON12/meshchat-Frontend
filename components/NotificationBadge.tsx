import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { useNotifications } from '../context/NotificationContext';

interface NotificationBadgeProps {
  size?: 'small' | 'medium' | 'large';
  style?: object;
}

export default function NotificationBadge({ size = 'medium', style }: NotificationBadgeProps) {
  const { unreadCount } = useNotifications?.() || { unreadCount: 0 };

  if (unreadCount <= 0) return null;

  const sizeStyles = {
    small: {
      width: 16,
      height: 16,
      fontSize: 10,
      borderRadius: 8,
      top: -8,
      right: -6
    },
    medium: {
      width: 20,
      height: 20,
      fontSize: 12,
      borderRadius: 10,
      top: -10,
      right: -8
    },
    large: {
      width: 24,
      height: 24,
      fontSize: 14,
      borderRadius: 12,
      top: -12,
      right: -10
    }
  };

  const { width, height, fontSize, borderRadius, top, right } = sizeStyles[size];

  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <View
      style={[
        styles.badge,
        {
          width,
          height,
          borderRadius,
          top,
          right
        },
        style
      ]}
    >
      <Text style={[styles.count, { fontSize }]}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    backgroundColor: Colors.common.red[500],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  count: {
    color: Colors.common.white,
    fontWeight: '600',
  }
});
