const { createHash } = require('node:crypto');

const XP_PER_MATCH = 50;
const XP_WIN_BONUS = 100;
const XP_PER_LEVEL = 2000;

function createDefaultPlayerData() {
  return {
    stats: {
      totalMatchesPlayed: 0,
      totalWins: 0,
      totalLosses: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
      sixesRolled: 0,
      pawnsCaptured: 0,
      modes: {
        twoPlayer: { played: 0, wins: 0, losses: 0 },
        threePlayer: { played: 0, wins: 0, losses: 0 },
        fourPlayer: { played: 0, wins: 0, losses: 0 },
      },
    },
    progression: { xp: 0 },
    customization: {
      avatar: 'provider',
      frame: 'default',
      title: 'Rookie',
    },
    preferences: {
      statsPublic: false,
      onlineStatusVisible: false,
    },
    matches: {},
  };
}

function normalizePlayerData(value) {
  const defaults = createDefaultPlayerData();
  const playerData = value && typeof value === 'object' ? value : {};
  const stats =
    playerData.stats && typeof playerData.stats === 'object'
      ? playerData.stats
      : {};
  const progression =
    playerData.progression && typeof playerData.progression === 'object'
      ? playerData.progression
      : {};
  const customization =
    playerData.customization && typeof playerData.customization === 'object'
      ? playerData.customization
      : {};
  const preferences =
    playerData.preferences && typeof playerData.preferences === 'object'
      ? playerData.preferences
      : {};
  const modes = stats.modes ?? {};
  const normalizeMode = mode =>
    ({
      ...defaults.stats.modes[mode],
      ...(modes[mode] ?? {}),
    });

  return {
    ...defaults,
    ...playerData,
    stats: {
      ...defaults.stats,
      ...stats,
      modes: {
        twoPlayer: normalizeMode('twoPlayer'),
        threePlayer: normalizeMode('threePlayer'),
        fourPlayer: normalizeMode('fourPlayer'),
      },
    },
    progression: { ...defaults.progression, ...progression },
    customization: { ...defaults.customization, ...customization },
    preferences: { ...defaults.preferences, ...preferences },
    matches:
      playerData.matches && typeof playerData.matches === 'object'
        ? playerData.matches
        : {},
  };
}

function getPlayerId(uid) {
  const digest = createHash('sha256').update(uid).digest('hex').slice(0, 16);
  return `LUDO-${digest.toUpperCase()}`;
}

function getLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function getUnlockedTitles(stats) {
  const titles = ['Rookie'];
  if (stats.totalWins >= 10) {
    titles.push('Ludo Master');
  }
  if (stats.totalWins >= 50) {
    titles.push('Unstoppable');
  }
  if (stats.sixesRolled >= 100) {
    titles.push('Dice Legend');
  }
  return titles;
}

async function ensurePlayerData(database, uid) {
  const playerRef = database.ref(`playerData/${uid}`);
  await playerRef.transaction(current =>
    current === null ? createDefaultPlayerData() : normalizePlayerData(current),
  );
  const snapshot = await playerRef.get();
  return normalizePlayerData(snapshot.val());
}

async function updatePlayerData(database, uid, update) {
  const result = await database.ref(`playerData/${uid}`).transaction(current => {
    const playerData = normalizePlayerData(current);
    return update(playerData);
  });
  if (!result.committed) {
    throw new Error('Player data changed. Please try again.');
  }
  return normalizePlayerData(result.snapshot.val());
}

async function recordGameplayAction(database, event) {
  if (!event.uid || !event.matchId) {
    return;
  }
  await updatePlayerData(database, event.uid, playerData => {
    const match = playerData.matches[event.matchId] ?? {};
    if (
      Number.isInteger(event.actionId) &&
      event.actionId <= (match.actionsThrough ?? 0)
    ) {
      return playerData;
    }

    if (event.actionType === 'roll') {
      if (event.isSix) {
        playerData.stats.sixesRolled += 1;
      }
    }
    playerData.stats.pawnsCaptured += event.capturedPawns ?? 0;
    if (Number.isInteger(event.actionId)) {
      playerData.matches[event.matchId] = {
        ...match,
        actionsThrough: event.actionId,
      };
    }
    return playerData;
  });
}

async function recordCompletedMatch(database, match) {
  const modeName = {
    2: 'twoPlayer',
    3: 'threePlayer',
    4: 'fourPlayer',
  }[match.playerCount];

  if (!modeName || !match.matchId || !Array.isArray(match.players)) {
    return;
  }

  await Promise.all(
    match.players.map(async player => {
      const { uid, playerNo } = player;
      if (!uid || !Number.isInteger(playerNo)) {
        return;
      }
      const result = await database.ref(`playerData/${uid}`).transaction(current => {
        const playerData = normalizePlayerData(current);
        const previousMatch = playerData.matches[match.matchId] ?? {};
        if (previousMatch.result) {
          return undefined;
        }

        const didWin = playerNo === match.winnerPlayerNo;
        const modeStats = playerData.stats.modes[modeName];
        playerData.stats.totalMatchesPlayed += 1;
        playerData.stats.totalWins += didWin ? 1 : 0;
        playerData.stats.totalLosses += didWin ? 0 : 1;
        modeStats.played += 1;
        modeStats.wins += didWin ? 1 : 0;
        modeStats.losses += didWin ? 0 : 1;
        playerData.stats.currentWinStreak = didWin
          ? playerData.stats.currentWinStreak + 1
          : 0;
        playerData.stats.longestWinStreak = Math.max(
          playerData.stats.longestWinStreak,
          playerData.stats.currentWinStreak,
        );
        playerData.progression.xp += XP_PER_MATCH + (didWin ? XP_WIN_BONUS : 0);
        playerData.matches[match.matchId] = {
          ...previousMatch,
          mode: modeName,
          result: didWin ? 'win' : 'loss',
          completedAt: match.completedAt,
        };
        return playerData;
      });
      return result.committed;
    }),
  );
}

function removePlayerFromRoom(room, uid) {
  if (!room || room.hostUid === uid) {
    return null;
  }

  const nextRoom = {
    ...room,
    players: { ...(room.players ?? {}) },
    joinRequests: { ...(room.joinRequests ?? {}) },
  };
  const player = nextRoom.players[uid];
  delete nextRoom.players[uid];
  delete nextRoom.joinRequests[uid];

  if (!player || !nextRoom.gameState) {
    return nextRoom;
  }

  const gameState = { ...nextRoom.gameState };
  const remainingPlayers = gameState.activePlayers.filter(
    playerNo => playerNo !== player.playerNo,
  );
  gameState.activePlayers = remainingPlayers;
  if (remainingPlayers.length < 2) {
    nextRoom.status = 'finished';
  } else if (gameState.chancePlayer === player.playerNo) {
    gameState.chancePlayer = remainingPlayers[0];
    gameState.isDiceRolled = false;
    gameState.touchDiceBlock = false;
    gameState.pileSelectionPlayer = -1;
    gameState.cellSelectionPlayer = -1;
  }
  nextRoom.gameState = gameState;
  return nextRoom;
}

async function removeUserFromRooms(database, uid) {
  const snapshot = await database.ref('rooms').get();
  const rooms = snapshot.val() ?? {};
  await Promise.all(
    Object.entries(rooms).map(async ([roomCode, room]) => {
      if (
        room?.hostUid !== uid &&
        !room?.players?.[uid] &&
        !room?.joinRequests?.[uid]
      ) {
        return;
      }
      await database.ref(`rooms/${roomCode}`).transaction(current =>
        current ? removePlayerFromRoom(current, uid) : undefined,
      );
    }),
  );
}

module.exports = {
  XP_PER_LEVEL,
  createDefaultPlayerData,
  ensurePlayerData,
  getLevel,
  getPlayerId,
  getUnlockedTitles,
  normalizePlayerData,
  recordCompletedMatch,
  recordGameplayAction,
  removeUserFromRooms,
  updatePlayerData,
};
