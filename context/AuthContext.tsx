// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { storage } from '../utils/storage';
import { User } from '../types/index';
import * as authApi from '../services/auth';
import { getCurrentUser, updateUserProfile } from '../services/users';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loadingUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<User>;
  refreshUser: () => Promise<User | null>;
  authToken: string | null; // Add authToken to the type
  isAuthenticated: boolean; // Add isAuthenticated to the type
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null); // Add authToken state
  const isAuthenticated = !!user; // Derive isAuthenticated from user state

  const handleTokenUpdate = useCallback(async (token: string | null) => {
    try {
      if (token) {
        await storage.setItem('token', token);
        authApi.setAuthToken(token);
        setAuthToken(token); // Update authToken state
      } else {
        await storage.deleteItem('token');
        authApi.setAuthToken(null);
        setAuthToken(null); // Update authToken state
      }
    } catch (error) {
      console.error('[Auth] Token update failed:', error);
      throw new Error('Failed to update authentication token');
    }
  }, []);

  const loadUser = useCallback(async () => {
    setLoadingUser(true);
    try {
      const token = await storage.getItem('token');
      if (!token) {
        setUser(null);
        setAuthToken(null); // Set authToken to null
        setLoadingUser(false);
        return;
      }
      authApi.setAuthToken(token);
      setAuthToken(token); // Set authToken state
      const userData = await getCurrentUser();
      setUser(userData ?? null);
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Only clear token and log out on 401
        await handleTokenUpdate(null);
        setUser(null);
      } else {
        // For other errors (like network), show error UI or retry
        // Optionally: set an error state here for the UI
        setUser(null); // or keep previous user if you want
      }
    } finally {
      setLoadingUser(false);
    }
  }, [handleTokenUpdate]);


  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const responseData = await authApi.login(email, password);

      console.log('[AuthContext] Login API response data:', responseData);

      // --- FIX IS ON THIS LINE ---
      // Correctly extract the token and user data
      const token = responseData.token;
      const userData = responseData.data?.user; // <<< Make SURE you have '.data?' here
      // --- FIX END ---

      console.log('[AuthContext] Received token AFTER extraction:', token ? 'Exists' : 'Null/Undefined');
      console.log('[AuthContext] Received userData AFTER extraction:', userData); // This should now show the user object

      if (token && userData) { // This check now correctly uses the extracted data
          await handleTokenUpdate(token);
          setUser(userData); // This line will now be called with the actual user object

          console.log('[AuthContext] User state set. app/_layout.tsx should now detect this and redirect.');

      } else {
          console.warn('[AuthContext] Login response missing token or nested user data.');
          await handleTokenUpdate(null);
          setUser(null);
      }

    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      await handleTokenUpdate(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] Login process finished.');
    }
  };

  const register = async (username: string, email: string, password: string) => { // <<< Correct signature
    setIsLoading(true);
    try {
      // --- FIX START ---
      // Call authApi.register, passing the parameters *from this function's scope*
      // in the order that authApi.register *expects* them (email, password, username).
      const responseData = await authApi.register(email, password, username); // <<< CORRECTED ORDER for authApi.register call

      // Destructure the responseData object based on your API's structure: { status, token, data: { user } }
      const token = responseData.token; // Token is top-level
      const userData = responseData.data?.user; // User is nested under 'data'
      // --- FIX END ---

      console.log('[AuthContext] Registration API response data:', responseData); // Log the received data
      console.log('[AuthContext] Received token AFTER extraction:', token ? 'Exists' : 'Null/Undefined');
      console.log('[AuthContext] Received userData AFTER extraction:', userData);

      if (token && userData) { // Check if both were successfully extracted
         await handleTokenUpdate(token);
         setUser(userData); // Set the user state
         console.log('[AuthContext] Registration successful, user set.');
         // Navigation to protected area is handled by app/_layout.tsx
      } else {
         console.warn('[AuthContext] Registration API response missing token or nested user data.');
         await handleTokenUpdate(null); // Clear any partial token
         setUser(null); // Ensure user state is null
         // Optionally throw a specific error if the response structure is unexpected
         // throw new Error('Registration failed: Invalid response format from server.');
      }

    } catch (error) {
      console.error('[AuthContext] Registration failed:', error); // Log the error that was thrown
      await handleTokenUpdate(null); // Clear any token on failure
      setUser(null); // Ensure user state is null on failure
      throw error; // Re-throw the error so SignUpScreen can handle it
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] Registration process finished.');
    }
  };

  const logout = async () => {
    console.log('[Auth] Starting logout process...');
    try {
      // Clear the token first
      await handleTokenUpdate(null);
      console.log('[Auth] Token cleared successfully');
      
      // Clear user state
      setUser(null);
      console.log('[Auth] User state cleared successfully');
      
      // Force a navigation update by triggering a re-render
      // This ensures the app navigates to the auth screen
      console.log('[Auth] Logout completed successfully');
      
      // Add a small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('[Auth] Logout failed:', error);
      // Even if there's an error, we should still clear the local state
      setUser(null);
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const updatedUser = await updateUserProfile(data);

      // Merge updates with existing user state
      setUser(prev => ({
        ...prev,
        ...updatedUser
      } as User));

      return updatedUser;
    } catch (error: any) {
      console.error('[Auth] Update failed:', error);

      // Only logout on explicit auth failures
      if (error.response?.status === 401) {
        await logout();
      }
      throw error;
    }
  };

  const refreshUser = async () => {
    setLoadingUser(true);
    try {
      const token = await storage.getItem('token');
      if (!token) {
        await logout();
        return null;
      }

      authApi.setAuthToken(token);
      const userData = await getCurrentUser();

      if (!userData) {
        console.warn('[Auth] Refresh failed - no user data');
        return null;
      }

      setUser(userData);
      return userData;
    } catch (error: any) {
      console.error('[Auth] Refresh failed:', error);
      if (error.response?.status === 401) {
        await logout();
      }
      return null;
    } finally {
      setLoadingUser(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loadingUser,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
        authToken, // Include authToken in the context value
        isAuthenticated, // Include isAuthenticated in the context value
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}