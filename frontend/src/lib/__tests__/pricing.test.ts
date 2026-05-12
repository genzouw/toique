import { describe, it, expect } from 'vitest';
import {
  PLAN_PRICES,
  formatPriceWithSymbol,
  formatPriceWithUnit,
} from '../pricing';

describe('PLAN_PRICES', () => {
  it('Free プランは 0 円', () => {
    expect(PLAN_PRICES.free).toBe(0);
  });

  it('Pro プランは 2,980 円', () => {
    expect(PLAN_PRICES.pro).toBe(2980);
  });
});

describe('formatPriceWithSymbol', () => {
  it('通貨記号と 3 桁区切りで表示する', () => {
    expect(formatPriceWithSymbol(2980)).toBe('¥2,980');
  });

  it('0 は ¥0 と表示する', () => {
    expect(formatPriceWithSymbol(0)).toBe('¥0');
  });

  it('4 桁以上も 3 桁区切りになる', () => {
    expect(formatPriceWithSymbol(12345)).toBe('¥12,345');
  });
});

describe('formatPriceWithUnit', () => {
  it('「円」サフィックスと 3 桁区切りで表示する', () => {
    expect(formatPriceWithUnit(2980)).toBe('2,980円');
  });

  it('0 は 0円 と表示する', () => {
    expect(formatPriceWithUnit(0)).toBe('0円');
  });

  it('4 桁以上も 3 桁区切りになる', () => {
    expect(formatPriceWithUnit(12345)).toBe('12,345円');
  });
});
