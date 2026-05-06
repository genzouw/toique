import type { secureHeaders } from 'hono/secure-headers';

type SecureHeadersOptions = Parameters<typeof secureHeaders>[0];

// API は JSON のみを返すため、保守的な CSP を適用する。
// ブラウザに HTML を返す経路がないため default-src 'none' で十分。
// HTML 配信側 (Cloudflare Pages) の CSP は frontend/public/_headers を参照。
export const securityHeadersConfig: SecureHeadersOptions = {
  crossOriginResourcePolicy: 'cross-origin',
  // CSP frame-ancestors を解釈しない古いブラウザ向けの defense-in-depth
  xFrameOptions: 'DENY',
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'none'"],
  },
};
