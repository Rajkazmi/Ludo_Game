import { Buffer } from 'buffer';
import { getAppCheckTokenExpiryMillis } from '../Src/config/appCheckToken';

const createToken = claims =>
  [
    Buffer.from('{}').toString('base64url'),
    Buffer.from(JSON.stringify(claims)).toString('base64url'),
    'signature',
  ].join('.');

describe('getAppCheckTokenExpiryMillis', () => {
  it('returns the token expiry as milliseconds', () => {
    expect(getAppCheckTokenExpiryMillis(createToken({ exp: 1735689600 }))).toBe(
      1735689600000,
    );
  });

  it.each([
    ['not-a-jwt', 'malformed token'],
    [createToken({}), 'without a valid expiry'],
    ['header.%%%invalid%%%.signature', 'unreadable token payload'],
  ])('rejects tokens %s', (token, message) => {
    expect(() => getAppCheckTokenExpiryMillis(token)).toThrow(message);
  });
});
