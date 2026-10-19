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
          return {
            exists: () => value !== undefined && value !== null,
            val: () => value ?? null,
          };
        },
        async set(value) {
          values.set(path, value);
        },
        async transaction(update) {
          const current = values.get(path) ?? null;
          const next = update(current);
          if (next === undefined) {
            return { committed: false };
          }
          if (next === null) {
            values.delete(path);
          } else {
            values.set(path, next);
          }
          return { committed: true };
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
