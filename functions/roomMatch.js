const { randomUUID } = require('node:crypto');

function createPaidRoomMatchStarter({
  database,
  HttpsError,
  chargeMatchFee,
  createInitialGameState,
  createMatchId = randomUUID,
}) {
  return async (roomCode, uid, kind) => {
    const roomRef = database.ref(`rooms/${roomCode}`);
    const proposedMatchId = createMatchId();
    const claim = await roomRef.transaction(room => {
      if (!room) {
        throw new HttpsError('not-found', 'That room no longer exists.');
      }

      if (room.pendingMatchStart) {
        const pending = room.pendingMatchStart;
        if (pending.kind !== kind || pending.payerUid !== uid) {
          throw new HttpsError(
            'failed-precondition',
            'Another player is already starting a match.',
          );
        }
        return room;
      }

      if (kind === 'start') {
        if (room.hostUid !== uid) {
          throw new HttpsError(
            'permission-denied',
            'Only the host can start the match.',
          );
        }
        if (room.status !== 'waiting') {
          throw new HttpsError(
            'failed-precondition',
            'The room has already started.',
          );
        }
      } else if (kind === 'newGame') {
        if (room.status !== 'playing' || !room.gameState) {
          throw new HttpsError(
            'failed-precondition',
            'The match is not in progress.',
          );
        }
        if (!room.players?.[uid]) {
          throw new HttpsError(
            'permission-denied',
            'You are not a player in this room.',
          );
        }
      } else {
        throw new HttpsError('invalid-argument', 'Unsupported match start.');
      }

      const players = Object.values(room.players ?? {});
      if (players.length < 2) {
        throw new HttpsError(
          'failed-precondition',
          'At least two players are required.',
        );
      }

      return {
        ...room,
        ...(kind === 'start' ? { status: 'starting' } : {}),
        pendingMatchStart: {
          matchId: proposedMatchId,
          kind,
          payerUid: uid,
        },
      };
    });

    if (!claim.committed) {
      throw new HttpsError('aborted', 'The room changed. Please try again.');
    }

    const pending = claim.snapshot.val()?.pendingMatchStart;
    if (!pending) {
      throw new HttpsError('aborted', 'The room changed. Please try again.');
    }

    const fee = await chargeMatchFee(
      uid,
      `room_${roomCode}_${pending.matchId}`,
    );
    if (!fee.allowed) {
      await roomRef.transaction(room => {
        if (room?.pendingMatchStart?.matchId !== pending.matchId) {
          return room;
        }
        const roomWithoutPending = { ...room };
        delete roomWithoutPending.pendingMatchStart;
        return {
          ...roomWithoutPending,
          ...(kind === 'start' ? { status: 'waiting' } : {}),
        };
      });
      throw new HttpsError(
        'failed-precondition',
        'You need at least 15 Gapes to start a match.',
      );
    }

    const completed = await roomRef.transaction(room => {
      if (!room) {
        throw new HttpsError('not-found', 'That room no longer exists.');
      }
      if (
        !room.pendingMatchStart &&
        room.gameState?.matchId === pending.matchId
      ) {
        return room;
      }
      if (room.pendingMatchStart?.matchId !== pending.matchId) {
        throw new HttpsError('aborted', 'The room changed. Please try again.');
      }

      const players = Object.values(room.players ?? {}).sort(
        (left, right) => left.playerNo - right.playerNo,
      );
      if (players.length < 2) {
        throw new HttpsError(
          'failed-precondition',
          'At least two players are required.',
        );
      }

      const matchPlayers = players.map(player => ({
        uid: player.uid,
        playerNo: player.playerNo,
      }));
      const gameState = createInitialGameState(
        players.map(player => player.playerNo),
      );
      gameState.matchId = pending.matchId;
      const roomWithoutPending = { ...room };
      delete roomWithoutPending.pendingMatchStart;

      return {
        ...roomWithoutPending,
        status: 'playing',
        matchPlayers,
        gameActionSequence: 0,
        gameState,
      };
    });

    if (!completed.committed) {
      throw new HttpsError('aborted', 'The room changed. Please try again.');
    }
  };
}

module.exports = { createPaidRoomMatchStarter };
