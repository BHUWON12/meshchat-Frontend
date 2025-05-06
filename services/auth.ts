import axiosClient from './axiosClient';
import { User } from '../types/index';

// services/auth.ts
// ...
interface AuthResponse {
  user: User;
  token: string;
}
// ...

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>('/api/v1/auth/login', { email, password });
  return data;
}

export async function register(email: string, password: string, username: string): Promise<AuthResponse> {
  const { data } = await axiosClient.post<AuthResponse>('/api/v1/auth/register', { email, password, username });
  return data;
}

// Helper to set token in axios headers globally
export function setAuthToken(token: string | null) {
  if (token) {
    axiosClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosClient.defaults.headers.common['Authorization'];
  }
}
