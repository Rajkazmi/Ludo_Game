import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockResetAndNavigate = jest.fn();
const mockNetInfoFetch = jest.fn();
const mockSetSoundSettings = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => false,
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: (...args) => mockNetInfoFetch(...args),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: selector => selector(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0 }),
}));

jest.mock('react-native-linear-gradient', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return ({ children, ...props }) =>
    ReactModule.createElement(View, props, children);
});

jest.mock('react-native-vector-icons/MaterialIcons', () => () => null);
jest.mock('react-native-sound-player', () => ({ stop: jest.fn() }));
jest.mock('../Src/Components/Wrapper', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return ({ children }) => ReactModule.createElement(View, null, children);
});
jest.mock('../Src/Components/EconomyHud', () => {
  const ReactModule = require('react');
  const { Pressable, View } = require('react-native');
  return ({ children, onOpenSettings }) =>
    ReactModule.createElement(
      View,
      null,
      ReactModule.createElement(Pressable, {
        accessibilityLabel: 'Open settings',
        onPress: onOpenSettings,
      }),
      children,
    );
});
jest.mock('../Src/Components/GameSetupModal', () => () => null);
jest.mock('../Src/helpers/NavigationUtil', () => ({
  navigate: (...args) => mockNavigate(...args),
  resetAndNavigate: (...args) => mockResetAndNavigate(...args),
}));
jest.mock('../Src/helpers/SoundUtility', () => ({
  getSoundSettings: () => ({
    musicVolume: 0.7,
    sfxVolume: 0.8,
    musicMuted: false,
    sfxMuted: false,
  }),
  playSound: jest.fn(),
  setSoundSettings: settings => mockSetSoundSettings(settings),
}));
jest.mock('../Src/redux/reducers/gameSlice', () => ({
  resetGame: payload => ({ type: 'game/resetGame', payload }),
}));
jest.mock('../Src/redux/reducers/gameSelector', () => ({
  selectCurrentPositions: () => [],
}));
jest.mock('../Src/redux/onlineSlice', () => ({
  clearOnlineRoom: () => ({ type: 'online/clearOnlineRoom' }),
}));
jest.mock('../Src/redux/profileSlice', () => ({
  selectUserProfile: () => null,
  setUserProfile: payload => ({ type: 'profile/setUserProfile', payload }),
}));
jest.mock('../Src/services/authService', () => ({
  isDeviceOffline: () => false,
}));
jest.mock('../Src/services/profileService', () => ({
  getUserProfile: jest.fn(),
}));
jest.mock('../Src/config/firebase', () => ({ auth: { currentUser: null } }));

import HomeScreen from '../Src/Screens/HomeScreen';

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetAndNavigate.mockResolvedValue();
    mockSetSoundSettings.mockImplementation(settings => settings);
    mockNetInfoFetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  it('shows the reference-inspired local and online game cards', () => {
    let renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen route={{ params: {} }} />);
    });

    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Start two player local game',
      }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Start four player local game',
      }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Create room to play with friends',
      }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Play online' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Open special game modes',
      }),
    ).toBeTruthy();
  });

  it('starts the selected two-player local mode', () => {
    let renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen route={{ params: {} }} />);
    });

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'Start two player local game' })
        .props.onPress();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'game/resetGame',
      payload: { activePlayers: [1, 3], cpuPlayers: [] },
    });
    expect(mockResetAndNavigate).toHaveBeenCalledWith('LudoBoardScreen');
  });

  it('starts the selected four-player local mode', () => {
    let renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen route={{ params: {} }} />);
    });

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'Start four player local game' })
        .props.onPress();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'game/resetGame',
      payload: { activePlayers: [1, 2, 3, 4], cpuPlayers: [] },
    });
    expect(mockResetAndNavigate).toHaveBeenCalledWith('LudoBoardScreen');
  });

  it('routes unauthenticated players to sign-in when creating a room', async () => {
    let renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen route={{ params: {} }} />);
    });

    await act(async () => {
      await renderer.root
        .findByProps({
          accessibilityLabel: 'Create room to play with friends',
        })
        .props.onPress();
    });

    expect(mockNetInfoFetch).toHaveBeenCalled();
    expect(mockResetAndNavigate).toHaveBeenCalledWith('LoginScreen');
  });

  it('opens audio and support controls from the settings gear', () => {
    let renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen route={{ params: {} }} />);
    });

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'Open settings' })
        .props.onPress();
    });

    expect(renderer.root.findByProps({ children: 'GAME MUSIC' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'SOUND EFFECTS' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'About Us' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Contact Us' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Help' })).toBeTruthy();
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Game music volume' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Sound effects volume' }),
    ).toBeTruthy();
  });

  it('persists sound-effect mute changes from Settings', () => {
    let renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen route={{ params: {} }} />);
    });

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'Open settings' })
        .props.onPress();
    });
    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'Mute sound effects' })
        .props.onPress();
    });

    expect(mockSetSoundSettings).toHaveBeenCalledWith({
      musicVolume: 0.7,
      sfxVolume: 0.8,
      musicMuted: false,
      sfxMuted: true,
    });
  });

  it('updates and persists the game music volume slider', () => {
    let renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen route={{ params: {} }} />);
    });

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'Open settings' })
        .props.onPress();
    });
    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'Game music volume' })
        .props.onAccessibilityAction({
          nativeEvent: { actionName: 'increment' },
        });
    });

    expect(mockSetSoundSettings).toHaveBeenCalled();
    const updatedSettings =
      mockSetSoundSettings.mock.calls[mockSetSoundSettings.mock.calls.length - 1][0];
    expect(updatedSettings.musicVolume).toBeCloseTo(0.8);
  });

  it('starts a default two-player game with the floating Play Now action', () => {
    let renderer;
    act(() => {
      renderer = ReactTestRenderer.create(<HomeScreen route={{ params: {} }} />);
    });

    act(() => {
      renderer.root.findByProps({ accessibilityLabel: 'Play now' }).props.onPress();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'game/resetGame',
      payload: { activePlayers: [1, 3], cpuPlayers: [] },
    });
    expect(mockResetAndNavigate).toHaveBeenCalledWith('LudoBoardScreen');
  });
});
