// app/(protected)/_layout.tsx

import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext'; // Adjust the import path as necessary
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'; // Import necessary React Native components

export default function ProtectedLayout() {
  // Access authentication state from context
  const { user, loadingUser } = useAuth();

  // While user data is loading, show a loading indicator using React Native components
  if (loadingUser) {
    return (
      // Use a React Native View for the container
      <View style={styles.loadingContainer}>
        {/* Use ActivityIndicator for the spinner */}
        <ActivityIndicator size="large" color="#0000ff" /> {/* You can customize the color */}
        {/* Use Text for the loading message */}
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If not authenticated, redirect to login
  // Ensure '/(auth)/login' is the correct path to your login screen
  if (!user) {
    return <Redirect href="/(auth)/signin" />;
  }

  // If authenticated, render the protected stack
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/*
        These Stack.Screen names should match the directories/files
        directly inside the app/(protected) directory.
      */}
      <Stack.Screen name="(tabs)" /> {/* This points to app/(protected)/(tabs)/_layout.tsx */}
      <Stack.Screen name="profile" /> {/* This points to app/(protected)/profile.tsx */}
      <Stack.Screen name="settings" /> {/* This points to app/(protected)/settings.tsx */}
      {/* Ensure these file/folder names exist */}
    </Stack>
  );
}

// Define React Native styles for the loading indicator
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, // Make the container fill the screen
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    backgroundColor: '#fff', // Add a background color (adjust as needed)
  },
  loadingText: {
    marginTop: 10, // Add some space below the spinner
    fontSize: 16,
    color: '#000', // Text color (adjust as needed)
  },
});
