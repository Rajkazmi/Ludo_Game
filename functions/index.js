const { randomInt } = require('node:crypto');
const { GoogleAuth } = require('google-auth-library');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const {
  applyGameAction,
  createInitialGameState,
  getNextActivePlayer,
} = require('./game');
const { createProfileCommand } = require('./profiles');
const { createEconomyCommand } = require('./economy');
const { createPaidRoomMatchStarter } = require('./roomMatch');
const {
  recordCompletedMatch,
  recordGameplayAction,
} = require('./playerData');

initializeApp({
  databaseURL: process.env.RTDB_DATABASE_URL,
});

const adminAuth = getAuth();
const database = getDatabase();
const ROOM_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_ROOM_PLAYERS = 4;
const REGION = 'us-central1';
const ANDROID_PACKAGE_NAME = 'com.gamegape.ludokingdom';
const PLAY_PUBLISHER_SCOPE =
  'https://www.googleapis.com/auth/androidpublisher';
const playAuth = new GoogleAuth({ scopes: [PLAY_PUBLISHER_SCOPE] });

function requireUser(request) {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Sign in before using this online feature.',
    );
  }
  return request.auth.uid;
}

async function playPublisherRequest(productId, purchaseToken) {
  const client = await playAuth.getClient();
  const url =
    'https://androidpublisher.googleapis.com/androidpublisher/v3/' +
    `applications/${ANDROID_PACKAGE_NAME}/purchases/products/` +
    `${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await client.request({ url });
  return response.data;
}

async function verifyPlayPurchase(productId, purchaseToken) {
  return playPublisherRequest(productId, purchaseToken);
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
    await startPaidRoomMatch(roomCode, uid, 'start');
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
      if (room.pendingMatchStart) {
        throw new HttpsError(
          'failed-precondition',
          'A match is currently starting.',
        );
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
      if (room.pendingMatchStart) {
        throw new HttpsError(
          'failed-precondition',
          'A match is currently starting.',
        );
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
    if (action.type === 'newGame') {
      await startPaidRoomMatch(roomCode, uid, 'newGame');
      return { accepted: true };
    }

    let actionStat;
    let matchResult;
    await updateRoom(roomCode, room => {
      if (!room || room.status !== 'playing' || !room.gameState) {
        throw new HttpsError('failed-precondition', 'The match is not in progress.');
      }
      const player = requireRoomPlayer(room, uid);
      if (room.pendingMatchStart) {
        throw new HttpsError(
          'failed-precondition',
          'A match is currently starting.',
        );
      }
      if (action.type === 'leave') {
        if (room.hostUid === uid) {
          return null;
        }
        const players = { ...room.players };
        delete players[uid];
        const nextRoom = { ...room, players };
        updateRoomPlayerLeave(nextRoom, player.playerNo);
        return nextRoom;
      }
      const previousGameState = room.gameState;
      let nextGameState;
      try {
        nextGameState = applyGameAction(
          previousGameState,
          player.playerNo,
          action,
        );
      } catch (error) {
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('failed-precondition', error.message);
      }
      const capturedPawns =
        action.type === 'movePiece'
          ? Object.entries(previousGameState)
              .filter(([key, pieces]) =>
                /^player[1-4]$/.test(key) && Array.isArray(pieces),
              )
              .filter(([key]) => key !== `player${player.playerNo}`)
              .flatMap(([key, pieces]) =>
                pieces.filter((piece, index) =>
                  piece.pos !== 0 &&
                  nextGameState[key][index]?.pos === 0,
                ),
              ).length
          : 0;
      const gameId = previousGameState.matchId ?? `${roomCode}-${room.createdAt}`;
      const gameActionSequence = (room.gameActionSequence ?? 0) + 1;
      actionStat = {
        uid,
        matchId: gameId,
        actionId: gameActionSequence,
        actionType: action.type,
        isSix: action.type === 'roll' && nextGameState.diceNo === 6,
        capturedPawns,
      };
      if (
        previousGameState.winner === null &&
        nextGameState.winner !== null
      ) {
        matchResult = {
          matchId: gameId,
          players:
            room.matchPlayers ??
            Object.values(room.players).map(roomPlayer => ({
              uid: roomPlayer.uid,
              playerNo: roomPlayer.playerNo,
            })),
          playerCount:
            room.matchPlayers?.length ??
            Object.keys(room.players ?? {}).length,
          winnerPlayerNo: nextGameState.winner,
          completedAt: Date.now(),
        };
      }
      return {
        ...room,
        gameState: nextGameState,
        gameActionSequence,
      };
    });
    if (actionStat) {
      await recordGameplayAction(database, actionStat);
    }
    if (matchResult) {
      await recordCompletedMatch(database, matchResult);
    }
    return { accepted: true };
  }

  throw new HttpsError('invalid-argument', 'Unsupported room command.');
}

const handleProfileCommand = createProfileCommand(database, HttpsError, {
  deleteAuthUser: uid => adminAuth.deleteUser(uid),
});
const handleEconomyCommand = createEconomyCommand(database, HttpsError, {
  verifyPlayPurchase,
});
const startPaidRoomMatch = createPaidRoomMatchStarter({
  database,
  HttpsError,
  chargeMatchFee: (uid, gameModeId) =>
    handleEconomyCommand(uid, {
      command: 'chargeMatchFee',
      game_mode_id: gameModeId,
    }),
  createInitialGameState,
});

exports.roomCommand = onCall({ region: REGION }, async request => {
  const uid = requireUser(request);
  return handleRoomCommand(uid, request.data ?? {});
});

exports.profileCommand = onCall({ region: REGION }, async request => {
  const uid = requireUser(request);
  return handleProfileCommand(uid, request.data ?? {}, {
    authTime: request.auth.token.auth_time,
  });
});

exports.economyCommand = onCall({ region: REGION }, async request => {
  const uid = requireUser(request);
  return handleEconomyCommand(uid, request.data ?? {});
});
