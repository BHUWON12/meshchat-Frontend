import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext'; // Adjust the import path as necessary
import Button from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess(true);
    } catch (err) {
      setError('Failed to send reset instructions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={[theme.colors.primary[900], theme.colors.secondary[900]]}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(500)} style={styles.content}>
            <Button
              title="Back"
              onPress={goBack}
              variant="text"
              leftIcon={<ArrowLeft size={20} color={theme.colors.white} />}
              style={styles.backButton}
            />

            <Text style={[styles.title, { color: theme.colors.white }]}>
              Reset Password
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.gray[200] }]}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>

            {error && (
              <View style={[styles.errorContainer, { backgroundColor: theme.colors.error[100] }]}>
                <Text style={[styles.errorText, { color: theme.colors.error[700] }]}>
                  {error}
                </Text>
              </View>
            )}

            {success ? (
              <View style={styles.successContainer}>
                <Text style={[styles.successTitle, { color: theme.colors.white }]}>
                  Check your email
                </Text>
                <Text style={[styles.successText, { color: theme.colors.gray[200] }]}>
                  We've sent password reset instructions to your email address.
                </Text>
                <Button
                  title="Back to Login"
                  onPress={() => router.push('/(auth)/signin')}
                  variant="secondary"
                  style={{ marginTop: 24 }}
                />
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.gray[200] }]}>
                    Email Address
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: theme.colors.white,
                        borderColor: theme.colors.gray[700],
                      },
                    ]}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.colors.gray[400]}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <Button
                  title="Send Reset Instructions"
                  onPress={handleSubmit}
                  variant="primary"
                  loading={loading}
                  style={{ marginTop: 24 }}
                />
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    marginBottom: 32,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  successTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    maxWidth: '80%',
  },
});