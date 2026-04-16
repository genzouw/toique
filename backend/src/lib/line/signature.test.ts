import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyLineSignature } from './signature.js';

describe('verifyLineSignature', () => {
  const secret = 'test-channel-secret';
  const body = '{"events":[]}';
  const validSignature = createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  it('returns true for a valid signature', () => {
    expect(verifyLineSignature(secret, body, validSignature)).toBe(true);
  });

  it('returns false for an invalid signature', () => {
    expect(verifyLineSignature(secret, body, 'wrong-signature')).toBe(false);
  });

  it('returns false when the body has been tampered with', () => {
    expect(verifyLineSignature(secret, '{"events":[1]}', validSignature)).toBe(
      false,
    );
  });

  it('returns false when the secret differs', () => {
    expect(verifyLineSignature('other-secret', body, validSignature)).toBe(
      false,
    );
  });
});
