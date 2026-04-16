import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyLineSignature(
  channelSecret: string,
  rawBody: string,
  signature: string,
): boolean {
  const expected = createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
