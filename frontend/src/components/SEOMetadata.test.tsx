import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, afterEach } from 'vitest';
import SEOMetadata from './SEOMetadata';
import { SITE_ORIGIN } from '../lib/site';

function getMeta(name: string): string | null {
  return (
    document.head
      .querySelector(`meta[name="${name}"]`)
      ?.getAttribute('content') ?? null
  );
}

function getOgMeta(property: string): string | null {
  return (
    document.head
      .querySelector(`meta[property="${property}"]`)
      ?.getAttribute('content') ?? null
  );
}

function getCanonical(): string | null {
  return (
    document.head
      .querySelector('link[rel="canonical"]')
      ?.getAttribute('href') ?? null
  );
}

describe('SEOMetadata', () => {
  afterEach(() => {
    cleanup();
  });

  it('title / description / canonical / og:* / twitter:* を head に出力する', () => {
    render(
      <MemoryRouter initialEntries={['/foo']}>
        <SEOMetadata
          title="テストタイトル"
          description="テスト説明文"
          ogImage={`${SITE_ORIGIN}/img.png`}
        />
      </MemoryRouter>,
    );

    expect(document.title).toBe('テストタイトル');
    expect(getMeta('description')).toBe('テスト説明文');
    expect(getCanonical()).toBe(`${SITE_ORIGIN}/foo`);
    expect(getOgMeta('og:title')).toBe('テストタイトル');
    expect(getOgMeta('og:description')).toBe('テスト説明文');
    expect(getOgMeta('og:url')).toBe(`${SITE_ORIGIN}/foo`);
    expect(getMeta('twitter:title')).toBe('テストタイトル');
    expect(getMeta('twitter:description')).toBe('テスト説明文');
    expect(getOgMeta('og:image')).toBe(`${SITE_ORIGIN}/img.png`);
    expect(getMeta('twitter:image')).toBe(`${SITE_ORIGIN}/img.png`);
  });

  it('canonical を明示指定すれば優先される', () => {
    render(
      <MemoryRouter initialEntries={['/foo']}>
        <SEOMetadata title="t" canonical="https://example.com/explicit" />
      </MemoryRouter>,
    );
    expect(getCanonical()).toBe('https://example.com/explicit');
    expect(getOgMeta('og:url')).toBe('https://example.com/explicit');
  });

  it('noIndex 指定時に robots=noindex が付与される', () => {
    render(
      <MemoryRouter initialEntries={['/private']}>
        <SEOMetadata title="t" noIndex />
      </MemoryRouter>,
    );
    expect(getMeta('robots')).toBe('noindex');
  });

  it('noIndex 指定時は canonical / og:url を出力しない', () => {
    render(
      <MemoryRouter initialEntries={['/for/unknown-slug']}>
        <SEOMetadata title="t" description="d" noIndex />
      </MemoryRouter>,
    );
    expect(getCanonical()).toBeNull();
    expect(getOgMeta('og:url')).toBeNull();
  });

  it('noIndex 指定時は canonical を明示指定しても出力しない', () => {
    render(
      <MemoryRouter initialEntries={['/private']}>
        <SEOMetadata
          title="t"
          canonical="https://example.com/explicit"
          noIndex
        />
      </MemoryRouter>,
    );
    expect(getCanonical()).toBeNull();
    expect(getOgMeta('og:url')).toBeNull();
  });

  it('unmount 時に動的に追加されたタグがクリーンアップされる', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/foo']}>
        <SEOMetadata title="クリーンアップ対象" description="bar" />
      </MemoryRouter>,
    );
    expect(document.title).toBe('クリーンアップ対象');
    expect(getMeta('description')).toBe('bar');

    unmount();

    // React 19 の Document Metadata は unmount で hoist 要素を head から外す
    expect(getMeta('description')).toBeNull();
    expect(getOgMeta('og:title')).toBeNull();
    expect(getOgMeta('og:description')).toBeNull();
    expect(getMeta('twitter:title')).toBeNull();
  });
});
