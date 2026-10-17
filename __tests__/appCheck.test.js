import { Buffer } from 'buffer';

jest.mock('@firebase/app-check', () => ({
  CustomProvider: class {
    constructor(options) {
      this.options = options;
    }
  },
  initializeAppCheck: jest.fn((app, options) => ({ app, options })),
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('@react-native-firebase/app-check', () => ({
  getToken: jest.fn(),
  initializeAppCheck: jest.fn(() => ({ native: true })),
  ReactNativeFirebaseAppCheckProvider: class {
    constructor(providerOptions) {
      this.providerOptions = providerOptions;
    }
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

import {
  CustomProvider as FirebaseJsCustomProvider,
  initializeAppCheck as initializeFirebaseJsAppCheck,
} from '@firebase/app-check';
import { getApp as getNativeApp } from '@react-native-firebase/app';
import {
  getToken as getNativeAppCheckToken,
  initializeAppCheck as initializeNativeAppCheck,
} from '@react-native-firebase/app-check';
import { initializeAndroidAppCheck } from '../Src/config/appCheck';

describe('initializeAndroidAppCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bridges native App Check tokens to the Firebase JS SDK', async () => {
    const nativeToken = [
      Buffer.from('{}').toString('base64url'),
      Buffer.from(JSON.stringify({ exp: 1735689600 })).toString('base64url'),
      'signature',
    ].join('.');
    getNativeAppCheckToken.mockResolvedValue({ token: nativeToken });

    const firebaseJsApp = { name: 'web-app' };
    const appCheck = initializeAndroidAppCheck(firebaseJsApp);

    expect(getNativeApp).toHaveBeenCalledTimes(1);
    expect(initializeNativeAppCheck).toHaveBeenCalledWith(
      { name: '[DEFAULT]' },
      expect.objectContaining({
        isTokenAutoRefreshEnabled: true,
        provider: expect.objectContaining({
          providerOptions: { android: { provider: 'debug' } },
        }),
      }),
    );

    const [configuredApp, options] =
      initializeFirebaseJsAppCheck.mock.calls[0];
    expect(configuredApp).toBe(firebaseJsApp);
    expect(options.provider).toBeInstanceOf(FirebaseJsCustomProvider);
    expect(options.isTokenAutoRefreshEnabled).toBe(false);
    await expect(options.provider.options.getToken()).resolves.toEqual({
      token: nativeToken,
      expireTimeMillis: 1735689600000,
    });
    expect(getNativeAppCheckToken).toHaveBeenCalledWith(
      initializeNativeAppCheck.mock.results[0].value,
    );
    expect(appCheck).toEqual({ app: firebaseJsApp, options });
  });
});
