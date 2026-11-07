import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockDispatch = jest.fn();
const mockResetAndNavigate = jest.fn().mockResolvedValue();
const mockCreateAccount = jest.fn().mockResolvedValue('player@example.com');
const mockSignIn = jest.fn().mockResolvedValue('player@example.com');
const mockGetUserProfile = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('../Src/Components/Wrapper', () => {
  const ReactForWrapper = require('react');
  const { View } = require('react-native');
  return ({ children, style }) =>
    ReactForWrapper.createElement(View, { style }, children);
});

jest.mock('../Src/config/firebase', () => ({
  auth: { currentUser: { uid: 'user-1' } },
}));

jest.mock('../Src/helpers/NavigationUtil', () => ({
  resetAndNavigate: (...args) => mockResetAndNavigate(...args),
}));

jest.mock('../Src/redux/profileSlice', () => ({
  setUserProfile: profile => ({ type: 'profile/set', payload: profile }),
}));

jest.mock('../Src/services/authService', () => ({
  createAccountWithEmailPassword: (...args) => mockCreateAccount(...args),
  signInWithEmailPassword: (...args) => mockSignIn(...args),
}));

jest.mock('../Src/services/profileService', () => ({
  getUserProfile: (...args) => mockGetUserProfile(...args),
}));

import CreateAccountScreen from '../Src/Screens/CreateAccountScreen';

async function submitForm(renderer, {
  email,
  password,
  confirmPassword,
  isSignIn,
}) {
  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Email address' })
      .props.onChangeText(email);
    renderer.root
      .findByProps({ accessibilityLabel: 'Password' })
      .props.onChangeText(password);
    if (confirmPassword) {
      renderer.root
        .findByProps({ accessibilityLabel: 'Confirm password' })
        .props.onChangeText(confirmPassword);
    }
  });

  await act(async () => {
    await renderer.root.findByProps({
      accessibilityLabel: isSignIn ? 'Sign in' : 'Create account',
    }).props.onPress();
  });
}

describe('CreateAccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an auth account and sends a missing profile to profile setup', async () => {
    mockGetUserProfile.mockResolvedValue(null);
    let renderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <CreateAccountScreen
          navigation={{ goBack: jest.fn() }}
          route={{ params: { mode: 'createAccount' } }}
        />,
      );
    });

    await submitForm(renderer, {
      email: 'player@example.com',
      password: 'secret1',
      confirmPassword: 'secret1',
      isSignIn: false,
    });

    expect(mockCreateAccount).toHaveBeenCalledWith(
      'player@example.com',
      'secret1',
    );
    expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
    expect(mockResetAndNavigate).toHaveBeenCalledWith(
      'ProfileSetupScreen',
      undefined,
    );
  });

  it('loads a saved profile for email login and routes the user to Home', async () => {
    const profile = {
      username: 'LudoPlayer',
      dateOfBirth: '2000-01-31',
      gender: 'Other',
      recoveryEmail: 'player@example.com',
    };
    mockGetUserProfile.mockResolvedValue(profile);
    let renderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <CreateAccountScreen
          navigation={{ goBack: jest.fn() }}
          route={{ params: { mode: 'signIn' } }}
        />,
      );
    });

    await submitForm(renderer, {
      email: 'player@example.com',
      password: 'secret1',
      isSignIn: true,
    });

    expect(mockSignIn).toHaveBeenCalledWith('player@example.com', 'secret1');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'profile/set',
      payload: { uid: 'user-1', profile },
    });
    expect(mockResetAndNavigate).toHaveBeenCalledWith('HomeScreen', {
      mode: 'online',
    });
  });

  it('lets an authenticated user continue to Home if profile lookup fails', async () => {
    mockGetUserProfile.mockRejectedValue(new Error('Profile lookup unavailable'));
    let renderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <CreateAccountScreen
          navigation={{ goBack: jest.fn() }}
          route={{ params: { mode: 'signIn' } }}
        />,
      );
    });

    await submitForm(renderer, {
      email: 'player@example.com',
      password: 'secret1',
      isSignIn: true,
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'profile/set',
      payload: null,
    });
    expect(mockResetAndNavigate).toHaveBeenCalledWith('HomeScreen', {
      mode: 'online',
      startupError: 'Profile lookup unavailable',
    });
  });
});
