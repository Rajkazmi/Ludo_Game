import React, { useCallback, useEffect } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Wrapper from '../Components/Wrapper';
import { deviceHeight } from '../constants/Scaling';
import logo from '../assets/images/logo.png';
import redPlayer from '../assets/images/piles/red.png';
import bluePlayer from '../assets/images/piles/blue.png';
import greenPlayer from '../assets/images/piles/green.png';
import yellowPlayer from '../assets/images/piles/yellow.png';
import {
  getSoundSettings,
  playSound,
  setSoundSettings,
} from '../helpers/SoundUtility';
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
import EconomyHud from '../Components/EconomyHud';

const HomeActionCard = ({
  accessibilityLabel,
  colors,
  compact = false,
  icon,
  onPress,
  playerSources,
  withDice = false,
  subtitle,
  title,
}) => (
  <Pressable
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    onPress={onPress}
    style={[styles.card, compact && styles.compactCard]}
  >
    <LinearGradient
      colors={colors}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.cardSurface, compact && styles.compactCardSurface]}
    >
      {playerSources ? (
        <View style={[styles.playerArt, compact && styles.compactPlayerArt]}>
          <View style={[styles.playerMarkers, compact && styles.compactMarkers]}>
            {playerSources.map((source, index) => (
              <Image
                key={`${title}-${index}`}
                source={source}
                style={[
                  styles.playerMarker,
                  playerSources.length > 2 && styles.smallPlayerMarker,
                ]}
              />
            ))}
          </View>
          {withDice ? (
            <MaterialIcons
              color="#fff"
              name="casino"
              size={42}
              style={styles.diceOverlay}
            />
          ) : null}
        </View>
      ) : (
        <MaterialIcons
          color="#fff4b0"
          name={icon}
          size={compact ? 30 : 36}
          style={styles.cardIcon}
        />
      )}
      <Text
        numberOfLines={2}
        style={[styles.cardTitle, compact && styles.compactCardTitle]}
      >
        {title}
      </Text>
      {!compact && subtitle ? (
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      ) : null}
    </LinearGradient>
  </Pressable>
);

const VolumeSlider = ({ label, onChange, value }) => {
  const [trackWidth, setTrackWidth] = React.useState(0);
  const updateFromEvent = event => {
    if (trackWidth > 0) {
      onChange(Math.max(0, Math.min(1, event.nativeEvent.locationX / trackWidth)));
    }
  };
  const adjustValue = direction => onChange(
    Math.max(0, Math.min(1, value + direction * 0.1)),
  );

  return (
    <View
      accessibilityActions={[
        { name: 'increment', label: 'Increase volume' },
        { name: 'decrement', label: 'Decrease volume' },
      ]}
      accessibilityLabel={`${label} volume`}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      onAccessibilityAction={event => {
        adjustValue(event.nativeEvent.actionName === 'increment' ? 1 : -1);
      }}
      onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={updateFromEvent}
      onResponderMove={updateFromEvent}
      onStartShouldSetResponder={() => true}
      style={styles.sliderTouchArea}
    >
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${value * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${value * 100}%` }]} />
      </View>
    </View>
  );
};

const HomeScreen = ({ route }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const currentPosition = useSelector(selectCurrentPositions);
  const userProfile = useSelector(selectUserProfile);
  const isFocused = useIsFocused();
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [gameSetupVisible, setGameSetupVisible] = React.useState(false);
  const [soundSettings, setSoundSettingsState] = React.useState(getSoundSettings);

  const updateSoundSettings = useCallback(changes => {
    setSoundSettingsState(current =>
      setSoundSettings({ ...current, ...changes }),
    );
  }, []);

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

    navigate('ProfileScreen');
  };

  const openContact = async () => {
    setSettingsVisible(false);
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

  return (
    <Wrapper style={styles.mainContainer}>
      <EconomyHud
        isAuthenticated={Boolean(auth.currentUser)}
        onOpenSettings={() => setSettingsVisible(true)}
        onProfilePress={handleProfilePress}
        username={
          userProfile &&
          auth.currentUser &&
          userProfile.uid === auth.currentUser.uid
            ? userProfile.profile.username
            : null
        }
      >
        <View style={styles.homeContent}>
          <ScrollView
            contentContainerStyle={styles.battlePage}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.imgContainer}>
              <Image source={logo} style={styles.img} />
            </View>
            {route?.params?.mode === 'offline' ? (
              <Text style={styles.offlineNotice}>Offline play</Text>
            ) : null}
            {currentPosition.length !== 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleResumePress}
                style={styles.resumeButton}
              >
                <MaterialIcons color="#fff4b0" name="replay" size={23} />
                <Text style={styles.resumeText}>RESUME SAVED GAME</Text>
                <MaterialIcons color="#fff4b0" name="arrow-forward" size={21} />
              </Pressable>
            ) : null}

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>CHOOSE YOUR GAME</Text>
              <Text style={styles.sectionSubtitle}>
                Play locally or invite your friends
              </Text>
            </View>

            <View style={styles.primaryCards}>
              <HomeActionCard
                accessibilityLabel="Start two player local game"
                colors={['#9be83e', '#53b936', '#29873e']}
                onPress={() =>
                  handleStartConfiguredGame({
                    activePlayers: [1, 3],
                    cpuPlayers: [],
                  })
                }
                playerSources={[redPlayer, bluePlayer]}
                subtitle="LOCAL PASS & PLAY"
                title="TWO PLAYER"
                withDice
              />
              <HomeActionCard
                accessibilityLabel="Start four player local game"
                colors={['#ffb83e', '#f27627', '#d83b48']}
                onPress={() =>
                  handleStartConfiguredGame({
                    activePlayers: [1, 2, 3, 4],
                    cpuPlayers: [],
                  })
                }
                playerSources={[
                  redPlayer,
                  bluePlayer,
                  greenPlayer,
                  yellowPlayer,
                ]}
                subtitle="LOCAL PASS & PLAY"
                title="FOUR PLAYER"
                withDice
              />
            </View>

            <View style={styles.secondaryCards}>
              <HomeActionCard
                accessibilityLabel="Create room to play with friends"
                colors={['#ff9560', '#ed4d48', '#bd283d']}
                compact
                icon="group-add"
                onPress={() => handleOnlineRoomPress('CreateRoomScreen')}
                title="PLAY WITH FRIENDS"
              />
              <HomeActionCard
                accessibilityLabel="Play online"
                colors={['#54d4e5', '#2289cc', '#3455b5']}
                compact
                icon="public"
                onPress={() => handleOnlineRoomPress('JoinRoomScreen')}
                title="ONLINE"
              />
              <HomeActionCard
                accessibilityLabel="Open special game modes"
                colors={['#c36be9', '#824acb', '#5536a2']}
                compact
                icon="casino"
                onPress={handleNewGamePress}
                title="SPECIAL MODES"
              />
            </View>
          </ScrollView>
          <Pressable
            accessibilityLabel="Play now"
            accessibilityRole="button"
            onPress={() =>
              handleStartConfiguredGame({
                activePlayers: [1, 3],
                cpuPlayers: [],
              })
            }
            style={styles.floatingPlayButton}
          >
            <LinearGradient
              colors={['#ffcf52', '#ff8b20', '#e84625']}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.floatingPlaySurface}
            >
              <MaterialIcons color="#fff" name="play-arrow" size={26} />
              <Text style={styles.floatingPlayText}>PLAY NOW</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </EconomyHud>
      <Modal
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
        transparent
        visible={settingsVisible}
      >
        <View style={styles.settingsBackdrop}>
          <Pressable
            accessibilityLabel="Close settings"
            onPress={() => setSettingsVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.settingsCard, { top: insets.top + 62 }]}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>SETTINGS</Text>
              <Pressable
                accessibilityLabel="Close settings"
                accessibilityRole="button"
                onPress={() => setSettingsVisible(false)}
                style={styles.settingsClose}
              >
                <MaterialIcons color="#fff" name="close" size={22} />
              </Pressable>
            </View>
            <View style={styles.audioSettings}>
              <View style={styles.audioControl}>
                <View style={styles.audioLabelRow}>
                  <MaterialIcons
                    color="#ffe27a"
                    name="music-note"
                    size={20}
                  />
                  <Text style={styles.audioLabel}>GAME MUSIC</Text>
                  <Pressable
                    accessibilityLabel={
                      soundSettings.musicMuted
                        ? 'Unmute game music'
                        : 'Mute game music'
                    }
                    accessibilityRole="button"
                    onPress={() =>
                      updateSoundSettings({
                        musicMuted: !soundSettings.musicMuted,
                      })
                    }
                    style={styles.muteButton}
                  >
                    <MaterialIcons
                      color="#fff"
                      name={
                        soundSettings.musicMuted
                          ? 'volume-off'
                          : 'volume-up'
                      }
                      size={22}
                    />
                  </Pressable>
                </View>
                <VolumeSlider
                  label="Game music"
                  onChange={musicVolume => updateSoundSettings({ musicVolume })}
                  value={soundSettings.musicVolume}
                />
              </View>
              <View style={styles.audioControl}>
                <View style={styles.audioLabelRow}>
                  <MaterialIcons color="#ffe27a" name="volume-up" size={20} />
                  <Text style={styles.audioLabel}>SOUND EFFECTS</Text>
                  <Pressable
                    accessibilityLabel={
                      soundSettings.sfxMuted
                        ? 'Unmute sound effects'
                        : 'Mute sound effects'
                    }
                    accessibilityRole="button"
                    onPress={() =>
                      updateSoundSettings({ sfxMuted: !soundSettings.sfxMuted })
                    }
                    style={styles.muteButton}
                  >
                    <MaterialIcons
                      color="#fff"
                      name={soundSettings.sfxMuted ? 'volume-off' : 'volume-up'}
                      size={22}
                    />
                  </Pressable>
                </View>
                <VolumeSlider
                  label="Sound effects"
                  onChange={sfxVolume => updateSoundSettings({ sfxVolume })}
                  value={soundSettings.sfxVolume}
                />
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSettingsVisible(false);
                Alert.alert(
                  'About Us',
                  'Ludo Kingdom is a casual Ludo game by GameGape.',
                );
              }}
              style={styles.settingsItem}
            >
              <MaterialIcons color="#ffe27a" name="info-outline" size={20} />
              <Text style={styles.settingsItemText}>About Us</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={openContact}
              style={styles.settingsItem}
            >
              <MaterialIcons color="#ffe27a" name="mail-outline" size={20} />
              <Text style={styles.settingsItemText}>Contact Us</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSettingsVisible(false);
                Alert.alert(
                  'Help',
                  'Choose a local game mode from the Home screen. Sign in and complete your profile to create or join an online room.',
                );
              }}
              style={styles.settingsItem}
            >
              <MaterialIcons color="#ffe27a" name="help-outline" size={20} />
              <Text style={styles.settingsItemText}>Help</Text>
            </Pressable>
          </View>
        </View>
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
  homeContent: {
    flex: 1,
    width: '100%',
  },
  battlePage: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 76,
  },
  settingsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  settingsCard: {
    position: 'absolute',
    top: 62,
    right: 12,
    width: 286,
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(27, 21, 65, 0.98)',
    borderColor: '#f0ce3c',
    borderWidth: 1.5,
    elevation: 14,
  },
  settingsHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.22)',
  },
  settingsTitle: {
    color: '#ffe27a',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  settingsClose: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioSettings: {
    paddingTop: 6,
    paddingBottom: 4,
  },
  audioControl: {
    paddingVertical: 4,
  },
  audioLabelRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 7,
    letterSpacing: 0.4,
  },
  muteButton: {
    width: 34,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTouchArea: {
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  sliderFill: {
    height: 6,
    borderRadius: 4,
    backgroundColor: '#f0ce3c',
  },
  sliderThumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 9,
    backgroundColor: '#ed8b26',
    elevation: 2,
  },
  settingsItem: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  settingsItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },

  imgContainer: {
    width: '60%',
    height: deviceHeight * 0.12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
    alignSelf: 'center',
  },
  img: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  offlineNotice: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(24, 21, 54, 0.82)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowRadius: 4,
  },
  resumeButton: {
    width: '100%',
    minHeight: 44,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ffe99a',
    borderRadius: 14,
    backgroundColor: 'rgba(133, 59, 24, 0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
  },
  resumeText: {
    flex: 1,
    marginHorizontal: 10,
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  sectionHeading: {
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff1aa',
    fontFamily: 'Philosopher-Bold',
    fontSize: 18,
    letterSpacing: 1.1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowRadius: 5,
  },
  sectionSubtitle: {
    color: '#f1eafa',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowRadius: 4,
  },
  primaryCards: {
    width: '100%',
    flexDirection: 'row',
    columnGap: 10,
    marginBottom: 12,
  },
  secondaryCards: {
    width: '100%',
    flexDirection: 'row',
    columnGap: 8,
  },
  floatingPlayButton: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    width: 162,
    height: 50,
    borderRadius: 16,
    elevation: 9,
    shadowColor: '#130820',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  floatingPlaySurface: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fff0aa',
  },
  floatingPlayText: {
    color: '#fff',
    fontFamily: 'Philosopher-Bold',
    fontSize: 17,
    marginLeft: 5,
    textShadowColor: 'rgba(120, 35, 18, 0.8)',
    textShadowRadius: 4,
  },
  card: {
    flex: 1,
    minWidth: 0,
    height: 164,
    borderRadius: 18,
    elevation: 7,
    shadowColor: '#09051e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
  },
  compactCard: {
    height: 116,
  },
  cardSurface: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 9,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.82)',
  },
  compactCardSurface: {
    borderRadius: 15,
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  playerMarkers: {
    height: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMarkers: {
    height: 48,
  },
  playerMarker: {
    width: 42,
    height: 58,
    marginHorizontal: -2,
    resizeMode: 'contain',
  },
  smallPlayerMarker: {
    width: 31,
    height: 43,
  },
  playerArt: {
    width: '100%',
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactPlayerArt: {
    height: 48,
  },
  diceOverlay: {
    position: 'absolute',
    right: '22%',
    bottom: -1,
    color: '#fff',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    textShadowColor: 'rgba(30, 20, 45, 0.75)',
    textShadowRadius: 5,
  },
  cardIcon: {
    marginBottom: 5,
    textShadowColor: 'rgba(40, 20, 70, 0.55)',
    textShadowRadius: 4,
  },
  cardTitle: {
    color: '#fff',
    fontFamily: 'Philosopher-Bold',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(42, 18, 30, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  compactCardTitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  cardSubtitle: {
    color: '#fff8db',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});

export default HomeScreen;
