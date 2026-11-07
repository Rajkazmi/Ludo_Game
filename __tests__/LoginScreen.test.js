import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockDispatch = jest.fn();
const mockResetAndNavigate = jest.fn().mockResolvedValue();
const mockSignInWithGoogle = jest.fn().mockResolvedValue('player@example.com');
const mockGetUserProfile = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('react-native-vector-icons/FontAwesome', () => () => null);

jest.mock('../Src/Components/Wrapper', () => {
  const ReactForWrapper = require('react');
  const { View } = require('react-native');
  return ({ children, style }) =>
    ReactForWrapper.createElement(View, { style }, children);
});

jest.mock('../Src/services/authService', () => ({
  getAuthConfigurationError: jest.fn(() => null),
  isDeviceOffline: jest.fn(() => false),
  signInWithFacebook: jest.fn(),
  signInWithGoogle: (...args) => mockSignInWithGoogle(...args),
}));

jest.mock('../Src/helpers/NavigationUtil', () => ({
  navigate: jest.fn(),
  resetAndNavigate: (...args) => mockResetAndNavigate(...args),
}));

jest.mock('../Src/redux/reducers/gameSlice', () => ({
  resetGame: jest.fn(() => ({ type: 'game/reset' })),
}));

jest.mock('../Src/redux/profileSlice', () => ({
  setUserProfile: jest.fn(profile => ({ type: 'profile/set', payload: profile })),
}));

jest.mock('../Src/config/firebase', () => ({
  auth: { currentUser: { uid: 'user-1' } },
}));

jest.mock('../Src/services/profileService', () => ({
  getUserProfile: (...args) => mockGetUserProfile(...args),
}));

import LoginScreen from '../Src/Screens/LoginScreen';

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('continues to Home when authentication succeeds but profile lookup fails', async () => {
    mockGetUserProfile.mockRejectedValue(new Error('Profile lookup unavailable'));
    let renderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <LoginScreen route={{ params: {} }} />,
      );
    });

    await act(async () => {
      await renderer.root
        .findByProps({ accessibilityLabel: 'Continue with Google' })
        .props.onPress();
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
