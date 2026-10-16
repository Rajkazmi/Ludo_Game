import { Alert, View, Text, StyleSheet } from 'react-native';
import React from 'react';
import { Modal } from 'react-native-modal';
import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import GradientButton from './GradientButton';
import {
  dismissWinner,
  resetGame,
} from '../redux/reducers/gameSlice';
import { resetAndNavigate } from '../helpers/NavigationUtil';
import { playSound, stopSound } from '../helpers/SoundUtility';
import { clearOnlineRoom } from '../redux/onlineSlice';
import { removeRoom, sendRoomAction } from '../services/OnlineGameService';
import {
  getPlayerPlacement,
  isFinalPlacement,
} from '../helpers/GameTurn';
import { colorPlayer } from '../helpers/PlotData';
import HeartGirl from '../assets/animation/girl.json';
import Trophy from '../assets/animation/trophy.json';
import Firework from '../assets/animation/firework.json';
import Pile from './Pile';

const WinModal = ({ winner }) => {
  const dispatch = useDispatch();
  const winners = useSelector(state => state.game.winners ?? [winner]);
  const activePlayers = useSelector(
    state => state.game.activePlayers ?? [1, 2, 3, 4],
  );
  const online = useSelector(state => state.online);

  if (!Number.isInteger(winner) || winner < 1 || winner > colorPlayer.length) {
    return null;
  }
  const placement = getPlayerPlacement(winners, winner);
  const isFinalWinner = isFinalPlacement(winners, activePlayers);
  const lastPlayer = activePlayers.find(player => !winners.includes(player));

  const handleContinue = async () => {
    if (online.roomCode) {
      try {
        await sendRoomAction(online.roomCode, { type: 'continue' });
        stopSound();
      } catch (error) {
        Alert.alert('Unable to continue', error.message);
      }
      return;
    }

    stopSound();
    dispatch(dismissWinner());
  };

  const handleNewGame = async () => {
    if (online.roomCode) {
      try {
        await sendRoomAction(online.roomCode, { type: 'newGame' });
        playSound('game_start');
      } catch (error) {
        Alert.alert('Unable to start a new game', error.message);
      }
      return;
    }

    dispatch(
      resetGame(
        online.roomCode ? { activePlayers: online.activePlayers } : undefined,
      ),
    );
    playSound('game_start');
  };

  const handleHome = async () => {
    if (online.roomCode) {
      try {
        if (online.isHost) {
          await removeRoom(online.roomCode);
        } else {
          await sendRoomAction(online.roomCode, { type: 'leave' });
        }
      } catch (error) {
        Alert.alert('Unable to leave the online room', error.message);
        return;
      }
      dispatch(clearOnlineRoom());
    }
    stopSound();
    dispatch(resetGame());
    resetAndNavigate('HomeScreen');
  };

  return (
    <Modal
      style={styles.modal}
      isVisible={winner !== null}
      backdropColor="black"
      backdropOpacity={0.8}
      onBackdropPress={() => {}}
      animationIn="zoomIn"
      animationOut="zoomOut"
      onBackButtonPress={() => {}}
    >
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={styles.gradientContainer}
      >
        <View style={styles.content}>
          <View style={styles.pileContainer}>
            <Pile player={winner} color={colorPlayer[winner - 1]} />
          </View>
          <Text style={styles.congratsText}>
            PLAYER {winner} FINISHED IN{' '}
            {placement === 1 ? '1ST' : placement === 2 ? '2ND' : '3RD'} PLACE
          </Text>
          {isFinalWinner && lastPlayer != null ? (
            <Text style={styles.lastPlaceText}>
              PLAYER {lastPlayer} IS LAST PLACE
            </Text>
          ) : null}
          <LottieView
            source={Trophy}
            autoPlay
            hardwareAccelerationAndroid
            loop={false}
            style={styles.trophyAnimation}
          />{' '}
          <LottieView
            autoPlay
            hardwareAccelerationAndroid
            loop={true}
            source={Firework}
            style={styles.fireworkAnimation}
          />
          {isFinalWinner ? (
            <>
              <GradientButton title="NEW GAME" onPress={handleNewGame} />
              <GradientButton title="HOME" onPress={handleHome} />
            </>
          ) : (
            <GradientButton title="CONTINUE GAME" onPress={handleContinue} />
          )}
        </View>
      </LinearGradient>
      <LottieView
        hardwareAccelerationAndroid
        autoPlay
        loop={true}
        source={HeartGirl}
        pointerEvents="none"
        style={styles.girlAnimation}
      />
    </Modal>
  );
};
const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientContainer: {
    borderRadius: 20,
    width: '96%',
    borderColor: 'gold',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  pileContainer: {
    width: 90,
    height: 20,
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  congratsText: {
    fontSize: 18,
    color: 'white',
    fontFamily: 'Philosopher-Bold',
    marginTop: 10,
  },
  lastPlaceText: {
    color: '#f0ce3c',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  trophyAnimation: {
    height: 200,
    width: 200,
    marginTop: 20,
  },
  fireworkAnimation: {
    height: 200,
    width: 500,
    position: 'absolute',
    zIndex: -1,
    marginTop: 20,
  },
  girlAnimation: {
    height: 500,
    width: 380,
    position: 'absolute',
    bottom: -200,
    right: -120,
    zIndex: 99,
  },
});

export default WinModal;
