import { httpsCallable } from '@firebase/functions';
import { functions } from '../config/firebase';

const profileCommand = httpsCallable(functions, 'profileCommand');

async function callProfileCommand(command, values = {}) {
  const result = await profileCommand({ command, ...values });
  return result.data;
}

export async function getUserProfile() {
  const result = await callProfileCommand('getProfile');
  return result.profile;
}

export async function getPlayerDashboard() {
  return callProfileCommand('getDashboard');
}

export async function isUsernameAvailable(profile) {
  const result = await callProfileCommand('checkUsername', { profile });
  return result.available;
}

export async function saveUserProfile(profile) {
  const result = await callProfileCommand('saveProfile', { profile });
  return result.profile;
}

export async function updateUsername(username) {
  const result = await callProfileCommand('updateUsername', { username });
  return result.profile;
}

export async function savePlayerCustomization(customization) {
  const result = await callProfileCommand('saveCustomization', {
    customization,
  });
  return result.customization;
}

export async function savePlayerPreferences(preferences) {
  const result = await callProfileCommand('savePreferences', { preferences });
  return result.preferences;
}

export async function deletePlayerAccount() {
  return callProfileCommand('deleteAccount');
}
