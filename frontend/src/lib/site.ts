// VITE_SITE_ORIGIN の真実の源は .env(.local)。
// フォールバック値は vite.config.ts と一致させること。
export const SITE_ORIGIN = (
  import.meta.env.VITE_SITE_ORIGIN ?? 'https://example.com'
).replace(/\/$/, '');
