import { PermissionsAndroid, Platform } from 'react-native';

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const permission = Platform.Version >= 29 
      ? PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      : PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

    const granted = await PermissionsAndroid.request(permission, {
      title: 'Location Permission',
      message: 'This app needs location permission to discover nearby devices for Wi-Fi Direct chat.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    });

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Error requesting location permission:', err);
    return false;
  }
};

export const requestNearbyWifiDevicesPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
      {
        title: 'Nearby Wi-Fi Devices Permission',
        message: 'This app needs to discover nearby Wi-Fi devices for offline chat.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Error requesting nearby Wi-Fi devices permission:', err);
    return false;
  }
};

export const checkAllPermissions = async (): Promise<{
  location: boolean;
  nearbyWifi: boolean;
}> => {
  const location = await requestLocationPermission();
  const nearbyWifi = await requestNearbyWifiDevicesPermission();
  
  return { location, nearbyWifi };
}; 