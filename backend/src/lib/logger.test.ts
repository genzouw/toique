import { describe, it, expect, vi, afterEach } from 'vitest';
import { logger } from './logger.js';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('info delegates to console.info', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('hello', 1);
    expect(spy).toHaveBeenCalledWith('hello', 1);
  });

  it('warn delegates to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('warn-msg');
    expect(spy).toHaveBeenCalledWith('warn-msg');
  });

  it('error delegates to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    logger.error('failure', err);
    expect(spy).toHaveBeenCalledWith('failure', err);
  });

  it('debug delegates to console.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.debug({ foo: 'bar' });
    expect(spy).toHaveBeenCalledWith({ foo: 'bar' });
  });
});
