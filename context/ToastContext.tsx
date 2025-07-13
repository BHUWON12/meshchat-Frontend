import React, { createContext, useContext, useState, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ToastItem from '../components/ToastItem';// We'll define this separately

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { theme } = useTheme();

  const showToast = (
    message: string,
    type: ToastType = 'info',
    duration = 3000
  ) => {
    const id = Date.now().toString();
    const newToast = { id, message, type, duration };

    setToasts(prev => {
      const maxToasts = 3;
      return [...prev.slice(-maxToasts + 1), newToast];
    });

    // Auto-dismiss toast after duration
    setTimeout(() => {
      hideToast(id);
    }, duration);
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getToastBackground = (type: ToastType) => {
    // Add null checks and fallback colors
    if (!theme || !theme.colors) {
      // Fallback colors if theme is not available
      const fallbackColors = {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
      };
      return fallbackColors[type] || fallbackColors.info;
    }

    try {
      switch (type) {
        case 'success':
          return theme.colors.success?.[500] || '#22c55e';
        case 'error':
          return theme.colors.error?.[500] || '#ef4444';
        case 'warning':
          return theme.colors.warning?.[500] || '#f59e0b';
        case 'info':
        default:
          return theme.colors.primary?.[500] || '#3b82f6';
      }
    } catch (error) {
      console.warn('ToastContext: Error getting toast background color:', error);
      // Fallback colors
      const fallbackColors = {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
      };
      return fallbackColors[type] || fallbackColors.info;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}

      {/* Toast container */}
      <View style={styles.toastContainer}>
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            backgroundColor={getToastBackground(toast.type)}
            onHide={() => hideToast(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
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
  toastText: {
    color: 'white',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    flex: 1,
  },
  closeButton: {
    marginLeft: 12,
  },
});