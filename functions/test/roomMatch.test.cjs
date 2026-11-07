const assert = require('node:assert/strict');
const test = require('node:test');
const { createPaidRoomMatchStarter } = require('../roomMatch');

class TestHttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function createDatabase(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  const database = {
    values,
    failNextRoomFinalize: false,
    ref(path) {
      return {
        async transaction(update) {
          const current = values.get(path) ?? null;
          const next = update(current);
          if (
            database.failNextRoomFinalize &&
            path.startsWith('rooms/') &&
            next?.status === 'playing'
          ) {
            database.failNextRoomFinalize = false;
            return {
              committed: false,
              snapshot: { val: () => current },
            };
          }
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
  return database;
}

function createRoom(status = 'waiting') {
  return {
    hostUid: 'host',
    status,
    players: {
      host: { uid: 'host', playerNo: 1 },
      guest: { uid: 'guest', playerNo: 2 },
    },
    ...(status === 'playing'
      ? { gameState: { matchId: 'old-match', activePlayers: [1, 2] } }
      : {}),
  };
}

function createStarter(database, options = {}) {
  const charged = new Set();
  const calls = [];
  let matchNumber = 0;
  let balance = options.balance ?? 100;
  const start = createPaidRoomMatchStarter({
    database,
    HttpsError: TestHttpsError,
    createMatchId: () => `match-${++matchNumber}`,
    createInitialGameState: activePlayers => ({ activePlayers }),
    chargeMatchFee: async (uid, gameModeId) => {
      calls.push({ uid, gameModeId });
      if (charged.has(`${uid}:${gameModeId}`)) {
        return { allowed: true, current_balance: balance };
      }
      if (balance < 15) {
        return { allowed: false, error: 'INSUFFICIENT_GAPES' };
      }
      balance -= 15;
      charged.add(`${uid}:${gameModeId}`);
      return { allowed: true, current_balance: balance };
    },
  });
  return { start, calls, charged };
}

test('charges the host before starting and blocks a second free start', async () => {
  const database = createDatabase({ 'rooms/ABC234': createRoom() });
  const { start, calls } = createStarter(database);

  await start('ABC234', 'host', 'start');

  const room = database.values.get('rooms/ABC234');
  assert.equal(room.status, 'playing');
  assert.equal(room.gameState.matchId, 'match-1');
  assert.equal(room.pendingMatchStart, undefined);
  assert.deepEqual(calls, [
    { uid: 'host', gameModeId: 'room_ABC234_match-1' },
  ]);
  await assert.rejects(
    start('ABC234', 'host', 'start'),
    error => error.code === 'failed-precondition',
  );
  assert.equal(calls.length, 1);
});

test('does not start a match or keep a pending reservation with insufficient Gapes', async () => {
  const database = createDatabase({ 'rooms/ABC234': createRoom() });
  const { start } = createStarter(database, { balance: 10 });

  await assert.rejects(
    start('ABC234', 'host', 'start'),
    error =>
      error.code === 'failed-precondition' &&
      error.message.includes('15 Gapes'),
  );

  const room = database.values.get('rooms/ABC234');
  assert.equal(room.status, 'waiting');
  assert.equal(room.pendingMatchStart, undefined);
  assert.equal(room.gameState, undefined);
});

test('resumes an interrupted start using the same idempotent fee', async () => {
  const database = createDatabase({ 'rooms/ABC234': createRoom() });
  database.failNextRoomFinalize = true;
  const { start, calls, charged } = createStarter(database);

  await assert.rejects(
    start('ABC234', 'host', 'start'),
    error => error.code === 'aborted',
  );
  assert.equal(database.values.get('rooms/ABC234').status, 'starting');
  await start('ABC234', 'host', 'start');

  assert.equal(database.values.get('rooms/ABC234').status, 'playing');
  assert.equal(calls.length, 2);
  assert.equal(charged.size, 1);
});

test('charges a room participant for new games and rejects non-members', async () => {
  const database = createDatabase({
    'rooms/ABC234': createRoom('playing'),
  });
  const { start, calls } = createStarter(database);

  await assert.rejects(
    start('ABC234', 'stranger', 'newGame'),
    error => error.code === 'permission-denied',
  );
  assert.equal(calls.length, 0);

  await start('ABC234', 'guest', 'newGame');
  const room = database.values.get('rooms/ABC234');
  assert.equal(room.status, 'playing');
  assert.equal(room.gameState.matchId, 'match-2');
  assert.deepEqual(calls, [
    { uid: 'guest', gameModeId: 'room_ABC234_match-2' },
  ]);
});
