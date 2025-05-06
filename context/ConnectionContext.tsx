import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { mockDevices } from '../services/mockData';
import { Device } from '../types/index';

interface ConnectionContextType {
  nearbyDevices: Device[];
  connectedDevices: Device[];
  isDiscovering: boolean;
  isBluetoothEnabled: boolean;
  isWifiDirectEnabled: boolean;
  discoverDevices: () => void;
  connectToDevice: (deviceId: string) => void;
  disconnectFromDevice: (deviceId: string) => void;
  toggleBluetooth: () => void;
  toggleWifiDirect: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [nearbyDevices, setNearbyDevices] = useState<Device[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<Device[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [isWifiDirectEnabled, setIsWifiDirectEnabled] = useState(false);
  
  // Use refs to track mounted state and store timeouts
  const isMounted = useRef(true);
  const discoveryTimeout = useRef<NodeJS.Timeout>();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (discoveryTimeout.current) {
        clearTimeout(discoveryTimeout.current);
      }
    };
  }, []);

  const discoverDevices = () => {
    setIsDiscovering(true);

    // Clear any existing timeout
    if (discoveryTimeout.current) {
      clearTimeout(discoveryTimeout.current);
    }

    // Set new timeout
    discoveryTimeout.current = setTimeout(() => {
      if (isMounted.current) {
        // Filter based on enabled connection types
        let discoveredDevices = mockDevices.filter(device => {
          if (device.type === 'bluetooth' && !isBluetoothEnabled) return false;
          if (device.type === 'wifi' && !isWifiDirectEnabled) return false;
          return true;
        });
        
        // Remove already connected devices
        discoveredDevices = discoveredDevices.filter(
          device => !connectedDevices.some(connected => connected.id === device.id)
        );
        
        setNearbyDevices(discoveredDevices);
        setIsDiscovering(false);
      }
    }, 2000);
  };

  const connectToDevice = (deviceId: string) => {
    if (!isMounted.current) return;

    const device = nearbyDevices.find(d => d.id === deviceId);
    
    if (device) {
      setNearbyDevices(prev => prev.filter(d => d.id !== deviceId));
      setConnectedDevices(prev => [...prev, device]);
    }
  };

  const disconnectFromDevice = (deviceId: string) => {
    if (!isMounted.current) return;

    const device = connectedDevices.find(d => d.id === deviceId);
    
    if (device) {
      setConnectedDevices(prev => prev.filter(d => d.id !== deviceId));
      
      // Add back to nearby devices if connection type is still enabled
      if (
        (device.type === 'bluetooth' && isBluetoothEnabled) ||
        (device.type === 'wifi' && isWifiDirectEnabled)
      ) {
        setNearbyDevices(prev => [...prev, device]);
      }
    }
  };

  const toggleBluetooth = () => {
    if (!isMounted.current) return;

    const newState = !isBluetoothEnabled;
    setIsBluetoothEnabled(newState);
    
    // Update device list based on new state
    if (!newState) {
      setNearbyDevices(prev => prev.filter(d => d.type !== 'bluetooth'));
    } else {
      discoverDevices();
    }
  };

  const toggleWifiDirect = () => {
    if (!isMounted.current) return;

    const newState = !isWifiDirectEnabled;
    setIsWifiDirectEnabled(newState);
    
    // Update device list based on new state
    if (!newState) {
      setNearbyDevices(prev => prev.filter(d => d.type !== 'wifi'));
    } else {
      discoverDevices();
    }
  };

  useEffect(() => {
    // Initialize with Bluetooth enabled by default
    if (isMounted.current) {
      setIsBluetoothEnabled(true);
    }
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        nearbyDevices,
        connectedDevices,
        isDiscovering,
        isBluetoothEnabled,
        isWifiDirectEnabled,
        discoverDevices,
        connectToDevice,
        disconnectFromDevice,
        toggleBluetooth,
        toggleWifiDirect,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}