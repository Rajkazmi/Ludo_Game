import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Wrapper from '../Components/Wrapper';
import { auth } from '../config/firebase';
import { resetAndNavigate } from '../helpers/NavigationUtil';
import {
  createAccountWithEmailPassword,
  signInWithEmailPassword,
} from '../services/authService';
import { getUserProfile } from '../services/profileService';
import { setUserProfile } from '../redux/profileSlice';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CreateAccountScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [isSignIn, setIsSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = useCallback(async () => {
    const normalizedEmail = email.trim();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!isSignIn && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isSignIn) {
        await signInWithEmailPassword(normalizedEmail, password);
      } else {
        await createAccountWithEmailPassword(normalizedEmail, password);
      }

      const profile = await getUserProfile();
      dispatch(
        setUserProfile(
          profile ? { uid: auth.currentUser.uid, profile } : null,
        ),
      );
      await resetAndNavigate(
        profile ? 'HomeScreen' : 'ProfileSetupScreen',
        profile ? { mode: 'online' } : undefined,
      );
    } catch (authError) {
      setError(authError.message || 'Unable to continue. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [confirmPassword, dispatch, email, isSignIn, password]);

  return (
    <Wrapper style={styles.wrapper}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>BACK</Text>
            </Pressable>
            <Text style={styles.title}>
              {isSignIn ? 'Sign In' : 'Create Account'}
            </Text>
            <Text style={styles.description}>
              {isSignIn
                ? 'Sign in with your email and password.'
                : 'Create an account to save your online profile.'}
            </Text>

            <TextInput
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={value => {
                setEmail(value);
                setError(null);
              }}
              placeholder="Email address"
              placeholderTextColor="#c5c5d0"
              style={styles.input}
              textContentType="emailAddress"
              value={email}
            />
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={value => {
                setPassword(value);
                setError(null);
              }}
              placeholder="Password"
              placeholderTextColor="#c5c5d0"
              secureTextEntry
              style={styles.input}
              textContentType={isSignIn ? 'password' : 'newPassword'}
              value={password}
            />
            {!isSignIn ? (
              <TextInput
                accessibilityLabel="Confirm password"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={value => {
                  setConfirmPassword(value);
                  setError(null);
                }}
                placeholder="Confirm password"
                placeholderTextColor="#c5c5d0"
                secureTextEntry
                style={styles.input}
                textContentType="newPassword"
                value={confirmPassword}
              />
            ) : null}

            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}

            {loading ? (
              <ActivityIndicator
                color="#f0ce3c"
                size="large"
                style={styles.loading}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={handleSubmit}
                style={styles.submitButton}
              >
                <Text style={styles.submitText}>
                  {isSignIn ? 'SIGN IN' : 'CREATE ACCOUNT'}
                </Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => {
                setIsSignIn(value => !value);
                setError(null);
              }}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {isSignIn
                  ? 'New here? Create an account'
                  : 'Already have an account? Sign in'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
  },
  keyboard: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 12, 41, 0.92)',
    borderWidth: 1,
    borderColor: '#f0ce3c',
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backText: {
    color: '#f0ce3c',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: '#fff',
    fontFamily: 'Philosopher-Bold',
    fontSize: 30,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#f0ce3c',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  error: {
    color: '#ffc1c1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    textAlign: 'center',
  },
  submitButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#b52228',
    borderWidth: 1,
    borderColor: '#f0ce3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  switchButton: {
    paddingVertical: 16,
  },
  switchText: {
    color: '#f0ce3c',
    fontSize: 14,
    textAlign: 'center',
  },
  loading: {
    marginVertical: 12,
  },
});

export default CreateAccountScreen;
