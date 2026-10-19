const assert = require('node:assert/strict');
const test = require('node:test');
const { validateProfile } = require('../profileValidation');

const validProfile = {
  username: 'Ludo_Player',
  dateOfBirth: '2000-01-31',
  gender: 'Prefer not to say',
  recoveryEmail: 'player@example.com',
};

test('profile validation trims and normalizes user input', () => {
  assert.deepEqual(
    validateProfile({
      ...validProfile,
      username: '  Ludo_Player  ',
      recoveryEmail: '  PLAYER@EXAMPLE.COM ',
    }),
    {
      ...validProfile,
      username: 'Ludo_Player',
      recoveryEmail: 'player@example.com',
    },
  );
});

test('profile validation rejects invalid usernames', () => {
  assert.throws(
    () => validateProfile({ ...validProfile, username: 'ab' }),
    /Username must be/,
  );
  assert.throws(
    () => validateProfile({ ...validProfile, username: 'player name' }),
    /Username must be/,
  );
});

test('profile validation rejects missing fields and invalid recovery email', () => {
  assert.throws(() => validateProfile(null), /Complete all profile fields/);
  assert.throws(
    () =>
      validateProfile({
        ...validProfile,
        recoveryEmail: 'not-an-email',
      }),
    /valid recovery email/,
  );
});

test('profile validation rejects invalid, future, or unsupported profile values', () => {
  assert.throws(
    () => validateProfile({ ...validProfile, dateOfBirth: '2023-02-29' }),
    /valid date of birth/,
  );
  assert.throws(
    () =>
      validateProfile(
        { ...validProfile, dateOfBirth: '2030-01-01' },
        new Date('2026-01-01T12:00:00.000Z'),
      ),
    /valid date of birth/,
  );
  assert.throws(
    () => validateProfile({ ...validProfile, gender: 'Unknown' }),
    /Select a gender/,
  );
});
