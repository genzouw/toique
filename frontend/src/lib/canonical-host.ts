// Cloudflare Pages の既定ドメイン (toique.pages.dev) から正規ドメインへ移す。
//
// API は api.toique.genzouw.com で動き、セッション Cookie は SameSite=Lax で発行される
// (backend/src/auth/better-auth.ts)。toique.pages.dev と genzouw.com は別サイトのため、
// toique.pages.dev から API を呼んでもブラウザは Cookie を送らない。ログイン API 自体は
// 成功しても直後のセッション取得が未ログイン扱いになり、ログイン画面へ戻されてしまう。
//
// _redirects はホスト名を条件にしたリダイレクトに対応していないため、ここで振り分ける。
// プレビューデプロイ (<hash>.toique.pages.dev) は動作確認に使うので対象外とする。
const REDIRECT_HOSTS: Readonly<Record<string, string>> = {
  'toique.pages.dev': 'https://toique.genzouw.com',
};

/** 正規ドメインへ移すべき場合は移動先 URL を、そうでなければ null を返す。 */
export function resolveCanonicalUrl(location: {
  hostname: string;
  pathname: string;
  search: string;
  hash: string;
}): string | null {
  const origin = REDIRECT_HOSTS[location.hostname];
  if (!origin) return null;
  return `${origin}${location.pathname}${location.search}${location.hash}`;
}
