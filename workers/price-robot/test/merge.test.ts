import { describe, expect, it } from 'vitest';
import { mergeRun, planFinnhub, type MergeInput } from '../src/merge';
import { TIER1 } from '../src/symbols';
import type { PriceBlob, SourceQuote } from '../src/types';

const NOW = new Date('2026-10-07T18:00:00Z'); // 14:00 ET
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
const SYMS = ['AAA', 'BBB', 'CCC'];
const session = { date: '2026-10-07', open: 570, close: 960, source: 'alpaca' as const };

function q(p: number, t: string): SourceQuote {
  return { p, pc: p - 1, t };
}

function input(over: Partial<MergeInput>): MergeInput {
  return {
    prev: null,
    now: NOW,
    session,
    phase: 'open',
    alpaca: { ok: true, quotes: {}, calls: 1 },
    finnhub: { quotes: {}, tried: [], authStatus: null },
    symbols: SYMS,
    ...over,
  };
}

describe('mergeRun: which price is shown', () => {
  it('uses a fresh Alpaca trade', () => {
    const blob = mergeRun(input({ alpaca: { ok: true, quotes: { AAA: q(100, minutesAgo(1)) }, calls: 1 } }));
    expect(blob.quotes.AAA).toMatchObject({ p: 100, src: 'alpaca' });
    expect(blob.quotes.AAA?.stale).toBeUndefined();
  });

  it('keeps Alpaca when Finnhub agrees within 1%, and records the check', () => {
    const blob = mergeRun(input({
      alpaca: { ok: true, quotes: { AAA: q(100, minutesAgo(1)) }, calls: 1 },
      finnhub: { quotes: { AAA: q(100.5, minutesAgo(0)) }, tried: ['AAA'], authStatus: null },
    }));
    expect(blob.quotes.AAA).toMatchObject({ p: 100, src: 'alpaca', chk: 0.498, chkAt: NOW.toISOString() });
    expect(blob.retry).not.toContain('AAA');
  });

  it('switches to Finnhub when the two differ by more than 1%, and re-checks next run', () => {
    const blob = mergeRun(input({
      alpaca: { ok: true, quotes: { AAA: q(100, minutesAgo(1)) }, calls: 1 },
      finnhub: { quotes: { AAA: q(102, minutesAgo(0)) }, tried: ['AAA'], authStatus: null },
    }));
    expect(blob.quotes.AAA).toMatchObject({ p: 102, src: 'finnhub' });
    expect(blob.retry).toContain('AAA');
  });

  it('uses Finnhub when the last IEX trade is older than 15 minutes', () => {
    const blob = mergeRun(input({
      alpaca: { ok: true, quotes: { AAA: q(100, minutesAgo(20)) }, calls: 1 },
      finnhub: { quotes: { AAA: q(101, minutesAgo(1)) }, tried: ['AAA'], authStatus: null },
    }));
    expect(blob.quotes.AAA).toMatchObject({ p: 101, src: 'finnhub' });
  });

  it('keeps the newest known price, marked stale, and queues it for Finnhub', () => {
    const prev = mergeRun(input({ now: new Date(NOW.getTime() - 30 * 60_000), alpaca: { ok: true, quotes: { AAA: q(99, minutesAgo(31)) }, calls: 1 } }));
    const blob = mergeRun(input({ prev, alpaca: { ok: true, quotes: { AAA: q(100, minutesAgo(20)) }, calls: 1 } }));
    expect(blob.quotes.AAA).toMatchObject({ p: 100, src: 'alpaca', stale: true });
    expect(blob.retry[0]).toBe('AAA');
  });

  it('Alpaca down: Finnhub covers what it fetched, the rest keep their last price', () => {
    const prev = mergeRun(input({ now: new Date(NOW.getTime() - 2 * 60_000), alpaca: { ok: true, quotes: { AAA: q(100, minutesAgo(3)), BBB: q(50, minutesAgo(3)) }, calls: 1 } }));
    const blob = mergeRun(input({
      prev,
      alpaca: { ok: false, status: 503, calls: 3 },
      finnhub: { quotes: { AAA: q(101, minutesAgo(0)) }, tried: ['AAA'], authStatus: null },
    }));
    expect(blob.alpacaOk).toBe(false);
    expect(blob.alpacaFails).toBe(1);
    expect(blob.quotes.AAA).toMatchObject({ p: 101, src: 'finnhub' });
    // BBB's last trade is 3 minutes old: still shown, not yet stale.
    expect(blob.quotes.BBB).toMatchObject({ p: 50, src: 'alpaca' });
    expect(blob.quotes.BBB?.stale).toBeUndefined();
    expect(blob.quotes.CCC).toBeUndefined();
  });

  it('counts consecutive Alpaca failures and resets on success', () => {
    let blob: PriceBlob | null = null;
    for (let i = 0; i < 3; i++) blob = mergeRun(input({ prev: blob, alpaca: { ok: false, status: 0, calls: 3 } }));
    expect(blob?.alpacaFails).toBe(3);
    blob = mergeRun(input({ prev: blob }));
    expect(blob.alpacaFails).toBe(0);
  });

  it('records a refused key', () => {
    expect(mergeRun(input({ alpaca: { ok: false, status: 403, calls: 1 } })).authError).toMatchObject({ source: 'alpaca', status: 403 });
    expect(mergeRun(input({ finnhub: { quotes: {}, tried: ['AAA'], authStatus: 401 } })).authError).toMatchObject({ source: 'finnhub', status: 401 });
  });

  it('marks the run after the close as the final snapshot', () => {
    expect(mergeRun(input({ phase: 'after-close' })).final).toBe(true);
    expect(mergeRun(input({ phase: 'open' })).final).toBe(false);
  });
});

describe('planFinnhub', () => {
  it('starts with flagged tickers, then never-checked ones, Tier 1 first', () => {
    const plan = planFinnhub({ retry: ['ZZZ_UNKNOWN', 'XOM'], quotes: {} } as unknown as PriceBlob, 5);
    expect(plan[0]).toBe('XOM');
    expect(plan.slice(1).every(s => TIER1.includes(s))).toBe(true);
    expect(plan).toHaveLength(5);
  });

  it('rotates: the least recently checked tickers come next', () => {
    const quotes = {
      AAA: { p: 1, pc: 1, t: NOW.toISOString(), src: 'alpaca', chkAt: minutesAgo(2) },
      BBB: { p: 1, pc: 1, t: NOW.toISOString(), src: 'alpaca', chkAt: minutesAgo(10) },
      CCC: { p: 1, pc: 1, t: NOW.toISOString(), src: 'alpaca', chkAt: minutesAgo(6) },
    };
    expect(planFinnhub({ retry: [], quotes } as unknown as PriceBlob, 2, SYMS)).toEqual(['BBB', 'CCC']);
  });

  it('covers every ticker within ceil(n/15) runs', () => {
    let blob: PriceBlob | null = null;
    const seen = new Set<string>();
    const runs = Math.ceil(110 / 15);
    for (let i = 0; i < runs; i++) {
      const now = new Date(NOW.getTime() + i * 120_000);
      const plan = planFinnhub(blob, 15);
      plan.forEach(s => seen.add(s));
      blob = mergeRun({ ...input({ symbols: undefined, now, prev: blob }), alpaca: { ok: true, quotes: {}, calls: 1 }, finnhub: { quotes: Object.fromEntries(plan.map(s => [s, q(10, now.toISOString())])), tried: plan, authStatus: null } });
    }
    expect(seen.size).toBe(110);
  });
});
