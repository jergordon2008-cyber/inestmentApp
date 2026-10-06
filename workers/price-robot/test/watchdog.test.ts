import { beforeEach, describe, expect, it } from 'vitest';
import { PRICES_KEY, WATCHDOG_KEY } from '../src/kv';
import { clearSessionMemo, refresh } from '../src/refresh';
import type { PriceBlob } from '../src/types';
import { evaluate, sendAlert, transitions, watchdog, type WatchState } from '../src/watchdog';
import { ALPACA_CAL, ALPACA_SNAP, alpacaBody, calendarRoute, fakeFetch, FakeKV, FINNHUB, finnhubBody, jsonRes, makeDeps, makeEnv } from './helpers';

const OPEN = new Date('2026-10-07T18:00:00Z'); // Wed 14:00 ET
const ALERT = 'https://ntfy.sh/test-topic';
const OK: WatchState = { stale: false, alpacaDown: false, manyFallback: false, authError: false };

function world(now: () => Date, opts: { alpacaStatus?: number } = {}) {
  const alerts: string[] = [];
  const f = fakeFetch({
    [ALPACA_CAL]: calendarRoute(),
    [ALPACA_SNAP]: url => (opts.alpacaStatus ? jsonRes({}, opts.alpacaStatus) : jsonRes(alpacaBody(url, new Date(now().getTime() - 30_000).toISOString()))),
    [FINNHUB]: () => jsonRes(finnhubBody(100, now().toISOString())),
    [ALERT]: async (_url, init) => { alerts.push(String(init?.body)); return new Response('ok'); },
  });
  return { f, alerts };
}

describe('watchdog', () => {
  beforeEach(() => clearSessionMemo());

  it('does nothing outside the watch window', async () => {
    const kv = new FakeKV();
    const night = new Date('2026-10-08T03:00:00Z');
    const w = world(() => night);
    const s = await watchdog(makeEnv(kv, { ALERT_URL: ALERT }), makeDeps(w.f.fn, night));
    expect(s.checked).toBe(false);
    expect(w.alerts).toHaveLength(0);
    expect(w.f.calls).toHaveLength(0); // not even the calendar
    const sunday = new Date('2026-10-04T16:00:00Z');
    await watchdog(makeEnv(kv, { ALERT_URL: ALERT }), makeDeps(w.f.fn, sunday));
    expect(w.f.calls).toHaveLength(0);
  });

  it('holiday inside regular hours: asks the calendar, then stays quiet', async () => {
    const kv = new FakeKV();
    const thanksgiving = new Date('2026-11-26T17:00:00Z');
    const alerts: string[] = [];
    const f = fakeFetch({ [ALPACA_CAL]: calendarRoute('09:30', '16:00', true), [ALERT]: () => { alerts.push('x'); return new Response('ok'); } });
    const s = await watchdog(makeEnv(kv, { ALERT_URL: ALERT }), makeDeps(f.fn, thanksgiving));
    expect(s.checked).toBe(false);
    expect(alerts).toHaveLength(0);
  });

  it('fresh prices: no alert, no KV write', async () => {
    const kv = new FakeKV();
    let now = OPEN;
    const w = world(() => now);
    await refresh(makeEnv(kv), makeDeps(w.f.fn, () => now));
    now = new Date(OPEN.getTime() + 4 * 60_000);
    const puts = kv.puts;
    const s = await watchdog(makeEnv(kv, { ALERT_URL: ALERT }), makeDeps(w.f.fn, () => now));
    expect(s).toMatchObject({ checked: true, refreshed: false, alerts: [] });
    expect(kv.puts).toBe(puts);
  });

  it('stale > 10 min: tries one Alpaca-only refresh, and stays quiet if that fixes it', async () => {
    const kv = new FakeKV();
    let now = OPEN;
    const w = world(() => now);
    await refresh(makeEnv(kv), makeDeps(w.f.fn, () => now));
    now = new Date(OPEN.getTime() + 11 * 60_000);
    w.f.calls.length = 0;
    const s = await watchdog(makeEnv(kv, { ALERT_URL: ALERT }), makeDeps(w.f.fn, () => now));
    expect(s.refreshed).toBe(true);
    expect(s.state.stale).toBe(false);
    expect(w.f.calls.filter(u => u.startsWith(FINNHUB))).toHaveLength(0);
    expect(w.alerts).toHaveLength(0);
  });

  it('alerts once when prices stay stale, once when they recover', async () => {
    const kv = new FakeKV();
    let now = OPEN;
    const good = world(() => now);
    await refresh(makeEnv(kv), makeDeps(good.f.fn, () => now));

    // Alpaca down and Finnhub refusing: the catch-up refresh can't help.
    const alerts: string[] = [];
    const down = fakeFetch({
      [ALPACA_CAL]: calendarRoute(),
      [ALPACA_SNAP]: () => { throw new Error('network'); },
      [ALERT]: async (_u, init) => { alerts.push(String(init?.body)); return new Response('ok'); },
    });
    // KV write fails too, so the blob really stays old.
    const env = makeEnv(kv, { ALERT_URL: ALERT });
    now = new Date(OPEN.getTime() + 12 * 60_000);
    kv.failNextPuts = 2;
    await watchdog(env, makeDeps(down.fn, () => now));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatch(/stale.*14:00 ET/);

    now = new Date(OPEN.getTime() + 17 * 60_000);
    kv.failNextPuts = 2;
    await watchdog(env, makeDeps(down.fn, () => now));
    expect(alerts).toHaveLength(1); // no repeat

    now = new Date(OPEN.getTime() + 22 * 60_000);
    await refresh(makeEnv(kv), makeDeps(world(() => now).f.fn, () => now));
    await watchdog(env, makeDeps(down.fn, () => now));
    expect(alerts).toHaveLength(2);
    expect(alerts[1]).toMatch(/updating again/);
    expect(kv.json<WatchState>(WATCHDOG_KEY)).toEqual(OK);
  });

  it('after the closing snapshot, an old blob is not stale', () => {
    const blob = { v: 1, asOf: '2026-10-07T20:02:00Z', final: true, session: { date: '2026-10-07' }, quotes: {}, alpacaFails: 0, authError: null } as unknown as PriceBlob;
    expect(evaluate(blob, new Date('2026-10-07T20:14:00Z'), '2026-10-07').stale).toBe(false);
  });

  it('reports Alpaca down, many fallbacks and refused keys', () => {
    const quotes = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`S${i}`, { p: 1, pc: 1, t: '', src: 'finnhub' }]));
    const blob = { v: 1, asOf: OPEN.toISOString(), final: false, session: null, quotes, alpacaFails: 3, authError: { source: 'finnhub', status: 401, at: '' } } as unknown as PriceBlob;
    const state = evaluate(blob, OPEN, '2026-10-07');
    expect(state).toEqual({ stale: false, alpacaDown: true, manyFallback: true, authError: true });
    const msgs = transitions(OK, state, blob, OPEN);
    expect(msgs).toHaveLength(3);
    expect(msgs.join(' ')).toMatch(/finnhub refused the API key \(HTTP 401\)/);
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
    const w = world(() => OPEN);
    await refresh(makeEnv(kv), makeDeps(w.f.fn, OPEN));
    expect(kv.json<PriceBlob>(PRICES_KEY)?.asOf).toBe(OPEN.toISOString());
  });
});
