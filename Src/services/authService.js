import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from '@firebase/auth';
import { ref, set } from '@firebase/database';
import {
  AccessToken,
  LoginManager,
} from 'react-native-fbsdk-next';
import { Platform } from 'react-native';
import {
  auth,
  database,
  googleIosClientId,
  googleWebClientId,
  isFacebookSignInConfigured,
  isFirebaseConfigured,
  isGoogleSignInConfigured,
} from '../config/firebase';

let googleSignInConfigured = false;

export const isDeviceOffline = networkState =>
  networkState.isConnected === false ||
  networkState.isInternetReachable === false;

export function getAuthConfigurationError(provider) {
  const missingSettings = [];

  if (!isFirebaseConfigured) {
    missingSettings.push(
      'Firebase project values in Src/config/firebase.js',
    );
  }

  if (
    (!provider || provider === 'Google') &&
    !isGoogleSignInConfigured
  ) {
    missingSettings.push(
      Platform.OS === 'ios'
        ? 'Google Web and iOS client IDs in Src/config/firebase.js'
        : 'Google Web client ID in Src/config/firebase.js',
    );
  }

  if (
    (!provider || provider === 'Facebook') &&
    !isFacebookSignInConfigured
  ) {
    missingSettings.push(
      'Facebook App ID in Src/config/firebase.js and the native Facebook app settings',
    );
  }

  if (missingSettings.length === 0) {
    return null;
  }

  return `Configure ${missingSettings.join(' and ')} before signing in.`;
}

function requireAuthConfiguration(provider) {
  const error = getAuthConfigurationError(provider);
  if (error) {
    throw new Error(error);
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null;
}

async function saveEmailOnly(user) {
  const email = normalizeEmail(user.email);
  if (!email) {
    await signOut(auth);
    throw new Error(
      'This account did not provide an email address. Allow email access in your provider account and try again.',
    );
  }

  try {
    await set(ref(database, `users/${user.uid}`), { email });
  } catch (error) {
    await signOut(auth);
    throw error;
  }

  return email;
}

export async function saveSignedInUserEmail(user) {
  requireAuthConfiguration('Firebase');
  return saveEmailOnly(user);
}

export async function signInWithGoogle() {
  requireAuthConfiguration('Google');

  if (!googleSignInConfigured) {
    GoogleSignin.configure({
      webClientId: googleWebClientId,
      iosClientId: googleIosClientId,
    });
    googleSignInConfigured = true;
  }

  await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });
  const response = await GoogleSignin.signIn();
  if (response.type === 'cancelled') {
    return null;
  }

  const { idToken, user } = response.data;
  if (!idToken || !normalizeEmail(user.email)) {
    throw new Error('Google did not return a valid sign-in token and email.');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return saveEmailOnly(result.user);
}

async function getFacebookEmail(accessToken) {
  const response = await fetch(
    'https://graph.facebook.com/me?fields=email',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Facebook email lookup failed (${response.status}).`);
  }

  const profile = await response.json();
  const email = normalizeEmail(profile.email);
  if (!email) {
    throw new Error(
      'Facebook did not provide an email address. Grant the email permission or use Google sign-in.',
    );
  }

  return email;
}

export async function signInWithFacebook() {
  requireAuthConfiguration('Facebook');

  const loginResult = await LoginManager.logInWithPermissions([
    'public_profile',
    'email',
  ]);
  if (loginResult.isCancelled) {
    return null;
  }

  const accessToken = await AccessToken.getCurrentAccessToken();
  if (!accessToken?.accessToken) {
    throw new Error('Facebook sign-in completed without an access token.');
  }

  await getFacebookEmail(accessToken.accessToken);
  const credential = FacebookAuthProvider.credential(
    accessToken.accessToken,
  );
  const result = await signInWithCredential(auth, credential);
  return saveEmailOnly(result.user);
}
