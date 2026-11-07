const { createHash, randomUUID } = require('node:crypto');

const REGEN_INTERVAL_MS = 12 * 60 * 60 * 1000;
const REGEN_AMOUNT = 20;
const MATCH_FEE = 15;
const LOGIN_REWARDS = [50, 100, 150, 200, 250, 300, 500];
const LOGIN_STREAK_RESET_MS = 48 * 60 * 60 * 1000;
const CATALOG = [
  { id: 'classic_frame', name: 'Classic Frame', price: 250 },
  { id: 'golden_dice', name: 'Golden Dice', price: 500 },
  { id: 'royal_theme', name: 'Royal Theme', price: 1000 },
];
const PLAY_PRODUCTS = {
  gapes_099: 1000,
  gapes_499: 10000,
};

function createInitialEconomy(uid, now) {
  return {
    user_id: uid,
    gapes_balance: 100,
    last_auto_regen_time: now,
    last_login_claim_time: null,
    last_login_reward_day: 0,
    login_streak_count: 0,
    inventory: {},
    transactions: {},
  };
}

function normalizeEconomy(uid, value, now) {
  const economy = value ?? createInitialEconomy(uid, now);
  return {
    ...economy,
    user_id: uid,
    gapes_balance:
      Number.isSafeInteger(economy.gapes_balance) && economy.gapes_balance >= 0
        ? economy.gapes_balance
        : 100,
    last_auto_regen_time:
      Number.isFinite(economy.last_auto_regen_time)
        ? economy.last_auto_regen_time
        : now,
    last_login_claim_time:
      Number.isFinite(economy.last_login_claim_time)
        ? economy.last_login_claim_time
        : null,
    last_login_reward_day:
      Number.isInteger(economy.last_login_reward_day)
        ? economy.last_login_reward_day
        : 0,
    login_streak_count:
      Number.isInteger(economy.login_streak_count) &&
      economy.login_streak_count >= 0 &&
      economy.login_streak_count < LOGIN_REWARDS.length
        ? economy.login_streak_count
        : 0,
    inventory: economy.inventory ?? {},
    transactions: economy.transactions ?? {},
  };
}

function applyAutoRegen(economy, uid, now, createTransactionId) {
  const elapsed = Math.max(0, now - economy.last_auto_regen_time);
  const cycles = Math.floor(elapsed / REGEN_INTERVAL_MS);
  if (cycles === 0) {
    return economy;
  }

  const amount = cycles * REGEN_AMOUNT;
  const transactionId = createTransactionId();
  const nextRegenTime =
    economy.last_auto_regen_time + cycles * REGEN_INTERVAL_MS;
  return {
    ...economy,
    gapes_balance: economy.gapes_balance + amount,
    last_auto_regen_time: nextRegenTime,
    transactions: {
      ...economy.transactions,
      [transactionId]: {
        transaction_id: transactionId,
        user_id: uid,
        amount,
        reason: 'AUTO_REGEN',
        created_at: now,
      },
    },
  };
}

function publicEconomy(economy, now) {
  const today = new Date(now).toISOString().slice(0, 10);
  const streakExpired =
    economy.last_login_claim_time !== null &&
    now - economy.last_login_claim_time > LOGIN_STREAK_RESET_MS;
  const nextStreakCount = streakExpired ? 0 : economy.login_streak_count;
  return {
    gapes_balance: economy.gapes_balance,
    last_auto_regen_time: economy.last_auto_regen_time,
    last_login_claim_time: economy.last_login_claim_time,
    last_login_reward_day: economy.last_login_reward_day,
    login_streak_count: economy.login_streak_count,
    next_login_reward_day: nextStreakCount + 1,
    claimed_today:
      economy.last_login_claim_time !== null &&
      new Date(economy.last_login_claim_time).toISOString().slice(0, 10) === today,
    inventory: economy.inventory,
    login_rewards: LOGIN_REWARDS,
    catalog: CATALOG,
    purchase_packages: [
      { product_id: 'gapes_099', price: '$0.99', gapes: PLAY_PRODUCTS.gapes_099 },
      { product_id: 'gapes_499', price: '$4.99', gapes: PLAY_PRODUCTS.gapes_499 },
    ],
  };
}

function createEconomyCommand(database, HttpsError, options = {}) {
  const now = options.now ?? Date.now;
  const createTransactionId = options.createTransactionId ?? randomUUID;
  const verifyPlayPurchase = options.verifyPlayPurchase;

  async function updateEconomy(uid, update) {
    let failure;
    const result = await database.ref(`economy/${uid}`).transaction(current => {
      failure = null;
      const currentTime = now();
      const economy = applyAutoRegen(
        normalizeEconomy(uid, current, currentTime),
        uid,
        currentTime,
        createTransactionId,
      );
      return update(economy, currentTime, reason => {
        failure = reason;
        return undefined;
      });
    });

    if (!result.committed && failure) {
      return { committed: false, value: result.snapshot.val(), failure };
    }
    if (!result.committed) {
      throw new HttpsError('aborted', 'Economy state changed. Please try again.');
    }
    return { committed: true, value: result.snapshot.val() };
  }

  async function handlePurchase(uid, data) {
    if (typeof verifyPlayPurchase !== 'function') {
      throw new HttpsError(
        'failed-precondition',
        'Google Play purchase verification is not configured.',
      );
    }

    const { product_id: productId, purchase_token: purchaseToken } = data;
    if (
      typeof productId !== 'string' ||
      !Object.prototype.hasOwnProperty.call(PLAY_PRODUCTS, productId) ||
      typeof purchaseToken !== 'string' ||
      purchaseToken.length < 16
    ) {
      throw new HttpsError('invalid-argument', 'Invalid Google Play purchase.');
    }
    const amount = PLAY_PRODUCTS[productId];

    const purchase = await verifyPlayPurchase(productId, purchaseToken);
    if (!purchase || purchase.purchaseState !== 0) {
      throw new HttpsError('permission-denied', 'Google Play purchase is not completed.');
    }

    const tokenHash = createHash('sha256').update(purchaseToken).digest('hex');
    const binding = await database.ref(`purchaseTokens/${tokenHash}`).transaction(
      currentUid => currentUid === null || currentUid === uid ? uid : undefined,
    );
    if (!binding.committed) {
      throw new HttpsError(
        'already-exists',
        'This Google Play purchase has already been used.',
      );
    }

    const transactionId = `purchase_${tokenHash}`;
    let credited = false;
    const result = await updateEconomy(uid, economy => {
      credited = false;
      if (economy.transactions[transactionId]) {
        return economy;
      }
      credited = true;
      return {
        ...economy,
        gapes_balance: economy.gapes_balance + amount,
        transactions: {
          ...economy.transactions,
          [transactionId]: {
            transaction_id: transactionId,
            user_id: uid,
            amount,
            reason: 'PURCHASE',
            product_id: productId,
            created_at: now(),
          },
        },
      };
    });

    return {
      gapes_balance: result.value.gapes_balance,
      credited,
    };
  }

  return async (uid, data = {}) => {
    if (data.command === 'purchasePackage') {
      return handlePurchase(uid, data);
    }

    if (data.command === 'getEconomy') {
      const result = await updateEconomy(uid, economy => economy);
      return publicEconomy(result.value, now());
    }

    if (data.command === 'claimDailyReward') {
      const transactionId = createTransactionId();
      const result = await updateEconomy(uid, (economy, currentTime, reject) => {
        const today = new Date(currentTime).toISOString().slice(0, 10);
        const claimedDate = economy.last_login_claim_time === null
          ? null
          : new Date(economy.last_login_claim_time).toISOString().slice(0, 10);
        if (claimedDate === today) {
          return reject('ALREADY_CLAIMED_TODAY');
        }

        const isStreakExpired =
          economy.last_login_claim_time !== null &&
          currentTime - economy.last_login_claim_time > LOGIN_STREAK_RESET_MS;
        const streakIndex = isStreakExpired ? 0 : economy.login_streak_count;
        const rewardDay = streakIndex + 1;
        const amount = LOGIN_REWARDS[streakIndex];
        return {
          ...economy,
          gapes_balance: economy.gapes_balance + amount,
          last_login_claim_time: currentTime,
          last_login_reward_day: rewardDay,
          login_streak_count: rewardDay % LOGIN_REWARDS.length,
          transactions: {
            ...economy.transactions,
            [transactionId]: {
              transaction_id: transactionId,
              user_id: uid,
              amount,
              reason: 'DAILY_LOGIN',
              created_at: currentTime,
            },
          },
        };
      });

      if (!result.committed) {
        if (result.failure === 'ALREADY_CLAIMED_TODAY') {
          throw new HttpsError('already-exists', 'ALREADY_CLAIMED_TODAY');
        }
        throw new HttpsError('aborted', 'Unable to claim the daily reward.');
      }
      return {
        ...publicEconomy(result.value, now()),
        reward: LOGIN_REWARDS[result.value.last_login_reward_day - 1],
      };
    }

    if (data.command === 'chargeMatchFee') {
      if (
        typeof data.game_mode_id !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(data.game_mode_id)
      ) {
        throw new HttpsError('invalid-argument', 'Invalid game mode identifier.');
      }
      const transactionId = `match_${data.game_mode_id}`;
      const result = await updateEconomy(uid, (economy, currentTime, reject) => {
        if (economy.transactions[transactionId]) {
          return economy;
        }
        if (economy.gapes_balance < MATCH_FEE) {
          return reject('INSUFFICIENT_GAPES');
        }
        return {
          ...economy,
          gapes_balance: economy.gapes_balance - MATCH_FEE,
          transactions: {
            ...economy.transactions,
            [transactionId]: {
              transaction_id: transactionId,
              user_id: uid,
              amount: -MATCH_FEE,
              reason: 'MATCH_FEE',
              game_mode_id: data.game_mode_id,
              created_at: currentTime,
            },
          },
        };
      });
      if (!result.committed && result.failure === 'INSUFFICIENT_GAPES') {
        return {
          allowed: false,
          error: 'INSUFFICIENT_GAPES',
          current_balance: result.value?.gapes_balance ?? 100,
        };
      }
      return {
        allowed: true,
        current_balance: result.value.gapes_balance,
      };
    }

    if (data.command === 'redeemItem') {
      const item = CATALOG.find(entry => entry.id === data.item_id);
      if (!item) {
        throw new HttpsError('invalid-argument', 'Unknown Gapes reward.');
      }
      const transactionId = createTransactionId();
      const result = await updateEconomy(uid, (economy, currentTime, reject) => {
        if (economy.inventory[item.id]) {
          return reject('ALREADY_OWNED');
        }
        if (economy.gapes_balance < item.price) {
          return reject('INSUFFICIENT_GAPES');
        }
        return {
          ...economy,
          gapes_balance: economy.gapes_balance - item.price,
          inventory: { ...economy.inventory, [item.id]: true },
          transactions: {
            ...economy.transactions,
            [transactionId]: {
              transaction_id: transactionId,
              user_id: uid,
              amount: -item.price,
              reason: 'REDEMPTION',
              item_id: item.id,
              created_at: currentTime,
            },
          },
        };
      });
      if (!result.committed) {
        throw new HttpsError(
          result.failure === 'INSUFFICIENT_GAPES'
            ? 'failed-precondition'
            : 'already-exists',
          result.failure,
        );
      }
      return publicEconomy(result.value, now());
    }

    throw new HttpsError('invalid-argument', 'Unsupported economy command.');
  };
}

module.exports = {
  CATALOG,
  LOGIN_REWARDS,
  MATCH_FEE,
  PLAY_PRODUCTS,
  REGEN_AMOUNT,
  REGEN_INTERVAL_MS,
  createEconomyCommand,
};
