import { describe, expect, it } from '@jest/globals';
import { allocationSplit } from '../allocation';

describe('allocationSplit', () => {
  it('one share in a $100,000 account is not "Invested 0%"', () => {
    expect(allocationSplit(99_790, 100_000)).toMatchObject({ investedLabel: '0.2%', cashLabel: '99.8%' });
  });

  it('a tiny position shows as <0.1%, never 0%', () => {
    expect(allocationSplit(99_970, 100_000)).toMatchObject({ investedLabel: '<0.1%', cashLabel: '>99.9%' });
  });

  it('whole percents in the middle', () => {
    expect(allocationSplit(40_000, 100_000)).toMatchObject({ investedLabel: '60%', cashLabel: '40%', investedPct: 60 });
  });

  it('all cash, all invested', () => {
    expect(allocationSplit(100_000, 100_000)).toMatchObject({ investedLabel: '0%', cashLabel: '100%' });
    expect(allocationSplit(0, 100_000)).toMatchObject({ investedLabel: '100%', cashLabel: '0%' });
  });

  it('nearly all invested keeps a decimal', () => {
    expect(allocationSplit(500, 100_000)).toMatchObject({ investedLabel: '99.5%', cashLabel: '0.5%' });
  });

  it('a zero or broken total does not show NaN', () => {
    expect(allocationSplit(0, 0)).toEqual({ investedPct: 0, investedLabel: '0%', cashLabel: '100%' });
    expect(allocationSplit(10, Number.NaN).investedLabel).toBe('0%');
  });
});
