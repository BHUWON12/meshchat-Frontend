// frontend/_layout.tsx
import React, { useEffect, useState, useCallback } from 'react';
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

ExpoSplashScreen.preventAutoHideAsync();

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SocketProvider>
        <MessageProvider>
          <NotificationProvider>
            {/* Other providers */}
            {/* <DeviceConnectionProvider> */}
              <SocialConnectionProvider>
                <AppEventListeners />
                <StatusBar style="light" />
                {children}
              </SocialConnectionProvider>
            {/* </DeviceConnectionProvider> */}
          </NotificationProvider>
        </MessageProvider>
      </SocketProvider>
    </ToastProvider>
  );
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
    if (!appIsReady) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = router.pathname;

    if (user) {
      if (inAuthGroup || currentPath === '/') {
        router.replace('/(protected)/(tabs)');
      }
    } else {
      if (!inAuthGroup) {
         router.replace('/(auth)/signin');
      }
    }
  }, [user, appIsReady, segments, router]);

  if (!appIsReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <Providers>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 250,
            }}
          >
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
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}
