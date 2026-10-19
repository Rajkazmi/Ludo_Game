jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
}));

jest.mock('@firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  FacebookAuthProvider: {
    credential: jest.fn(() => 'facebook-credential'),
  },
  GoogleAuthProvider: {
    credential: jest.fn(() => 'google-credential'),
  },
  signInWithEmailAndPassword: jest.fn(),
  signInWithCredential: jest.fn(),
}));

jest.mock('@firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(),
}));

jest.mock('react-native-fbsdk-next', () => ({
  AccessToken: {
    getCurrentAccessToken: jest.fn(),
  },
  LoginManager: {
    logInWithPermissions: jest.fn(),
  },
}));

jest.mock('../Src/config/firebase', () => ({
  auth: {},
  googleIosClientId: 'ios-client-id',
  googleWebClientId: 'web-client-id',
  isFacebookSignInConfigured: true,
  isFirebaseConfigured: true,
  isGoogleSignInConfigured: true,
}));

import {
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
} from '@firebase/auth';
import { set } from '@firebase/database';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  AccessToken,
  LoginManager,
} from 'react-native-fbsdk-next';
import {
  createAccountWithEmailPassword,
  signInWithEmailPassword,
  signInWithFacebook,
  signInWithGoogle,
} from '../Src/services/authService';

describe('authentication provider sign-in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ email: 'player@example.com' }),
    });
    signInWithCredential.mockResolvedValue({
      user: { email: 'player@example.com', uid: 'user-1' },
    });
  });

  it('completes Google sign-in without writing a Realtime Database profile', async () => {
    GoogleSignin.hasPlayServices.mockResolvedValue();
    GoogleSignin.signIn.mockResolvedValue({
      type: 'success',
      data: {
        idToken: 'google-id-token',
        user: { email: 'player@example.com' },
      },
    });

    await expect(signInWithGoogle()).resolves.toBe('player@example.com');
    expect(set).not.toHaveBeenCalled();
  });

  it('completes Facebook sign-in without writing a Realtime Database profile', async () => {
    LoginManager.logInWithPermissions.mockResolvedValue({
      isCancelled: false,
    });
    AccessToken.getCurrentAccessToken.mockResolvedValue({
      accessToken: 'facebook-access-token',
    });

    await expect(signInWithFacebook()).resolves.toBe('player@example.com');
    expect(set).not.toHaveBeenCalled();
  });

  it('creates a Firebase email/password account and returns its email', async () => {
    createUserWithEmailAndPassword.mockResolvedValue({
      user: { email: 'player@example.com', uid: 'user-1' },
    });

    await expect(
      createAccountWithEmailPassword(' player@example.com ', 'secret1'),
    ).resolves.toBe('player@example.com');
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'player@example.com',
      'secret1',
    );
  });

  it('signs in an existing Firebase email/password account', async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { email: 'player@example.com', uid: 'user-1' },
    });

    await expect(
      signInWithEmailPassword(' player@example.com ', 'secret1'),
    ).resolves.toBe('player@example.com');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'player@example.com',
      'secret1',
    );
  });

});
