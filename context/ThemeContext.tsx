// context/ThemeContext.tsx - Improved

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Appearance, useColorScheme } from 'react-native'; // useColorScheme hook is good
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

// Assuming your theme objects (containing colors etc.) are defined and exported from ../theme/index
import { lightTheme, darkTheme } from '../theme/index';
// Assuming your Theme type is defined in ../types/index and includes things like a `colors` property
import { Theme } from '../types/index'; // Assuming Theme type is here

// Define the possible theme modes (these are the user's preferences)
type ThemeMode = 'light' | 'dark' | 'system';

// Define the shape of the data provided by the Theme Context
interface ThemeContextType {
  themeMode: ThemeMode; // The user's selected preference ('light', 'dark', or 'system')
  activeTheme: Theme; // The actively applied theme object (either lightTheme or darkTheme)
  setThemeMode: (mode: ThemeMode) => Promise<void>; // Function to change the theme mode preference and save it
  // You might still want toggleTheme for convenience, it will now call setThemeMode
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'userThemePreference'; // Key for AsyncStorage

export function ThemeProvider({ children }: { children: ReactNode }) {
  // State to hold the user's preferred mode ('light', 'dark', or 'system'). Default to 'system' initially.
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  // Get the current system color scheme reactively. This hook updates when the OS theme changes.
  const systemColorScheme = useColorScheme(); // 'light' | 'dark' | null

  // Determine the actively applied theme object (lightTheme or darkTheme).
  // This is derived based on the user's preference AND the current system setting if 'system' is preferred.
  const activeTheme = useMemo(() => {
    let modeToApply: 'light' | 'dark';

    if (themeMode === 'system') {
      // If the user prefers the system theme, use the actual system color scheme.
      // Default to 'light' if systemColorScheme is null (e.g., on some platforms or simulators).
      modeToApply = systemColorScheme === 'dark' ? 'dark' : 'light';
    } else {
      // If the user has a specific preference ('light' or 'dark'), use that preference.
      modeToApply = themeMode;
    }

    // Return the corresponding theme object based on the determined mode.
    return modeToApply === 'dark' ? darkTheme : lightTheme;

  }, [themeMode, systemColorScheme]); // Re-calculate the active theme whenever the user's preference or the system scheme changes.

  // --- Effect to Load User's Saved Preference on App Start ---
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        // Check if a valid preference was stored.
        if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system')) {
          // If a valid preference was found, set it as the initial themeMode state.
          setThemeModeState(storedTheme as ThemeMode);
        } else {
          // If no valid preference or storage is empty, default to 'system' mode.
          setThemeModeState('system');
        }
      } catch (error) {
        console.error('Failed to load theme preference from storage:', error);
        // In case of any error during loading, default to 'system' mode.
        setThemeModeState('system');
      }
    };
    loadThemePreference(); // Run this effect only once on component mount.
  }, [setThemeModeState]); // Depend on the state setter to satisfy ESLint, though it's stable.


  // --- Function to Allow Components to Change the Theme Mode Preference and Save It ---
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
      try {
        setThemeModeState(mode); // Update the local state to the new preferred mode.

        // Save the user's preference to storage.
        if (mode !== 'system') {
           // If the user chose light or dark, save that specific preference.
           await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        } else {
           // If the user chose 'system', remove any previously saved preference.
           await AsyncStorage.removeItem(THEME_STORAGE_KEY);
        }
      } catch (error) {
         console.error('Failed to set or save theme preference:', error);
         // Optionally show an error message to the user if saving fails.
      }
  }, [setThemeModeState]); // Depend on the state setter to satisfy ESLint.


   // --- Convenience function to Toggle Theme ---
   // This function toggles between manual light and dark modes.
   // If the user is currently in 'system' mode, it will switch them to a manual mode
   // based on what theme is currently active ('light' if active is dark, 'dark' if active is light).
   const toggleTheme = useCallback(async () => {
       let nextMode: ThemeMode;
       // If currently in system mode, the toggle should switch them to a manual override.
       // We determine the next manual mode based on what theme is currently active.
       if (themeMode === 'system') {
           // If system is currently resulting in the dark theme, toggle to manual light.
           // If system is currently resulting in the light theme, toggle to manual dark.
           nextMode = activeTheme === darkTheme ? 'light' : 'dark';
       } else {
           // If currently in manual light or dark, simply toggle to the other manual mode.
           nextMode = themeMode === 'light' ? 'dark' : 'light';
       }
       // Use the primary setter function to update state and handle storage.
       await setThemeMode(nextMode);
   }, [themeMode, activeTheme, setThemeMode]); // Depend on relevant states and the setter.


  // --- Provide the Context Value ---
  // Memoize the context value to prevent unnecessary re-renders of consumers.
  const contextValue = useMemo(() => ({
    themeMode, // The user's preference ('light', 'dark', 'system')
    activeTheme, // The actively applied theme object (lightTheme or darkTheme)
    setThemeMode, // Function to change user preference and save
    toggleTheme, // Convenience toggle function
  }), [themeMode, activeTheme, setThemeMode, toggleTheme]); // Depend on all values in the context value.


  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to easily access the theme context.
// Use this hook in any component that needs theme information.
export function useTheme() {
  const context = useContext(ThemeContext);
  // Throw an error if the hook is used outside of a ThemeProvider.
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}