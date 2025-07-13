import React, { useCallback } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

export default function ConnectionToggle() {
  const { isOnlineMode, setIsOnlineMode, isConnected } = useSocket();
  const { showToast } = useToast();
  
  const handleToggle = useCallback((value: boolean) => {
    console.log(`ConnectionToggle: Toggling to ${value ? 'online' : 'offline'} mode`);
    setIsOnlineMode(value);
    
    // Show feedback to user
    if (value) {
      showToast?.('Switching to online mode...', 'info');
    } else {
      showToast?.('Switching to offline mode...', 'info');
    }
  }, [setIsOnlineMode, showToast]);
  
  const getStatusText = () => {
    if (!isOnlineMode) {
      return 'Bluetooth/Wi-Fi Direct';
    }
    
    if (isConnected) {
      return 'Connected to server';
    } else {
      return 'Connecting...';
    }
  };
  
  const getStatusColor = () => {
    if (!isOnlineMode) {
      return 'rgba(255, 255, 255, 0.7)';
    }
    
    if (isConnected) {
      return 'rgba(255, 255, 255, 0.9)';
    } else {
      return 'rgba(255, 255, 255, 0.6)';
    }
  };
  
  return (
    <LinearGradient
      colors={[Colors.primary[700], Colors.primary[600]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {isOnlineMode ? (
            isConnected ? (
              <Wifi size={20} color={Colors.common.white} />
            ) : (
              <AlertCircle size={20} color={Colors.common.white} />
            )
          ) : (
            <WifiOff size={20} color={Colors.common.white} />
          )}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isOnlineMode ? 'Online Mode' : 'Offline Mode'}
          </Text>
          <Text style={[styles.subtitle, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        
        <Switch
          value={isOnlineMode}
          onValueChange={handleToggle}
          trackColor={{ false: Colors.common.gray[300], true: Colors.accent.lime }}
          thumbColor={Colors.common.white}
          ios_backgroundColor={Colors.common.gray[300]}
          style={styles.switch}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.common.white,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
});