import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { WifiOff, MapPinOff, ShieldOff } from 'lucide-react-native';
import Colors from '../constants/Colors';
import wifiDirectService, { WifiDirectStatus } from '../services/wifiDirect';
import { requestLocationPermission } from '../utils/permissions';

interface WifiDirectStatusCheckerProps {
  onStatusChange?: (status: WifiDirectStatus) => void;
}

export default function WifiDirectStatusChecker({ onStatusChange }: WifiDirectStatusCheckerProps) {
  const [status, setStatus] = useState<WifiDirectStatus | null>(null);
  const [showWifiBanner, setShowWifiBanner] = useState(true);
  const [showLocationPermBanner, setShowLocationPermBanner] = useState(true);
  const [showLocationBanner, setShowLocationBanner] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') return; // Don't run native checks on web
    checkStatus();
    const events = [
      'onWifiEnabled', 'onWifiDisabled',
      'onLocationEnabled', 'onLocationDisabled',
      'onLocationPermissionGranted', 'onLocationPermissionDenied',
      'onWifiDirectSupported', 'onWifiDirectUnsupported'
    ];
    events.forEach(eventType => {
      wifiDirectService.addEventListener(eventType, checkStatus);
    });
    return () => {
      wifiDirectService.removeAllListeners();
    };
  }, []);

  const checkStatus = async () => {
    try {
      const currentStatus = await wifiDirectService.getStatus();
      setStatus(currentStatus);
      onStatusChange?.(currentStatus);
    } catch (error) {
      // Optionally handle error
    }
  };

  // --- WEB: Always show a non-blocking banner, never block UI ---
  if (Platform.OS === 'web') {
    return (
      <View style={styles.bannerContainer} pointerEvents="box-none">
        <View style={[styles.banner, { backgroundColor: Colors.warning }]}> 
          <Text style={styles.bannerText}>
            Wi-Fi Direct is not supported on web. Device discovery is disabled, but you can view your chat history and recent chats.
          </Text>
        </View>
      </View>
    );
  }

  if (!status) return null;

  return (
    <View style={styles.bannerContainer} pointerEvents="box-none">
      {/* Wi-Fi Off Banner */}
      {!status.isWifiEnabled && showWifiBanner && (
        <View style={[styles.banner, { backgroundColor: Colors.error }]}> 
          <WifiOff size={18} color={Colors.common.white} style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>Wi-Fi is off.</Text>
          <TouchableOpacity style={styles.bannerAction} onPress={async () => {
            await wifiDirectService.enableWifi();
            checkStatus();
          }}>
            <Text style={styles.bannerActionText}>Enable Wi-Fi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bannerDismiss} onPress={() => setShowWifiBanner(false)}>
            <Text style={styles.bannerDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Location Permission Banner */}
      {!status.hasLocationPermission && showLocationPermBanner && (
        <View style={[styles.banner, { backgroundColor: Colors.warning }]}> 
          <ShieldOff size={18} color={Colors.common.white} style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>Location permission required.</Text>
          <TouchableOpacity style={styles.bannerAction} onPress={async () => {
            await requestLocationPermission();
            checkStatus();
          }}>
            <Text style={styles.bannerActionText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bannerDismiss} onPress={() => setShowLocationPermBanner(false)}>
            <Text style={styles.bannerDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Location Services Banner */}
      {!status.isLocationEnabled && showLocationBanner && (
        <View style={[styles.banner, { backgroundColor: Colors.info }]}> 
          <MapPinOff size={18} color={Colors.common.white} style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>Location services are off.</Text>
          <TouchableOpacity style={styles.bannerAction} onPress={async () => {
            await wifiDirectService.openLocationSettings();
            checkStatus();
          }}>
            <Text style={styles.bannerActionText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bannerDismiss} onPress={() => setShowLocationBanner(false)}>
            <Text style={styles.bannerDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'column',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    marginHorizontal: 8,
    minWidth: 300,
    maxWidth: 400,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bannerText: {
    color: Colors.common.white,
    fontWeight: '600',
    fontSize: 14,
    marginRight: 8,
  },
  bannerAction: {
    backgroundColor: Colors.common.white,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  bannerActionText: {
    color: Colors.primary[500],
    fontWeight: 'bold',
    fontSize: 13,
  },
  bannerDismiss: {
    marginLeft: 4,
    padding: 2,
  },
  bannerDismissText: {
    color: Colors.common.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 