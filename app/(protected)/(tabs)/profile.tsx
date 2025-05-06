import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, LogOut, CreditCard as Edit2, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../../../constants/Colors';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../components/ui/Button';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateProfile({ avatar: result.assets[0].uri });
    }
  };

  const handleSaveProfile = () => {
    updateProfile({ username, bio });
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Edit2 size={24} color={Colors.common.gray[700]} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePick}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={40} color={Colors.common.gray[400]} />
              </View>
            )}
            <View style={styles.cameraButton}>
              <Camera size={16} color={Colors.common.white} />
            </View>
          </TouchableOpacity>

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor={Colors.common.gray[400]}
              />
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Write something about yourself..."
                placeholderTextColor={Colors.common.gray[400]}
                multiline
                numberOfLines={3}
              />
              <Button
                title="Save Changes"
                onPress={handleSaveProfile}
                style={styles.saveButton}
                gradient
              />
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{user?.username}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              {bio && <Text style={styles.bio}>{bio}</Text>}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LogOut size={20} color={Colors.common.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.common.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary[500],
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginBottom: 12,
    fontFamily: 'Inter-Regular',
  },
  bio: {
    fontSize: 16,
    color: Colors.common.gray[700],
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  editForm: {
    width: '100%',
  },
  input: {
    backgroundColor: Colors.common.white,
    borderWidth: 1,
    borderColor: Colors.common.gray[300],
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 'auto',
    backgroundColor: Colors.common.gray[100],
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.common.error,
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
  },
});