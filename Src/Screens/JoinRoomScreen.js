import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Wrapper from '../Components/Wrapper';
import GradientButton from '../Components/GradientButton';
import { auth } from '../config/firebase';
import { requestRoomJoin } from '../services/OnlineGameService';

const getDefaultDisplayName = () =>
  auth.currentUser?.displayName ||
  auth.currentUser?.email?.split('@')[0] ||
  '';

const JoinRoomScreen = () => {
  const navigation = useNavigation();
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState(getDefaultDisplayName);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);

  const handleJoinRoom = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError('Enter a player name.');
      return;
    }

    setJoining(true);
    setError(null);
    try {
      const normalizedCode = await requestRoomJoin(roomCode, trimmedName);
      navigation.replace('GameLobbyScreen', { roomCode: normalizedCode });
    } catch (joinError) {
      setError(joinError.message || 'Unable to join the room.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Wrapper style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Join Online Room</Text>
        <Text style={styles.description}>
          Enter the six-character code shared by the room host.
        </Text>
        <TextInput
          accessibilityLabel="Room code"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          onChangeText={value => setRoomCode(value.toUpperCase())}
          placeholder="ROOM CODE"
          placeholderTextColor="#c5c5d0"
          style={[styles.input, styles.roomCodeInput]}
          value={roomCode}
        />
        <TextInput
          accessibilityLabel="Your player name"
          autoCapitalize="words"
          maxLength={24}
          onChangeText={setDisplayName}
          placeholder="Player name"
          placeholderTextColor="#c5c5d0"
          style={styles.input}
          value={displayName}
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {joining ? (
          <ActivityIndicator color="#f0ce3c" size="large" />
        ) : (
          <GradientButton title="JOIN ROOM" onPress={handleJoinRoom} />
        )}
        <GradientButton title="BACK" onPress={() => navigation.goBack()} />
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    fontSize: 28,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#f0ce3c',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  roomCodeInput: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 5,
    textAlign: 'center',
  },
  error: {
    color: '#ffc1c1',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
});

export default JoinRoomScreen;