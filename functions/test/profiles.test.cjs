const assert = require('node:assert/strict');
const test = require('node:test');
const { createProfileCommand } = require('../profiles');

class TestHttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const validProfile = {
  username: 'LudoPlayer',
  dateOfBirth: '2000-01-31',
  gender: 'Other',
  recoveryEmail: 'player@example.com',
};

function createDatabase(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    values,
    ref(path) {
      return {
        async get() {
          const value = values.get(path);
          if (value !== undefined) {
            return {
              exists: () => value !== null,
              val: () => value ?? null,
            };
          }
          const prefix = `${path}/`;
          const children = Object.fromEntries(
            [...values.entries()]
              .filter(([key]) => key.startsWith(prefix))
              .map(([key, childValue]) => [
                key.slice(prefix.length),
                childValue,
              ]),
          );
          return {
            exists: () => Object.keys(children).length > 0,
            val: () => Object.keys(children).length ? children : null,
          };
        },
        async set(value) {
          values.set(path, value);
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
        async remove() {
          values.delete(path);
        },
      };
    },
  };
}

test('username availability check is case-insensitive and allows the owner', async () => {
  const database = createDatabase({
    'usernameIndex/ludoplayer': 'uid-1',
  });
  const profileCommand = createProfileCommand(database, TestHttpsError);

  assert.deepEqual(
    await profileCommand('uid-2', {
      command: 'checkUsername',
      profile: validProfile,
    }),
    { available: false },
  );
  const ownProfileCommand = createProfileCommand(
    createDatabase({
      'usernameIndex/ludoplayer': 'uid-1',
    }),
    TestHttpsError,
  );
  assert.deepEqual(
    await ownProfileCommand('uid-1', {
      command: 'checkUsername',
      profile: validProfile,
    }),
    { available: true },
  );
});

test('profile save reserves username and stores details against authenticated UID', async () => {
  const database = createDatabase();
  const profileCommand = createProfileCommand(database, TestHttpsError);

  const result = await profileCommand('uid-1', {
    command: 'saveProfile',
    profile: validProfile,
  });

  assert.deepEqual(database.values.get('usernameIndex/ludoplayer'), 'uid-1');
  assert.deepEqual(database.values.get('users/uid-1'), result.profile);
  assert.equal(result.profile.recoveryEmail, 'player@example.com');
  assert.equal(typeof result.profile.updatedAt, 'number');
});

test('profile save rejects a username claimed by another UID', async () => {
  const database = createDatabase({
    'usernameIndex/ludoplayer': 'uid-1',
  });
  const profileCommand = createProfileCommand(database, TestHttpsError);

  await assert.rejects(
    profileCommand('uid-2', {
      command: 'saveProfile',
      profile: validProfile,
    }),
    error =>
      error.code === 'already-exists' &&
      error.message === 'Username is already taken.',
  );
  assert.equal(database.values.has('users/uid-2'), false);
});

test('changing a username releases the previous reservation', async () => {
  const database = createDatabase({
    'usernameIndex/oldname': 'uid-1',
    'users/uid-1': {
      ...validProfile,
      username: 'OldName',
    },
  });
  const profileCommand = createProfileCommand(database, TestHttpsError);

  await profileCommand('uid-1', {
    command: 'saveProfile',
    profile: { ...validProfile, username: 'NewName' },
  });

  assert.equal(database.values.has('usernameIndex/oldname'), false);
  assert.equal(database.values.get('usernameIndex/newname'), 'uid-1');
});

test('profile lookup returns only a complete profile owned by the signed-in UID', async () => {
  const database = createDatabase({
    'users/uid-1': validProfile,
    'users/uid-2': { email: 'legacy@example.com' },
  });
  const profileCommand = createProfileCommand(database, TestHttpsError);

  const currentUser = await profileCommand('uid-1', {
    command: 'getProfile',
  });
  const legacyUser = await profileCommand('uid-2', {
    command: 'getProfile',
  });
  assert.deepEqual(currentUser.profile, validProfile);
  assert.equal(legacyUser.profile, null);
});

test('dashboard initializes missing player data and returns only safe profile details', async () => {
  const database = createDatabase({
    'users/uid-1': {
      ...validProfile,
      updatedAt: 123,
    },
    'economy/uid-1': {
      gapes_balance: 250,
      inventory: { classic_frame: true },
    },
  });
  const profileCommand = createProfileCommand(database, TestHttpsError);

  const dashboard = await profileCommand('uid-1', {
    command: 'getDashboard',
  });

  assert.deepEqual(dashboard.profile, {
    username: 'LudoPlayer',
    updatedAt: 123,
  });
  assert.match(dashboard.playerId, /^LUDO-[A-F0-9]{16}$/);
  assert.equal(dashboard.gapesBalance, 250);
  assert.equal(dashboard.collectibles.ownedCosmetics, 1);
  assert.deepEqual(dashboard.collectibles.ownedItems, ['classic_frame']);
  assert.equal(dashboard.progression.level, 1);
  assert.equal(dashboard.preferences.statsPublic, false);
  assert.equal('recoveryEmail' in dashboard.profile, false);
  assert.equal(database.values.has('playerData/uid-1'), true);
});

test('updates usernames without returning private profile details from the dashboard', async () => {
  const database = createDatabase({
    'users/uid-1': validProfile,
    'usernameIndex/ludoplayer': 'uid-1',
  });
  const profileCommand = createProfileCommand(database, TestHttpsError);

  const result = await profileCommand('uid-1', {
    command: 'updateUsername',
    username: 'NewPlayer',
  });

  assert.equal(result.profile.username, 'NewPlayer');
  assert.equal(database.values.has('usernameIndex/ludoplayer'), false);
  assert.equal(database.values.get('usernameIndex/newplayer'), 'uid-1');
});

test('persists visibility preferences and rejects malformed settings', async () => {
  const database = createDatabase();
  const profileCommand = createProfileCommand(database, TestHttpsError);

  assert.deepEqual(
    await profileCommand('uid-1', {
      command: 'savePreferences',
      preferences: { statsPublic: true, onlineStatusVisible: false },
    }),
    { preferences: { statsPublic: true, onlineStatusVisible: false } },
  );
  await assert.rejects(
    profileCommand('uid-1', {
      command: 'savePreferences',
      preferences: { statsPublic: 'yes', onlineStatusVisible: false },
    }),
    error => error.code === 'invalid-argument',
  );
});

test('rejects account deletion without recent authentication', async () => {
  const database = createDatabase();
  const profileCommand = createProfileCommand(database, TestHttpsError, {
    now: () => 1_000_000,
    deleteAuthUser: async () => {},
  });

  await assert.rejects(
    profileCommand('uid-1', { command: 'deleteAccount' }, { authTime: 0 }),
    error =>
      error.code === 'failed-precondition' &&
      error.message === 'Sign in again before deleting your account.',
  );
});

test('deletes the authenticated account data and removes hosted/joined rooms', async () => {
  const database = createDatabase({
    'users/uid-1': validProfile,
    'usernameIndex/ludoplayer': 'uid-1',
    'playerData/uid-1': { stats: {} },
    'economy/uid-1': { gapes_balance: 100 },
    'rooms/hosted': {
      hostUid: 'uid-1',
      status: 'waiting',
      players: { 'uid-1': { uid: 'uid-1', playerNo: 1 } },
    },
    'rooms/joined': {
      hostUid: 'uid-2',
      status: 'waiting',
      players: {
        'uid-1': { uid: 'uid-1', playerNo: 2 },
        'uid-2': { uid: 'uid-2', playerNo: 1 },
      },
      joinRequests: { 'uid-1': { uid: 'uid-1' } },
    },
    'rooms/active': {
      hostUid: 'uid-2',
      status: 'playing',
      players: {
        'uid-1': { uid: 'uid-1', playerNo: 2 },
        'uid-2': { uid: 'uid-2', playerNo: 1 },
      },
      gameState: {
        activePlayers: [1, 2],
        chancePlayer: 2,
        isDiceRolled: true,
        touchDiceBlock: true,
        pileSelectionPlayer: 2,
        cellSelectionPlayer: 2,
      },
    },
    'rooms/requested': {
      hostUid: 'uid-3',
      status: 'waiting',
      players: { 'uid-3': { uid: 'uid-3', playerNo: 1 } },
      joinRequests: { 'uid-1': { uid: 'uid-1' } },
    },
  });
  const deletedUsers = [];
  const profileCommand = createProfileCommand(database, TestHttpsError, {
    now: () => 1_000_000,
    deleteAuthUser: async uid => deletedUsers.push(uid),
  });

  const result = await profileCommand(
    'uid-1',
    { command: 'deleteAccount' },
    { authTime: 999 },
  );

  assert.deepEqual(result, { deleted: true });
  assert.deepEqual(deletedUsers, ['uid-1']);
  for (const path of [
    'users/uid-1',
    'usernameIndex/ludoplayer',
    'playerData/uid-1',
    'economy/uid-1',
    'rooms/hosted',
  ]) {
    assert.equal(database.values.has(path), false, path);
  }
  const joinedRoom = database.values.get('rooms/joined');
  assert.equal(joinedRoom.players['uid-1'], undefined);
  assert.equal(joinedRoom.joinRequests['uid-1'], undefined);
  const activeRoom = database.values.get('rooms/active');
  assert.equal(activeRoom.players['uid-1'], undefined);
  assert.deepEqual(activeRoom.gameState.activePlayers, [1]);
  assert.equal(activeRoom.status, 'finished');
  const requestedRoom = database.values.get('rooms/requested');
  assert.equal(requestedRoom.joinRequests['uid-1'], undefined);
});
