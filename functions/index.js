const { randomInt } = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const {
  applyGameAction,
  createInitialGameState,
  getNextActivePlayer,
} = require('./game');
const { createProfileCommand } = require('./profiles');

initializeApp({
  databaseURL: process.env.RTDB_DATABASE_URL,
});

const database = getDatabase();
const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_ROOM_PLAYERS = 4;
const REGION = 'us-central1';

function requireUser(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before using online rooms.');
  }
  return request.auth.uid;
}

function requireDisplayName(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', 'Enter a player name.');
  }
  return value.trim().slice(0, 24);
}

function normalizeRoomCode(value) {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'Enter a valid room code.');
  }

  const roomCode = value.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(roomCode)) {
    throw new HttpsError('invalid-argument', 'Enter a valid 6-character room code.');
  }
  return roomCode;
}

function createRoomCode() {
  return Array.from({ length: 6 }, () =>
    ROOM_CODE_CHARACTERS[randomInt(ROOM_CODE_CHARACTERS.length)],
  ).join('');
}

function requireRoomPlayer(room, uid) {
  const player = room.players?.[uid];
  if (!player) {
    throw new HttpsError('permission-denied', 'You are not a player in this room.');
  }
  return player;
}

function updateRoomPlayerLeave(room, playerNo) {
  const gameState = room.gameState;
  if (!gameState || gameState.winners.includes(playerNo)) {
    return;
  }

  const remainingPlayers = gameState.activePlayers.filter(
    activePlayer => activePlayer !== playerNo,
  );
  if (remainingPlayers.length === 0) {
    room.status = 'finished';
    return;
  }

  if (gameState.chancePlayer === playerNo) {
    gameState.chancePlayer = getNextActivePlayer(
      playerNo,
      remainingPlayers,
      gameState.winners,
    );
    gameState.isDiceRolled = false;
    gameState.touchDiceBlock = false;
    gameState.pileSelectionPlayer = -1;
    gameState.cellSelectionPlayer = -1;
  }
  gameState.activePlayers = remainingPlayers;
}

async function createRoom(uid, displayName) {
  const safeDisplayName = requireDisplayName(displayName);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomCode = createRoomCode();
    const result = await database.ref(`rooms/${roomCode}`).transaction(
      room =>
        room === null
          ? {
              hostUid: uid,
              status: 'waiting',
              createdAt: Date.now(),
              players: {
                [uid]: {
                  uid,
                  displayName: safeDisplayName,
                  playerNo: 1,
                  joinedAt: Date.now(),
                },
              },
            }
          : undefined,
      undefined,
      false,
    );

    if (result.committed) {
      return { roomCode };
    }
  }

  throw new HttpsError('resource-exhausted', 'Could not create a unique room code.');
}

async function updateRoom(roomCode, update) {
  const result = await database.ref(`rooms/${roomCode}`).transaction(
    currentRoom => update(currentRoom),
    undefined,
    false,
  );
  if (!result.committed) {
    throw new HttpsError('aborted', 'The room changed. Please try again.');
  }
  return result.snapshot.val();
}

async function handleRoomCommand(uid, data) {
  const command = data.command;

  if (command === 'createRoom') {
    return createRoom(uid, data.displayName);
  }

  const roomCode = normalizeRoomCode(data.roomCode);
  if (command === 'requestJoin') {
    const displayName = requireDisplayName(data.displayName);
    await updateRoom(roomCode, room => {
      if (!room || room.status !== 'waiting') {
        throw new HttpsError('not-found', 'That room does not exist or has started.');
      }
      if (room.players?.[uid]) {
        throw new HttpsError('already-exists', 'You are already in this room.');
      }
      if (Object.keys(room.players ?? {}).length >= MAX_ROOM_PLAYERS) {
        throw new HttpsError('resource-exhausted', 'That room is full.');
      }

      return {
        ...room,
        joinRequests: {
          ...room.joinRequests,
          [uid]: { uid, displayName, requestedAt: Date.now() },
        },
      };
    });
    return { roomCode };
  }

  if (command === 'acceptJoin') {
    const requestUid = data.userUid;
    if (typeof requestUid !== 'string' || !requestUid) {
      throw new HttpsError('invalid-argument', 'A joining player is required.');
    }

    let accepted = false;
    await updateRoom(roomCode, room => {
      if (!room || room.hostUid !== uid) {
        throw new HttpsError('permission-denied', 'Only the host can accept players.');
      }
      if (room.status !== 'waiting') {
        throw new HttpsError('failed-precondition', 'The room has already started.');
      }

      const request = room.joinRequests?.[requestUid];
      if (!request || request.uid !== requestUid) {
        throw new HttpsError('not-found', 'That join request is no longer available.');
      }

      const players = room.players ?? {};
      if (players[requestUid]) {
        accepted = true;
        const joinRequests = { ...room.joinRequests };
        delete joinRequests[requestUid];
        return { ...room, joinRequests };
      }

      const currentPlayers = Object.values(players);
      if (currentPlayers.length >= MAX_ROOM_PLAYERS) {
        return {
          ...room,
          joinRequests: {
            ...room.joinRequests,
            [requestUid]: { ...request, status: 'unavailable' },
          },
        };
      }

      const occupiedSeats = new Set(currentPlayers.map(player => player.playerNo));
      const playerNo = [1, 2, 3, 4].find(seat => !occupiedSeats.has(seat));
      if (!playerNo) {
        throw new HttpsError('resource-exhausted', 'The room has no open seats.');
      }

      const joinRequests = { ...room.joinRequests };
      delete joinRequests[requestUid];
      accepted = true;
      return {
        ...room,
        players: {
          ...players,
          [requestUid]: {
            uid: requestUid,
            displayName: request.displayName,
            playerNo,
            joinedAt: request.requestedAt,
          },
        },
        joinRequests,
      };
    });
    return { accepted };
  }

  if (command === 'startRoom') {
    await updateRoom(roomCode, room => {
      if (!room || room.hostUid !== uid) {
        throw new HttpsError('permission-denied', 'Only the host can start the match.');
      }
      if (room.status !== 'waiting') {
        throw new HttpsError('failed-precondition', 'The room has already started.');
      }

      const activePlayers = Object.values(room.players ?? {})
        .sort((left, right) => left.playerNo - right.playerNo)
        .map(player => player.playerNo);
      if (activePlayers.length < 2) {
        throw new HttpsError('failed-precondition', 'At least two players are required.');
      }

      return {
        ...room,
        status: 'playing',
        gameState: createInitialGameState(activePlayers),
      };
    });
    return { started: true };
  }

  if (command === 'cancelJoin') {
    await updateRoom(roomCode, room => {
      if (!room || room.status !== 'waiting') {
        throw new HttpsError('failed-precondition', 'The room is no longer waiting.');
      }
      const joinRequests = { ...room.joinRequests };
      delete joinRequests[uid];
      return { ...room, joinRequests };
    });
    return { cancelled: true };
  }

  if (command === 'deleteRoom') {
    await updateRoom(roomCode, room => {
      if (!room || room.hostUid !== uid) {
        throw new HttpsError('permission-denied', 'Only the host can close this room.');
      }
      return null;
    });
    return { deleted: true };
  }

  if (command === 'leaveRoom') {
    await updateRoom(roomCode, room => {
      if (!room) {
        throw new HttpsError('not-found', 'That room no longer exists.');
      }
      if (room.hostUid === uid) {
        return null;
      }

      const player = room.players?.[uid];
      if (!player) {
        const joinRequests = { ...room.joinRequests };
        delete joinRequests[uid];
        return { ...room, joinRequests };
      }

      const players = { ...room.players };
      delete players[uid];
      const nextRoom = { ...room, players };
      updateRoomPlayerLeave(nextRoom, player.playerNo);
      return nextRoom;
    });
    return { left: true };
  }

  if (command === 'gameAction') {
    const action = data.action;
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      throw new HttpsError('invalid-argument', 'A game action is required.');
    }

    let nextGameState;
    await updateRoom(roomCode, room => {
      if (!room || room.status !== 'playing' || !room.gameState) {
        throw new HttpsError('failed-precondition', 'The match is not in progress.');
      }
      const player = requireRoomPlayer(room, uid);
      if (action.type === 'leave') {
        if (room.hostUid === uid) {
          return null;
        }
        const players = { ...room.players };
        delete players[uid];
        const nextRoom = { ...room, players };
        updateRoomPlayerLeave(nextRoom, player.playerNo);
        nextGameState = nextRoom.gameState;
        return nextRoom;
      }
      if (action.type === 'newGame') {
        const activePlayers = Object.values(room.players)
          .sort((left, right) => left.playerNo - right.playerNo)
          .map(roomPlayer => roomPlayer.playerNo);
        nextGameState = createInitialGameState(activePlayers);
      } else {
        try {
          nextGameState = applyGameAction(
            room.gameState,
            player.playerNo,
            action,
          );
        } catch (error) {
          if (error instanceof HttpsError) {
            throw error;
          }
          throw new HttpsError('failed-precondition', error.message);
        }
      }
      return { ...room, gameState: nextGameState };
    });
    return { accepted: true };
  }

  throw new HttpsError('invalid-argument', 'Unsupported room command.');
}

const handleProfileCommand = createProfileCommand(database, HttpsError);

exports.roomCommand = onCall({ region: REGION }, async request => {
  const uid = requireUser(request);
  return handleRoomCommand(uid, request.data ?? {});
});

exports.profileCommand = onCall({ region: REGION }, async request => {
  const uid = requireUser(request);
  return handleProfileCommand(uid, request.data ?? {});
});
