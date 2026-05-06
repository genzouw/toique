import { safeJsonLdStringify } from '../lib/json-ld';

/**
 * 構造化データ (JSON-LD) を <script type="application/ld+json"> として
 * 安全に出力するコンポーネント。
 *
 * React 19 の <script> 自動 hoist の対象は src + async={true} のスクリプトに
 * 限られるため、インライン JSON-LD は body 内にレンダリングされる。
 * Google などの主要クローラーは body 内 JSON-LD も認識するため SEO 上の問題はない。
 */
export interface JsonLdProps {
  data: unknown;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(data) }}
    />
  );
}
