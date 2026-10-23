import { beforeEach, describe, expect, it } from 'vitest';
import { clearDemandMemo, flushDemand, noteDemand } from '../src/demand';
import { FINNHUB_PER_RUN } from '../src/finnhub';
import { PRICES_KEY } from '../src/kv';
import { clearSessionMemo, refresh } from '../src/refresh';
import { SYMBOLS } from '../src/symbols';
import type { PriceBlob } from '../src/types';
import { fakeFetch, FakeKV, FINNHUB, FINNHUB_HOLIDAYS, finnhubBody, finnhubWorld, holidaysRoute, jsonRes, makeDeps, makeEnv } from './helpers';

const OPEN = new Date('2026-10-07T18:00:00Z');           // Wed 14:00 ET
const PRE_OPEN = new Date('2026-10-07T13:02:00Z');       // 09:02 ET
const CLOSE = new Date('2026-10-07T20:00:00Z');          // 16:00 ET
const LATE = new Date('2026-10-07T21:30:00Z');           // 17:30 ET
const HOLIDAY = new Date('2026-11-26T16:00:00Z');        // Thanksgiving 11:00 ET
const EARLY_CLOSE_PM = new Date('2026-11-27T19:00:00Z'); // day after Thanksgiving, 14:00 ET (closed at 13:00)
const min = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

const finnhubCalls = (calls: string[]) => calls.filter(u => u.startsWith(FINNHUB));

describe('refresh', () => {
  beforeEach(() => { clearSessionMemo(); clearDemandMemo(); });

  it('during the session: 45 Finnhub calls at most (calendar included), 1 KV write, under 50 subrequests', async () => {
    const kv = new FakeKV();
    const f = finnhubWorld(() => OPEN);
    const summary = await refresh(makeEnv(kv), makeDeps(f.fn, OPEN));
    expect(summary).toMatchObject({ ran: true, phase: 'open', finnhubCalls: FINNHUB_PER_RUN, wrote: true });
    expect(f.calls).toHaveLength(45);                                  // 1 calendar + 44 quotes
    expect(f.calls.filter(u => u.startsWith(FINNHUB_HOLIDAYS))).toHaveLength(1);
    expect(summary.subrequests).toBeLessThanOrEqual(50);
    expect(kv.puts).toBe(1);
    const blob = kv.json<PriceBlob>(PRICES_KEY)!;
    expect(Object.keys(blob.quotes)).toHaveLength(44);
    expect(blob.session).toMatchObject({ date: '2026-10-07', open: 570, close: 960, source: 'finnhub' });
    expect(Object.values(blob.quotes).every(q => q.src === 'finnhub' && q.at === OPEN.toISOString())).toBe(true);
  });

  it('makes no call to Alpaca, ever', async () => {
    const kv = new FakeKV();
    const f = finnhubWorld(() => OPEN);
    for (let i = 0; i < 4; i++) await refresh(makeEnv(kv), makeDeps(f.fn, min(OPEN, i)));
    expect(f.calls.every(u => u.startsWith('https://finnhub.io/'))).toBe(true);
  });

  it('the Finnhub key goes in a header, never in the URL', async () => {
    const kv = new FakeKV();
    const f = finnhubWorld(() => OPEN);
    await refresh(makeEnv(kv), makeDeps(f.fn, OPEN));
    expect(f.calls.some(u => u.includes('test-finnhub'))).toBe(false);
  });

  it('reuses the stored calendar: later runs spend all 45 calls on quotes', async () => {
    const kv = new FakeKV();
    await refresh(makeEnv(kv), makeDeps(finnhubWorld(() => OPEN).fn, OPEN));
    clearSessionMemo();
    const f = finnhubWorld(() => min(OPEN, 1));
    const s = await refresh(makeEnv(kv), makeDeps(f.fn, min(OPEN, 1)));
    expect(f.calls.filter(u => u.startsWith(FINNHUB_HOLIDAYS))).toHaveLength(0);
    expect(finnhubCalls(f.calls)).toHaveLength(45);
    expect(s.finnhubCalls).toBe(45);
  });

  it('covers all 109 tickers in 3 runs', async () => {
    const kv = new FakeKV();
    for (let i = 0; i < 3; i++) await refresh(makeEnv(kv), makeDeps(finnhubWorld(() => min(OPEN, i)).fn, min(OPEN, i)));
    expect(Object.keys(kv.json<PriceBlob>(PRICES_KEY)!.quotes)).toHaveLength(109);
  });

  it('before the open: no price calls; stores the new day once', async () => {
    const kv = new FakeKV();
    await refresh(makeEnv(kv), makeDeps(finnhubWorld(() => OPEN).fn, new Date('2026-10-06T18:00:00Z'))); // yesterday
    clearSessionMemo();
    const writesBefore = kv.puts;
    const f = finnhubWorld(() => PRE_OPEN);
    const s1 = await refresh(makeEnv(kv), makeDeps(f.fn, PRE_OPEN));
    const s2 = await refresh(makeEnv(kv), makeDeps(f.fn, min(PRE_OPEN, 1)));
    expect(s1.ran).toBe(false);
    expect(s2.ran).toBe(false);
    expect(finnhubCalls(f.calls)).toHaveLength(0);
    expect(f.calls.length).toBeLessThanOrEqual(1);                      // the calendar, once
    expect(kv.puts - writesBefore).toBe(1);
  });

  it('holiday: the calendar call only, no price calls', async () => {
    const kv = new FakeKV();
    const f = finnhubWorld(() => HOLIDAY);
    const s = await refresh(makeEnv(kv), makeDeps(f.fn, HOLIDAY));
    expect(s).toMatchObject({ ran: false, phase: 'closed' });
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]).toContain('market-holiday');
  });

  it('early close: closed in the afternoon', async () => {
    const kv = new FakeKV();
    const f = finnhubWorld(() => EARLY_CLOSE_PM);
    const s = await refresh(makeEnv(kv), makeDeps(f.fn, EARLY_CLOSE_PM));
    expect(s).toMatchObject({ ran: false, phase: 'closed' });
    expect(finnhubCalls(f.calls)).toHaveLength(0);
  });

  it('weekend: no call at all', async () => {
    const kv = new FakeKV();
    const f = finnhubWorld(() => OPEN);
    const s = await refresh(makeEnv(kv), makeDeps(f.fn, new Date('2026-10-10T16:00:00Z')));
    expect(s.ran).toBe(false);
    expect(f.calls).toHaveLength(0);
  });

  it('closing snapshot: runs after the close until every ticker has a closing price, then stays idle', async () => {
    const kv = new FakeKV();
    for (let i = 0; i < 3; i++) await refresh(makeEnv(kv), makeDeps(finnhubWorld(() => min(CLOSE, i - 5)).fn, min(CLOSE, i - 5)));
    const runs: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      const s = await refresh(makeEnv(kv), makeDeps(finnhubWorld(() => min(CLOSE, i)).fn, min(CLOSE, i)));
      expect(s).toMatchObject({ ran: true, phase: 'after-close' });
      runs.push(!!s.final);
    }
    expect(runs).toEqual([false, false, true]);
    const blob = kv.json<PriceBlob>(PRICES_KEY)!;
    expect(blob.final).toBe(true);
    expect(blob.closeFrom).toBe(CLOSE.toISOString());
    const f = finnhubWorld(() => min(CLOSE, 3));
    expect((await refresh(makeEnv(kv), makeDeps(f.fn, min(CLOSE, 3)))).ran).toBe(false);
    expect((await refresh(makeEnv(kv), makeDeps(f.fn, LATE))).ran).toBe(false);
    expect(f.calls).toHaveLength(0);
  });

  it('priority tickers (held or opened) are fetched first, every run', async () => {
    const kv = new FakeKV();
    await refresh(makeEnv(kv), makeDeps(finnhubWorld(() => OPEN).fn, OPEN));
    noteDemand(['ZM', 'DKNG'], OPEN.getTime());
    await flushDemand(kv as unknown as KVNamespace, OPEN, true);
    for (let i = 1; i <= 4; i++) {
      const f = finnhubWorld(() => min(OPEN, i));
      await refresh(makeEnv(kv), makeDeps(f.fn, min(OPEN, i)));
      const first = finnhubCalls(f.calls).slice(0, 2).map(u => new URL(u).searchParams.get('symbol')).sort();
      expect(first).toEqual(['DKNG', 'ZM']);
    }
  });

  it('Finnhub 429 stops the batch for that run, and the stored prices stay', async () => {
    const kv = new FakeKV();
    await refresh(makeEnv(kv), makeDeps(finnhubWorld(() => OPEN).fn, OPEN));
    const f = fakeFetch({ [FINNHUB]: () => jsonRes({ error: 'limit' }, 429) });
    const s = await refresh(makeEnv(kv), makeDeps(f.fn, min(OPEN, 1)));
    expect(s.finnhubCalls).toBe(5);                                       // first group of 5 in flight, then stop
    const blob = kv.json<PriceBlob>(PRICES_KEY)!;
    expect(Object.keys(blob.quotes)).toHaveLength(44);
    expect(blob.finnhubFails).toBe(1);
  });

  it('a refused Finnhub key stops the run and is recorded', async () => {
    const kv = new FakeKV();
    const f = fakeFetch({ [FINNHUB_HOLIDAYS]: holidaysRoute(), [FINNHUB]: () => jsonRes({ error: 'no access' }, 403) });
    await refresh(makeEnv(kv), makeDeps(f.fn, OPEN));
    expect(finnhubCalls(f.calls)).toHaveLength(5);
    expect(kv.json<PriceBlob>(PRICES_KEY)?.authError).toMatchObject({ source: 'finnhub', status: 403 });
  });

  it('retries a failed KV write once', async () => {
    const kv = new FakeKV();
    kv.failNextPuts = 1;
    const s = await refresh(makeEnv(kv), makeDeps(finnhubWorld(() => OPEN).fn, OPEN));
    expect(s.wrote).toBe(true);
  });

  it('the watchdog budget (10) is respected', async () => {
    const kv = new FakeKV();
    const f = finnhubWorld(() => OPEN);
    const s = await refresh(makeEnv(kv), makeDeps(f.fn, OPEN), { budget: 10 });
    expect(f.calls).toHaveLength(10);
    expect(s.finnhubCalls).toBe(10);
  });

  it('falls back to regular weekday hours if the calendar is down', async () => {
    const kv = new FakeKV();
    const trade = new Date(OPEN.getTime() - 30_000).toISOString();
    const f = fakeFetch({ [FINNHUB_HOLIDAYS]: holidaysRoute(500), [FINNHUB]: () => jsonRes(finnhubBody(100, trade)) });
    const s = await refresh(makeEnv(kv), makeDeps(f.fn, OPEN));
    expect(s).toMatchObject({ ran: true, phase: 'open', finnhubCalls: 45 });
  });

  it('an answer with an older trade than the stored one keeps the stored price', async () => {
    const kv = new FakeKV();
    await refresh(makeEnv(kv), makeDeps(finnhubWorld(() => OPEN, () => 101).fn, OPEN));
    const old = new Date(OPEN.getTime() - 3_600_000).toISOString();
    const f = fakeFetch({ [FINNHUB]: () => jsonRes(finnhubBody(50, old)) });
    for (let i = 1; i <= 3; i++) await refresh(makeEnv(kv), makeDeps(f.fn, min(OPEN, i)));
    const blob = kv.json<PriceBlob>(PRICES_KEY)!;
    expect(blob.quotes[SYMBOLS[0]!]?.p).toBe(101);
  });
});
