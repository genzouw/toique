import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEnvSetReader } from './env-set.js';

describe('createEnvSetReader', () => {
  beforeEach(() => {
    vi.stubEnv('TEST_ENV_SET', 'Foo@example.com, bar@example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('parses comma-separated values, trimming and lowercasing', () => {
    const getSet = createEnvSetReader('TEST_ENV_SET');
    expect(getSet().has('foo@example.com')).toBe(true);
    expect(getSet().has('bar@example.com')).toBe(true);
  });

  it('returns an empty set when the env var is unset or empty', () => {
    vi.stubEnv('TEST_ENV_SET', undefined);
    expect(createEnvSetReader('TEST_ENV_SET')().size).toBe(0);

    vi.stubEnv('TEST_ENV_SET', '');
    expect(createEnvSetReader('TEST_ENV_SET')().size).toBe(0);
  });

  it('caches the parsed set while the raw value is unchanged', () => {
    const getSet = createEnvSetReader('TEST_ENV_SET');
    const first = getSet();
    const second = getSet();
    expect(second).toBe(first);
  });

  it('re-parses when the underlying env value changes', () => {
    const getSet = createEnvSetReader('TEST_ENV_SET');
    const first = getSet();
    vi.stubEnv('TEST_ENV_SET', 'baz@example.com');
    const second = getSet();
    expect(second).not.toBe(first);
    expect(second.has('baz@example.com')).toBe(true);
  });
});
