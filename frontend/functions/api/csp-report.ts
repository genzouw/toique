// Cloudflare Pages Function: CSP 違反レポートの受信エンドポイント。
//
// 経緯: PR #226 で CSP を Report-Only から enforce に切り替えた際、connect-src の
// オリジン追加漏れで本番ログイン障害が発生した (PR #233 で復旧)。直接原因は
// Report-Only 期間中に違反が観測されていなかったこと。docs/csp-inventory.md で
// `report-uri` / `report-to` は当面省略する方針だったが、Issue #234 でこの観測経路の
// 弱さを解消するため Cloudflare Pages 同一オリジンで CSP レポートを受け付ける。
//
// バックエンド Cloud Run ではなく Pages Functions に置く理由は、Cloud Run URL が
// 動的で CSP の report-* ディレクティブで安定して指せないため (docs/csp-inventory.md
// で当初省略理由として挙げられていた点)。

const MAX_BODY_BYTES = 8 * 1024;

const ACCEPTED_CONTENT_TYPES = [
  'application/csp-report', // 旧仕様 (report-uri)
  'application/reports+json', // 新仕様 (report-to / Reporting API)
  'application/json', // 一部実装が JSON でフォールバック送信する
];

type CspReportEnv = Record<string, unknown>;

type PagesFunctionContext = {
  request: Request;
  env: CspReportEnv;
};

export const onRequestPost = async (
  context: PagesFunctionContext,
): Promise<Response> => {
  const { request } = context;
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
  // `application/json; charset=utf-8` のようにパラメータが付くため、メディアタイプ部分のみを取り出し、
  // `application/json-patch+json` 等への誤マッチを避けるため完全一致で比較する。
  const mediaType = contentType.split(';')[0].trim();
  const accepted = ACCEPTED_CONTENT_TYPES.includes(mediaType);
  if (!accepted) {
    return new Response(null, { status: 415 });
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (body.length > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  // body はオブジェクトとして格納し、ログ上でフィールド単位の検索を可能にする。
  // パース失敗時は文字列のままフォールバックし、不正な JSON でも観測経路を断たない。
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    parsedBody = body;
  }

  // 構造化ログとして 1 行 JSON で出力する。Cloudflare のログ閲覧 (Dashboard / Logpush)
  // で grep しやすいよう type フィールドを固定値にしている。
  // 永続化 (KV / D1 / R2) はまずは導入せず、必要になった段階で Logpush 経由で集約する。
  const logEntry = {
    type: 'csp-report',
    receivedAt: new Date().toISOString(),
    contentType,
    userAgent: request.headers.get('user-agent') ?? '',
    referer: request.headers.get('referer') ?? '',
    body: parsedBody,
  };

  console.info(JSON.stringify(logEntry));

  // ブラウザの Reporting API は 204 を期待する。
  return new Response(null, { status: 204 });
};

// CSP レポート受信は POST のみ。Pages Functions は onRequestPost を優先的にルーティングするため、
// この onRequest には POST 以外のメソッドのみが到達する。
export const onRequest = async (): Promise<Response> => {
  return new Response(null, {
    status: 405,
    headers: { Allow: 'POST' },
  });
};
