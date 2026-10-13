import {
  onChildAdded,
  onValue,
  get,
  push,
  ref,
  remove,
  runTransaction,
  set,
} from '@firebase/database';
import { auth, database } from '../config/firebase';
import { initialState } from '../redux/reducers/initialState';

const ROOM_CODE_LENGTH = 6;
const MAX_ROOM_PLAYERS = 4;
const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const requireUser = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in before creating or joining an online room.');
  }
  return user;
};

const normalizeRoomCode = roomCode => {
  const normalizedCode = roomCode.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalizedCode)) {
    throw new Error('Enter a valid 6-character room code.');
  }
  return normalizedCode;
};

const getRoomReference = roomCode =>
  ref(database, `rooms/${normalizeRoomCode(roomCode)}`);

const createRoomCode = () =>
  Array.from({ length: ROOM_CODE_LENGTH }, () =>
    ROOM_CODE_CHARACTERS.charAt(
      Math.floor(Math.random() * ROOM_CODE_CHARACTERS.length),
    ),
  ).join('');

const createInitialGameState = activePlayers => ({
  ...initialState,
  player1: initialState.player1.map(piece => ({ ...piece })),
  player2: initialState.player2.map(piece => ({ ...piece })),
  player3: initialState.player3.map(piece => ({ ...piece })),
  player4: initialState.player4.map(piece => ({ ...piece })),
  activePlayers,
  winners: [],
});

export async function createRoom(displayName) {
  const user = requireUser();
  const roomPlayer = {
    uid: user.uid,
    displayName: displayName.trim().slice(0, 24),
    playerNo: 1,
    joinedAt: Date.now(),
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomCode = createRoomCode();
    const result = await runTransaction(
      getRoomReference(roomCode),
      currentRoom =>
        currentRoom === null
          ? {
              hostUid: user.uid,
              status: 'waiting',
              createdAt: Date.now(),
              players: { [user.uid]: roomPlayer },
            }
          : undefined,
      { applyLocally: false },
    );

    if (result.committed) {
      return roomCode;
    }
  }

  throw new Error('Could not create a unique room code. Please try again.');
}

export async function requestRoomJoin(roomCode, displayName) {
  const user = requireUser();
  const normalizedCode = normalizeRoomCode(roomCode);
  const roomSnapshot = await get(getRoomReference(normalizedCode));
  const roomData = roomSnapshot.val();

  if (!roomData || roomData.status !== 'waiting') {
    throw new Error('That room does not exist or has already started.');
  }
  if (roomData.players?.[user.uid]) {
    return normalizedCode;
  }
  if (Object.keys(roomData.players ?? {}).length >= MAX_ROOM_PLAYERS) {
    throw new Error('That room is full.');
  }

  await set(ref(database, `rooms/${normalizedCode}/joinRequests/${user.uid}`), {
    uid: user.uid,
    displayName: displayName.trim().slice(0, 24),
    requestedAt: Date.now(),
  });

  return normalizedCode;
}

export function subscribeToRoom(roomCode, onRoomChange, onError) {
  return onValue(
    getRoomReference(roomCode),
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
  const normalizedCode = normalizeRoomCode(roomCode);
  const roomReference = getRoomReference(normalizedCode);
  const result = await runTransaction(
    roomReference,
    currentRoom => {
      if (!currentRoom || currentRoom.status !== 'waiting') {
        return undefined;
      }

      const players = currentRoom.players ?? {};
      if (players[request.uid]) {
        return currentRoom;
      }

      const currentPlayers = Object.values(players);
      if (currentPlayers.length >= MAX_ROOM_PLAYERS) {
        return undefined;
      }

      const occupiedSeats = new Set(
        currentPlayers.map(player => player.playerNo),
      );
      const playerNo = [1, 2, 3, 4].find(seat => !occupiedSeats.has(seat));
      if (!playerNo) {
        return undefined;
      }

      return {
        ...currentRoom,
        players: {
          ...players,
          [request.uid]: {
            uid: request.uid,
            displayName: request.displayName,
            playerNo,
            joinedAt: request.requestedAt,
          },
        },
      };
    },
    { applyLocally: false },
  );

  await remove(
    ref(database, `rooms/${normalizedCode}/joinRequests/${request.uid}`),
  );

  if (!result.committed) {
    await set(
      ref(database, `rooms/${normalizedCode}/joinRequests/${request.uid}`),
      { ...request, status: 'unavailable' },
    );
  }
  return result.committed;
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
  const roomReference = getRoomReference(roomCode);
  const result = await runTransaction(
    roomReference,
    currentRoom => {
      if (
        !currentRoom ||
        currentRoom.status !== 'waiting' ||
        Object.keys(currentRoom.players ?? {}).length < 2
      ) {
        return undefined;
      }

      const activePlayers = Object.values(currentRoom.players)
        .sort((left, right) => left.playerNo - right.playerNo)
        .map(player => player.playerNo);

      return {
        ...currentRoom,
        status: 'playing',
        gameState: createInitialGameState(activePlayers),
      };
    },
    { applyLocally: false },
  );

  if (!result.committed) {
    throw new Error('The room needs at least two players before it can start.');
  }
}

export async function sendRoomAction(roomCode, action) {
  const user = requireUser();
  const actionsReference = ref(
    database,
    `rooms/${normalizeRoomCode(roomCode)}/actions`,
  );
  const actionReference = push(actionsReference);
  await set(actionReference, {
    ...action,
    uid: user.uid,
    createdAt: Date.now(),
  });
}

export function subscribeToRoomActions(roomCode, onAction, onError) {
  let actionQueue = Promise.resolve();

  return onChildAdded(
    ref(database, `rooms/${normalizeRoomCode(roomCode)}/actions`),
    snapshot => {
      const action = snapshot.val();
      if (!action?.uid) {
        return;
      }

      actionQueue = actionQueue.then(async () => {
        try {
          const removeAction = await onAction(action);
          if (removeAction !== false) {
            await remove(snapshot.ref);
          }
        } catch (error) {
          onError(error);
        }
      });
    },
    onError,
  );
}

export function publishRoomGameState(roomCode, gameState) {
  return set(
    ref(database, `rooms/${normalizeRoomCode(roomCode)}/gameState`),
    gameState,
  );
}

export async function removeRoom(roomCode) {
  requireUser();
  await remove(getRoomReference(roomCode));
}

export async function removeRoomPlayer(roomCode, playerUid) {
  const user = requireUser();
  const result = await runTransaction(
    getRoomReference(roomCode),
    currentRoom => {
      if (
        !currentRoom ||
        currentRoom.hostUid !== user.uid ||
        playerUid === user.uid ||
        !currentRoom.players?.[playerUid]
      ) {
        return undefined;
      }

      const players = { ...currentRoom.players };
      delete players[playerUid];
      return { ...currentRoom, players };
    },
    { applyLocally: false },
  );

  return result.committed;
}

export async function cancelRoomJoinRequest(roomCode) {
  const user = requireUser();
  await remove(
    ref(
      database,
      `rooms/${normalizeRoomCode(roomCode)}/joinRequests/${user.uid}`,
    ),
  );
}
