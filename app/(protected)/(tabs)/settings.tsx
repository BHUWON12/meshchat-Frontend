// frontend/app/(protected)/(tabs)/settings.tsx
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
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../../../constants/Colors';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import ConnectionToggle from '../../../components/ConnectionToggle';
import UserAvatar from '../../../components/UserAvatar';
import Button from '../../../components/ui/Button';

export default function SettingsProfileScreen() {
  const { user, logout, updateProfile, isLoading } = useAuth();
  const { isOnlineMode, setIsOnlineMode } = useSocket();

  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState(user?.avatar || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleLogout = () => {
    // For web platform, use window.confirm instead of Alert.alert
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (confirmed) {
        performLogout();
      }
    } else {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Out',
            style: 'destructive',
            onPress: performLogout,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const performLogout = async () => {
    try {
      console.log('[Settings] Starting logout process...');
      await logout();
      console.log('[Settings] Logout completed successfully');
      // The navigation should happen automatically via the AuthContext
    } catch (error) {
      console.error("[Settings] Logout failed:", error);
      if (Platform.OS === 'web') {
        alert("Logout Failed: An error occurred during logout. Please try again.");
      } else {
        Alert.alert("Logout Failed", "An error occurred during logout. Please try again.");
      }
    }
  };

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear all chat history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            console.log("Clearing chat history...");
            Alert.alert('Success', 'Chat history cleared (placeholder)');
          },
        },
      ]
    );
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your photo library to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      Alert.alert('Error', 'User not logged in.');
      return;
    }

    setIsSavingProfile(true);

    const updatedData: Partial<typeof user> = {};
    if (username !== user.username) updatedData.username = username;
    if (bio !== user.bio) updatedData.bio = bio;
    if (avatarUri !== user.avatar) updatedData.avatar = avatarUri;

    if (Object.keys(updatedData).length === 0) {
      console.log("No profile changes to save.");
      setIsEditing(false);
      setIsSavingProfile(false);
      return;
    }

    try {
      console.log("Attempting to save profile changes:", updatedData);
      await updateProfile(updatedData);
      Alert.alert('Success', 'Profile updated successfully.');
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update failed:', error);
      setUsername(user?.username || '');
      setBio(user?.bio || '');
      setAvatarUri(user?.avatar || '');
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Helper function to render a setting item row
  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    description: string | null,
    rightElement: React.ReactNode,
    onPress: (() => void) | undefined,
    isComingSoon: boolean = false
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, isComingSoon && styles.settingItemComingSoon]}
      onPress={isComingSoon ? undefined : onPress}
      disabled={isComingSoon || !onPress}
    >
      <View style={[styles.settingIcon, isComingSoon && styles.settingIconComingSoon]}>{icon}</View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isComingSoon && styles.settingTextComingSoon]}>{title}</Text>
        {description ? (
          <Text style={[styles.settingDescription, isComingSoon && styles.settingTextComingSoon]}>
            {description}
          </Text>
        ) : null}
      </View>
      {isComingSoon ? null : rightElement}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings & Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePick}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={40} color={Colors.common.gray[400]} />
              </View>
            )}
            <View style={styles.cameraButton}>
              <Camera size={16} color={Colors.common.white} />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.username}>{user?.username || 'Guest'}</Text>
            <Text style={styles.email}>{user?.email || 'N/A'}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setUsername(user?.username || '');
                setBio(user?.bio || '');
                setAvatarUri(user?.avatar || '');
                setIsEditing(true);
              }}
            >
              <Edit2 size={20} color={Colors.primary[500]} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ConnectionToggle />

        {/* Preferences Section - Mark as Coming Soon */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleComingSoon]}>Preferences (Coming Soon)</Text>
          {renderSettingItem(
            <Bell size={22} color={Colors.primary[600]} />,
            'Notifications',
            'Get notified about new messages',
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.common.gray[300], true: Colors.primary[300] }}
              thumbColor={notifications ? Colors.primary[500] : Colors.common.gray[100]}
            />,
            undefined,
            true
          )}
          {renderSettingItem(
            <Moon size={22} color={Colors.primary[600]} />,
            'Dark Mode',
            'Change app appearance',
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: Colors.common.gray[300], true: Colors.primary[300] }}
              thumbColor={darkMode ? Colors.primary[500] : Colors.common.gray[100]}
            />,
            undefined,
            true
          )}
        </View>

        {/* Data Section - Mark as Coming Soon */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleComingSoon]}>Data (Coming Soon)</Text>
          {renderSettingItem(
            <Trash2 size={22} color={Colors.common.error} />,
            'Clear Chat History',
            'Delete all your conversations',
            <ChevronRight size={18} color={Colors.common.gray[400]} />,
            handleClearChat,
            true
          )}
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          {renderSettingItem(
            <Shield size={22} color={Colors.primary[600]} />,
            'Privacy Policy',
            'Read our privacy policy',
            <ChevronRight size={18} color={Colors.common.gray[400]} />,
            () => { console.log("Navigate to Privacy Policy"); }
          )}
          {renderSettingItem(
            <Info size={22} color={Colors.primary[600]} />,
            'About MeshChat',
            'Version 1.0.0',
            <ChevronRight size={18} color={Colors.common.gray[400]} />,
            () => { console.log("Navigate to About screen"); }
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            console.log('[Settings] Logout button pressed!');
            console.log('[Settings] isLoading:', isLoading);
            handleLogout();
          }}
          onPressIn={() => console.log('[Settings] Logout button pressed in!')}
          onPressOut={() => console.log('[Settings] Logout button pressed out!')}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.common.white} style={{ marginRight: 8 }} />
          ) : (
            <LogOut size={20} color={Colors.common.white} style={{ marginRight: 8 }} />
          )}
          <Text style={styles.logoutText}>{isLoading ? "Logging Out..." : "Log Out"}</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditing}
        onRequestClose={() => {
          setIsEditing(false);
          setIsSavingProfile(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setIsEditing(false);
                setIsSavingProfile(false);
              }}
            >
              <X size={24} color={Colors.common.gray[700]} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Edit Profile</Text>

            <View style={styles.modalForm}>
              <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePick}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User size={40} color={Colors.common.gray[400]} />
                  </View>
                )}
                <View style={styles.cameraButton}>
                  <Camera size={16} color={Colors.common.white} />
                </View>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor={Colors.common.gray[400]}
                autoCapitalize="none"
                editable={!isSavingProfile}
              />

              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Write something about yourself..."
                placeholderTextColor={Colors.common.gray[400]}
                multiline
                numberOfLines={3}
                editable={!isSavingProfile}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setIsEditing(false);
                    setIsSavingProfile(false);
                  }}
                  style={styles.actionButton}
                />
                <Button
                  title={isSavingProfile ? "Saving..." : "Save Changes"}
                  onPress={handleSaveProfile}
                  style={{ ...styles.actionButton, ...styles.saveButton }}
                  gradient
                  disabled={isSavingProfile}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light?.background || Colors.common.white,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.common.gray[900],
    fontFamily: 'Poppins-Bold',
  },
  profileCard: {
    backgroundColor: Colors.common.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: Colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.primary[500],
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.common.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary[500],
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary[600],
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.common.white,
  },
  profileInfo: {
    alignItems: 'center',
  },
  username: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.common.gray[900],
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  email: {
    fontSize: 16,
    color: Colors.common.gray[600],
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary[600],
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    marginTop: 20,
    backgroundColor: Colors.common.white,
    borderRadius: 12,
    shadowColor: Colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.common.gray[700],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[200],
    fontFamily: 'Inter-SemiBold',
    backgroundColor: Colors.common.gray[50],
  },
  // Style for Coming Soon section titles
  sectionTitleComingSoon: {
    color: Colors.common.red?.[700] || '#B91C1C', // Darker red for title
    backgroundColor: Colors.common.red?.[50] || '#FEF2F2', // Very light red background
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.common.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[100],
  },
   // Style for Coming Soon setting items
  settingItemComingSoon: {
    opacity: 0.6, // Reduce opacity
    backgroundColor: Colors.common.red?.[50] || '#FEF2F2', // Very light red background
    borderBottomColor: Colors.common.red?.[100] || '#FEE2E2', // Lighter red border
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
   // Style for Coming Soon setting item icons (background)
  settingIconComingSoon: {
     backgroundColor: Colors.common.red?.[100] || '#FEE2F2', // Light red background for icon circle
  },
  settingContent: {
    flex: 1,
    marginLeft: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.common.gray[900],
    fontFamily: 'Inter-Medium',
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.common.gray[500],
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
   // Style for Coming Soon setting item text (title and description)
  settingTextComingSoon: {
    color: Colors.common.red?.[800] || '#991B1B', // Dark reddish text color
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 32,
    marginHorizontal: 16,
    backgroundColor: Colors.common.error,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.common.error,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.common.white,
    fontFamily: 'Inter-SemiBold',
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: Colors.common.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.common.gray[900],
    marginBottom: 20,
    fontFamily: 'Poppins-Bold',
  },
  modalForm: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    backgroundColor: Colors.common.white,
    borderWidth: 1,
    borderColor: Colors.common.gray[300],
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
    width: '100%',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: Colors.common.white,
  },
  saveButton: {
     // Specific styles for the Save button
  },
});
