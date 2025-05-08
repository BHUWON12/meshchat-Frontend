import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
}

export default function NotificationBadge({ 
  count, 
  size = 'medium' 
}: NotificationBadgeProps) {
  if (count <= 0) return null;
  
  // Determine size properties
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
  
  // Format count to display (max 99+)
  const displayCount = count > 99 ? '99+' : count.toString();
  
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
        }
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