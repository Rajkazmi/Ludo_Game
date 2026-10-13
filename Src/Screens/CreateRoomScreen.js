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
import { createRoom } from '../services/OnlineGameService';

const getDefaultDisplayName = () =>
  auth.currentUser?.displayName ||
  auth.currentUser?.email?.split('@')[0] ||
  '';

const CreateRoomScreen = () => {
  const navigation = useNavigation();
  const [displayName, setDisplayName] = useState(getDefaultDisplayName);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const handleCreateRoom = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError('Enter a name for the room.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const roomCode = await createRoom(trimmedName);
      navigation.replace('GameLobbyScreen', { roomCode });
    } catch (createError) {
      setError(createError.message || 'Unable to create the room.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Wrapper style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Online Room</Text>
        <Text style={styles.description}>
          Share the room code with 1 to 3 friends. The host starts the match
          when at least two players have joined.
        </Text>
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
        {creating ? (
          <ActivityIndicator color="#f0ce3c" size="large" />
        ) : (
          <GradientButton title="CREATE ROOM" onPress={handleCreateRoom} />
        )}
        <GradientButton
          title="BACK"
          onPress={() => navigation.goBack()}
        />
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
  error: {
    color: '#ffc1c1',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
});

export default CreateRoomScreen;
