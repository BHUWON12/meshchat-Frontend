import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

let API_BASE_URL = '';

if (Constants.expoConfig?.extra?.apiUrl) {
  API_BASE_URL = Constants.expoConfig.extra.apiUrl;
} else {
  // Use your laptop's local IP address and backend port for local development
  API_BASE_URL = 'https://comparative-lizzy-bhuwonsorg-d68d66cf.koyeb.app';
}

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 6000,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to retrieve auth token:', error);
    }

    console.log(`➡️ ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized access, possibly invalid token');
    }

    console.error('Response Error:', error);
    return Promise.reject(error);
  }
);

export default axiosClient;