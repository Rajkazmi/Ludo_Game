const assert = require('node:assert/strict');
const test = require('node:test');
const { createRateLimiter } = require('../rateLimit');

test('allows operations within the configured window limit', () => {
  let currentTime = 1000;
  const limiter = createRateLimiter({
    windowMs: 60000,
    maxOperations: 3,
    now: () => currentTime,
  });

  assert.equal(limiter('user-1'), true);
  assert.equal(limiter('user-1'), true);
  assert.equal(limiter('user-1'), true);
  assert.equal(limiter('user-1'), false);
});

test('tracks different users independently', () => {
  let currentTime = 1000;
  const limiter = createRateLimiter({
    windowMs: 60000,
    maxOperations: 2,
    now: () => currentTime,
  });

  assert.equal(limiter('user-1'), true);
  assert.equal(limiter('user-1'), true);
  assert.equal(limiter('user-1'), false);

  assert.equal(limiter('user-2'), true);
  assert.equal(limiter('user-2'), true);
  assert.equal(limiter('user-2'), false);
});

test('resets after the window period expires', () => {
  let currentTime = 1000;
  const limiter = createRateLimiter({
    windowMs: 10000,
    maxOperations: 2,
    now: () => currentTime,
  });

  assert.equal(limiter('user-1'), true);
  assert.equal(limiter('user-1'), true);
  assert.equal(limiter('user-1'), false);

  currentTime += 10001;
  assert.equal(limiter('user-1'), true);
});

test('rejects invalid or missing uids safely', () => {
  const limiter = createRateLimiter();
  assert.equal(limiter(null), false);
  assert.equal(limiter(''), false);
  assert.equal(limiter(123), false);
});
