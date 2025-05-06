import axiosClient from './axiosClient';
import { User } from '../types/index';

export const contacts = {
  // Connection management
  getConnections: async (): Promise<User[]> => {
    try {
      const { data } = await axiosClient.get('/api/v1/connections');
      return data.data;
    } catch (error) {
      console.error('Failed to get connections:', error);
      throw error;
    }
  },

  sendRequest: async (userId: string): Promise<void> => {
    try {
      await axiosClient.post(`/api/v1/connections/request/${userId}`);
    } catch (error) {
      console.error('Failed to send connection request:', error);
      throw error;
    }
  },

  respondToRequest: async (requestId: string, action: 'accept' | 'reject'): Promise<void> => {
    try {
      await axiosClient.post(`/api/v1/connections/respond/${requestId}`, { action });
    } catch (error) {
      console.error('Failed to respond to request:', error);
      throw error;
    }
  },

  removeConnection: async (connectionId: string): Promise<void> => {
    try {
      await axiosClient.delete(`/api/v1/connections/${connectionId}`);
    } catch (error) {
      console.error('Failed to remove connection:', error);
      throw error;
    }
  },

  cancelRequest: async (userId: string): Promise<void> => {
    try {
      await axiosClient.delete(`/api/v1/connections/${userId}`);
    } catch (error) {
      console.error('Failed to cancel request:', error);
      throw error;
    }
  },

  // Status checking
  checkRequestStatus: async (userId: string): Promise<{ exists: boolean; status: string }> => {
    try {
      const { data } = await axiosClient.get(`/api/v1/connections/request/check/${userId}`);
      return { exists: data.exists, status: data.status };
    } catch (error) {
      console.error('Failed to check request status:', error);
      throw error;
    }
  },

  checkConnectionStatus: async (userId: string): Promise<{ isConnected: boolean }> => {
    try {
      const { data } = await axiosClient.get(`/api/v1/connections/check/${userId}`);
      return { isConnected: data.isConnected };
    } catch (error) {
      console.error('Failed to check connection status:', error);
      throw error;
    }
  },

  // User search
  searchUsers: async (email: string): Promise<User[]> => {
    try {
      const { data } = await axiosClient.get('/api/v1/users/search', { params: { email } });
      return data.data;
    } catch (error) {
      console.error('Failed to search users:', error);
      throw error;
    }
  }
};


// Full exports section should now look like:
export const getConnections = contacts.getConnections;
export const sendConnectionRequest = contacts.sendRequest;
export const respondToRequest = contacts.respondToRequest;
export const removeConnection = contacts.removeConnection;
export const cancelConnectionRequest = contacts.cancelRequest;
export const checkConnectionRequest = contacts.checkRequestStatus;
export const checkConnectionRequestByUser = contacts.checkRequestStatus; // ✅ Added
export const checkConnectionStatus = contacts.checkConnectionStatus;
export const searchUsersByEmail = contacts.searchUsers;