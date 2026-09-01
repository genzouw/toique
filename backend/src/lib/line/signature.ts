import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

export function verifyLineSignature(
  channelSecret: string,
  rawBody: string,
  signature: string,
): boolean {
  const expected = createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');

  const signatureHash = createHash('sha256').update(signature).digest();
  const expectedHash = createHash('sha256').update(expected).digest();

  return timingSafeEqual(signatureHash, expectedHash);
}
