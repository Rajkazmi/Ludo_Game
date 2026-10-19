const { validateProfile } = require('./profileValidation');

function createProfileCommand(database, HttpsError) {
  return async (uid, data = {}) => {
    const command = data.command;

    if (command === 'getProfile') {
      const snapshot = await database.ref(`users/${uid}`).get();
      const profile = snapshot.val();
      return {
        profile:
          profile &&
          typeof profile.username === 'string' &&
          typeof profile.dateOfBirth === 'string' &&
          typeof profile.gender === 'string' &&
          typeof profile.recoveryEmail === 'string'
            ? profile
            : null,
      };
    }

    if (command === 'checkUsername' || command === 'saveProfile') {
      let profile;
      try {
        profile = validateProfile(data.profile);
      } catch (error) {
        throw new HttpsError('invalid-argument', error.message);
      }

      const usernameKey = profile.username.toLowerCase();
      const usernameRef = database.ref(`usernameIndex/${usernameKey}`);

      if (command === 'checkUsername') {
        const snapshot = await usernameRef.get();
        return { available: !snapshot.exists() || snapshot.val() === uid };
      }

      const reservation = await usernameRef.transaction(currentUid =>
        currentUid === null || currentUid === uid ? uid : undefined,
      );
      if (!reservation.committed) {
        throw new HttpsError('already-exists', 'Username is already taken.');
      }

      const userRef = database.ref(`users/${uid}`);
      const existingSnapshot = await userRef.get();
      const existingProfile = existingSnapshot.val();
      const savedProfile = { ...profile, updatedAt: Date.now() };

      await userRef.set(savedProfile);

      const oldUsername = existingProfile?.username?.toLowerCase();
      if (oldUsername && oldUsername !== usernameKey) {
        await database.ref(`usernameIndex/${oldUsername}`).transaction(
          currentUid => (currentUid === uid ? null : undefined),
        );
      }

      return { profile: savedProfile };
    }

    throw new HttpsError('invalid-argument', 'Unsupported profile command.');
  };
}

module.exports = { createProfileCommand };
