// frontend/app/(protected)/(tabs)/_layout.tsx
import React from 'react';
import { Tabs, usePathname } from 'expo-router';
import { MessageSquare, Users, Bell, User, Settings, RadioTower } from 'lucide-react-native';
import Colors from '../../../constants/Colors'; // Assuming Colors constant exists
import { ViewStyle } from 'react-native'; // Import necessary components




export default function TabLayout() {
  const pathname = usePathname(); // Get the current route path

  // Determine if the current route is a chat detail page (starts with '/chat/')
  const isChatDetail = pathname.startsWith('/chat/');

  // Define the base tab bar style
  const baseTabBarStyle: ViewStyle = {
    borderTopWidth: 1,
    borderTopColor: Colors.common.gray[200], // Use a color from your constants
    backgroundColor: Colors.common.white, // Use a color from your constants
    height: 65, // Increase height slightly to accommodate the extra text
    paddingBottom: 5, // Adjust padding
    paddingTop: 5, // Add padding at the top
  };

  // Conditionally set the tabBarStyle to hide it on chat detail screens
  // Using 'none' as 'none' to satisfy TypeScript ViewStyle type
  const tabBarStyle = isChatDetail ? { display: 'none' as 'none' } : baseTabBarStyle;

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Hide header for all tab screens by default
        tabBarActiveTintColor: Colors.primary[600], // Default active color for other tabs
        tabBarInactiveTintColor: Colors.common.gray[500], // Default inactive color for other tabs
        tabBarStyle: tabBarStyle, // Apply the conditional style
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter-Medium', // Ensure this font is loaded and linked
           marginTop: -2, // Adjust margin to bring label closer to icon
        },
        tabBarIconStyle: {
           marginBottom: -2, // Adjust margin to bring icon closer to label
        }
      }}
    >
      {/* Define each tab screen */}

      {/* Chats Tab */}
      <Tabs.Screen
        name="index" // Corresponds to app/(protected)/(tabs)/index.tsx
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} />
          ),
        }}
      />

      {/* Connections Tab */}
      <Tabs.Screen
        name="connections" // Corresponds to app/(protected)/(tabs)/connections.tsx
        options={{
          title: 'Connections',
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }}
      />

      {/* Notifications Tab */}
      <Tabs.Screen
        name="notifications" // Corresponds to app/(protected)/(tabs)/notifications.tsx
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => (
            <Bell size={size} color={color} />
          ),
        }}
      />

      {/* PingNear Tab */}
      <Tabs.Screen
        name="pingnear" // Corresponds to app/(protected)/(tabs)/pingnear.tsx
        options={{
          title: 'PingNear',
          tabBarIcon: ({ color, size }) => (
            <RadioTower size={size} color={color} />
          ),
        }}
      />

       {/* Settings Tab */}
       {/* This tab remains interactive and uses default colors */}
       <Tabs.Screen
        name="settings" // Corresponds to app/(protected)/(tabs)/settings.tsx
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />

      {/* The chat detail screen - hidden from the tab bar */}
      {/* Corresponds to app/(protected)/(tabs)/chat/[id].tsx */}
      <Tabs.Screen
        name="chat/[id]"
        options={{
          href: null, // Correctly hides this screen from the tab bar
          // You will likely want a custom header for this screen defined within chat/[id].tsx
          headerShown: false, // Ensure header is hidden if handled within the screen
        }}
      />
    </Tabs>
  );
}


