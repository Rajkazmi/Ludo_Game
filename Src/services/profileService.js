import { getToken as getAppCheckToken } from '@firebase/app-check';
import { httpsCallable } from '@firebase/functions';
import { appCheck, functions } from '../config/firebase';

const profileCommand = httpsCallable(functions, 'profileCommand');

async function callProfileCommand(command, values = {}) {
  if (appCheck) {
    await getAppCheckToken(appCheck);
  }

  const result = await profileCommand({ command, ...values });
  return result.data;
}

export async function getUserProfile() {
  const result = await callProfileCommand('getProfile');
  return result.profile;
}

export async function isUsernameAvailable(profile) {
  const result = await callProfileCommand('checkUsername', { profile });
  return result.available;
}

export async function saveUserProfile(profile) {
  const result = await callProfileCommand('saveProfile', { profile });
  return result.profile;
}
