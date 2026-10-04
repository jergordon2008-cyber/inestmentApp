import { beforeEach, describe, expect, it } from 'vitest';
import { PRICES_KEY } from '../src/kv';
import { clearSessionMemo, refresh } from '../src/refresh';
import type { PriceBlob } from '../src/types';
import { ALPACA_CAL, ALPACA_SNAP, alpacaBody, calendarRoute, fakeFetch, FakeKV, FINNHUB, finnhubBody, jsonRes, makeDeps, makeEnv } from './helpers';

const OPEN = new Date('2026-10-07T18:00:00Z');           // Wed 14:00 ET
const PRE_OPEN = new Date('2026-10-07T13:02:00Z');       // 09:02 ET
const AFTER_CLOSE = new Date('2026-10-07T20:02:00Z');    // 16:02 ET
const LATE = new Date('2026-10-07T21:30:00Z');           // 17:30 ET
const HOLIDAY = new Date('2026-11-26T16:00:00Z');        // Thanksgiving 11:00 ET

function routes(now: Date, opts: { alpacaStatus?: number; holiday?: boolean } = {}) {
  const trade = new Date(now.getTime() - 30_000).toISOString();
  return fakeFetch({
    [ALPACA_CAL]: calendarRoute('09:30', '16:00', opts.holiday),
    [ALPACA_SNAP]: url => (opts.alpacaStatus ? jsonRes({ message: 'x' }, opts.alpacaStatus) : jsonRes(alpacaBody(url, trade))),
    [FINNHUB]: () => jsonRes(finnhubBody(100.2, trade)),
  });
}

describe('refresh', () => {
  beforeEach(() => clearSessionMemo());

  it('during the session: 1 Alpaca call, 15 Finnhub calls, 1 KV write, all 110 tickers', async () => {
    const kv = new FakeKV();
    const f = routes(OPEN);
    const summary = await refresh(makeEnv(kv), makeDeps(f.fn, OPEN));
    expect(summary).toMatchObject({ ran: true, phase: 'open', alpacaOk: true, finnhubCalls: 15, wrote: true });
    expect(f.calls.filter(u => u.startsWith(ALPACA_SNAP))).toHaveLength(1);
    expect(f.calls.filter(u => u.startsWith(FINNHUB))).toHaveLength(15);
    expect(summary.subrequests).toBeLessThanOrEqual(20);
    expect(kv.puts).toBe(1);
    const blob = kv.json<PriceBlob>(PRICES_KEY)!;
    expect(Object.keys(blob.quotes)).toHaveLength(110);
    expect(blob.session).toMatchObject({ date: '2026-10-07', source: 'alpaca' });
  });

  it('the Finnhub key goes in a header, never in the URL', async () => {
    const kv = new FakeKV();
    const f = routes(OPEN);
    await refresh(makeEnv(kv), makeDeps(f.fn, OPEN));
    expect(f.calls.some(u => u.includes('test-finnhub'))).toBe(false);
  });

  it('reuses the stored calendar instead of fetching it every run', async () => {
    const kv = new FakeKV();
    await refresh(makeEnv(kv), makeDeps(routes(OPEN).fn, OPEN));
    clearSessionMemo();
    const f = routes(OPEN);
    await refresh(makeEnv(kv), makeDeps(f.fn, new Date(OPEN.getTime() + 120_000)));
    expect(f.calls.filter(u => u.startsWith(ALPACA_CAL))).toHaveLength(0);
  });

  it('before the open: no data calls; stores the new day once', async () => {
    const kv = new FakeKV();
    await refresh(makeEnv(kv), makeDeps(routes(OPEN).fn, new Date('2026-10-06T18:00:00Z'))); // yesterday
    clearSessionMemo();
    const writesBefore = kv.puts;
    const f = routes(PRE_OPEN);
    const s1 = await refresh(makeEnv(kv), makeDeps(f.fn, PRE_OPEN));
    const s2 = await refresh(makeEnv(kv), makeDeps(f.fn, new Date(PRE_OPEN.getTime() + 120_000)));
    expect(s1.ran).toBe(false);
    expect(s2.ran).toBe(false);
    expect(f.calls.filter(u => !u.startsWith(ALPACA_CAL))).toHaveLength(0);
    expect(kv.puts - writesBefore).toBe(1);
  });

  it('holiday: no price calls at all', async () => {
    const kv = new FakeKV();
    const f = routes(HOLIDAY, { holiday: true });
    const s = await refresh(makeEnv(kv), makeDeps(f.fn, HOLIDAY));
    expect(s).toMatchObject({ ran: false, phase: 'closed' });
    expect(f.calls.every(u => u.startsWith(ALPACA_CAL))).toBe(true);
  });

  it('takes one closing snapshot, then stays idle', async () => {
    const kv = new FakeKV();
    await refresh(makeEnv(kv), makeDeps(routes(OPEN).fn, OPEN));
    const s1 = await refresh(makeEnv(kv), makeDeps(routes(AFTER_CLOSE).fn, AFTER_CLOSE));
    expect(s1).toMatchObject({ ran: true, phase: 'after-close' });
    expect(kv.json<PriceBlob>(PRICES_KEY)?.final).toBe(true);
    const f = routes(AFTER_CLOSE);
    const s2 = await refresh(makeEnv(kv), makeDeps(f.fn, new Date(AFTER_CLOSE.getTime() + 120_000)));
    expect(s2.ran).toBe(false);
    expect(f.calls).toHaveLength(0);
    const s3 = await refresh(makeEnv(kv), makeDeps(f.fn, LATE));
    expect(s3.ran).toBe(false);
    expect(f.calls).toHaveLength(0);
  });

  it('Alpaca down: retries twice, then Finnhub covers 15 tickers, Tier 1 first', async () => {
    const kv = new FakeKV();
    const f = routes(OPEN, { alpacaStatus: 503 });
    const s = await refresh(makeEnv(kv), makeDeps(f.fn, OPEN));
    expect(f.calls.filter(u => u.startsWith(ALPACA_SNAP))).toHaveLength(3);
    expect(s).toMatchObject({ alpacaOk: false, finnhubCalls: 15 });
    const blob = kv.json<PriceBlob>(PRICES_KEY)!;
    expect(Object.keys(blob.quotes)).toHaveLength(15);
    expect(blob.quotes.AAPL?.src).toBe('finnhub');
  });

  it('Alpaca down for a while: Finnhub reaches all 110 tickers within 8 runs at 15 per run (7.5/min)', async () => {
    const kv = new FakeKV();
    for (let i = 0; i < 8; i++) {
      const now = new Date(OPEN.getTime() + i * 120_000);
      const f = routes(now, { alpacaStatus: 503 });
      const s = await refresh(makeEnv(kv), makeDeps(f.fn, now));
      expect(s.finnhubCalls).toBe(15);
    }
    const blob = kv.json<PriceBlob>(PRICES_KEY)!;
    expect(Object.keys(blob.quotes)).toHaveLength(110);
    expect(blob.alpacaFails).toBe(8);
  });

  it('a refused Alpaca key is not retried', async () => {
    const kv = new FakeKV();
    const f = routes(OPEN, { alpacaStatus: 403 });
    await refresh(makeEnv(kv), makeDeps(f.fn, OPEN));
    expect(f.calls.filter(u => u.startsWith(ALPACA_SNAP))).toHaveLength(1);
    expect(kv.json<PriceBlob>(PRICES_KEY)?.authError).toMatchObject({ source: 'alpaca', status: 403 });
  });

  it('Finnhub 429 stops the batch for that run', async () => {
    const kv = new FakeKV();
    const trade = new Date(OPEN.getTime() - 30_000).toISOString();
    const f = fakeFetch({
      [ALPACA_CAL]: calendarRoute(),
      [ALPACA_SNAP]: url => jsonRes(alpacaBody(url, trade)),
      [FINNHUB]: () => jsonRes({ error: 'limit' }, 429),
    });
    const s = await refresh(makeEnv(kv), makeDeps(f.fn, OPEN));
    expect(s.finnhubCalls).toBe(5); // first group of 5 in flight, then stop
  });

  it('retries a failed KV write once', async () => {
    const kv = new FakeKV();
    kv.failNextPuts = 1;
    const s = await refresh(makeEnv(kv), makeDeps(routes(OPEN).fn, OPEN));
    expect(s.wrote).toBe(true);
  });

  it('without Finnhub (watchdog catch-up) makes no Finnhub calls', async () => {
    const kv = new FakeKV();
    const f = routes(OPEN);
    await refresh(makeEnv(kv), makeDeps(f.fn, OPEN), { finnhub: false });
    expect(f.calls.filter(u => u.startsWith(FINNHUB))).toHaveLength(0);
  });

  it('falls back to regular weekday hours if the calendar is down', async () => {
    const kv = new FakeKV();
    const trade = new Date(OPEN.getTime() - 30_000).toISOString();
    const f = fakeFetch({
      [ALPACA_CAL]: () => jsonRes({}, 500),
      [ALPACA_SNAP]: url => jsonRes(alpacaBody(url, trade)),
      [FINNHUB]: () => jsonRes(finnhubBody(100, trade)),
    });
    const s = await refresh(makeEnv(kv), makeDeps(f.fn, OPEN));
    expect(s).toMatchObject({ ran: true, phase: 'open' });
  });
});
