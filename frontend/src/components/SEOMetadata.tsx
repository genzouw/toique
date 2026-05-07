import { useLocation } from 'react-router';
import { SITE_ORIGIN } from '../lib/site';

/**
 * React 19 の Document Metadata 機能（<title>/<meta>/<link> の自動 hoist）を
 * 利用してページごとの SEO メタ情報を宣言的に記述するためのコンポーネント。
 *
 * - title が指定されると og:title / twitter:title も同時に出力する
 * - description も同様に og:description / twitter:description を生成する
 * - canonical 未指定時は SITE_ORIGIN + 現在のパスから自動生成する
 * - noIndex 指定時は canonical / og:url を出力しない（noindex × self-canonical の競合シグナルを避ける）
 * - unmount 時のクリーンアップは React が自動で行う
 *
 * 注意: index.html には動的に変わる title / description / canonical / og:* /
 * twitter:* を残さない方針。クローラーから見える初期 HTML では og:image など
 * 不変なデフォルトのみが index.html に存在する。
 */
export interface SEOMetadataProps {
  /** ページタイトル。未指定なら index.html のデフォルトを使用。 */
  title?: string;
  /** meta description。 */
  description?: string;
  /** 正規URL。未指定なら `${SITE_ORIGIN}${location.pathname}` を自動生成。 */
  canonical?: string;
  /** OGP画像。絶対URL。 */
  ogImage?: string;
  /** true なら <meta name="robots" content="noindex"> を付与。 */
  noIndex?: boolean;
}

export default function SEOMetadata({
  title,
  description,
  canonical,
  ogImage,
  noIndex,
}: SEOMetadataProps) {
  const location = useLocation();
  const canonicalUrl = canonical ?? `${SITE_ORIGIN}${location.pathname}`;

  return (
    <>
      {title && (
        <>
          <title>{title}</title>
          <meta property="og:title" content={title} />
          <meta name="twitter:title" content={title} />
        </>
      )}
      {description && (
        <>
          <meta name="description" content={description} />
          <meta property="og:description" content={description} />
          <meta name="twitter:description" content={description} />
        </>
      )}
      {!noIndex && (
        <>
          <link rel="canonical" href={canonicalUrl} />
          <meta property="og:url" content={canonicalUrl} />
        </>
      )}
      {ogImage && (
        <>
          <meta property="og:image" content={ogImage} />
          <meta name="twitter:image" content={ogImage} />
        </>
      )}
      {noIndex && <meta name="robots" content="noindex" />}
    </>
  );
}
