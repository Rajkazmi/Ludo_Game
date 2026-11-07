jest.mock('react-native-sound-player', () => ({
  playSoundFile: jest.fn(),
  setNumberOfLoops: jest.fn(),
  setVolume: jest.fn(),
  playAsset: jest.fn(),
}));
jest.mock('../Src/assets/sfx/home.mp3', () => 1);
jest.mock('../Src/assets/sfx/dice_roll.mp3', () => 1);
jest.mock('../Src/redux/storage', () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
  },
}));

import SoundPlayer from 'react-native-sound-player';
import { storage } from '../Src/redux/storage';
import {
  getSoundSettings,
  playSound,
  setSoundSettings,
} from '../Src/helpers/SoundUtility';

describe('SoundUtility preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.getString.mockReturnValue(undefined);
  });

  it('uses defaults and persists separate music and effect controls', () => {
    expect(getSoundSettings()).toEqual({
      musicVolume: 0.7,
      sfxVolume: 0.8,
      musicMuted: false,
      sfxMuted: false,
    });

    const updatedSettings = setSoundSettings({
      musicVolume: 0.4,
      sfxVolume: 0.6,
      musicMuted: true,
      sfxMuted: false,
    });

    expect(storage.set).toHaveBeenCalledWith(
      'soundSettings',
      JSON.stringify(updatedSettings),
    );
    expect(updatedSettings.musicVolume).toBe(0.4);
    expect(updatedSettings.musicMuted).toBe(true);
  });

  it('applies each volume to its own sound category and skips muted playback', async () => {
    await playSound('home');
    expect(SoundPlayer.setVolume).toHaveBeenLastCalledWith(0.7);

    await playSound('dice_roll');
    expect(SoundPlayer.setVolume).toHaveBeenLastCalledWith(0.8);

    storage.getString.mockReturnValue(JSON.stringify({
      musicVolume: 0.25,
      sfxVolume: 0.3,
      musicMuted: false,
      sfxMuted: true,
    }));
    const soundsPlayed = SoundPlayer.playSoundFile.mock.calls.length;
    expect(await playSound('dice_roll')).toBe(false);
    expect(SoundPlayer.playSoundFile).toHaveBeenCalledTimes(soundsPlayed);

    await playSound('home');
    expect(SoundPlayer.setVolume).toHaveBeenLastCalledWith(0.25);
  });
});
