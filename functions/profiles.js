const { validateProfile } = require('./profileValidation');
const {
  ensurePlayerData,
  getLevel,
  getPlayerId,
  getUnlockedTitles,
  removeUserFromRooms,
  updatePlayerData,
} = require('./playerData');

function createProfileCommand(
  database,
  HttpsError,
  { deleteAuthUser, now = Date.now } = {},
) {
  return async (uid, data = {}, context = {}) => {
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

    if (command === 'getDashboard') {
      const profileSnapshot = await database.ref(`users/${uid}`).get();
      const savedProfile = profileSnapshot.val();
      const playerData = await ensurePlayerData(database, uid);
      const economySnapshot = await database.ref(`economy/${uid}`).get();
      const economy = economySnapshot.val();
      const titles = getUnlockedTitles(playerData.stats);
      const xp = playerData.progression.xp;
      const xpProgress = xp % 2000;
      const inventory = economy?.inventory ?? {};

      return {
        profile:
          savedProfile &&
          typeof savedProfile.username === 'string' &&
          typeof savedProfile.dateOfBirth === 'string' &&
          typeof savedProfile.gender === 'string' &&
          typeof savedProfile.recoveryEmail === 'string'
            ? {
                username: savedProfile.username,
                updatedAt: savedProfile.updatedAt ?? null,
              }
            : null,
        playerId: getPlayerId(uid),
        stats: playerData.stats,
        progression: {
          xp,
          level: getLevel(xp),
          currentLevelXp: xpProgress,
          xpToNextLevel: 2000,
          vipTier: 'None',
        },
        customization: playerData.customization,
        unlockedTitles: titles,
        preferences: playerData.preferences,
        gapesBalance: economy?.gapes_balance ?? null,
        collectibles: {
          ownedCosmetics: Object.values(inventory).filter(Boolean).length,
          ownedItems: Object.entries(inventory)
            .filter(([, owned]) => Boolean(owned))
            .map(([itemId]) => itemId),
          diceSkins: null,
          boardThemes: null,
          pawnSkins: null,
        },
        social: {
          friendsCount: null,
          clan: null,
        },
      };
    }

    if (command === 'updateUsername') {
      const existingSnapshot = await database.ref(`users/${uid}`).get();
      const existingProfile = existingSnapshot.val();
      if (!existingProfile) {
        throw new HttpsError('not-found', 'Create your profile first.');
      }

      let profile;
      try {
        profile = validateProfile({
          ...existingProfile,
          username: data.username,
        });
      } catch (error) {
        throw new HttpsError('invalid-argument', error.message);
      }
      return saveProfile(database, uid, profile, existingProfile, HttpsError);
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

      const userRef = database.ref(`users/${uid}`);
      const existingSnapshot = await userRef.get();
      return saveProfile(
        database,
        uid,
        profile,
        existingSnapshot.val(),
        HttpsError,
      );
    }

    if (command === 'saveCustomization') {
      const { avatar, frame, title } = data.customization ?? {};
      if (!['provider', 'default'].includes(avatar)) {
        throw new HttpsError('invalid-argument', 'Choose a supported avatar.');
      }
      if (!['default', 'classic'].includes(frame)) {
        throw new HttpsError('invalid-argument', 'Choose a supported avatar frame.');
      }
      if (typeof title !== 'string' || title.length > 32) {
        throw new HttpsError('invalid-argument', 'Choose a valid player title.');
      }

      const playerData = await ensurePlayerData(database, uid);
      const availableTitles = getUnlockedTitles(playerData.stats);
      if (!availableTitles.includes(title)) {
        throw new HttpsError('permission-denied', 'That title is not unlocked.');
      }
      if (frame === 'classic') {
        const economySnapshot = await database.ref(`economy/${uid}`).get();
        if (!economySnapshot.val()?.inventory?.classic_frame) {
          throw new HttpsError(
            'permission-denied',
            'Redeem the Classic Frame before equipping it.',
          );
        }
      }

      const updated = await updatePlayerData(database, uid, dataToSave => {
        dataToSave.customization = { avatar, frame, title };
        return dataToSave;
      });
      return { customization: updated.customization };
    }

    if (command === 'savePreferences') {
      const { statsPublic, onlineStatusVisible } = data.preferences ?? {};
      if (
        typeof statsPublic !== 'boolean' ||
        typeof onlineStatusVisible !== 'boolean'
      ) {
        throw new HttpsError(
          'invalid-argument',
          'Choose valid profile visibility settings.',
        );
      }
      const updated = await updatePlayerData(database, uid, playerData => {
        playerData.preferences = { statsPublic, onlineStatusVisible };
        return playerData;
      });
      return { preferences: updated.preferences };
    }

    if (command === 'deleteAccount') {
      const authTime = context.authTime;
      if (
        !Number.isInteger(authTime) ||
        now() / 1000 - authTime > 5 * 60 ||
        authTime > now() / 1000
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Sign in again before deleting your account.',
        );
      }
      if (typeof deleteAuthUser !== 'function') {
        throw new HttpsError(
          'failed-precondition',
          'Account deletion is not configured.',
        );
      }

      const profileSnapshot = await database.ref(`users/${uid}`).get();
      const existingProfile = profileSnapshot.val();
      await removeUserFromRooms(database, uid);
      const username = existingProfile?.username?.toLowerCase();
      if (username) {
        await database.ref(`usernameIndex/${username}`).transaction(
          currentUid => (currentUid === uid ? null : undefined),
        );
      }
      await Promise.all([
        database.ref(`users/${uid}`).remove(),
        database.ref(`playerData/${uid}`).remove(),
        database.ref(`economy/${uid}`).remove(),
      ]);
      await deleteAuthUser(uid);
      return { deleted: true };
    }

    throw new HttpsError('invalid-argument', 'Unsupported profile command.');
  };
}

async function saveProfile(database, uid, profile, existingProfile, HttpsError) {
  const usernameKey = profile.username.toLowerCase();
  const usernameRef = database.ref(`usernameIndex/${usernameKey}`);
  const reservation = await usernameRef.transaction(currentUid =>
    currentUid === null || currentUid === uid ? uid : undefined,
  );
  if (!reservation.committed) {
    throw new HttpsError('already-exists', 'Username is already taken.');
  }

  const savedProfile = { ...profile, updatedAt: Date.now() };
  await database.ref(`users/${uid}`).set(savedProfile);

  const oldUsername = existingProfile?.username?.toLowerCase();
  if (oldUsername && oldUsername !== usernameKey) {
    await database.ref(`usernameIndex/${oldUsername}`).transaction(
      currentUid => (currentUid === uid ? null : undefined),
    );
  }
  return { profile: savedProfile };
}

module.exports = { createProfileCommand };
