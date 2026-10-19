import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const MODES = [
  { id: 'localDuel', label: '1 vs 1', description: 'Two local players' },
  {
    id: 'computer',
    label: '1 vs Computer',
    description: 'Play against the computer',
  },
  {
    id: 'localPlayers',
    label: 'Local players',
    description: 'Choose 2, 3, or 4 players',
  },
];

const GameSetupModal = ({ onClose, onStart, visible }) => {
  const [mode, setMode] = useState('localDuel');
  const [playerCount, setPlayerCount] = useState(2);

  const handleStart = () => {
    let activePlayers;
    let cpuPlayers = [];

    if (mode === 'localDuel') {
      activePlayers = [1, 3];
    } else if (mode === 'computer') {
      activePlayers = [1, 2];
      cpuPlayers = [2];
    } else {
      activePlayers = Array.from(
        { length: playerCount },
        (_value, index) => index + 1,
      );
    }

    onStart({ activePlayers, cpuPlayers });
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>NEW GAME</Text>
          <Text style={styles.description}>Choose how you want to play.</Text>

          {MODES.map(option => {
            const selected = mode === option.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={option.id}
                onPress={() => setMode(option.id)}
                style={[styles.modeOption, selected && styles.selectedOption]}
              >
                <View style={styles.modeCopy}>
                  <Text style={styles.modeLabel}>{option.label}</Text>
                  <Text style={styles.modeDescription}>
                    {option.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selected && styles.selectedRadio,
                  ]}
                />
              </Pressable>
            );
          })}

          {mode === 'localPlayers' ? (
            <View style={styles.playerCountSection}>
              <Text style={styles.countLabel}>Number of players</Text>
              <View style={styles.countOptions}>
                {[2, 3, 4].map(count => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: playerCount === count }}
                    key={count}
                    onPress={() => setPlayerCount(count)}
                    style={[
                      styles.countOption,
                      playerCount === count && styles.selectedCountOption,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countText,
                        playerCount === count && styles.selectedCountText,
                      ]}
                    >
                      {count}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleStart}
              style={styles.startButton}
            >
              <Text style={styles.startText}>START GAME</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 22,
    borderWidth: 1,
    borderColor: '#f0ce3c',
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#100d2b',
  },
  title: {
    color: '#fff',
    fontFamily: 'Philosopher-Bold',
    fontSize: 27,
    textAlign: 'center',
  },
  description: {
    color: '#ddd',
    fontSize: 15,
    marginTop: 6,
    marginBottom: 16,
    textAlign: 'center',
  },
  modeOption: {
    width: '100%',
    minHeight: 62,
    marginVertical: 5,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(240, 206, 60, 0.45)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedOption: {
    backgroundColor: 'rgba(240, 206, 60, 0.14)',
    borderColor: '#f0ce3c',
  },
  modeCopy: {
    flex: 1,
  },
  modeLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modeDescription: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 3,
  },
  radio: {
    width: 20,
    height: 20,
    marginLeft: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#aaa',
  },
  selectedRadio: {
    backgroundColor: '#f0ce3c',
    borderColor: '#f0ce3c',
  },
  playerCountSection: {
    width: '100%',
    marginTop: 12,
  },
  countLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  countOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  countOption: {
    flex: 1,
    height: 44,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0ce3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCountOption: {
    backgroundColor: '#f0ce3c',
  },
  countText: {
    color: '#f0ce3c',
    fontSize: 17,
    fontWeight: '700',
  },
  selectedCountText: {
    color: '#100d2b',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0ce3c',
  },
  cancelText: {
    color: '#f0ce3c',
    fontSize: 15,
    fontWeight: '700',
  },
  startButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 10,
    backgroundColor: '#b52228',
    borderWidth: 1,
    borderColor: '#f0ce3c',
  },
  startText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default GameSetupModal;
