import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Wrapper from '../Components/Wrapper';
import GradientButton from '../Components/GradientButton';
import { auth } from '../config/firebase';
import {
  acceptRoomJoinRequest,
  cancelRoomJoinRequest,
  removeRoom,
  removeRoomPlayer,
  sendRoomAction,
  startRoom,
  subscribeToJoinRequests,
  subscribeToJoinRequest,
  subscribeToRoomActions,
  subscribeToRoom,
} from '../services/OnlineGameService';

const GameLobbyScreen = () => {
  const navigation = useNavigation();
  const { params } = useRoute();
  const roomCode = params?.roomCode;
  const currentUid = auth.currentUser?.uid;
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const didNavigateToGame = useRef(false);
  const isHost = room?.hostUid === currentUid;
  const players = useMemo(
    () =>
      Object.values(room?.players ?? {}).sort(
        (left, right) => left.playerNo - right.playerNo,
      ),
    [room?.players],
  );

  useEffect(() => {
    if (!roomCode) {
      setError('No room code was provided.');
      return undefined;
    }

    return subscribeToRoom(
      roomCode,
      nextRoom => {
        if (!nextRoom) {
          setError('This room is no longer available.');
          return;
        }

        setRoom(nextRoom);
        if (nextRoom.status === 'playing' && !didNavigateToGame.current) {
          didNavigateToGame.current = true;
          navigation.replace('LudoBoardScreen', { roomCode });
        }
      },
      subscriptionError => setError(subscriptionError.message),
    );
  }, [navigation, roomCode]);

  useEffect(() => {
    if (!isHost || !roomCode) {
      return undefined;
    }

    return subscribeToJoinRequests(
      roomCode,
      request => {
      acceptRoomJoinRequest(roomCode, request)
        .then(accepted => {
          if (!accepted) {
            setError('A player could not be added because the room is full or has started.');
          }
        })
        .catch(joinError => setError(joinError.message));
      },
      subscriptionError => setError(subscriptionError.message),
    );
  }, [isHost, roomCode]);

  useEffect(() => {
    if (!roomCode || !currentUid || isHost) {
      return undefined;
    }

    return subscribeToJoinRequest(
      roomCode,
      currentUid,
      request => {
        if (request?.status === 'unavailable') {
          setError('The room is full or has already started.');
        }
      },
      subscriptionError => setError(subscriptionError.message),
    );
  }, [currentUid, isHost, roomCode]);

  useEffect(() => {
    if (!isHost || room?.status !== 'waiting' || !roomCode) {
      return undefined;
    }

    return subscribeToRoomActions(
      roomCode,
      async action => {
        if (action.type === 'leave') {
          await removeRoomPlayer(roomCode, action.uid);
        }
      },
      subscriptionError => setError(subscriptionError.message),
    );
  }, [isHost, navigation, room?.status, roomCode]);

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      await startRoom(roomCode);
    } catch (startError) {
      setError(startError.message || 'Unable to start the match.');
      setStarting(false);
    }
  };

  const handleLeave = async () => {
    try {
      if (isHost) {
        await removeRoom(roomCode);
      } else if (currentUid && players.some(player => player.uid === currentUid)) {
        await sendRoomAction(roomCode, {
          type: 'leave',
          playerNo: players.find(player => player.uid === currentUid).playerNo,
        });
      } else if (currentUid) {
        await cancelRoomJoinRequest(roomCode);
      }
      navigation.replace('HomeScreen');
    } catch (leaveError) {
      setError(leaveError.message || 'Unable to leave the room.');
    }
  };

  return (
    <Wrapper style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Game Lobby</Text>
        <Text style={styles.roomCodeLabel}>ROOM CODE</Text>
        <Text selectable style={styles.roomCode}>
          {roomCode || '------'}
        </Text>
        <Text style={styles.description}>
          {isHost
            ? 'Share this code. You can start when at least two players are ready.'
            : 'Waiting for the host to start the match.'}
        </Text>
        <View style={styles.playerList}>
          {(players.length ? players : [null, null]).map((player, index) => (
            <Text
              key={player?.uid ?? `open-seat-${index}`}
              style={styles.player}
            >
              {player
                ? `Player ${player.playerNo}: ${player.displayName}${player.uid === room?.hostUid ? ' (Host)' : ''}`
                : `Player ${index + 1}: Waiting for a player`}
            </Text>
          ))}
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {starting ? (
          <ActivityIndicator color="#f0ce3c" size="large" />
        ) : isHost ? (
          <GradientButton
            disabled={players.length < 2}
            title="START MATCH"
            onPress={handleStart}
          />
        ) : (
          <ActivityIndicator color="#f0ce3c" size="large" />
        )}
        <GradientButton title="LEAVE ROOM" onPress={handleLeave} />
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f0ce3c',
    backgroundColor: 'rgba(15, 12, 41, 0.92)',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontFamily: 'Philosopher-Bold',
    fontSize: 30,
    marginBottom: 12,
  },
  roomCodeLabel: {
    color: '#f0ce3c',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  roomCode: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 8,
    marginVertical: 8,
  },
  description: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    marginVertical: 10,
    textAlign: 'center',
  },
  playerList: {
    width: '100%',
    marginVertical: 12,
  },
  player: {
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
  },
  error: {
    color: '#ffc1c1',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
});

export default GameLobbyScreen;