import {
  CustomProvider as FirebaseJsCustomProvider,
  initializeAppCheck as initializeFirebaseJsAppCheck,
} from '@firebase/app-check';
import { getApp as getNativeApp } from '@react-native-firebase/app';
import {
  getToken as getNativeAppCheckToken,
  initializeAppCheck as initializeNativeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from '@react-native-firebase/app-check';
import { Platform } from 'react-native';
import { getAppCheckTokenExpiryMillis } from './appCheckToken';

export function initializeAndroidAppCheck(firebaseJsApp) {
  if (Platform.OS !== 'android') {
    return null;
  }

  const nativeAppCheck = initializeNativeAppCheck(getNativeApp(), {
    provider: new ReactNativeFirebaseAppCheckProvider({
      android: {
        provider: __DEV__ ? 'debug' : 'playIntegrity',
      },
    }),
    isTokenAutoRefreshEnabled: true,
  });

  return initializeFirebaseJsAppCheck(firebaseJsApp, {
    provider: new FirebaseJsCustomProvider({
      getToken: async () => {
        const { token } = await getNativeAppCheckToken(nativeAppCheck);
        return {
          token,
          expireTimeMillis: getAppCheckTokenExpiryMillis(token),
        };
      },
    }),
    isTokenAutoRefreshEnabled: false,
  });
}
