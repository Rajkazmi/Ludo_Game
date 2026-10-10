import { initializeApp } from '@firebase/app';
import {
  getReactNativePersistence,
  initializeAuth,
} from '@firebase/auth';
import { getDatabase } from '@firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: 'REPLACE_WITH_FIREBASE_WEB_API_KEY',
  authDomain: 'REPLACE_WITH_FIREBASE_AUTH_DOMAIN',
  databaseURL: 'https://replace-with-project-default-rtdb.firebaseio.com',
  projectId: 'REPLACE_WITH_FIREBASE_PROJECT_ID',
  appId: 'REPLACE_WITH_FIREBASE_APP_ID',
};

export const googleWebClientId = 'REPLACE_WITH_GOOGLE_WEB_CLIENT_ID';
export const googleIosClientId = 'REPLACE_WITH_GOOGLE_IOS_CLIENT_ID';
export const facebookAppId = 'REPLACE_WITH_FACEBOOK_APP_ID';

const isConfiguredValue = value =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.includes('REPLACE_WITH_') &&
  !value.includes('replace-with-project');

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  isConfiguredValue,
);

export const isGoogleSignInConfigured =
  isConfiguredValue(googleWebClientId) &&
  (Platform.OS !== 'ios' || isConfiguredValue(googleIosClientId));

export const isFacebookSignInConfigured =
  isConfiguredValue(facebookAppId);

const app = initializeApp(firebaseConfig);
const authStorage = AsyncStorage;

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(authStorage),
});

export const database = getDatabase(app);
