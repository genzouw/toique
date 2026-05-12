import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);

// jsdom v29 + vitest v4 の組み合わせで window.localStorage が undefined になる
// 現象が発生するため、最小限の in-memory Storage を polyfill する。
if (
  typeof window !== 'undefined' &&
  typeof window.localStorage === 'undefined'
) {
  const store: Record<string, string> = {};
  const storage: Storage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = v;
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  });
}
