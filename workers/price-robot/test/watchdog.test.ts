import { beforeEach, describe, expect, it } from 'vitest';
import { clearDemandMemo } from '../src/demand';
import { PRICES_KEY, WATCHDOG_KEY } from '../src/kv';
import { clearSessionMemo, refresh } from '../src/refresh';
import type { PriceBlob } from '../src/types';
import { evaluate, sendAlert, transitions, watchdog, type WatchState } from '../src/watchdog';
import { fakeFetch, FakeKV, FINNHUB, FINNHUB_HOLIDAYS, finnhubWorld, holidaysRoute, makeDeps, makeEnv, seedAll } from './helpers';

const OPEN = new Date('2026-10-07T18:00:00Z'); // Wed 14:00 ET
const ALERT = 'https://ntfy.sh/test-topic';
const OK: WatchState = { stale: false, finnhubDown: false, manyOld: false, authError: false };
const min = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

function world(now: () => Date) {
  const alerts: string[] = [];
  const f = finnhubWorld(now, () => 100, {
    [ALERT]: async (_url, init) => { alerts.push(String(init?.body)); return new Response('ok'); },
  });
  return { f, alerts };
}

describe('watchdog', () => {
  beforeEach(() => { clearSessionMemo(); clearDemandMemo(); });

  it('does nothing outside the watch window', async () => {
    const kv = new FakeKV();
    const night = new Date('2026-10-08T03:00:00Z');
    const w = world(() => night);
    const s = await watchdog(makeEnv(kv, { ALERT_URL: ALERT }), makeDeps(w.f.fn, night));
    expect(s.checked).toBe(false);
    expect(w.f.calls).toHaveLength(0); // not even the calendar
    await watchdog(makeEnv(kv, { ALERT_URL: ALERT }), makeDeps(w.f.fn, new Date('2026-10-04T16:00:00Z'))); // Sunday
    expect(w.f.calls).toHaveLength(0);
  });

  it('holiday inside regular hours: asks the calendar, then stays quiet', async () => {
    const kv = new FakeKV();
    const thanksgiving = new Date('2026-11-26T17:00:00Z');
    const alerts: string[] = [];
    const f = fakeFetch({ [FINNHUB_HOLIDAYS]: holidaysRoute(), [ALERT]: () => { alerts.push('x'); return new Response('ok'); } });
    const s = await watchdog(makeEnv(kv, { ALERT_URL: ALERT }), makeDeps(f.fn, thanksgiving));
    expect(s.checked).toBe(false);
    expect(alerts).toHaveLength(0);
  });

  it('fresh prices: no alert, no KV write', async () => {
    const kv = new FakeKV();
    await seedAll(kv, OPEN);
    const now = min(OPEN, 1);
    const w = world(() => now);
    const puts = kv.puts;
    const s = await watchdog(makeEnv(kv, { ALERT_URL: ALERT }), makeDeps(w.f.fn, now));
    expect(s).toMatchObject({ checked: true, refreshed: false, alerts: [] });
    expect(kv.puts).toBe(puts);
  });

  it('stale > 10 min: one catch-up run of at most 10 Finnhub calls; no "stale" alert if that fixes it', async () => {
    const kv = new FakeKV();
    await seedAll(kv, OPEN);
    const now = min(OPEN, 11);
    const w = world(() => now);
    const s = await watchdog(makeEnv(kv, { ALERT_URL: ALERT }), makeDeps(w.f.fn, now));
    expect(s.refreshed).toBe(true);
    expect(s.state.stale).toBe(false);
    expect(w.f.calls.filter(u => u.startsWith(FINNHUB)).length).toBeLessThanOrEqual(10);
    // 10 calls can't reconfirm 110 tickers: the honest alert is that trades are blocked.
    expect(w.alerts).toHaveLength(1);
    expect(w.alerts[0]).not.toMatch(/stale/);
    expect(w.alerts[0]).toMatch(/no price confirmed in the last 5 minutes/);
  });

  it('alerts once when prices stay stale, once when they recover', async () => {
    const kv = new FakeKV();
    await seedAll(kv, OPEN);
    const alerts: string[] = [];
    const down = fakeFetch({
      [FINNHUB]: () => { throw new Error('network'); },
      [ALERT]: async (_u, init) => { alerts.push(String(init?.body)); return new Response('ok'); },
    });
    const env = makeEnv(kv, { ALERT_URL: ALERT });
    let now = min(OPEN, 12);
    kv.failNextPuts = 2; // the catch-up can't write either, so the blob really stays old
    await watchdog(env, makeDeps(down.fn, () => now));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatch(/stale.*14:00 ET/);

    now = min(OPEN, 17);
    kv.failNextPuts = 2;
    await watchdog(env, makeDeps(down.fn, () => now));
    expect(alerts).toHaveLength(1); // no repeat

    now = min(OPEN, 22);
    await seedAll(kv, now);
    await watchdog(env, makeDeps(down.fn, () => now));
    expect(alerts.at(-1)).toMatch(/updating again/);
    expect(kv.json<WatchState>(WATCHDOG_KEY)).toEqual(OK);
  });

  it('after the closing snapshot, an old blob is not stale', () => {
    const blob = { v: 1, asOf: '2026-10-07T20:02:00Z', final: true, market: 'after-close', session: { date: '2026-10-07', close: 960 }, quotes: {}, finnhubFails: 0, authError: null } as unknown as PriceBlob;
    expect(evaluate(blob, new Date('2026-10-07T20:14:00Z'), '2026-10-07').stale).toBe(false);
    // Not final (some closing prices missing), but the closing window is over: not stale either.
    expect(evaluate({ ...blob, final: false }, new Date('2026-10-07T20:14:00Z'), '2026-10-07').stale).toBe(false);
  });

  it('reports Finnhub down, many unconfirmed tickers and refused keys', () => {
    const quotes = Object.fromEntries(Array.from({ length: 110 }, (_, i) => [`S${i}`, { p: 1, pc: 1, t: '', src: 'finnhub', at: '' }]));
    const blob = { v: 1, asOf: OPEN.toISOString(), market: 'open', final: false, session: null, quotes, finnhubFails: 3, authError: { source: 'finnhub', status: 401, at: '' } } as unknown as PriceBlob;
    const state = evaluate(blob, OPEN, '2026-10-07');
    expect(state).toEqual({ stale: false, finnhubDown: true, manyOld: true, authError: true });
    const msgs = transitions(OK, state, blob, OPEN);
    expect(msgs).toHaveLength(3);
    expect(msgs.join(' ')).toMatch(/finnhub refused the API key \(HTTP 401\)/);
    expect(msgs.join(' ')).toMatch(/trades in them are blocked/);
  });

  it('sends Discord webhooks as JSON and ntfy as plain text', async () => {
    const bodies: Array<{ url: string; body: string; type: string | null }> = [];
    const f = fakeFetch({
      'https://': async (url, init) => {
        bodies.push({ url: url.href, body: String(init?.body), type: new Headers(init?.headers).get('Content-Type') });
        return new Response('ok');
      },
    });
    await sendAlert('https://discord.com/api/webhooks/1/abc', ['x'], f.fn);
    await sendAlert('https://ntfy.sh/topic', ['y'], f.fn);
    expect(JSON.parse(bodies[0]!.body)).toEqual({ content: 'Price robot: x' });
    expect(bodies[1]).toMatchObject({ body: 'Price robot: y', type: 'text/plain' });
    expect(await sendAlert(undefined, ['z'], f.fn)).toBe(false);
  });
});

describe('blob written by refresh', () => {
  it('is what the watchdog reads', async () => {
    const kv = new FakeKV();
    await refresh(makeEnv(kv), makeDeps(world(() => OPEN).f.fn, OPEN));
    expect(kv.json<PriceBlob>(PRICES_KEY)?.asOf).toBe(OPEN.toISOString());
  });
});
