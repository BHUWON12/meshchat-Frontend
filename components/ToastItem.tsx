// components/ToastItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';

interface ToastItemProps {
  toast: {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
  };
  backgroundColor: string;
  onHide: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, backgroundColor, onHide }) => {
  return (
    <View style={[styles.toast, { backgroundColor }]}>
      <Text style={styles.message}>{toast.message}</Text>
      <TouchableOpacity style={styles.closeButton} onPress={onHide}>
        <X size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  message: {
    color: '#fff',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    flex: 1,
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
  },
});

export default ToastItem;
