import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  useWindowDimensions,
  Alert,
} from 'react-native';
import Wrapper from '../Components/Wrapper';
import MenuModal from '../Components/MenuModal';
import MenuIcon from '../assets/images/menu.png';
import { playSound } from '../helpers/SoundUtility';
import StartGame from '../assets/images/start.png';
import { useIsFocused } from '@react-navigation/native';
import {
  selectDiceTouch,
  selectPlayer1,
  selectPlayer2,
  selectPlayer3,
  selectPlayer4,
} from '../redux/reducers/gameSelector';
import { useDispatch, useSelector } from 'react-redux';
import { resetAndNavigate } from '../helpers/NavigationUtil';
import Dice from '../Components/Dice';
import HorizontalPath from '../Components/path/HorizontalPath';
import VerticalPath from '../Components/path/VerticalPath';
import Pocket from '../Components/Pocket';
import FourTriangles from '../Components/FourTriangles';
import WinModal from '../Components/WinModal';
import { Colors } from '../constants/Colors';
import { Plot1Data, Plot2Data, Plot3Data, Plot4Data } from '../helpers/PlotData';
import {
  replaceGameState,
} from '../redux/reducers/gameSlice';
import {
  clearOnlineError,
  clearOnlineRoom,
  setOnlineError,
  setOnlineRoom,
} from '../redux/onlineSlice';
import { auth } from '../config/firebase';
import {
  subscribeToRoom,
} from '../services/OnlineGameService';

const LudoBoardScreen = ({ route }) => {
  const dispatch = useDispatch();
  const { width, height } = useWindowDimensions();
  const boardSize = Math.min(width - 24, height * 0.58);
  const player1 = useSelector(selectPlayer1);
  const player2 = useSelector(selectPlayer2);
  const player3 = useSelector(selectPlayer3);
  const player4 = useSelector(selectPlayer4);
  const isDiceTouch = useSelector(selectDiceTouch);
  const winner = useSelector(state => state.game.winner);
  const online = useSelector(state => state.online);
  const roomCode = route?.params?.roomCode ?? null;

  const isFocused = useIsFocused();
  const opacity = useRef(new Animated.Value(1)).current;
  const missingRoomAlertShown = useRef(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [showStartGame, setShowStartImage] = useState(false);

  const handleMenuPress = useCallback(() => {
    playSound('ui');
    setMenuVisible(true);
  }, []);

  useEffect(() => {
    if (!roomCode) {
      return undefined;
    }

    const user = auth.currentUser;
    if (!user) {
      dispatch(setOnlineError('Sign in again before joining this online match.'));
      return undefined;
    }

    return subscribeToRoom(
      roomCode,
      room => {
        if (!room) {
          dispatch(clearOnlineRoom());
          if (!missingRoomAlertShown.current) {
            missingRoomAlertShown.current = true;
            Alert.alert(
              'Online match ended',
              'The room is no longer available.',
              [
                {
                  text: 'HOME',
                  onPress: () => resetAndNavigate('HomeScreen'),
                },
              ],
            );
          }
          return;
        }

        const players = Object.values(room.players ?? {}).sort(
          (left, right) => left.playerNo - right.playerNo,
        );
        const currentPlayer = players.find(player => player.uid === user.uid);
        if (!currentPlayer) {
          dispatch(setOnlineError('Your account is no longer in this room.'));
          return;
        }

        const isHost = room.hostUid === user.uid;
        if (room.status === 'playing' && room.gameState) {
          dispatch(replaceGameState(room.gameState));
        }
        dispatch(
          setOnlineRoom({
            roomCode,
            userUid: user.uid,
            hostUid: room.hostUid,
            isHost,
            playerNo: currentPlayer.playerNo,
            displayName: currentPlayer.displayName,
            players,
            activePlayers:
              room.gameState?.activePlayers ??
              players.map(player => player.playerNo),
            error: null,
          }),
        );
      },
      error => dispatch(setOnlineError(error.message)),
    );
  }, [dispatch, roomCode]);

  useEffect(() => {
    if (!online.error) {
      return;
    }

    Alert.alert('Online game error', online.error);
    dispatch(clearOnlineError());
  }, [dispatch, online.error]);

  useEffect(() => {
    if (isFocused) {
      setShowStartImage(true);
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );

      blinkAnimation.start();

      const timeout = setTimeout(() => {
        blinkAnimation.stop();
        setShowStartImage(false);
      }, 2500);
      // Cleanup animation on component unmounts or when focus lost 
      return () => {
        blinkAnimation.stop();
        clearTimeout(timeout);
      };
    }
  }, [isFocused, opacity]);

  return (
    <Wrapper style={styles.container}>
      <TouchableOpacity style={styles.menuIcon} onPress={handleMenuPress}>
        <Image source={MenuIcon} style={styles.menuIconImage} />
      </TouchableOpacity>
      <View style={styles.container}>
        <View
          style={[styles.flexRow, { width: boardSize }]}
          pointerEvents={isDiceTouch ? 'none' : 'auto'}
        >
          <Dice color={Colors.green} player={2} />
          <Dice color={Colors.yellow} player={3} rotate />
        </View>

        <View
          style={[
            styles.ludoBoard,
            { width: boardSize, height: boardSize },
          ]}
        >
          <View style={styles.plotContainer}>
            <Pocket color={Colors.green} player={2} data={player2} />
            <VerticalPath cells={Plot2Data} color={Colors.yellow} />
            <Pocket color={Colors.yellow} player={3} data={player3} />
          </View>
          <View style={styles.pathContainer}>
            <HorizontalPath cells={Plot1Data} color={Colors.green} />
            <FourTriangles
              player1={player1}
              player2={player2}
              player3={player3}
              player4={player4}
            />
            <HorizontalPath cells={Plot3Data} color={Colors.blue} />
          </View>

          <View style={styles.plotContainer}>
            <Pocket color={Colors.red} player={1} data={player1} />
            <VerticalPath cells={Plot4Data} color={Colors.red} />
            <Pocket color={Colors.blue} player={4} data={player4} />
          </View>
          {showStartGame && (
            <View pointerEvents="none" style={styles.startGameOverlay}>
              <Animated.Image
                source={StartGame}
                resizeMode="contain"
                style={{
                  width: boardSize * 0.86,
                  height: boardSize * 0.86,
                  opacity,
                }}
              />
            </View>
          )}
        </View>

        <View
          style={[styles.flexRow, { width: boardSize }]}
          pointerEvents={isDiceTouch ? 'none' : 'auto'}
        >
          <Dice color={Colors.red} player={1} />
          <Dice color={Colors.blue} rotate player={4} />
        </View>
      </View>

      {menuVisible && (
        <MenuModal
          onPressHide={() => setMenuVisible(false)}
          visible={menuVisible}
        />
      )}

      {winner != null && <WinModal winner={winner} />}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ludoBoard: {
    alignSelf: 'center',
    padding: 0,
    position: 'relative',
  },
  menuIcon: {
    position: 'absolute',
    top: 60,
    left: 20,
  },
  menuIconImage: {
    width: 30,
    height: 30,
  },
  startGameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  flexRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 30,
  },
  plotContainer: {
    width: '100%',
    height: '40%',
    justifyContent: 'space-between',
    flexDirection: 'row',
    backgroundColor: '#ccc',
  },
  pathContainer: {
    width: '100%',
    height: '20%',
    justifyContent: 'space-between',
    flexDirection: 'row',
    backgroundColor: '#1E5162',
  },
});

export default LudoBoardScreen;
