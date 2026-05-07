import { describe, it, expect } from 'vitest';
import { resolveApiBaseUrl } from '../api-base-url';

describe('resolveApiBaseUrl', () => {
  it('未設定（undefined）の場合は http://localhost:3000 を返す', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('http://localhost:3000');
  });

  it('絶対 URL はそのまま返す', () => {
    expect(resolveApiBaseUrl('https://api.example.com')).toBe(
      'https://api.example.com',
    );
  });

  it('末尾スラッシュ付き URL は末尾スラッシュを削除する', () => {
    expect(resolveApiBaseUrl('https://api.example.com/')).toBe(
      'https://api.example.com',
    );
  });
});
