import { describe, expect, it } from 'vitest';
import { countOld, mergeRun, planRun } from '../src/merge';
import { SYMBOLS } from '../src/symbols';
import type { PriceBlob, Quote, SourceQuote } from '../src/types';

const NOW = new Date('2026-10-07T18:00:00Z');
const session = { date: '2026-10-07', open: 570, close: 960, source: 'finnhub' as const };
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
const q = (p: number, t: string): SourceQuote => ({ p, pc: p - 1, t });
const stored = (at: string): Quote => ({ p: 1, pc: 1, t: at, src: 'finnhub', at });

function input(over: Partial<Parameters<typeof mergeRun>[0]> = {}): Parameters<typeof mergeRun>[0] {
  return {
    prev: null, now: NOW, session, phase: 'open',
    finnhub: { quotes: {}, tried: [], authStatus: null },
    symbols: ['AAA', 'BBB'],
    ...over,
  };
}

describe('mergeRun', () => {
  it('stores a fetched price with the trade time and the confirmation time', () => {
    const blob = mergeRun(input({ finnhub: { quotes: { AAA: q(100, minutesAgo(1)) }, tried: ['AAA'], authStatus: null } }));
    expect(blob.quotes.AAA).toEqual({ p: 100, pc: 99, t: minutesAgo(1), src: 'finnhub', at: NOW.toISOString() });
    expect(blob.quotes.BBB).toBeUndefined();
  });

  it('keeps unfetched tickers as they were', () => {
    const prev = mergeRun(input({ now: new Date(NOW.getTime() - 60_000), finnhub: { quotes: { BBB: q(50, minutesAgo(2)) }, tried: ['BBB'], authStatus: null } }));
    const blob = mergeRun(input({ prev, finnhub: { quotes: { AAA: q(100, minutesAgo(1)) }, tried: ['AAA'], authStatus: null } }));
    expect(blob.quotes.BBB).toMatchObject({ p: 50, at: minutesAgo(1) });
  });

  it('trims fields from older blobs (Alpaca-era chk, chkAt, stale)', () => {
    const prev = { v: 1, quotes: { AAA: { p: 9, pc: 8, t: minutesAgo(3), src: 'alpaca', chk: 0.1, chkAt: minutesAgo(5), stale: true } } } as unknown as PriceBlob;
    const blob = mergeRun(input({ prev }));
    expect(blob.quotes.AAA).toEqual({ p: 9, pc: 8, t: minutesAgo(3), src: 'alpaca', at: '' });
  });

  it('counts runs without a single quote, and resets on success', () => {
    let blob: PriceBlob | null = null;
    for (let i = 0; i < 3; i++) blob = mergeRun(input({ prev: blob, finnhub: { quotes: {}, tried: ['AAA'], authStatus: null } }));
    expect(blob?.finnhubFails).toBe(3);
    blob = mergeRun(input({ prev: blob, finnhub: { quotes: { AAA: q(1, minutesAgo(0)) }, tried: ['AAA'], authStatus: null } }));
    expect(blob.finnhubFails).toBe(0);
  });

  it('records a refused key', () => {
    expect(mergeRun(input({ finnhub: { quotes: {}, tried: ['AAA'], authStatus: 401 } })).authError).toMatchObject({ source: 'finnhub', status: 401 });
  });

  it('is final only when every ticker is confirmed since the first run after the close', () => {
    const one = mergeRun(input({ phase: 'after-close', finnhub: { quotes: { AAA: q(1, minutesAgo(0)) }, tried: ['AAA'], authStatus: null } }));
    expect(one).toMatchObject({ final: false, closeFrom: NOW.toISOString() });
    const later = new Date(NOW.getTime() + 60_000);
    const two = mergeRun(input({ prev: one, now: later, phase: 'after-close', finnhub: { quotes: { BBB: q(1, minutesAgo(0)) }, tried: ['BBB'], authStatus: null } }));
    expect(two).toMatchObject({ final: true, closeFrom: NOW.toISOString() });
  });
});

describe('planRun', () => {
  const blobWith = (ats: Record<string, string>) => ({ quotes: Object.fromEntries(Object.entries(ats).map(([s, at]) => [s, stored(at)])) }) as unknown as PriceBlob;

  it('starts with never-confirmed tickers, Tier 1 first', () => {
    const plan = planRun(null, [], 3, ['ZM', 'AAPL', 'DKNG', 'MSFT']);
    expect(plan).toEqual(['AAPL', 'MSFT', 'ZM']);
  });

  it('rotates: the least recently confirmed come next', () => {
    const prev = blobWith({ AAA: minutesAgo(1), BBB: minutesAgo(3), CCC: minutesAgo(2) });
    expect(planRun(prev, [], 2, ['AAA', 'BBB', 'CCC'])).toEqual(['BBB', 'CCC']);
  });

  it('priority tickers go first, even when just confirmed, up to the slot limit', () => {
    const prev = blobWith({ AAA: minutesAgo(2), BBB: minutesAgo(5), CCC: minutesAgo(1), DDD: minutesAgo(9) });
    expect(planRun(prev, ['CCC', 'AAA'], 3, ['AAA', 'BBB', 'CCC', 'DDD'], 1)).toEqual(['AAA', 'DDD', 'BBB']);
    expect(planRun(prev, ['CCC', 'AAA'], 3, ['AAA', 'BBB', 'CCC', 'DDD'], 2)).toEqual(['AAA', 'CCC', 'DDD']);
  });

  it('ignores unknown priority tickers and duplicates', () => {
    expect(planRun(null, ['NOPE', 'ZM', 'ZM'], 2, ['AAPL', 'ZM'])).toEqual(['ZM', 'AAPL']);
  });
});

/**
 * Refresh frequency for the real 109 tickers: simulate a trading hour of
 * one-minute runs and measure the longest gap between two confirmations of
 * each ticker. These numbers are the ones quoted in the design doc (§3).
 */
describe('refresh frequency (109 tickers, 45 calls a minute)', () => {
  function simulate(priority: string[], runs = 60) {
    let blob: PriceBlob | null = null;
    const last: Record<string, number> = {};
    const gaps: Record<string, number> = {};
    const start = NOW.getTime();
    for (let i = 0; i < runs; i++) {
      const now = new Date(start + i * 60_000);
      const plan = planRun(blob, priority, 45);
      const quotes = Object.fromEntries(plan.map(s => [s, q(10, now.toISOString())]));
      blob = mergeRun({ prev: blob, now, session, phase: 'open', finnhub: { quotes, tried: plan, authStatus: null } });
      if (i >= 10) { // after warm-up
        for (const s of plan) if (last[s] !== undefined) gaps[s] = Math.max(gaps[s] ?? 0, i - last[s]!);
      }
      for (const s of plan) last[s] = i;
    }
    return { gaps, blob: blob!, end: new Date(start + (runs - 1) * 60_000) };
  }
  const maxGap = (gaps: Record<string, number>, syms: readonly string[]) => Math.max(...syms.map(s => gaps[s] ?? Infinity));

  it('no priority tickers: every ticker every 2–3 minutes', () => {
    const { gaps, blob, end } = simulate([]);
    expect(maxGap(gaps, SYMBOLS)).toBe(3);
    expect(countOld(blob, end)).toBe(0);
  });

  it('12 priority tickers: those every minute, the other 97 at most every 3 minutes', () => {
    const pri = SYMBOLS.slice(-12);
    const { gaps } = simulate(pri);
    expect(maxGap(gaps, pri)).toBe(1);
    expect(maxGap(gaps, SYMBOLS.filter(s => !pri.includes(s)))).toBeLessThanOrEqual(3);
  });

  it('40 priority tickers (more than the 12 slots): every ticker still within 3 minutes', () => {
    const pri = SYMBOLS.slice(0, 40);
    const { gaps, blob, end } = simulate(pri);
    expect(maxGap(gaps, SYMBOLS)).toBeLessThanOrEqual(3);
    expect(countOld(blob, end)).toBe(0);
  });

  it('all 109 sent as priority (a misbehaving client) changes nothing for the others', () => {
    const { gaps } = simulate([...SYMBOLS]);
    expect(maxGap(gaps, SYMBOLS)).toBeLessThanOrEqual(3);
  });
});
