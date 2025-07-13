// frontend/_layout.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as ExpoSplashScreen from 'expo-splash-screen';

// Context Providers
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
// import { ConnectionProvider as DeviceConnectionProvider } from '../context/ConnectionContext';
import { SocialConnectionProvider } from '../context/SocialConnectionContext';
import { MessageProvider } from '../context/MessageContext';
import { ToastProvider } from '../context/ToastContext';
import { SocketProvider } from '../context/SocketContext';
import { NotificationProvider } from '../context/NotificationContext';

// App Event Listeners
import { AppEventListeners } from '../components/AppEventListner';
import ErrorBoundary from '../components/ErrorBoundary';

ExpoSplashScreen.preventAutoHideAsync();

function Providers({ children }: { children: React.ReactNode }) {
  // Memoize the providers to prevent unnecessary re-renders
  const providers = useMemo(() => (
    <ToastProvider>
      <SocketProvider>
        <MessageProvider>
          <NotificationProvider>
            {/* Other providers */}
            {/* <DeviceConnectionProvider> */}
            {/* </DeviceConnectionProvider> */}
            <SocialConnectionProvider>
              <AppEventListeners />
              <StatusBar style="light" />
              {children}
            </SocialConnectionProvider>
          </NotificationProvider>
        </MessageProvider>
      </SocketProvider>
    </ToastProvider>
  ), [children]);

  return providers;
}

function RootLayout() {
  const { user, loadingUser } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const [appIsReady, setAppIsReady] = useState(false);

  const [fontsLoaded] = useFonts({
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter_18pt-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter_18pt-Medium.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter_18pt-Bold.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter_18pt-SemiBold.ttf'),
  });

  // Memoize the navigation logic to prevent unnecessary re-renders
  const navigationLogic = useCallback(() => {
    console.log('[Navigation] Navigation logic triggered');
    console.log('[Navigation] appIsReady:', appIsReady);
    console.log('[Navigation] user:', user ? 'exists' : 'null');
    console.log('[Navigation] segments:', segments);
    console.log('[Navigation] currentPath:', router.pathname);
    
    if (!appIsReady) {
      console.log('[Navigation] App not ready, skipping navigation');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = router.pathname;

    if (user) {
      console.log('[Navigation] User authenticated, checking if in auth group');
      if (inAuthGroup || currentPath === '/') {
        console.log('[Navigation] Redirecting to protected tabs');
        router.replace('/(protected)/(tabs)');
      } else {
        console.log('[Navigation] User already in protected area');
      }
    } else {
      console.log('[Navigation] User not authenticated, checking if in auth group');
      if (!inAuthGroup) {
        console.log('[Navigation] Redirecting to signin');
        router.replace('/(auth)/signin');
      } else {
        console.log('[Navigation] User already in auth area');
      }
    }
  }, [user, appIsReady, segments, router]);

  // Memoize the stack configuration to prevent unnecessary re-renders
  const stackConfig = useMemo(() => ({
    screenOptions: {
      headerShown: false,
      animation: 'fade',
      animationDuration: 250,
    }
  }), []);

  useEffect(() => {
    async function prepare() {
      try {
        if (fontsLoaded && !loadingUser) {
          await ExpoSplashScreen.hideAsync();
          setAppIsReady(true);
        }
      } catch (e) {
        console.warn(e);
        await ExpoSplashScreen.hideAsync();
        setAppIsReady(true);
      }
    }
    prepare();
  }, [fontsLoaded, loadingUser]);

  useEffect(() => {
    navigationLogic();
  }, [navigationLogic]);

  // Monitor user state changes for debugging
  useEffect(() => {
    console.log('[Layout] User state changed:', user ? 'authenticated' : 'not authenticated');
  }, [user]);

  if (!appIsReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <Providers>
          <Stack {...stackConfig}>
            <Stack.Screen
              name="(auth)"
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="(protected)"
            />
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
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
    </ErrorBoundary>
  );
}
