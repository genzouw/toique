import { useEffect } from 'react';

/**
 * ページ別のメタタグを切り替えるためのフック。
 *
 * SPA では index.html の <meta> タグはページ遷移時に変化しない。
 * このフックは該当する meta タグを動的に更新し、必要なら新規作成する。
 * 動的に作成/更新されたタグには data-seo="true" 属性を付け、
 * index.html に元からある静的なタグと衝突しないよう管理する。
 */
export interface SEOOptions {
  /** ページタイトル。未指定なら index.html のデフォルトを維持。 */
  title?: string;
  /** meta description。 */
  description?: string;
  /** 正規URL。未指定なら `https://toique.genzouw.com${location.pathname}` を自動生成。 */
  canonical?: string;
  /** OGP画像。絶対URL。 */
  ogImage?: string;
  /** true なら <meta name="robots" content="noindex"> を付与。 */
  noIndex?: boolean;
}

const SITE_ORIGIN =
  import.meta.env.VITE_SITE_ORIGIN ?? 'https://toique.genzouw.com';

type MetaSelector =
  | { kind: 'name'; value: string }
  | { kind: 'property'; value: string };

function upsertMeta(selector: MetaSelector, content: string): void {
  const attr = selector.kind === 'name' ? 'name' : 'property';
  const query = `meta[${attr}="${selector.value}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(query);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, selector.value);
    el.setAttribute('data-seo', 'true');
    document.head.appendChild(el);
  } else if (!el.hasAttribute('data-seo')) {
    el.setAttribute('data-seo', 'true');
    el.setAttribute('data-seo-original', el.getAttribute('content') ?? '');
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute('data-seo', 'true');
    document.head.appendChild(el);
  } else if (!el.hasAttribute('data-seo')) {
    el.setAttribute('data-seo', 'true');
    el.setAttribute('data-seo-original', el.getAttribute('href') ?? '');
  }
  el.setAttribute('href', href);
}

function removeMeta(selector: MetaSelector): void {
  const attr = selector.kind === 'name' ? 'name' : 'property';
  const el = document.head.querySelector(`meta[${attr}="${selector.value}"]`);
  if (el && el.getAttribute('data-seo') === 'true') {
    el.remove();
  }
}

export function useSEO(options: SEOOptions): void {
  const { title, description, canonical, ogImage, noIndex } = options;

  useEffect(() => {
    const prevTitle = document.title;

    if (title) {
      document.title = title;
    }

    if (description) {
      upsertMeta({ kind: 'name', value: 'description' }, description);
      upsertMeta({ kind: 'property', value: 'og:description' }, description);
      upsertMeta({ kind: 'name', value: 'twitter:description' }, description);
    }

    if (title) {
      upsertMeta({ kind: 'property', value: 'og:title' }, title);
      upsertMeta({ kind: 'name', value: 'twitter:title' }, title);
    }

    const canonicalUrl =
      canonical ?? `${SITE_ORIGIN}${window.location.pathname}`;
    if (canonicalUrl) {
      upsertLink('canonical', canonicalUrl);
      upsertMeta({ kind: 'property', value: 'og:url' }, canonicalUrl);
    }

    if (ogImage) {
      upsertMeta({ kind: 'property', value: 'og:image' }, ogImage);
      upsertMeta({ kind: 'name', value: 'twitter:image' }, ogImage);
    }

    if (noIndex) {
      upsertMeta({ kind: 'name', value: 'robots' }, 'noindex');
    } else {
      removeMeta({ kind: 'name', value: 'robots' });
    }

    return () => {
      document.title = prevTitle;
      document.head.querySelectorAll('[data-seo="true"]').forEach((el) => {
        const original = el.getAttribute('data-seo-original');
        if (original !== null) {
          const attrName = el.tagName === 'LINK' ? 'href' : 'content';
          el.setAttribute(attrName, original);
          el.removeAttribute('data-seo');
          el.removeAttribute('data-seo-original');
        } else {
          el.remove();
        }
      });
    };
  }, [title, description, canonical, ogImage, noIndex]);
}
