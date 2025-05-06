import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Switch,
  Alert, // Ensure Alert is imported
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LogOut,
  User,
  Bell,
  Moon,
  Trash2,
  Info,
  Shield,
  ChevronRight,
  Camera,
  Edit2, 
  X,
} from 'lucide-react-native'; // Ensure all icons are imported
import * as ImagePicker from 'expo-image-picker'; // Ensure ImagePicker is imported
import Colors from '../../../constants/Colors'; // Adjust path if needed
import { useAuth } from '../../../context/AuthContext'; // Adjust path if needed
import { useSocket } from '../../../context/SocketContext'; // Adjust path if needed
import ConnectionToggle from '../../../components/ConnectionToggle'; // Adjust path if needed
import UserAvatar from '../../../components/UserAvatar'; // Adjust path if needed
import Button from '../../../components/ui/Button'; // Adjust path if needed

export default function SettingsProfileScreen() {
  // Access user, logout, and updateProfile from AuthContext
  const { user, logout, updateProfile, isLoading } = useAuth(); // Added isLoading from AuthContext

  // Access socket connection state
  const { isOnlineMode, setIsOnlineMode } = useSocket(); // Assuming useSocket provides these

  // State for various settings
  const [darkMode, setDarkMode] = useState(false); // Example state, needs actual implementation
  const [notifications, setNotifications] = useState(true); // Example state, needs actual implementation

  // State for profile editing modal
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState(user?.avatar || ''); // Use user's current avatar

  // --- Logout Confirmation Function ---
  const handleLogout = () => {
    Alert.alert(
      'Log Out', // Title of the alert
      'Are you sure you want to log out?', // Message of the alert
      [
        // Array of buttons
        {
          text: 'Cancel', // Button text for cancel
          style: 'cancel', // Style for cancel button (usually on the left or bottom)
        },
        {
          text: 'Log Out', // Button text for logout
          style: 'destructive', // Style for destructive actions (often red)
          onPress: async () => { // Action when Log Out is pressed in the alert
            console.log("Attempting logout from alert...");
            try {
               // Call the actual logout function from your AuthContext
               await logout();
               // The app/_layout.tsx handles redirection automatically after user state becomes null
               console.log("Logout successful, redirect should follow.");
            } catch (error) {
               console.error("Logout failed:", error);
               // Optionally show an error message if logout itself fails (e.g., network issue)
               Alert.alert("Logout Failed", "An error occurred during logout. Please try again.");
            }
          },
        },
      ],
      { cancelable: true } // Allows dismissing the alert by tapping outside
    );
  };

  // --- Clear Chat Confirmation Function ---
  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all chat history? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement your actual clear chat history function here
            console.log("Clearing chat history...");
            // Example placeholder:
            // clearAllMessages().then(() => Alert.alert('Success', 'Chat history cleared')).catch(e => Alert.alert('Error', 'Failed to clear chat history'));
             Alert.alert('Success', 'Chat history cleared (placeholder)'); // Placeholder alert
          },
        },
      ]
    );
  };

  // --- Image Picker for Avatar ---
  const handleImagePick = async () => {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your photo library to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only allow images
      allowsEditing: true, // Allow user to crop/edit
      aspect: [1, 1], // Square aspect ratio
      quality: 0.8, // Image quality (0 to 1)
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Use the URI from the first asset in the assets array
      setAvatarUri(result.assets[0].uri);
    }
  };

  // --- Save Profile Changes ---
  const handleSaveProfile = async () => {
    // Only attempt to update if there's a user
    if (!user) {
        Alert.alert('Error', 'User not logged in.');
        return;
    }

    setIsEditing(false); // Close modal immediately or after successful API call

    // Prepare data to send (only include fields that might have changed)
    const updatedData: Partial<User> = {};
    if (username !== user.username) updatedData.username = username;
    if (bio !== user.bio) updatedData.bio = bio;
    if (avatarUri !== user.avatar) updatedData.avatar = avatarUri; // Pass URI to backend for upload

    // If no changes were made, just close modal and return
    if (Object.keys(updatedData).length === 0) {
        console.log("No profile changes to save.");
        // setIsEditing(false); // Ensure modal is closed
        return;
    }

    try {
      console.log("Attempting to save profile changes:", updatedData);
      // Call the updateProfile function from AuthContext
      await updateProfile(updatedData);
      Alert.alert('Success', 'Profile updated successfully.');
      // AuthContext's updateProfile should already update the user state upon success
    } catch (error) {
      console.error('Profile update failed:', error);
      // Revert local state or refetch user if save failed
      setUsername(user?.username || ''); // Revert username
      setBio(user?.bio || ''); // Revert bio
      setAvatarUri(user?.avatar || ''); // Revert avatar
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
       // setIsEditing(false); // Ensure modal is closed even on error
    }
  };


  // --- Helper function to render a setting item row ---
  const renderSettingItem = (
    icon,
    title,
    description,
    rightElement,
    onPress // Optional onPress handler for the item row
  ) => (
    // TouchableOpacity makes the row tappable if onPress is provided
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress} // Disable if no onPress function is provided
    >
      {/* Icon on the left */}
      <View style={styles.settingIcon}>{icon}</View>
      {/* Title and description in the middle */}
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      {/* Element on the right (Switch, Chevron, etc.) */}
      {rightElement}
    </TouchableOpacity>
  );

  // --- Main Component Render ---
  return (
    // SafeAreaView ensures content isn't hidden by notches/status bars
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ScrollView allows content to be scrollable */}
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings & Profile</Text>
          {/* Optional: Add a back button or other header elements here */}
        </View>

        {/* Profile Card Section */}
        <View style={styles.profileCard}>
          {/* Avatar with Image Picker capability */}
          <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePick}>
            {avatarUri ? (
              // Display selected/current avatar image
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              // Display placeholder if no avatar URI
              <View style={styles.avatarPlaceholder}>
                <User size={40} color={Colors.common.gray[400]} />
              </View>
            )}
             {/* Camera icon overlay on avatar */}
            <View style={styles.cameraButton}>
               <Camera size={16} color={Colors.common.white} />
            </View>
          </TouchableOpacity>

          {/* User Info */}
          <View style={styles.profileInfo}>
            <Text style={styles.username}>{user?.username || 'Guest'}</Text>
            <Text style={styles.email}>{user?.email || 'N/A'}</Text> {/* Display email or N/A */}
            {/* Edit Profile Button */}
            <TouchableOpacity style={styles.editButton} onPress={() => {
                 // Initialize modal state with current user data
                 setUsername(user?.username || '');
                 setBio(user?.bio || '');
                 setAvatarUri(user?.avatar || '');
                 setIsEditing(true); // Open the modal
            }}>
              <Edit2 size={20} color={Colors.primary[500]} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Connection Status Toggle Component */}
        <ConnectionToggle /> {/* Assumes this is a separate component */}


        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          {/* Notifications Setting */}
          {renderSettingItem(
            <Bell size={22} color={Colors.primary[600]} />, // Icon
            'Notifications', // Title
            'Get notified about new messages', // Description
            <Switch // Right element (Switch component)
              value={notifications}
              onValueChange={setNotifications} // Handles switch toggle
              trackColor={{ false: Colors.common.gray[300], true: Colors.primary[300] }}
              thumbColor={notifications ? Colors.primary[500] : Colors.common.gray[100]}
            />,
            undefined // No specific action for tapping the row itself
          )}

          {/* Dark Mode Setting */}
          {renderSettingItem(
            <Moon size={22} color={Colors.primary[600]} />, // Icon
            'Dark Mode', // Title
            'Change app appearance', // Description
            <Switch // Right element (Switch component)
              value={darkMode}
              onValueChange={setDarkMode} // Handles switch toggle
              trackColor={{ false: Colors.common.gray[300], true: Colors.primary[300] }}
              thumbColor={darkMode ? Colors.primary[500] : Colors.common.gray[100]}
            />,
            undefined // No specific action for tapping the row itself
          )}
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>

          {/* Clear Chat History Setting */}
          {renderSettingItem(
            <Trash2 size={22} color={Colors.common.error} />, // Icon (Error color for destructive action)
            'Clear Chat History', // Title
            'Delete all your conversations', // Description
            <ChevronRight size={18} color={Colors.common.gray[400]} />, // Right element (Chevron icon)
            handleClearChat // onPress handler for the row
          )}
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          {/* Privacy Policy Link */}
          {renderSettingItem(
            <Shield size={22} color={Colors.primary[600]} />, // Icon
            'Privacy Policy', // Title
            'Read our privacy policy', // Description
            <ChevronRight size={18} color={Colors.common.gray[400]} />, // Right element (Chevron icon)
            () => { /* TODO: Implement navigation to Privacy Policy screen/link */ console.log("Navigate to Privacy Policy"); } // onPress handler
          )}

          {/* About App Info */}
          {renderSettingItem(
            <Info size={22} color={Colors.primary[600]} />, // Icon
            'About MeshChat', // Title
            'Version 1.0.0', // Description (can be dynamic)
            <ChevronRight size={18} color={Colors.common.gray[400]} />, // Right element (Chevron icon)
            () => { /* TODO: Implement navigation to About screen */ console.log("Navigate to About screen"); } // onPress handler
          )}
        </View>

        {/* --- Logout Button --- */}
        {/* This button triggers the handleLogout confirmation popup */}
        <TouchableOpacity
           style={styles.logoutButton}
           onPress={handleLogout} // <<< Correctly calls the confirmation function
           disabled={isLoading} // Optional: Disable while AuthContext is busy
        >
          <LogOut size={20} color={Colors.common.error} /> {/* Icon */}
          <Text style={styles.logoutText}>{isLoading ? "Logging Out..." : "Log Out"}</Text> {/* Text */}
        </TouchableOpacity>

         {/* Add some padding at the bottom of scrollview if needed */}
         <View style={{ height: 50 }} />

      </ScrollView>

      {/* --- Edit Profile Modal --- */}
      <Modal
        animationType="slide" // Slide animation
        transparent={true} // Allows background to show through
        visible={isEditing} // Controls visibility based on state
        onRequestClose={() => setIsEditing(false)} // Handles hardware back button on Android
      >
        <View style={styles.modalContainer}> {/* Dark overlay */}
          <View style={styles.modalContent}> {/* Modal content box */}
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsEditing(false)}>
              <X size={24} color={Colors.common.gray[700]} />
            </TouchableOpacity>

            {/* Modal Title */}
            <Text style={styles.modalTitle}>Edit Profile</Text>

            {/* Modal Form */}
            <View style={styles.modalForm}>
              {/* Avatar with picker in modal */}
              <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePick}>
                 {avatarUri ? (
                   <Image source={{ uri: avatarUri }} style={styles.avatar} />
                 ) : (
                   <View style={styles.avatarPlaceholder}>
                     <User size={40} color={Colors.common.gray[400]} />
                   </View>
                 )}
                 {/* Camera icon overlay */}
                 <View style={styles.cameraButton}>
                   <Camera size={16} color={Colors.common.white} />
                 </View>
               </TouchableOpacity>

              {/* Username Input */}
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor={Colors.common.gray[400]}
                autoCapitalize="none" // Or "words" if preferred
              />

              {/* Bio Input */}
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Write something about yourself..."
                placeholderTextColor={Colors.common.gray[400]}
                multiline // Allow multiple lines
                numberOfLines={3} // Hint for initial height
              />

              {/* Modal Action Buttons */}
              <View style={styles.modalActions}>
                {/* Cancel Button */}
                <Button
                  title="Cancel"
                  onPress={() => setIsEditing(false)}
                  style={styles.actionButton}
                  textStyle={styles.actionButtonText}
                  // Add secondary style props if needed
                />
                {/* Save Changes Button */}
                <Button
                  title="Save Changes"
                  onPress={handleSaveProfile}
                  style={[styles.actionButton, styles.saveButton]}
                  textStyle={styles.actionButtonText}
                  gradient // Apply gradient if your Button component supports it
                  // disabled={isLoading || isSavingProfile} // Add state for saving profile
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- StyleSheet Definitions ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Use Colors from your constants, ensure Colors.light.background exists or use a fallback
    backgroundColor: Colors.light?.background || Colors.common.white,
  },
  scrollContent: {
    flexGrow: 1, // Allows content to take full height and scroll
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Pushes title to one side if other elements added
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.common.gray[900],
    fontFamily: 'Poppins-Bold', // Ensure font is loaded
  },
  profileCard: {
    backgroundColor: Colors.common.white,
    borderRadius: 16,
    padding: 24,
    // Shadow styles for iOS
    shadowColor: Colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, // Adjusted shadow opacity
    shadowRadius: 8, // Adjusted shadow radius
    // Elevation for Android
    elevation: 4,
    alignItems: 'center', // Center content horizontally
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative', // Allows positioning the camera button
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60, // Makes it round
    borderWidth: 3, // Added a slightly thicker border
    borderColor: Colors.primary[500], // Border color
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.common.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3, // Added border
    borderColor: Colors.primary[500],
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary[600], // Slightly darker primary color
    width: 36,
    height: 36,
    borderRadius: 18, // Makes it round
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.common.white, // White border for contrast
  },
  profileInfo: {
    alignItems: 'center', // Center text content
  },
  username: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.common.gray[900],
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold', // Ensure font is loaded
  },
  email: {
    fontSize: 16,
    color: Colors.common.gray[600],
    marginBottom: 16,
    fontFamily: 'Inter-Regular', // Ensure font is loaded
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // Adjusted padding
    paddingHorizontal: 16,
    borderRadius: 20, // Adjusted border radius
    backgroundColor: Colors.primary[50], // Light primary background
  },
  editButtonText: {
    fontSize: 14, // Adjusted font size
    fontWeight: '600',
    color: Colors.primary[600],
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold', // Ensure font is loaded
  },
  section: {
    marginTop: 20, // Adjusted top margin
    backgroundColor: Colors.common.white, // Section background
    borderRadius: 12, // Rounded corners for the section block
    shadowColor: Colors.common.black, // Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden', // Ensures border radius clips children borders
  },
  sectionTitle: {
    fontSize: 16, // Adjusted title size
    fontWeight: '600',
    color: Colors.common.gray[700],
    paddingVertical: 12, // Padding top/bottom
    paddingHorizontal: 16, // Padding left/right
    borderBottomWidth: 1, // Separator line
    borderBottomColor: Colors.common.gray[200],
    fontFamily: 'Inter-SemiBold', // Ensure font is loaded
    backgroundColor: Colors.common.gray[50], // Light background for title
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16, // Increased vertical padding
    paddingHorizontal: 16,
    backgroundColor: Colors.common.white, // Item background
    borderBottomWidth: 1, // Separator line between items
    borderBottomColor: Colors.common.gray[100], // Lighter separator color
  },
  // Remove last item border if needed via logic
  // Example: borderBottomWidth: index === settings.length - 1 ? 0 : 1,

  settingIcon: {
    width: 40, // Adjusted icon container size
    height: 40,
    borderRadius: 20, // Makes it round
    backgroundColor: Colors.primary[50], // Light primary background for icon
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1, // Takes available space
    marginLeft: 16, // Adjusted margin
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.common.gray[900],
    fontFamily: 'Inter-Medium', // Ensure font is loaded
  },
  settingDescription: {
    fontSize: 13, // Adjusted font size
    color: Colors.common.gray[500],
    fontFamily: 'Inter-Regular', // Ensure font is loaded
    marginTop: 2, // Space below title
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 32,
    // marginBottom: 32, // Removed or adjusted as scrollview padding is added
    marginHorizontal: 16,
    backgroundColor: Colors.common.gray[100], // Light gray background
    borderRadius: 12, // Rounded corners
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.common.error, // Error color for logout text
    marginLeft: 8, // Space from icon
    fontFamily: 'Inter-SemiBold', // Ensure font is loaded
  },

  // --- Modal Styles ---
  modalContainer: {
    flex: 1,
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent dark overlay
  },
  modalContent: {
    width: '90%', // Modal width
    backgroundColor: Colors.common.white, // White background
    borderRadius: 16, // Rounded corners
    padding: 24,
    alignItems: 'center',
    position: 'relative', // For absolute positioning of close button
  },
  closeButton: {
    position: 'absolute',
    top: 12, // Adjusted position
    right: 12, // Adjusted position
    zIndex: 1, // Ensure it's above other content
    padding: 8, // Make it easier to tap
  },
  modalTitle: {
    fontSize: 22, // Adjusted size
    fontWeight: '700',
    color: Colors.common.gray[900],
    marginBottom: 20, // Adjusted margin
    fontFamily: 'Poppins-Bold',
  },
  modalForm: {
    width: '100%',
    alignItems: 'center', // Center avatar and inputs horizontally
  },
  input: {
    backgroundColor: Colors.common.white,
    borderWidth: 1,
    borderColor: Colors.common.gray[300],
    borderRadius: 8, // Adjusted border radius
    paddingVertical: 12, // Adjusted padding
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
    width: '100%', // Ensure input takes full width of form
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top', // Start text from the top
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20, // Adjusted margin
    width: '100%', // Ensure buttons take full width
  },
  actionButton: {
    // Styles for both buttons
    flex: 1, // Make buttons take equal space
    marginHorizontal: 4, // Add space between buttons
    borderRadius: 8, // Adjusted border radius
    justifyContent: 'center', // Center text vertically within button
    alignItems: 'center', // Center text horizontally within button
  },
  actionButtonText: {
    // Styles for button text
    fontSize: 15, // Adjusted size
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: Colors.common.white, // Text color for gradient button
  },
  // Override text color for non-gradient button if needed
  // actionButton: { textStyle: { color: Colors.primary[600] } }

  saveButton: {
    // Specific styles for the Save button (often the primary one)
     // Assuming Button component handles gradient when gradient prop is true
     // If not using gradient prop, set backgroundColor here
  },
});