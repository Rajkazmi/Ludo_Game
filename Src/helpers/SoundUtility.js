import SoundPlayer from 'react-native-sound-player';
import { Platform } from 'react-native';
import { storage } from '../redux/storage';

const SOUND_SETTINGS_KEY = 'soundSettings';
const DEFAULT_SOUND_SETTINGS = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  musicMuted: false,
  sfxMuted: false,
};
let activeSoundCategory = null;

export const getSoundSettings = () => {
  const savedSettings = storage.getString(SOUND_SETTINGS_KEY);
  if (!savedSettings) {
    return { ...DEFAULT_SOUND_SETTINGS };
  }

  const settings = JSON.parse(savedSettings);
  return {
    musicVolume:
      typeof settings.musicVolume === 'number'
        ? Math.max(0, Math.min(1, settings.musicVolume))
        : DEFAULT_SOUND_SETTINGS.musicVolume,
    sfxVolume:
      typeof settings.sfxVolume === 'number'
        ? Math.max(0, Math.min(1, settings.sfxVolume))
        : DEFAULT_SOUND_SETTINGS.sfxVolume,
    musicMuted:
      typeof settings.musicMuted === 'boolean'
        ? settings.musicMuted
        : DEFAULT_SOUND_SETTINGS.musicMuted,
    sfxMuted:
      typeof settings.sfxMuted === 'boolean'
        ? settings.sfxMuted
        : DEFAULT_SOUND_SETTINGS.sfxMuted,
  };
};

const applyVolume = (settings, category = activeSoundCategory) => {
  if (!category) {
    return;
  }
  const isMusic = category === 'music';
  const muted = isMusic ? settings.musicMuted : settings.sfxMuted;
  const volume = isMusic ? settings.musicVolume : settings.sfxVolume;
  SoundPlayer.setVolume(muted ? 0 : volume);
};

export const setSoundSettings = settings => {
  const normalizedSettings = {
    musicVolume: Math.max(0, Math.min(1, settings.musicVolume)),
    sfxVolume: Math.max(0, Math.min(1, settings.sfxVolume)),
    musicMuted: Boolean(settings.musicMuted),
    sfxMuted: Boolean(settings.sfxMuted),
  };
  storage.set(SOUND_SETTINGS_KEY, JSON.stringify(normalizedSettings));
  applyVolume(normalizedSettings);
  return normalizedSettings;
};

export const playSound = async (soundName, loop = false) => {
  try {
    const category = soundName === 'home' ? 'music' : 'sfx';
    const settings = getSoundSettings();
    const muted = category === 'music'
      ? settings.musicMuted
      : settings.sfxMuted;
    if (muted) {
      return false;
    }

    const soundPath = getSoundPath(soundName);
    activeSoundCategory = category;
    applyVolume(settings, category);
    if (Platform.OS === 'android') {
      SoundPlayer.playSoundFile(soundName, 'mp3');
    } else {
      await SoundPlayer.playAsset(soundPath);
    }
    SoundPlayer.setNumberOfLoops(loop ? -1 : 0);
    return true;
  } catch (e) {
    console.warn(`Unable to play sound "${soundName}"`, e);
    return false;
  }
};

export const stopSound = () => {
  SoundPlayer.stop();
};

const getSoundPath = soundName => {
  switch (soundName) {
    case 'dice_roll':
      return require('../assets/sfx/dice_roll.mp3');
    case 'cheer':
      return require('../assets/sfx/cheer.mp3');
    case 'game_start':
      return require('../assets/sfx/game_start.mp3');
    case 'collide':
      return require('../assets/sfx/collide.mp3');
    case 'home_win':
      return require('../assets/sfx/home_win.mp3');
    case 'pile_move':
      return require('../assets/sfx/pile_move.mp3');
    case 'safe_spot':
      return require('../assets/sfx/safe_spot.mp3');
    case 'ui':
      return require('../assets/sfx/ui.mp3');
    case 'home':
      return require('../assets/sfx/home.mp3');
    case 'girl2':
      return require('../assets/sfx/girl2.mp3');
    case 'girl1':
      return require('../assets/sfx/girl1.mp3');
    case 'girl3':
      return require('../assets/sfx/girl3.mp3');
    default:
      throw new Error(`Sound ${soundName} not found`);
  }
};
