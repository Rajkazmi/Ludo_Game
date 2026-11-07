jest.mock('@firebase/functions', () => ({
  httpsCallable: jest.fn(() => jest.fn()),
}));

jest.mock('../Src/config/firebase', () => ({
  functions: { name: 'test-functions' },
}));

import { httpsCallable } from '@firebase/functions';
import {
  deletePlayerAccount,
  getPlayerDashboard,
  getUserProfile,
  saveUserProfile,
  updateUsername,
} from '../Src/services/profileService';

describe('profile service', () => {
  it('loads the profile through the callable function', async () => {
    const profile = { username: 'player' };
    const profileCommand = httpsCallable.mock.results[0].value;
    profileCommand.mockResolvedValue({
      data: { profile },
    });

    await expect(getUserProfile()).resolves.toEqual(profile);
    expect(httpsCallable).toHaveBeenCalledWith(
      { name: 'test-functions' },
      'profileCommand',
    );
    expect(profileCommand).toHaveBeenCalledWith({
      command: 'getProfile',
    });
  });

  it('saves profile details through the trusted callable function', async () => {
    const profile = {
      username: 'player',
      dateOfBirth: '2000-01-31',
      gender: 'Other',
      recoveryEmail: 'player@example.com',
    };
    const profileCommand = httpsCallable.mock.results[0].value;
    profileCommand.mockResolvedValue({
      data: { profile },
    });

    await expect(saveUserProfile(profile)).resolves.toEqual(profile);
    expect(profileCommand).toHaveBeenCalledWith({
      command: 'saveProfile',
      profile,
    });
  });

  it('loads the player dashboard through the trusted callable function', async () => {
    const dashboard = { playerId: 'LUDO-ABCD123456' };
    const profileCommand = httpsCallable.mock.results[0].value;
    profileCommand.mockResolvedValue({ data: dashboard });

    await expect(getPlayerDashboard()).resolves.toEqual(dashboard);
    expect(profileCommand).toHaveBeenCalledWith({
      command: 'getDashboard',
    });
  });

  it('updates the display name and requests account deletion', async () => {
    const profileCommand = httpsCallable.mock.results[0].value;
    profileCommand.mockClear();
    profileCommand
      .mockResolvedValueOnce({ data: { profile: { username: 'NewName' } } })
      .mockResolvedValueOnce({ data: { deleted: true } });

    await expect(updateUsername('NewName')).resolves.toEqual({
      username: 'NewName',
    });
    await expect(deletePlayerAccount()).resolves.toEqual({ deleted: true });
    expect(profileCommand).toHaveBeenNthCalledWith(1, {
      command: 'updateUsername',
      username: 'NewName',
    });
    expect(profileCommand).toHaveBeenNthCalledWith(2, {
      command: 'deleteAccount',
    });
  });
});
