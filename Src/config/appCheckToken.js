import { Buffer } from 'buffer';

export function getAppCheckTokenExpiryMillis(token) {
  const segments = token.split('.');
  if (segments.length !== 3 || segments.some(segment => segment.length === 0)) {
    throw new Error('Firebase App Check returned a malformed token.');
  }

  let claims;
  try {
    const payload = segments[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    claims = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    throw new Error('Firebase App Check returned an unreadable token payload.');
  }

  if (
    typeof claims?.exp !== 'number' ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= 0
  ) {
    throw new Error('Firebase App Check returned a token without a valid expiry.');
  }

  return claims.exp * 1000;
}
