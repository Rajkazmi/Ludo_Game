const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createDefaultPlayerData,
  ensurePlayerData,
  getLevel,
  getPlayerId,
  getUnlockedTitles,
  recordCompletedMatch,
  recordGameplayAction,
} = require('../playerData');

function createDatabase(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    values,
    ref(path) {
      return {
        async get() {
          if (values.has(path)) {
            const value = values.get(path);
            return { val: () => value };
          }
          const prefix = `${path}/`;
          const children = Object.fromEntries(
            [...values.entries()]
              .filter(([key]) => key.startsWith(prefix))
              .map(([key, value]) => [key.slice(prefix.length), value]),
          );
          return {
            val: () => Object.keys(children).length ? children : null,
          };
        },
        async transaction(update) {
          const current = values.get(path) ?? null;
          const next = update(current);
          if (next === undefined) {
            return {
              committed: false,
              snapshot: { val: () => current },
            };
          }
          if (next === null) {
            values.delete(path);
          } else {
            values.set(path, next);
          }
          return {
            committed: true,
            snapshot: { val: () => next },
          };
        },
      };
    },
  };
}

test('initializes profile progression, statistics, customization, and private preferences', async () => {
  const database = createDatabase();
  const playerData = await ensurePlayerData(database, 'uid-1');

  assert.deepEqual(playerData, createDefaultPlayerData());
  assert.equal(getPlayerId('uid-1'), getPlayerId('uid-1'));
  assert.match(getPlayerId('uid-1'), /^LUDO-[A-F0-9]{16}$/);
  assert.equal(getLevel(4000), 3);
});

test('records accepted online rolls and captures', async () => {
  const database = createDatabase();
  await recordGameplayAction(database, {
    uid: 'uid-1',
    matchId: 'match-1',
    actionId: 1,
    actionType: 'roll',
    isSix: true,
  });
  await recordGameplayAction(database, {
    uid: 'uid-1',
    matchId: 'match-1',
    actionId: 2,
    actionType: 'movePiece',
    capturedPawns: 1,
  });
  await recordGameplayAction(database, {
    uid: 'uid-1',
    matchId: 'match-1',
    actionId: 2,
    actionType: 'movePiece',
    capturedPawns: 1,
  });

  const stats = database.values.get('playerData/uid-1').stats;
  assert.equal(stats.sixesRolled, 1);
  assert.equal(stats.pawnsCaptured, 1);
  assert.equal(
    database.values.get('playerData/uid-1').matches['match-1'].actionsThrough,
    2,
  );
});

test('records match results once and awards XP and unlocks milestone titles', async () => {
  const database = createDatabase();
  const result = {
    matchId: 'match-1',
    players: [
      { uid: 'winner', playerNo: 1 },
      { uid: 'loser', playerNo: 2 },
    ],
    playerCount: 2,
    winnerPlayerNo: 1,
    completedAt: 123,
  };

  await recordGameplayAction(database, {
    uid: 'winner',
    matchId: result.matchId,
    actionId: 1,
    actionType: 'roll',
    isSix: true,
  });
  await recordCompletedMatch(database, result);
  await recordCompletedMatch(database, result);

  const winner = database.values.get('playerData/winner');
  const loser = database.values.get('playerData/loser');
  assert.equal(winner.stats.totalMatchesPlayed, 1);
  assert.equal(winner.stats.totalWins, 1);
  assert.equal(winner.stats.sixesRolled, 1);
  assert.equal(winner.stats.modes.twoPlayer.wins, 1);
  assert.equal(winner.progression.xp, 150);
  assert.equal(winner.matches['match-1'].actionsThrough, 1);
  assert.equal(winner.matches['match-1'].result, 'win');
  assert.equal(loser.stats.totalLosses, 1);
  assert.equal(loser.progression.xp, 50);
  assert.deepEqual(
    getUnlockedTitles({ totalWins: 50, sixesRolled: 100 }),
    ['Rookie', 'Ludo Master', 'Unstoppable', 'Dice Legend'],
  );
});

test('handles one thousand generated players without sharing account data', async () => {
  const database = createDatabase();
  await Promise.all(
    Array.from({ length: 1000 }, (_, index) =>
      ensurePlayerData(database, `user-${index}`),
    ),
  );

  assert.equal(database.values.size, 1000);
  assert.equal(database.values.get('playerData/user-999').stats.totalWins, 0);
  assert.equal(
    new Set(
      Array.from({ length: 1000 }, (_, index) =>
        getPlayerId(`user-${index}`),
      ),
    ).size,
    1000,
  );
  assert.notEqual(
    database.values.get('playerData/user-1'),
    database.values.get('playerData/user-2'),
  );
});
