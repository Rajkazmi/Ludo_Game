const GENDERS = new Set([
  'Female',
  'Male',
  'Non-binary',
  'Other',
  'Prefer not to say',
]);

function validateProfile(data, now = new Date()) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Complete all profile fields.');
  }

  const username =
    typeof data.username === 'string' ? data.username.trim() : '';
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    throw new Error(
      'Username must be 3-20 characters and use only letters, numbers, or underscores.',
    );
  }

  const dateOfBirth =
    typeof data.dateOfBirth === 'string' ? data.dateOfBirth : '';
  const parsedDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== dateOfBirth ||
    parsedDate > new Date(now.toISOString().slice(0, 10))
  ) {
    throw new Error('Enter a valid date of birth.');
  }

  if (!GENDERS.has(data.gender)) {
    throw new Error('Select a gender.');
  }

  const recoveryEmail =
    typeof data.recoveryEmail === 'string'
      ? data.recoveryEmail.trim().toLowerCase()
      : '';
  if (
    recoveryEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)
  ) {
    throw new Error('Enter a valid recovery email address.');
  }

  return { username, dateOfBirth, gender: data.gender, recoveryEmail };
}

module.exports = { validateProfile };
