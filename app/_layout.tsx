// app/_layout.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router'; // Import useRouter
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as ExpoSplashScreen from 'expo-splash-screen';

// Context Providers
// Use alias '@' for imports from your root structure if configured, otherwise use relative paths
import { AuthProvider, useAuth } from '../context/AuthContext'; // Import useAuth
import { ThemeProvider } from '../context/ThemeContext'; // Assuming this is correct from your project
// import { ConnectionProvider as DeviceConnectionProvider } from '../context/ConnectionContext'; 
import { SocialConnectionProvider } from '../context/SocialConnectionContext'; // Assuming this is correct from your project
import { MessageProvider } from '../context/MessageContext';
import { ToastProvider } from '../context/ToastContext'; // Assuming this is correct from your project
import { SocketProvider } from '../context/SocketContext'; // Assuming this is correct from your project

// Keep the splash screen visible until we explicitly hide it
ExpoSplashScreen.preventAutoHideAsync();

// Component to wrap the main app logic with all necessary providers
// AuthProvider is handled outside this component now, wrapping the RootLayout
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <ThemeProvider>
        {/* Ensure these provider names and import paths (@/ or ../) are correct */}
        {/* <DeviceConnectionProvider> */}
          <SocialConnectionProvider>
            <MessageProvider>
              <ToastProvider>
                 {/* StatusBar is often fine here */}
                <StatusBar style="light" /> {/* Or "auto" */}
                {children}
              </ToastProvider>
            </MessageProvider>
          </SocialConnectionProvider>
        {/* </DeviceConnectionProvider> */}
      </ThemeProvider>
    </SocketProvider>
  );
}


function RootLayout() {
  // Get auth state and router
  // useAuth can be called here because AuthProvider wraps RootLayout below
  const { user, loadingUser } = useAuth();
  const router = useRouter();

  // State to track if fonts are loaded AND initial auth state is checked
  const [appIsReady, setAppIsReady] = useState(false);

  // Load fonts
  const [fontsLoaded] = useFonts({
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter_18pt-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter_18pt-Medium.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter_18pt-Bold.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter_18pt-SemiBold.ttf'),
     // Add other fonts if needed, ensure correct paths relative to this file
  });

  // Effect to set appIsReady and hide splash screen
  // This now waits for both fontsLoaded AND loadingUser to be false
  useEffect(() => {
    async function prepare() {
      try {
        // Wait for fonts and the initial auth state loading to complete
        if (fontsLoaded && !loadingUser) {
          // Delay hiding splash screen slightly if needed, but usually happens here
           await ExpoSplashScreen.hideAsync();
           setAppIsReady(true);
        }
      } catch (e) {
        console.warn(e);
        // In case of error, still hide splash screen and set app ready
        await ExpoSplashScreen.hideAsync();
        setAppIsReady(true);
      }
    }
    prepare();
  }, [fontsLoaded, loadingUser]); // Depend on fontsLoaded and loadingUser

  // Effect to redirect based on authentication state once app is ready
  useEffect(() => {
    // Only redirect if the app is ready (fonts loaded and initial auth state checked)
    if (appIsReady) {
      if (user) {
        // User is authenticated, redirect to the default screen within the protected tabs group
        // Corrected path: point to the default screen within the (tabs) group
        router.replace('/(protected)/(tabs)');
      } else {
        // User is not authenticated, redirect to the auth flow signin screen
        router.replace('/(auth)/signin');
      }
    }
  }, [user, appIsReady, router]); // Depend on user, appIsReady, and router


  // Return null or a loading indicator while the app is not ready
  // This ensures the splash screen remains visible until fonts are loaded AND
  // the initial authentication status from storage has been checked.
  if (!appIsReady) {
    return null;
  }

  // Once appIsReady is true, the useEffect above will handle the correct navigation.
  // We render the stack here, and the router state determines which screen from
  // the defined groups ((auth) or (protected)) is active.
  return (
    <SafeAreaProvider>
      {/* Wrap the Stack with the rest of your Providers */}
      <Providers>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade', // Keep your desired animations
            animationDuration: 250,
          }}
        >
          {/* Define your route groups here. The useEffect handles the initial navigation. */}
          <Stack.Screen
            name="(auth)"
            options={{ gestureEnabled: false }} // Keep gesture settings
          />
          {/* Use '(protected)' as per your file structure */}
          <Stack.Screen
            name="(protected)"
             // Keep gesture settings if any, or remove options if none needed
          />
           {/*
             The not-found screen should typically be outside auth/protected
             and accessible regardless of auth state. Its placement here is standard.
           */}
          <Stack.Screen
            name="+not-found"
            options={{
              title: 'Oops!',
              presentation: 'modal',
            }}
          />
        </Stack>
      </Providers>
    </SafeAreaProvider>
  );
}

// Export a default App component that wraps the RootLayout with AuthProvider
// This ensures that the useAuth hook called inside RootLayout works correctly.
export default function App() {
  return (
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}
