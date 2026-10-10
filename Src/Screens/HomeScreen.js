import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import Wrapper from '../Components/Wrapper';
import { deviceHeight, deviceWidth } from '../constants/Scaling';
import logo from '../assets/images/logo.png';
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

const HomeScreen = ({ route }) => {
  const dispatch = useDispatch();
  const currentPosition = useSelector(selectCurrentPositions);
  const witchAnim = useRef(new Animated.Value(-deviceWidth)).current;
  const scaleXAnim = useRef(new Animated.Value(-1)).current;
  const isFocused = useIsFocused();

  const renderButton = useCallback(
    (title, onPress) => <GradientButton title={title} onPress={onPress} />,
    [],
  );

  const startGame = useCallback(
    async (isNew = false) => {
      SoundPlayer.stop();
      if (isNew) {
        dispatch(resetGame());
      }
      navigate('LudoBoardScreen');
      playSound('game_start');
    },
    [dispatch],
  );


  const handleNewGamePress = useCallback(async () => {
    await startGame(true);
  }, [startGame]);

  const handleResumePress = useCallback(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    if (isFocused) {
      playSound('home');
    }
  }, [isFocused]);

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
      <View style={styles.imgContainer}>
        <Image source={logo} style={styles.img} />
      </View>
      {route?.params?.mode === 'offline' ? (
        <Text style={styles.offlineNotice}>Offline play</Text>
      ) : null}
      {currentPosition.length !== 0 &&
        renderButton('RESUME', handleResumePress)}
      {renderButton('NEW GAME', handleNewGamePress)}
      {renderButton('VS CPU', () => Alert.alert('Coming Soon! Click New Game'))}
      {renderButton('2 VS 2', () => Alert.alert('Coming Soon! Click New Game'))}

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
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  mainContainer: {

    justifyContent: 'flex-start',
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
