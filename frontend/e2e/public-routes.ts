// E2E で巡回する公開経路 (認証不要)。csp-smoke.spec.ts と a11y.spec.ts で共有する。
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/pricing',
  '/help',
  '/faq',
  '/contact',
  '/specified-commercial-transactions',
  '/for/salon',
] as const;
