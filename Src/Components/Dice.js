import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Image,
  TouchableOpacity,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCurrentPlayerChance,
  selectDiceNo,
  selectDiceRolled,
} from '../redux/reducers/gameSelector';
import { BackgroundImage } from '../helpers/GetIcons';
import LinearGradient from 'react-native-linear-gradient';
import Arrow from '../assets/images/arrow.png';
import LottieView from 'lottie-react-native';
import DiceRoll from '../assets/animation/gamediceroll.json';
import { playSound } from '../helpers/SoundUtility';
import { handleDiceRollThunk } from '../redux/reducers/gameAction';

const Dice = React.memo(({ color, rotate, player }) => {
  const dispatch = useDispatch();
  const currentPlayerChance = useSelector(selectCurrentPlayerChance);
  const isDiceRolled = useSelector(selectDiceRolled);
  const diceNo = useSelector(selectDiceNo);
  const activePlayers = useSelector(
    state => state.game.activePlayers ?? [1, 2, 3, 4],
  );
  const winners = useSelector(state => state.game.winners ?? []);
  const online = useSelector(state => state.online);
  const isEligiblePlayer =
    activePlayers.includes(player) &&
    !winners.includes(player) &&
    (!online.roomCode || online.playerNo === player);
  const pileIcon = BackgroundImage.GetImage(color);
  const diceIcon = BackgroundImage.GetImage(diceNo);
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const rollInProgress = useRef(null);
  const [diceRolling, setDiceRolling] = useState(false);

  const finishDiceRoll = () => {
    if (rollInProgress.current === null) {
      return;
    }

    const newDiceNo = rollInProgress.current;
    rollInProgress.current = null;
    dispatch(handleDiceRollThunk(player, newDiceNo));
    setDiceRolling(false);
  };

  useEffect(() => {
    if (isDiceRolled) {
      rollInProgress.current = null;
      setDiceRolling(false);
    }
  }, [isDiceRolled]);

  useEffect(() => {
    if (currentPlayerChance !== player || isDiceRolled || !isEligiblePlayer) {
      arrowAnim.stopAnimation();
      arrowAnim.setValue(0);
      return undefined;
    }

    const arrowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, {
          toValue: 10,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    arrowAnimation.start();
    return () => arrowAnimation.stop();
  }, [
    arrowAnim,
    currentPlayerChance,
    isDiceRolled,
    isEligiblePlayer,
    player,
  ]);

  const handleDicePress = () => {
    if (
      rollInProgress.current !== null ||
      currentPlayerChance !== player ||
      isDiceRolled ||
      !isEligiblePlayer
    ) {
      return;
    }

    const newDiceNo = online.roomCode
      ? 0
      : Math.floor(Math.random() * 6) + 1;
    rollInProgress.current = newDiceNo;
    playSound('dice_roll');
    setDiceRolling(true);
  };

  return (
    <View
      style={[styles.flexRow, { transform: [{ scaleX: rotate ? -1 : 1 }] }]}
    >
      <View style={styles.border1}>
        <LinearGradient
          style={styles.linearGradient}
          colors={['#0052be', '#5f9fcb', '#97c6c9']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        >
          <View style={styles.pileContainer}>
            <Image source={pileIcon} style={styles.pileIcon} />
          </View>
        </LinearGradient>
      </View>

      <View style={styles.border2}>
        <View style={styles.diceGradient}>
          <View style={styles.diceContainer}>
            {currentPlayerChance === player && isEligiblePlayer ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Roll dice for player ${player}`}
                  hitSlop={8}
                  disabled={isDiceRolled || diceRolling}
                  activeOpacity={0.4}
                  onPress={handleDicePress}
                >
                  <Image
                    source={diceIcon}
                    style={[styles.dice, diceRolling && styles.hiddenDice]}
                  />
                </TouchableOpacity>
              </>
            ) : null}
          </View>
          {currentPlayerChance === player &&
            isEligiblePlayer &&
            diceRolling && (
            <LottieView
              source={DiceRoll}
              style={styles.rollingDice}
              loop={false}
              autoPlay
              speed={2.5}
              onAnimationFinish={isCancelled => {
                if (!isCancelled) {
                  finishDiceRoll();
                }
              }}
              hardwareAccelerationAndroid
            />
          )}
        </View>
      </View>

      {currentPlayerChance === player &&
      isEligiblePlayer &&
      !isDiceRolled ? (
        <Animated.View
          style={[styles.arrowContainer, { transform: [{ translateX: arrowAnim }] }]}
        >
          <Image source={Arrow} style={styles.arrow} />
        </Animated.View>
      ) : null}

    </View>
  );
});

const styles = StyleSheet.create({
  flexRow: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  pileIcon: {
    width: 35,
    height: 35,
  },
  diceContainer: {
    backgroundColor: '#e8c0c1',
    borderWidth: 1,
    borderRadius: 5,
    width: 60,
    height: 70,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pileContainer: {
    paddingHorizontal: 3,
    paddingVertical: 10,
  },
  linearGradient: {
    padding: 1,
    borderWidth: 3,
    borderRightWidth: 0,
    borderColor: '#f0ce2c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dice: {
    height: 45,
    width: 45,
  },
  hiddenDice: {
    opacity: 0,
  },
  rollingDice: {
    width: 68,
    height: 68,
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 99,
    pointerEvents: 'none',
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    width: 30,
    height: 30,
  },
  diceGradient: {
    borderWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#f0ce3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  border1: {
    borderWidth: 3,
    borderRightWidth: 0,
    borderColor: '#f0ce2c',
  },
  border2: {
    borderWidth: 3,
    padding: 1,
    backgroundColor: '#aac8ab',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderColor: '#aac8ab',
  },
});
export default Dice;
