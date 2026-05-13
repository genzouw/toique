// Cloudflare Pages にデプロイする dist/_headers の CSP プレースホルダを、
// 実行時の VITE_API_URL のオリジンで置換する post-build スクリプト。
//
// 経緯: PR #233 (Issue #235) で _headers の connect-src にバックエンド Cloud Run URL を
// ハードコードしていた。GCP プロジェクト移管・サービス名変更・リージョン移転で乖離する
// リスクがあるため、deploy.yml が既に動的注入している VITE_API_URL を CSP 側でも参照する。
//
// 動作:
//   - VITE_API_URL が設定されていれば new URL().origin で抽出して置換
//   - 未設定 (例: CI test build / ローカルビルド) は http://localhost:3000 にフォールバック
//     (frontend/src/lib/api-base-url.ts の DEFAULT_API_URL と一致)
//   - 不正な URL / プレースホルダ未検出は exit 1

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLACEHOLDER = '__VITE_API_ORIGIN__';
const DEV_FALLBACK_ORIGIN = 'http://localhost:3000';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_PATH = resolve(__dirname, '..', 'dist', '_headers');

function resolveApiOrigin(rawUrl) {
  if (!rawUrl || !rawUrl.trim()) {
    console.warn(
      `[inject-csp-api-origin] VITE_API_URL is not set, using fallback ${DEV_FALLBACK_ORIGIN}`,
    );
    return DEV_FALLBACK_ORIGIN;
  }
  try {
    return new URL(rawUrl).origin;
  } catch {
    console.error(
      `[inject-csp-api-origin] VITE_API_URL is not a valid URL: ${rawUrl}`,
    );
    process.exit(1);
  }
}

async function main() {
  const origin = resolveApiOrigin(process.env.VITE_API_URL);

  let content;
  try {
    content = await readFile(TARGET_PATH, 'utf8');
  } catch (error) {
    console.error(
      `[inject-csp-api-origin] Failed to read ${TARGET_PATH}: ${error.message}`,
    );
    process.exit(1);
  }

  if (!content.includes(PLACEHOLDER)) {
    console.error(
      `[inject-csp-api-origin] Placeholder ${PLACEHOLDER} not found in ${TARGET_PATH}. ` +
        `frontend/public/_headers をテンプレ化したまま運用してください。`,
    );
    process.exit(1);
  }

  const replaced = content.replaceAll(PLACEHOLDER, origin);
  await writeFile(TARGET_PATH, replaced, 'utf8');
  console.log(
    `[inject-csp-api-origin] Replaced ${PLACEHOLDER} -> ${origin} in ${TARGET_PATH}`,
  );
}

await main();
