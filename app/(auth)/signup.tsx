import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Colors from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext'; 

export default function SignUpScreen() {
  const { register, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Validate form
  const validateForm = () => {
    const newErrors: {
      username?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    
    if (!username) newErrors.username = 'Username is required';
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle sign up
  const handleSignUp = async () => {
    if (!validateForm()) return;
    
    try {
      await register(username, email, password);
    } catch (error) {
      console.error('Error signing up:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <LinearGradient
              colors={[Colors.primary[600], Colors.primary[500]]}
              style={styles.logoContainer}
            >
              <Text style={styles.logoText}>MC</Text>
            </LinearGradient>
            <Text style={styles.title}>MeshChat</Text>
            <Text style={styles.subtitle}>
              Create your account to start messaging
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Sign Up</Text>
            
            <Input
              label="Username"
              placeholder="Choose a username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              leftIcon={<User size={20} color={Colors.common.gray[500]} />}
              error={errors.username}
              containerStyle={styles.inputContainer}
            />
            
            <Input
              label="Email"
              placeholder="Your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={Colors.common.gray[500]} />}
              error={errors.email}
              containerStyle={styles.inputContainer}
            />
            
            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              showPasswordToggle
              leftIcon={<Lock size={20} color={Colors.common.gray[500]} />}
              error={errors.password}
              containerStyle={styles.inputContainer}
            />
            
            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              showPasswordToggle
              leftIcon={<Lock size={20} color={Colors.common.gray[500]} />}
              error={errors.confirmPassword}
              containerStyle={styles.inputContainer}
            />

            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={isLoading}
              gradient
              style={styles.button}
            />
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Link href="/(auth)/signin" asChild>
                <TouchableOpacity>
                  <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.common.white,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.common.white,
    fontFamily: 'Poppins-Bold',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.common.gray[900],
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.common.gray[600],
    textAlign: 'center',
    marginHorizontal: 20,
    fontFamily: 'Inter-Regular',
  },
  formContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.common.gray[900],
    marginBottom: 24,
    fontFamily: 'Poppins-SemiBold',
  },
  inputContainer: {
    marginBottom: 20,
  },
  button: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.common.gray[600],
    fontFamily: 'Inter-Regular',
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary[600],
    marginLeft: 4,
    fontFamily: 'Inter-SemiBold',
  },
});