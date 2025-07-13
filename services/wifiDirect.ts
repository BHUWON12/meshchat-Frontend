import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';

const { WifiDirectModule } = NativeModules;

export interface WifiDirectDevice {
  deviceName: string;
  deviceAddress: string;
  status: 'AVAILABLE' | 'INVITED' | 'CONNECTED' | 'FAILED' | 'UNAVAILABLE' | 'UNKNOWN';
}

export interface WifiDirectEvent {
  type: string;
  data?: any;
}

export interface WifiDirectStatus {
  hasLocationPermission: boolean;
  isWifiEnabled: boolean;
  isLocationEnabled: boolean;
  isWifiDirectSupported: boolean;
}

export interface WifiDirectInterface {
  initialize(): Promise<boolean>;
  startDiscovery(): Promise<boolean>;
  stopDiscovery(): Promise<boolean>;
  connectToDevice(deviceAddress: string): Promise<boolean>;
  disconnect(): Promise<boolean>;
  sendMessage(message: string): Promise<boolean>;
  
  // Permission and status methods
  checkWifiStatus(): Promise<{ isEnabled: boolean }>;
  enableWifi(): Promise<boolean>;
  openWifiSettings(): Promise<boolean>;
  checkLocationPermission(): Promise<{ hasPermission: boolean; permission: string }>;
  checkLocationStatus(): Promise<{ isEnabled: boolean }>;
  openLocationSettings(): Promise<boolean>;
  checkWifiDirectSupport(): Promise<{ isSupported: boolean }>;
  getStatus(): Promise<WifiDirectStatus>;
}

class WifiDirectService implements WifiDirectInterface {
  private eventEmitter: NativeEventEmitter;
  private listeners: EmitterSubscription[] = [];

  constructor() {
    this.eventEmitter = new NativeEventEmitter(WifiDirectModule);
  }

  async initialize(): Promise<boolean> {
    return await WifiDirectModule.initialize();
  }

  async startDiscovery(): Promise<boolean> {
    return await WifiDirectModule.startDiscovery();
  }

  async stopDiscovery(): Promise<boolean> {
    return await WifiDirectModule.stopDiscovery();
  }

  async connectToDevice(deviceAddress: string): Promise<boolean> {
    return await WifiDirectModule.connectToDevice(deviceAddress);
  }

  async disconnect(): Promise<boolean> {
    return await WifiDirectModule.disconnect();
  }

  async sendMessage(message: string): Promise<boolean> {
    return await WifiDirectModule.sendMessage(message);
  }

  // Permission and status methods
  async checkWifiStatus(): Promise<{ isEnabled: boolean }> {
    return await WifiDirectModule.checkWifiStatus();
  }

  async enableWifi(): Promise<boolean> {
    return await WifiDirectModule.enableWifi();
  }

  async openWifiSettings(): Promise<boolean> {
    return await WifiDirectModule.openWifiSettings();
  }

  async checkLocationPermission(): Promise<{ hasPermission: boolean; permission: string }> {
    return await WifiDirectModule.checkLocationPermission();
  }

  async checkLocationStatus(): Promise<{ isEnabled: boolean }> {
    return await WifiDirectModule.checkLocationStatus();
  }

  async openLocationSettings(): Promise<boolean> {
    return await WifiDirectModule.openLocationSettings();
  }

  async checkWifiDirectSupport(): Promise<{ isSupported: boolean }> {
    return await WifiDirectModule.checkWifiDirectSupport();
  }

  async getStatus(): Promise<WifiDirectStatus> {
    return await WifiDirectModule.getStatus();
  }

  addEventListener(eventType: string, callback: (event: WifiDirectEvent) => void): EmitterSubscription {
    const subscription = this.eventEmitter.addListener('WifiDirectEvent', (event: WifiDirectEvent) => {
      if (event.type === eventType) {
        callback(event);
      }
    });
    this.listeners.push(subscription);
    return subscription;
  }

  removeAllListeners(): void {
    this.listeners.forEach(listener => listener.remove());
    this.listeners = [];
  }
}

export default new WifiDirectService(); 