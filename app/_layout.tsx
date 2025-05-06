import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router'; // Import useSegments
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as ExpoSplashScreen from 'expo-splash-screen';

// Context Providers - Ensure correct relative paths or aliases
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
// import { ConnectionProvider as DeviceConnectionProvider } from '../context/ConnectionContext'; // Uncomment if used
import { SocialConnectionProvider } from '../context/SocialConnectionContext'; // Uncomment if used
import { MessageProvider } from '../context/MessageContext';
import { ToastProvider } from '../context/ToastContext';
import { SocketProvider } from '../context/SocketContext';

// Import the AppEventListeners component (Adjust path if needed)
import { AppEventListeners } from '../components/AppEventListner'; // <-- Corrected suggested path

// Keep the splash screen visible until we explicitly hide it
ExpoSplashScreen.preventAutoHideAsync();


// Component to wrap the main app logic with most necessary providers
// AuthProvider is handled outside this component, wrapping RootLayout in the default export
function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Providers should be layered from more fundamental/independent outwards
    // MessageProvider manages core app data state
    <MessageProvider>
      {/* ThemeProvider provides theme context, used by UI components and potentially others like Toast */}
      <ThemeProvider>
        {/* ToastProvider provides toast functionality, used by SocketProvider and other components */}
        <ToastProvider>
          {/* SocketProvider manages the socket connection, uses useToast */}
          <SocketProvider>
            {/* AppEventListeners uses useSocket and useMessages - MUST be inside both */}
            <AppEventListeners />

            {/* Other providers that might depend on Theme, Toast, or Socket */}
            {/* Uncomment and ensure correct paths for SocialConnectionProvider and DeviceConnectionProvider */}
            {/* <DeviceConnectionProvider> */}
              <SocialConnectionProvider>
                 {/* StatusBar is often fine here - determines status bar appearance */}
                <StatusBar style="light" /> {/* Or "auto", "dark" */}
                {children} {/* Your main app content rendered here (the Stack navigator) */}
              </SocialConnectionProvider>
            {/* </DeviceConnectionProvider> */}
          </SocketProvider>
        </ToastProvider>
      </ThemeProvider>
    </MessageProvider>
  );
}


function RootLayout() {
  // Get auth state and router hooks
  const { user, loadingUser } = useAuth();
  const router = useRouter();
  const segments = useSegments(); // Get the current route segments for path checking

  // State to track if fonts are loaded AND initial auth state is checked
  const [appIsReady, setAppIsReady] = useState(false);

  // --- Load Fonts ---
  // Use expo-font hook to load custom fonts
  const [fontsLoaded] = useFonts({
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter_18pt-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter_18pt-Medium.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter_18pt-Bold.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter_18pt-SemiBold.ttf'),
     // Add other fonts if needed, ensure correct paths relative to this file
  });

  // --- Prepare App (Hide Splash Screen) ---
  // Effect to set appIsReady and hide splash screen once fonts are loaded and auth state checked
  useEffect(() => {
    async function prepare() {
      try {
        // Wait for both font loading to complete and the initial auth state check to finish
        if (fontsLoaded && !loadingUser) {
           console.log("RootLayout: Fonts loaded and auth check complete. Hiding splash screen.");
           // Explicitly hide the splash screen
           await ExpoSplashScreen.hideAsync();
           // Mark the app as ready
           setAppIsReady(true);
        }
      } catch (e) {
        console.warn("RootLayout: Error preparing app:", e);
        // In case of an error during preparation (e.g., font loading), still hide splash screen and set app ready
        await ExpoSplashScreen.hideAsync();
        setAppIsReady(true);
      }
    }
    // Call the preparation function
    prepare();
    // Effect depends on fontsLoaded and loadingUser state
  }, [fontsLoaded, loadingUser]);

  // --- Navigation Redirect Logic ---
  // Effect to redirect based on authentication state and current path once the app is ready
  useEffect(() => {
    // Only run the redirect logic if the app has finished its initial preparation
    if (!appIsReady) {
      console.log("RootLayout: App not ready, skipping redirect logic.");
      return; // Do not redirect until fonts and auth state are loaded
    }

    // Determine if the user is currently on an authentication route group
    // useSegments() provides an array of the current path segments
    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = router.pathname; // Get the full current path for detailed logging

    console.log(`RootLayout: App ready for redirect check. Authenticated: ${!!user}. Current path: ${currentPath}. In Auth Group: ${inAuthGroup}.`);

    if (user) {
      // --- User IS Authenticated ---
      // If the user is authenticated BUT is currently on an auth route or the root '/',
      // redirect them to the default protected page within the tabs group.
      // Otherwise (if they are on any other path), they are presumably on a protected page,
      // so we do nothing and let Expo Router handle loading that route from the URL.
      if (inAuthGroup || currentPath === '/') {
        console.log(`RootLayout: User authenticated but on auth or root path (${currentPath}). Redirecting to /(protected)/(tabs).`);
        // Use router.replace to replace the current history entry, preventing going back to auth/root pages after login
        router.replace('/(protected)/(tabs)');
      } else {
        console.log(`RootLayout: User authenticated and on a protected path (${currentPath}). Staying on current page.`);
        // Do nothing - Expo Router will load the component mapped to the current URL path.
        // This handles staying on pages like chat/[id].tsx after refresh/re-load.
      }
    } else {
      // --- User is NOT Authenticated ---
      // If the user is NOT authenticated AND they are NOT already on an auth route group,
      // redirect them to the signin page, which is the entry point for authentication.
      if (!inAuthGroup) {
         console.log(`RootLayout: User NOT authenticated and NOT in auth group (${currentPath}). Redirecting to /(auth)/signin.`);
         // Use router.replace to replace the current history entry, preventing going back to non-auth pages from signin
         router.replace('/(auth)/signin');
      } else {
          console.log(`RootLayout: User NOT authenticated and already in auth group (${currentPath}). Staying on auth page.`);
          // Do nothing - they are already on a signin, signup, or forgot-password page.
      }
    }
    // Effect depends on user authentication status, app readiness, route segments, and router object
  }, [user, appIsReady, segments, router]);


  // --- Render Content ---
  // Return null while the app is not ready. This keeps the splash screen visible
  // until all initial loading and checks (fonts, auth state) are complete.
  if (!appIsReady) {
    console.log("RootLayout: App not ready, rendering null (splash screen visible).");
    return null;
  }

  // Once appIsReady is true, the useEffect above handles the initial navigation.
  // We render the main Stack navigator here. Expo Router uses the current URL/router state
  // to determine which screen from the defined groups ((auth), (protected), +not-found) to display.
  return (
    <SafeAreaProvider>
      {/* Wrap the main Stack navigator with all necessary Context Providers */}
      <Providers>
        <Stack
          screenOptions={{
            headerShown: false, // Hide default header for all screens/groups
            animation: 'fade', // Apply a fade animation between screens
            animationDuration: 250, // Duration of the fade animation
          }}
        >
          {/* Define your top-level route groups/screens here */}

          {/* Authentication routes group (e.g., signin, signup) */}
          <Stack.Screen
            name="(auth)"
            options={{ gestureEnabled: false }} // Disable swipe gestures to leave auth flow
          />

          {/* Protected routes group (e.g., tabs, chat screens) */}
          {/* Note: Individual screens within (protected) and (tabs) are defined by their file names */}
          <Stack.Screen
            name="(protected)"
             // Add specific options here if needed for the protected group layout
          />

           {/* The not-found screen, displayed when no matching route is found */}
           {/* Typically outside auth/protected groups so it's accessible always */}
          <Stack.Screen
            name="+not-found"
            options={{
              title: 'Oops!', // Title for the not-found screen
              presentation: 'modal', // Present as a modal overlay
            }}
          />

          {/* Add other top-level screens here if any */}

        </Stack>
      </Providers>
    </SafeAreaProvider>
  );
}

// Default export wraps the RootLayout with AuthProvider
// AuthProvider must be the outermost provider because RootLayout uses useAuth
export default function App() {
  return (
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}