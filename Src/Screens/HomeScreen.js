import React, { useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Wrapper from '../Components/Wrapper';
import { deviceHeight, deviceWidth } from '../constants/Scaling';
import logo from '../assets/images/logo.png';
import MenuIcon from '../assets/images/menu.png';
import GradientButton from '../Components/GradientButton';
import LottieView from 'lottie-react-native';
import Witch from '../assets/animation/witch.json';
import { playSound } from '../helpers/SoundUtility';
import { useIsFocused } from '@react-navigation/native';
import SoundPlayer from 'react-native-sound-player';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentPositions } from '../redux/reducers/gameSelector';
import { resetGame } from '../redux/reducers/gameSlice';
import { navigate } from '../helpers/NavigationUtil';
import { clearOnlineRoom } from '../redux/onlineSlice';
import { isDeviceOffline } from '../services/authService';
import { auth } from '../config/firebase';
import { getUserProfile } from '../services/profileService';
import {
  selectUserProfile,
  setUserProfile,
} from '../redux/profileSlice';
import { resetAndNavigate } from '../helpers/NavigationUtil';
import GameSetupModal from '../Components/GameSetupModal';

const HomeScreen = ({ route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const currentPosition = useSelector(selectCurrentPositions);
  const userProfile = useSelector(selectUserProfile);
  const witchAnim = useRef(new Animated.Value(-deviceWidth)).current;
  const scaleXAnim = useRef(new Animated.Value(-1)).current;
  const isFocused = useIsFocused();
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [gameSetupVisible, setGameSetupVisible] = React.useState(false);

  const renderButton = useCallback(
    (title, onPress) => <GradientButton title={title} onPress={onPress} />,
    [],
  );

  const startGame = useCallback(
    async (isNew = false) => {
      SoundPlayer.stop();
      if (isNew) {
        dispatch(clearOnlineRoom());
        dispatch(resetGame());
      }
      navigate('LudoBoardScreen');
      playSound('game_start');
    },
    [dispatch],
  );


  const handleNewGamePress = useCallback(async () => {
    setGameSetupVisible(true);
  }, []);

  const handleStartConfiguredGame = useCallback(
    ({ activePlayers, cpuPlayers }) => {
      SoundPlayer.stop();
      dispatch(clearOnlineRoom());
      dispatch(resetGame({ activePlayers, cpuPlayers }));
      setGameSetupVisible(false);
      resetAndNavigate('LudoBoardScreen');
      playSound('game_start');
    },
    [dispatch],
  );

  const handleResumePress = useCallback(() => {
    startGame();
  }, [startGame]);

  const promptToEnableInternet = () => {
    Alert.alert(
      'Internet connection required',
      'Turn on Wi-Fi or mobile data in your device settings to create or join a room.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            const openSettings =
              Platform.OS === 'android'
                ? Linking.sendIntent('android.settings.WIFI_SETTINGS')
                : Linking.openSettings();

            Promise.resolve(openSettings).catch(error => {
              Alert.alert(
                'Unable to open settings',
                error.message || 'Please enable Wi-Fi or mobile data manually.',
              );
            });
          },
        },
      ],
    );
  };

  const handleOnlineRoomPress = async screen => {
    try {
      const networkState = await NetInfo.fetch();
      if (isDeviceOffline(networkState)) {
        promptToEnableInternet();
        return;
      }

      if (!auth.currentUser) {
        await resetAndNavigate('LoginScreen');
        return;
      }

      const profile = await getUserProfile();
      dispatch(
        setUserProfile(
          profile ? { uid: auth.currentUser.uid, profile } : null,
        ),
      );
      if (!profile) {
        await resetAndNavigate('ProfileSetupScreen');
        return;
      }

      navigate(screen);
    } catch (error) {
      Alert.alert(
        'Unable to check internet connection',
        error.message || 'Please try again.',
      );
    }
  };

  const handleProfilePress = async () => {
    if (!auth.currentUser) {
      Alert.alert(
        'Sign in required',
        'Sign in to view or set up your user profile.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign in',
            onPress: () => resetAndNavigate('LoginScreen'),
          },
        ],
      );
      return;
    }

    try {
      const networkState = await NetInfo.fetch();
      if (isDeviceOffline(networkState)) {
        promptToEnableInternet();
        return;
      }

      const profile = await getUserProfile();
      dispatch(
        setUserProfile(
          profile ? { uid: auth.currentUser.uid, profile } : null,
        ),
      );
      if (!profile) {
        await resetAndNavigate('ProfileSetupScreen');
        return;
      }
    } catch (error) {
      Alert.alert(
        'Unable to load profile',
        error.message || 'Please try again.',
      );
      return;
    }

    navigate('ProfileSetupScreen');
  };

  const openContact = async () => {
    setMenuVisible(false);
    try {
      await Linking.openURL('mailto:gamegape.official@gmail.com');
    } catch (error) {
      Alert.alert(
        'Unable to open email',
        error.message || 'Contact gamegape.official@gmail.com for help.',
      );
    }
  };

  useEffect(() => {
    if (isFocused) {
      playSound('home');
    }
  }, [isFocused]);

  useEffect(() => {
    if (route?.params?.startupError) {
      Alert.alert('Unable to load your saved profile', route.params.startupError);
    }
  }, [route?.params?.startupError]);

  useEffect(() => {
    if (!isFocused) {
      return undefined;
    }

    const witchAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(witchAnim, {
            toValue: deviceWidth * 0.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: -1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(3000),
        Animated.parallel([
          Animated.timing(witchAnim, {
            toValue: deviceWidth * 2,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: -1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(witchAnim, {
            toValue: -deviceWidth * 0.05,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(3000),
        Animated.parallel([
          Animated.timing(witchAnim, {
            toValue: -deviceWidth * 2,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleXAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    witchAnimation.start();

    return () => witchAnimation.stop();
  }, [isFocused, witchAnim, scaleXAnim]);

  return (
    <Wrapper style={styles.mainContainer}>
      <View
        style={[
          styles.headerActions,
          {
            top: insets.top + 8,
            left: insets.left,
            right: insets.right,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Open menu"
          accessibilityRole="button"
          onPress={() => setMenuVisible(true)}
          style={styles.headerIcon}
        >
          <Image source={MenuIcon} style={styles.menuIconImage} />
        </Pressable>
        <Pressable
          accessibilityLabel="User profile"
          accessibilityRole="button"
          onPress={handleProfilePress}
          style={styles.headerIcon}
        >
          <MaterialIcons color="#f0ce3c" name="account-circle" size={30} />
        </Pressable>
      </View>
      <View style={styles.imgContainer}>
        <Image source={logo} style={styles.img} />
      </View>
      {userProfile?.uid === auth.currentUser?.uid ? (
        <Text style={styles.profileGreeting}>
          Welcome, {userProfile.profile.username}
        </Text>
      ) : null}
      {route?.params?.mode === 'offline' ? (
        <Text style={styles.offlineNotice}>Offline play</Text>
      ) : null}
      {currentPosition.length !== 0 &&
        renderButton('RESUME', handleResumePress)}
      {renderButton('NEW GAME', handleNewGamePress)}
      {renderButton('CREATE ROOM', () =>
        handleOnlineRoomPress('CreateRoomScreen'),
      )}
      {renderButton('JOIN ROOM', () =>
        handleOnlineRoomPress('JoinRoomScreen'),
      )}

      <Animated.View
        style={[
          styles.witchContainer,
          {
            transform: [{ translateX: witchAnim }, { scaleX: scaleXAnim }],
          },
        ]}
      >
        <Pressable
          onPress={() => {
            const random = Math.floor(Math.random() * 3) + 1;
            playSound(`girl${random}`);
          }}
        >
          <LottieView
            hardwareAccelerationAndroid
            source={Witch}
            autoPlay
            speed={1}
            style={styles.witch}
          />
        </Pressable>
      </Animated.View>

      <Text style={styles.artist}>Made By: - GameGape </Text>
      <Modal
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
        transparent
        visible={menuVisible}
      >
        <Pressable
          onPress={() => setMenuVisible(false)}
          style={styles.menuBackdrop}
        >
          <View style={[styles.menuCard, { top: insets.top + 52 }]}>
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                Alert.alert(
                  'About Us',
                  'Ludo Kingdom is a casual Ludo game by GameGape.',
                );
              }}
              style={styles.menuItem}
            >
              <Text style={styles.menuText}>About Us</Text>
            </Pressable>
            <Pressable onPress={openContact} style={styles.menuItem}>
              <Text style={styles.menuText}>Contact Us</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                Alert.alert(
                  'Help',
                  'Start a new local game with NEW GAME. Sign in and complete your profile to create or join an online room.',
                );
              }}
              style={styles.menuItem}
            >
              <Text style={styles.menuText}>Help</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <GameSetupModal
        onClose={() => setGameSetupVisible(false)}
        onStart={handleStartConfiguredGame}
        visible={gameSetupVisible}
      />
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  mainContainer: {

    justifyContent: 'flex-start',
  },
  headerActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconImage: {
    width: 30,
    height: 30,
  },
  profileGreeting: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: -28,
    marginBottom: 10,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  menuCard: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 190,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#1a1732',
    borderColor: '#f0ce3c',
    borderWidth: 1,
  },
  menuItem: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  imgContainer: {
    width: deviceWidth * 0.6,
    height: deviceHeight * 0.12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
    alignSelf: 'center',
  },
  img: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  artist: {
    position: 'absolute',
    bottom: 40,
    fontWeight: '800',
    fontSize: 16,
    fontStyle: 'italic',
    opacity: 0.5,
    color: '#fff',
  },
  offlineNotice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowRadius: 4,
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },

  button: {
    backgroundColor: '#FFC107',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 5,
  },

  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  witchContainer: {
    position: 'absolute',
    top: '70%',
    left: '24%',
  },
  witch: {
    height: 240,
    width: 240,
    transform: [{ rotate: '15deg' }],
  },
});

export default HomeScreen;
