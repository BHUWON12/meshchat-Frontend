import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert, // Import Alert for user feedback
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Using the original component paths as requested
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

import Colors from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext'; // Assuming useAuth is correctly implemented in your AuthContext.tsx

export default function SignInScreen() {
  // Access login function and loading state from AuthContext
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Validate form input fields
  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    }
    // Optional: Add more specific email format validation here if needed
    // else if (!/\S+@\S+\.\S+/.test(email)) {
    //   newErrors.email = 'Invalid email format';
    // }

    if (!password) {
      newErrors.password = 'Password is required';
    }
    // Optional: Add password length or complexity validation here
     else if (password.length < 6) {
       newErrors.password = 'Password must be at least 6 characters';
     }


    setErrors(newErrors); // Update the errors state
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  // Handle standard email/password sign in
  const handleSignIn = async () => {
    // Clear any previous validation errors
    setErrors({});

    // Validate the form before attempting login
    if (!validateForm()) {
      // If validation fails, the errors state is updated, and the Input components will show error messages.
      // Optionally, you could show a general alert here as well.
      // Alert.alert('Validation Error', 'Please fix the errors in the form.');
      return; // Stop the sign-in process if validation fails
    }

    try {
      // Call the login function provided by AuthContext
      // The AuthContext is responsible for calling your services/auth.ts login function
      await login(email, password);
      // If login is successful, the AuthContext should handle navigation (e.g., redirect to tabs)
    } catch (error: any) { // Catch any errors during the login process
      console.error('Error signing in:', error);
      // Show a user-friendly alert message on login failure
      // Attempt to get a more specific error message from the backend response
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred during sign-in. Please try again.';
      Alert.alert('Sign In Failed', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Use 'height' on Android
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // Adjust offset as needed
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            {/* Logo/App Title Section */}
            <LinearGradient
              colors={[Colors.primary[600], Colors.primary[500]]}
              style={styles.logoContainer}
            >
              <Text style={styles.logoText}>MC</Text>
            </LinearGradient>
            <Text style={styles.title}>MeshChat</Text>
            <Text style={styles.subtitle}>
              Communicate anywhere, anytime - even without the internet.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Sign In</Text>

            {/* Email Input */}
            <Input
              label="Email"
              placeholder="Your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={Colors.common.gray[500]} />}
              error={errors.email} // Pass validation error message
              containerStyle={styles.inputContainer}
              // Optional: Add ref and onSubmitEditing for keyboard navigation
              // ref={emailInputRef}
              // onSubmitEditing={() => passwordInputRef.current?.focus()}
            />

            {/* Password Input */}
            <Input
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              showPasswordToggle
              leftIcon={<Lock size={20} color={Colors.common.gray[500]} />}
              error={errors.password} // Pass validation error message
              containerStyle={styles.inputContainer}
              // Optional: Add ref and onSubmitEditing for form submission
              // ref={passwordInputRef}
              // onSubmitEditing={handleSignIn}
            />

            {/* Sign In Button */}
            <Button
              title="Sign In"
              onPress={handleSignIn}
              loading={isLoading} // Show loading indicator when isLoading is true
              gradient // Apply gradient style
              style={styles.button}
              disabled={isLoading} // Disable button while loading
            />

            {/* Sign Up Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              {/* Ensure no whitespace between Link and TouchableOpacity */}
              <Link href="/(auth)/signup" asChild><TouchableOpacity disabled={isLoading}><Text style={styles.signUpLink}>Sign Up</Text></TouchableOpacity></Link>
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
    backgroundColor: Colors.common.white, // Consistent background
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1, // Allow content to grow and enable scrolling
    padding: 24,
    justifyContent: 'center', // Center content vertically if it doesn't fill the screen
  },
  header: {
    alignItems: 'center',
    marginTop: 0, // Adjusted margin top
    marginBottom: 32, // Adjusted margin bottom
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
    // fontFamily: 'Poppins-Bold', // Ensure font is loaded if used
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.common.gray[900],
    marginBottom: 8,
    // fontFamily: 'Poppins-Bold', // Ensure font is loaded if used
  },
  subtitle: {
    fontSize: 16,
    color: Colors.common.gray[600],
    textAlign: 'center',
    marginHorizontal: 20,
    // fontFamily: 'Inter-Regular', // Ensure font is loaded if used
  },
  formContainer: {
    // flex: 1, // Removed flex: 1 to allow scrollview to control height
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.common.gray[900],
    marginBottom: 24,
    // fontFamily: 'Poppins-SemiBold', // Ensure font is loaded if used
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
    marginTop: 24, // Adjusted margin top after removing demo section
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.common.gray[600],
    // fontFamily: 'Inter-Regular', // Ensure font is loaded if used
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary[600],
    marginLeft: 4,
    // fontFamily: 'Inter-SemiBold', // Ensure font is loaded if used
  },
});
