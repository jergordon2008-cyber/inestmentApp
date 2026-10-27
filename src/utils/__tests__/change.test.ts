import { describe, expect, it } from '@jest/globals';
import { formatMoneyChange, formatPercentChange } from '../change';

describe('formatMoneyChange', () => {
  it('keeps the minus on a loss', () => {
    expect(formatMoneyChange(-0.19)).toBe('-$0.19');
    expect(formatMoneyChange(-1234.5)).toBe('-$1234.50');
  });

  it('plus on a gain, nothing at zero', () => {
    expect(formatMoneyChange(0.19)).toBe('+$0.19');
    expect(formatMoneyChange(0)).toBe('$0.00');
    expect(formatMoneyChange(-0.004)).toBe('$0.00');
    expect(formatMoneyChange(null)).toBe('$0.00');
  });
});

describe('formatPercentChange', () => {
  it('signs normal values', () => {
    expect(formatPercentChange(1.5)).toBe('+1.50%');
    expect(formatPercentChange(-0.4)).toBe('-0.40%');
  });

  it('a tiny nonzero change next to a real dollar change is <0.01%, not -0.00%', () => {
    expect(formatPercentChange(-0.0019, -0.19)).toBe('<0.01%');
    expect(formatPercentChange(0.0004, 0.2)).toBe('<0.01%');
  });

  it('flat dollars stay 0.00%', () => {
    expect(formatPercentChange(-0.0004, -0.004)).toBe('0.00%');
    expect(formatPercentChange(0, 0)).toBe('0.00%');
    expect(formatPercentChange(null)).toBe('0.00%');
  });
});
