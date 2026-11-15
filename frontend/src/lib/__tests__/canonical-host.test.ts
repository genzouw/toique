import { describe, it, expect } from 'vitest';
import { resolveCanonicalUrl } from '../canonical-host';

const loc = (hostname: string, pathname = '/', search = '', hash = '') => ({
  hostname,
  pathname,
  search,
  hash,
});

describe('resolveCanonicalUrl', () => {
  it('toique.pages.dev はパス・クエリ・ハッシュを保ったまま正規ドメインへ移す', () => {
    expect(
      resolveCanonicalUrl(
        loc('toique.pages.dev', '/reset-password', '?token=abc', '#top'),
      ),
    ).toBe('https://toique.genzouw.com/reset-password?token=abc#top');
  });

  it('正規ドメインでは移動しない', () => {
    expect(resolveCanonicalUrl(loc('toique.genzouw.com', '/login'))).toBeNull();
  });

  it('プレビューデプロイのサブドメインでは移動しない', () => {
    expect(resolveCanonicalUrl(loc('abc123.toique.pages.dev'))).toBeNull();
  });

  it('ローカル開発では移動しない', () => {
    expect(resolveCanonicalUrl(loc('localhost'))).toBeNull();
  });
});
