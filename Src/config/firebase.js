import { initializeApp } from '@firebase/app';
import {
  getReactNativePersistence,
  initializeAuth,
} from '@firebase/auth';
import { getDatabase } from '@firebase/database';
import { getFunctions } from '@firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { initializeAndroidAppCheck } from './appCheck';

export const firebaseConfig = {
  apiKey: 'AIzaSyDwSmUqhVaeKjMDpPucOOF6Kr9TseWkbRU',
  authDomain: 'test-22240846.firebaseapp.com',
  databaseURL: 'https://test-22240846-default-rtdb.firebaseio.com',
  projectId: 'test-22240846',
  appId: '1:803078782268:web:3687570a421bfd9dbc7239',
};

export const googleWebClientId = '803078782268-4h34k77paoc2bsqrrbaqla7mdred7snn.apps.googleusercontent.com';
export const googleIosClientId = '803078782268-4h34k77paoc2bsqrrbaqla7mdred7snn.apps.googleusercontent.com';
export const facebookAppId = '1162340739453922';

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

export const appCheck = initializeAndroidAppCheck(app);
export const database = getDatabase(app);
export const functions = getFunctions(app, 'us-central1');
