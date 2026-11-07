import {
  onChildAdded,
  onValue,
  ref,
} from '@firebase/database';
import { httpsCallable } from '@firebase/functions';
import { database, functions } from '../config/firebase';

const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const roomCommand = httpsCallable(functions, 'roomCommand');

const normalizeRoomCode = roomCode => {
  if (typeof roomCode !== 'string') {
    throw new Error('Enter a valid room code.');
  }
  const normalizedCode = roomCode.trim().toUpperCase();
  if (!ROOM_CODE_PATTERN.test(normalizedCode)) {
    throw new Error('Enter a valid 6-character room code.');
  }
  return normalizedCode;
};

const callRoomCommand = async (command, values = {}) => {
  const result = await roomCommand({ command, ...values });
  return result.data;
};

export async function createRoom(displayName) {
  const result = await callRoomCommand('createRoom', { displayName });
  return result.roomCode;
}

export async function requestRoomJoin(roomCode, displayName) {
  const result = await callRoomCommand('requestJoin', {
    roomCode: normalizeRoomCode(roomCode),
    displayName,
  });
  return result.roomCode;
}

export function subscribeToRoom(roomCode, onRoomChange, onError) {
  return onValue(
    ref(database, `rooms/${normalizeRoomCode(roomCode)}`),
    snapshot => onRoomChange(snapshot.val()),
    onError,
  );
}

export function subscribeToJoinRequests(roomCode, onRequest, onError) {
  return onChildAdded(
    ref(database, `rooms/${normalizeRoomCode(roomCode)}/joinRequests`),
    snapshot => {
      const request = snapshot.val();
      if (request?.uid && !request.status) {
        onRequest(request);
      }
    },
    onError,
  );
}

export async function acceptRoomJoinRequest(roomCode, request) {
  const result = await callRoomCommand('acceptJoin', {
    roomCode: normalizeRoomCode(roomCode),
    userUid: request.uid,
  });
  return result.accepted;
}

export function subscribeToJoinRequest(roomCode, userUid, onRequest, onError) {
  return onValue(
    ref(
      database,
      `rooms/${normalizeRoomCode(roomCode)}/joinRequests/${userUid}`,
    ),
    snapshot => onRequest(snapshot.val()),
    onError,
  );
}

export async function startRoom(roomCode) {
  await callRoomCommand('startRoom', {
    roomCode: normalizeRoomCode(roomCode),
  });
}

export async function sendRoomAction(roomCode, action) {
  await callRoomCommand('gameAction', {
    roomCode: normalizeRoomCode(roomCode),
    action,
  });
}

export async function removeRoom(roomCode) {
  await callRoomCommand('deleteRoom', {
    roomCode: normalizeRoomCode(roomCode),
  });
}

export async function leaveRoom(roomCode) {
  await callRoomCommand('leaveRoom', {
    roomCode: normalizeRoomCode(roomCode),
  });
}
