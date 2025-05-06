import axiosClient from './axiosClient';
import { User } from '../types/index';

// Fetch current user's profile
export const getCurrentUser = async (): Promise<User> => {
  try {
    console.log('[users.ts] Attempting to fetch current user...'); // Added log
    const response = await axiosClient.get('/api/v1/users/me');
    console.log('[users.ts] getCurrentUser response data:', response.data); // Added log to see the data fetched

    // Return the user data from response
    return response.data.data;
  } catch (error) {
    console.error('Profile fetch failed:', error);
    throw error;
  }
};

// Update user profile with provided data
export const updateUserProfile = async (profile: Partial<User>): Promise<User> => {
  try {
    console.log('[users.ts] Attempting to update profile...'); // Added log
    console.log('[users.ts] updateUserProfile: Data being sent:', profile); // Added log to see what data is sent to the backend

    const response = await axiosClient.put('/api/v1/users/me', profile);

    console.log('[users.ts] updateUserProfile: Received response status:', response.status); // Added log for status
    console.log('[users.ts] updateUserProfile: Received response data:', response.data); // Added log to see the response data

    // Return the updated user data from response
    // Assuming backend sends updated user in response.data.data
    return response.data.data;
  } catch (error: any) { // Added type annotation
    // Handle errors such as unauthorized or server issues
    console.error('Profile update failed:', error.response?.data || error.message || error); // Log more detailed error info

    // Re-throw error to handle it at component level (e.g., show alert)
    throw error;
  }
};