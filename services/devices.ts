import axiosClient from './axiosClient';
import { Device } from '../types/index';

export async function getNearbyDevices(): Promise<Device[]> {
  const { data } = await axiosClient.get<Device[]>('/api/v1/devices/nearby');
  return data;
}

export async function connectToDevice(deviceId: string): Promise<{ success: boolean; device?: Device }> {
  const { data } = await axiosClient.post('/api/v1/devices/connect', { deviceId });
  return data;
}

export async function disconnectFromDevice(deviceId: string): Promise<{ success: boolean }> {
  const { data } = await axiosClient.post('/api/v1/devices/disconnect', { deviceId });
  return data;
}
