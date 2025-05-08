// components/ToastItem.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ToastItemProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const ToastItem: React.FC<ToastItemProps> = ({ message, type }) => {
  return (
    <View style={[styles.toast, styles[type]]}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
  },
  message: {
    color: '#fff',
  },
  success: {
    backgroundColor: '#4BB543',
  },
  error: {
    backgroundColor: '#FF3B30',
  },
  info: {
    backgroundColor: '#007AFF',
  },
  warning: {
    backgroundColor: '#FF9500',
  },
});

export default ToastItem;
