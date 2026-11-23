const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_ROOM_OPERATIONS = 10;

function createRateLimiter({
  windowMs = RATE_LIMIT_WINDOW_MS,
  maxOperations = MAX_ROOM_OPERATIONS,
  now = Date.now,
} = {}) {
  const clients = new Map();

  return function checkRateLimit(uid) {
    if (!uid || typeof uid !== 'string') {
      return false;
    }

    const currentTime = now();
    const timestamps = clients.get(uid) ?? [];
    const validTimestamps = timestamps.filter(ts => currentTime - ts < windowMs);

    if (validTimestamps.length >= maxOperations) {
      return false;
    }

    validTimestamps.push(currentTime);
    clients.set(uid, validTimestamps);

    if (clients.size > 2000) {
      for (const [key, list] of clients.entries()) {
        const active = list.filter(ts => currentTime - ts < windowMs);
        if (active.length === 0) {
          clients.delete(key);
        } else {
          clients.set(key, active);
        }
      }
    }

    return true;
  };
}

module.exports = {
  createRateLimiter,
  MAX_ROOM_OPERATIONS,
  RATE_LIMIT_WINDOW_MS,
};
