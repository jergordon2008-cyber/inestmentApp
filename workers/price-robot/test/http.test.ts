import { beforeEach, describe, expect, it } from 'vitest';
import { clearHttpMemo, handleRequest, originAllowed } from '../src/http';
import { clearSessionMemo, refresh } from '../src/refresh';
import { ALPACA_CAL, ALPACA_SNAP, alpacaBody, calendarRoute, fakeFetch, FakeKV, FINNHUB, finnhubBody, jsonRes, makeDeps, makeEnv } from './helpers';

const OPEN = new Date('2026-10-07T18:00:00Z');
const BASE = 'https://price-robot.example.workers.dev';
const price = (s: string) => (s === 'AAPL' ? 333.75 : 100);

async function seeded(now = OPEN) {
  const kv = new FakeKV();
  const trade = new Date(now.getTime() - 30_000).toISOString();
  const f = fakeFetch({
    [ALPACA_CAL]: calendarRoute(),
    [ALPACA_SNAP]: url => jsonRes(alpacaBody(url, trade, price)),
    [FINNHUB]: url => jsonRes(finnhubBody(price(url.searchParams.get('symbol') ?? ''), trade)),
  });
  await refresh(makeEnv(kv), makeDeps(f.fn, now));
  return kv;
}

describe('HTTP API', () => {
  beforeEach(() => { clearSessionMemo(); clearHttpMemo(); });

  it('GET /v1/prices returns every ticker without internal fields', async () => {
    const kv = await seeded();
    const res = await handleRequest(new Request(`${BASE}/v1/prices`), makeEnv(kv), makeDeps(fakeFetch({}).fn, OPEN));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=30');
    const body = await res.json() as { quotes: Record<string, Record<string, unknown>>; asOf: string; retry?: unknown };
    expect(Object.keys(body.quotes)).toHaveLength(110);
    expect(body.quotes.AAPL).toMatchObject({ p: 333.75, src: 'alpaca' });
    expect(body.quotes.AAPL).not.toHaveProperty('chkAt');
    expect(body).not.toHaveProperty('retry');
    expect(JSON.stringify(body)).not.toContain('test-');
  });

  it('GET /v1/prices: a second request within 30 s is served from memory, not KV', async () => {
    const kv = await seeded();
    let reads = 0;
    const counting = { ...kv, get: async (...a: Parameters<FakeKV['get']>) => { reads++; return kv.get(...a); } };
    const env = makeEnv(counting as unknown as FakeKV);
    await handleRequest(new Request(`${BASE}/v1/prices`), env, makeDeps(fakeFetch({}).fn, OPEN));
    await handleRequest(new Request(`${BASE}/v1/prices`), env, makeDeps(fakeFetch({}).fn, new Date(OPEN.getTime() + 20_000)));
    expect(reads).toBe(1);
    await handleRequest(new Request(`${BASE}/v1/prices`), env, makeDeps(fakeFetch({}).fn, new Date(OPEN.getTime() + 31_000)));
    expect(reads).toBe(2);
  });

  it('GET /v1/prices before the first run is 503', async () => {
    const res = await handleRequest(new Request(`${BASE}/v1/prices`), makeEnv(new FakeKV()), makeDeps(fakeFetch({}).fn, OPEN));
    expect(res.status).toBe(503);
  });

  it('GET /v1/quote serves a fresh stored quote without calling Alpaca', async () => {
    const kv = await seeded();
    const f = fakeFetch({});
    const res = await handleRequest(new Request(`${BASE}/v1/quote/aapl`), makeEnv(kv), makeDeps(f.fn, new Date(OPEN.getTime() + 60_000)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ symbol: 'AAPL', onDemand: false, quote: { p: 333.75 } });
    expect(f.calls).toHaveLength(0);
  });

  it('GET /v1/quote refetches a quote older than 4 minutes from Alpaca only', async () => {
    const kv = await seeded();
    const later = new Date(OPEN.getTime() + 5 * 60_000);
    const f = fakeFetch({ [ALPACA_SNAP]: url => jsonRes(alpacaBody(url, new Date(later.getTime() - 5_000).toISOString(), () => 340)) });
    const res = await handleRequest(new Request(`${BASE}/v1/quote/AAPL`), makeEnv(kv), makeDeps(f.fn, later));
    expect(await res.json()).toMatchObject({ onDemand: true, quote: { p: 340, src: 'alpaca' } });
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]).toContain('symbols=AAPL');
  });

  it('GET /v1/quote keeps the stored quote if Alpaca fails, and never calls Finnhub', async () => {
    const kv = await seeded();
    const later = new Date(OPEN.getTime() + 5 * 60_000);
    const f = fakeFetch({ [ALPACA_SNAP]: () => jsonRes({}, 500) });
    const res = await handleRequest(new Request(`${BASE}/v1/quote/AAPL`), makeEnv(kv), makeDeps(f.fn, later));
    expect(await res.json()).toMatchObject({ onDemand: false, quote: { p: 333.75 } });
    expect(f.calls.every(u => u.startsWith(ALPACA_SNAP))).toBe(true);
  });

  it('GET /v1/quote maps SQ to XYZ and rejects unknown symbols', async () => {
    const kv = await seeded();
    const deps = makeDeps(fakeFetch({}).fn, OPEN);
    expect(await (await handleRequest(new Request(`${BASE}/v1/quote/SQ`), makeEnv(kv), deps)).json()).toMatchObject({ symbol: 'XYZ' });
    expect((await handleRequest(new Request(`${BASE}/v1/quote/FAKE`), makeEnv(kv), deps)).status).toBe(404);
  });

  it('GET /v1/quote outside market hours makes no upstream call', async () => {
    const kv = await seeded();
    const night = new Date('2026-10-08T03:00:00Z');
    const f = fakeFetch({});
    const res = await handleRequest(new Request(`${BASE}/v1/quote/AAPL`), makeEnv(kv), makeDeps(f.fn, night));
    expect(res.status).toBe(200);
    expect(f.calls).toHaveLength(0);
  });

  it('GET /v1/health is 200 when fresh and 503 when stale in session', async () => {
    const kv = await seeded();
    const ok = await handleRequest(new Request(`${BASE}/v1/health`), makeEnv(kv), makeDeps(fakeFetch({}).fn, OPEN));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, counts: { alpaca: 110 } });
    const stale = await handleRequest(new Request(`${BASE}/v1/health`), makeEnv(kv), makeDeps(fakeFetch({}).fn, new Date(OPEN.getTime() + 11 * 60_000)));
    expect(stale.status).toBe(503);
  });

  it('CORS: allowed origins get the header, others do not', async () => {
    const kv = await seeded();
    const env = makeEnv(kv, { ALLOWED_ORIGINS: 'https://app.example.com, https://investmentapp-*-team.vercel.app' });
    const deps = makeDeps(fakeFetch({}).fn, OPEN);
    const get = (origin: string) => handleRequest(new Request(`${BASE}/v1/prices`, { headers: { Origin: origin } }), env, deps);
    expect((await get('https://app.example.com')).headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
    expect((await get('https://investmentapp-git-x-team.vercel.app')).headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    expect((await get('https://evil.example.com')).headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect((await get('http://localhost:8081')).headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8081');
  });

  it('origin patterns cannot be stretched across hostname dots', () => {
    expect(originAllowed('https://investmentapp-a.evil.com-team.vercel.app', 'https://investmentapp-*-team.vercel.app')).toBe(false);
  });

  it('rejects writes', async () => {
    const res = await handleRequest(new Request(`${BASE}/v1/prices`, { method: 'POST' }), makeEnv(new FakeKV()), makeDeps(fakeFetch({}).fn, OPEN));
    expect(res.status).toBe(405);
  });
});
