import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { getInitials, getUserAvatar } from '../utils/helpers';

type UserAvatarProps = {
  uri?: string;
  name?: string;
  size?: number;
  showStatus?: boolean;
  isOnline?: boolean;
  style?: any;
};

export default function UserAvatar({
  uri,
  name,
  size = 40,
  showStatus = false,
  isOnline = false,
  style,
}: UserAvatarProps) {
  const avatarUrl = uri ? uri : name ? undefined : getUserAvatar();
  const initial = name ? getInitials(name) : '';
  
  // Status indicator size based on avatar size
  const statusSize = Math.max(10, size / 4);
  const statusBorderWidth = Math.max(2, statusSize / 5);
  
  return (
    <View style={[styles.container, style]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.avatar,
            { width: size, height: size, borderRadius: size / 2 }
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2 }
          ]}
        >
          <Text
            style={[
              styles.initial,
              { fontSize: size / 2 }
            ]}
          >
            {initial}
          </Text>
        </View>
      )}
      
      {showStatus && (
        <View
          style={[
            styles.statusIndicator,
            isOnline ? styles.online : styles.offline,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              borderWidth: statusBorderWidth,
              right: 0,
              bottom: 0,
            }
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: Colors.common.gray[200],
  },
  fallback: {
    backgroundColor: Colors.primary[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: Colors.common.white,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    borderColor: Colors.common.white,
  },
  online: {
    backgroundColor: Colors.connection.online,
  },
  offline: {
    backgroundColor: Colors.connection.offline,
  },
});