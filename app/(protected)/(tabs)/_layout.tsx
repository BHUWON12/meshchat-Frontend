// frontend/app/(protected)/(tabs)/_layout.tsx
import React from 'react';
import { Tabs, usePathname } from 'expo-router';
import { MessageSquare, Users, Bell, User, Settings, RadioTower } from 'lucide-react-native';
import Colors from '../../../constants/Colors'; // Assuming Colors constant exists
import { ViewStyle, TouchableOpacity, View, Text as RNText, StyleSheet } from 'react-native'; // Import necessary components

// Custom component for the PingNear tab button with "Coming Soon" text
const PingNearComingSoonButton = (props: any) => {
  // The default props include the style for the tab slot and the children (Icon and Label)
  // We render the default children and add our custom "Coming Soon" text below them.
  return (
    // Use a View to wrap the content and apply the default tab slot style.
    // This View itself is not interactive, making the tab non-tappable.
    <View {...props} style={[props.style, styles.pingNearTabButton]}>
      {/* Render the default Icon and Label provided by Expo Router */}
      {props.children}
      {/* Add the "Coming Soon" text */}
      <View style={styles.comingSoonBadge}>
        <RNText style={styles.comingSoonText}>Soon</RNText> {/* Use a shorter text like 'Soon' to fit */}
      </View>
    </View>
  );
};


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

      {/* PingNear - Coming Soon Tab (using the 'profile' screen) */}
      {/* This tab is styled reddish, non-interactive, and has "Coming Soon" text */}
      <Tabs.Screen
        name="profile" // Corresponds to app/(protected)/(tabs)/profile.tsx
        options={{
          title: 'PingNear', // Keep the title as PingNear
          tabBarIcon: ({ color, size }) => (
            <RadioTower size={size} color={color} /> // Keep the RadioTower icon
          ),
          // Override colors for this specific tab to make the default icon/label reddish
          tabBarActiveTintColor: Colors.common.red?.[600] || '#DC2626', // A darker red when active
          tabBarInactiveTintColor: Colors.common.red?.[400] || '#F87171', // A lighter red when inactive
          // Use the custom component for the tab button
          tabBarButton: PingNearComingSoonButton,
          // Setting href: null would hide the tab entirely
          // href: null, // Keep this commented out
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

const styles = StyleSheet.create({
  // Style for the custom PingNear tab button container
  pingNearTabButton: {
    // The default props.style handles the flex layout for the tab bar slot.
    // We add opacity to visually indicate it's disabled.
    opacity: 0.6,
    // Ensure the content (Icon, Label, Coming Soon) is centered within the tab slot
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Style for the "Coming Soon" badge View
  comingSoonBadge: {
    backgroundColor: Colors.common.red?.[100] || '#FEE2E2', // Light reddish background
    borderRadius: 8, // Rounded corners for the badge
    paddingHorizontal: 4, // Horizontal padding
    paddingVertical: 1, // Vertical padding - make it small
    marginTop: 2, // Small margin above the badge
  },
  // Style for the "Coming Soon" text
  comingSoonText: {
    fontSize: 8, // Very small font size
    fontWeight: 'bold', // Make the text bold
    color: Colors.common.red?.[800] || '#991B1B', // Dark reddish text color
    fontFamily: 'Inter-Bold', // Use a bold font if available
    textTransform: 'uppercase', // Optional: make text uppercase
  },
});
