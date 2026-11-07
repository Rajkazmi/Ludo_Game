const assert = require('node:assert/strict');
const test = require('node:test');
const { createEconomyCommand } = require('../economy');

class TestHttpsError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function createDatabase(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    values,
    ref(path) {
      return {
        async transaction(update) {
          const current = values.get(path) ?? null;
          const next = update(current);
          if (next === undefined) {
            return {
              committed: false,
              snapshot: { val: () => current },
            };
          }
          values.set(path, next);
          return {
            committed: true,
            snapshot: { val: () => next },
          };
        },
      };
    },
  };
}

function createService(database, options = {}) {
  let time = options.now ?? Date.UTC(2026, 0, 1);
  let transactionNumber = 0;
  const command = createEconomyCommand(database, TestHttpsError, {
    now: () => time,
    createTransactionId: () => `transaction-${++transactionNumber}`,
    verifyPlayPurchase: options.verifyPlayPurchase,
  });
  return {
    command,
    setTime(value) {
      time = value;
    },
  };
}

test('initializes a 100-Gapes balance and applies full 12-hour regeneration cycles', async () => {
  const database = createDatabase();
  const service = createService(database);

  const initial = await service.command('uid-1', { command: 'getEconomy' });
  assert.equal(initial.gapes_balance, 100);
  assert.equal(database.values.get('economy/uid-1').user_id, 'uid-1');

  service.setTime(Date.UTC(2026, 0, 2, 1));
  const regenerated = await service.command('uid-1', { command: 'getEconomy' });
  assert.equal(regenerated.gapes_balance, 140);
  assert.equal(
    regenerated.last_auto_regen_time,
    Date.UTC(2026, 0, 2, 0),
  );
  assert.equal(
    Object.values(database.values.get('economy/uid-1').transactions)[0].reason,
    'AUTO_REGEN',
  );
  assert.equal(
    Object.values(database.values.get('economy/uid-1').transactions)[0].user_id,
    'uid-1',
  );
});

test('claims the seven daily rewards once per UTC day and resets after 48 hours', async () => {
  const database = createDatabase();
  const service = createService(database);

  const dayOne = await service.command('uid-1', {
    command: 'claimDailyReward',
  });
  assert.equal(dayOne.reward, 50);
  assert.equal(dayOne.gapes_balance, 150);
  await assert.rejects(
    service.command('uid-1', { command: 'claimDailyReward' }),
    error => error.code === 'already-exists' &&
      error.message === 'ALREADY_CLAIMED_TODAY',
  );

  service.setTime(Date.UTC(2026, 0, 2));
  const dayTwo = await service.command('uid-1', {
    command: 'claimDailyReward',
  });
  assert.equal(dayTwo.reward, 100);
  assert.equal(dayTwo.login_streak_count, 2);

  service.setTime(Date.UTC(2026, 0, 5));
  const reset = await service.command('uid-1', {
    command: 'claimDailyReward',
  });
  assert.equal(reset.reward, 50);
  assert.equal(reset.login_streak_count, 1);
});

test('rolls the seventh daily reward back to the first reward', async () => {
  const database = createDatabase();
  const service = createService(database);
  const expectedRewards = [50, 100, 150, 200, 250, 300, 500];

  for (const [index, reward] of expectedRewards.entries()) {
    service.setTime(Date.UTC(2026, 0, 1 + index));
    const result = await service.command('uid-1', {
      command: 'claimDailyReward',
    });
    assert.equal(result.reward, reward);
  }

  const weekEnd = database.values.get('economy/uid-1');
  assert.equal(weekEnd.login_streak_count, 0);
  assert.equal(weekEnd.last_login_reward_day, 7);
  service.setTime(Date.UTC(2026, 0, 8));
  const nextWeek = await service.command('uid-1', {
    command: 'claimDailyReward',
  });
  assert.equal(nextWeek.reward, 50);
  assert.equal(nextWeek.login_streak_count, 1);
});

test('charges match fees idempotently and reports insufficient balance', async () => {
  const database = createDatabase();
  const service = createService(database);

  const firstCharge = await service.command('uid-1', {
    command: 'chargeMatchFee',
    game_mode_id: 'room-1',
  });
  const retryCharge = await service.command('uid-1', {
    command: 'chargeMatchFee',
    game_mode_id: 'room-1',
  });
  assert.deepEqual(firstCharge, { allowed: true, current_balance: 85 });
  assert.deepEqual(retryCharge, firstCharge);
  const feeTransaction = Object.values(
    database.values.get('economy/uid-1').transactions,
  ).find(entry => entry.reason === 'MATCH_FEE');
  assert.equal(feeTransaction.user_id, 'uid-1');
  assert.equal(feeTransaction.amount, -15);

  database.values.set('economy/uid-2', {
    gapes_balance: 10,
    last_auto_regen_time: Date.UTC(2026, 0, 1),
  });
  const denied = await service.command('uid-2', {
    command: 'chargeMatchFee',
    game_mode_id: 'room-2',
  });
  assert.deepEqual(denied, {
    allowed: false,
    error: 'INSUFFICIENT_GAPES',
    current_balance: 10,
  });
});

test('redeems a catalog item once and records the balance transaction', async () => {
  const database = createDatabase({
    'economy/uid-1': {
      gapes_balance: 500,
      last_auto_regen_time: Date.UTC(2026, 0, 1),
      inventory: {},
      transactions: {},
    },
  });
  const service = createService(database);

  const result = await service.command('uid-1', {
    command: 'redeemItem',
    item_id: 'classic_frame',
  });
  assert.equal(result.gapes_balance, 250);
  assert.equal(result.inventory.classic_frame, true);
  await assert.rejects(
    service.command('uid-1', {
      command: 'redeemItem',
      item_id: 'classic_frame',
    }),
    error => error.code === 'already-exists' && error.message === 'ALREADY_OWNED',
  );
});

test('credits verified Play purchases once', async () => {
  const database = createDatabase();
  const verifyPlayPurchase = async () => ({ purchaseState: 0 });
  const service = createService(database, {
    verifyPlayPurchase,
  });
  await service.command('uid-1', { command: 'getEconomy' });

  const purchase = {
    command: 'purchasePackage',
    product_id: 'gapes_099',
    purchase_token: 'a-valid-google-play-purchase-token',
  };
  const result = await service.command('uid-1', purchase);
  assert.equal(result.gapes_balance, 1100);
  assert.equal(result.credited, true);
  const retry = await service.command('uid-1', purchase);
  assert.equal(retry.gapes_balance, 1100);
  assert.equal(retry.credited, false);
  assert.equal(
    Object.values(database.values.get('economy/uid-1').transactions).filter(
      entry => entry.reason === 'PURCHASE',
    ).length,
    1,
  );
});

test('rejects unverified and unsupported Play purchases', async () => {
  const database = createDatabase();
  const service = createService(database, {
    verifyPlayPurchase: async () => ({ purchaseState: 1 }),
  });

  await assert.rejects(
    service.command('uid-1', {
      command: 'purchasePackage',
      product_id: 'gapes_099',
      purchase_token: 'a-valid-google-play-purchase-token',
    }),
    error => error.code === 'permission-denied',
  );
  await assert.rejects(
    service.command('uid-1', {
      command: 'purchasePackage',
      product_id: 'unknown_package',
      purchase_token: 'a-valid-google-play-purchase-token',
    }),
    error => error.code === 'invalid-argument',
  );
  assert.equal(database.values.has('economy/uid-1'), false);
});
