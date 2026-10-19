import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useDispatch } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import Wrapper from '../Components/Wrapper';
import {
  getAuthConfigurationError,
  isDeviceOffline,
  signInWithFacebook,
  signInWithGoogle,
} from '../services/authService';
import { resetAndNavigate } from '../helpers/NavigationUtil';
import { resetGame } from '../redux/reducers/gameSlice';
import { setUserProfile } from '../redux/profileSlice';
import { auth } from '../config/firebase';
import { getUserProfile } from '../services/profileService';
import { navigate } from '../helpers/NavigationUtil';

const LoginScreen = ({ route }) => {
  const dispatch = useDispatch();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState(route.params?.startupError ?? null);
  const configurationError = getAuthConfigurationError();

  useEffect(
    () =>
      NetInfo.addEventListener(networkState => {
        if (isDeviceOffline(networkState)) {
          resetAndNavigate('HomeScreen', { mode: 'offline' });
        }
      }),
    [],
  );

  const handleSignIn = useCallback(async (provider, signIn) => {
    setError(null);
    setLoadingProvider(provider);
    let failureStage = `${provider} sign-in`;

    try {
      const email = await signIn();
      if (email) {
        failureStage = 'Realtime Database profile lookup';
        const profile = await getUserProfile();
        dispatch(setUserProfile(
          profile ? { uid: auth.currentUser.uid, profile } : null,
        ));
        await resetAndNavigate(
          profile ? 'HomeScreen' : 'ProfileSetupScreen',
          profile ? { mode: 'online' } : undefined,
        );
      }
    } catch (signInError) {
      setError(
        `${failureStage} failed: ${
          signInError.message || 'Please try again.'
        }`,
      );
    } finally {
      setLoadingProvider(null);
    }
  }, [dispatch]);

  const handlePlayOffline = useCallback(() => {
    dispatch(resetGame());
    resetAndNavigate('LudoBoardScreen');
  }, [dispatch]);

  return (
    <Wrapper style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Ludo</Text>
        <Text style={styles.description}>
          Sign in to continue online, or start a local game without an account.
        </Text>

        {error || configurationError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error || configurationError}
          </Text>
        ) : null}

        {loadingProvider ? (
          <ActivityIndicator
            accessibilityLabel={`Signing in with ${loadingProvider}`}
            color="#f0ce3c"
            size="large"
            style={styles.indicator}
          />
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate('CreateAccountScreen')}
              style={[styles.signInButton, styles.createAccountButton]}
            >
              <Text style={styles.createAccountText}>CREATE ACCOUNT</Text>
            </Pressable>
            <View style={styles.providerButtons}>
              <Pressable
                accessibilityLabel="Continue with Google"
                accessibilityRole="button"
                onPress={() => handleSignIn('Google', signInWithGoogle)}
                style={[styles.providerButton, styles.googleButton]}
              >
                <FontAwesome color="#4285f4" name="google" size={25} />
              </Pressable>
              <Pressable
                accessibilityLabel="Continue with Facebook"
                accessibilityRole="button"
                onPress={() => handleSignIn('Facebook', signInWithFacebook)}
                style={[styles.providerButton, styles.facebookButton]}
              >
                <FontAwesome color="#fff" name="facebook" size={27} />
              </Pressable>
            </View>
          </>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={handlePlayOffline}
          style={[styles.signInButton, styles.offlineButton]}
        >
          <Text style={styles.offlineButtonText}>Play Offline</Text>
        </Pressable>
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: 24,
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
  title: {
    color: '#fff',
    fontFamily: 'Philosopher-Bold',
    fontSize: 30,
    marginBottom: 12,
  },
  description: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 20,
    textAlign: 'center',
  },
  error: {
    color: '#ffc1c1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  indicator: {
    marginVertical: 20,
  },
  signInButton: {
    width: '100%',
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  createAccountButton: {
    backgroundColor: '#b52228',
    borderColor: '#f0ce3c',
    borderWidth: 1,
  },
  createAccountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  providerButtons: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    columnGap: 20,
  },
  providerButton: {
    width: 58,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0ce3c',
  },
  googleButton: {
    backgroundColor: '#fff',
  },
  facebookButton: {
    backgroundColor: '#1877f2',
  },
  offlineButton: {
    backgroundColor: 'transparent',
    borderColor: '#f0ce3c',
    borderWidth: 1,
  },
  offlineButtonText: {
    color: '#f0ce3c',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LoginScreen;
