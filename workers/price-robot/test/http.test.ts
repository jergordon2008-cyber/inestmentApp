import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearHttpMemo, handleRequest, originAllowed, publicView } from '../src/http';
import { clearSessionMemo, refresh } from '../src/refresh';
import type { PriceBlob } from '../src/types';
import { ALPACA_CAL, ALPACA_SNAP, alpacaBody, calendarRoute, fakeFetch, FakeKV, FINNHUB, finnhubBody, jsonRes, makeDeps, makeEnv } from './helpers';

const OPEN = new Date('2026-10-07T18:00:00Z');
const BASE = 'https://price-robot.example.workers.dev';
const APP = 'https://app.example.com';        // the one allowed site in these tests
const price = (s: string) => (s === 'AAPL' ? 333.75 : 100);

/** An Env that allows APP, like production allows its own domains. */
const envFor = (kv: FakeKV, extra: Parameters<typeof makeEnv>[1] = {}) => makeEnv(kv, { ALLOWED_ORIGINS: APP, ...extra });
/** A request as the app's page would make it: the browser adds Origin. */
const fromApp = (path: string, init: RequestInit = {}) =>
  new Request(`${BASE}${path}`, { ...init, headers: { Origin: APP, ...(init.headers as Record<string, string> | undefined) } });

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
    const res = await handleRequest(fromApp('/v1/prices'), envFor(kv), makeDeps(fakeFetch({}).fn, OPEN));
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
    const env = envFor(counting as unknown as FakeKV);
    await handleRequest(fromApp('/v1/prices'), env, makeDeps(fakeFetch({}).fn, OPEN));
    await handleRequest(fromApp('/v1/prices'), env, makeDeps(fakeFetch({}).fn, new Date(OPEN.getTime() + 20_000)));
    expect(reads).toBe(1);
    await handleRequest(fromApp('/v1/prices'), env, makeDeps(fakeFetch({}).fn, new Date(OPEN.getTime() + 31_000)));
    expect(reads).toBe(2);
  });

  it('GET /v1/prices before the first run is 503', async () => {
    const res = await handleRequest(fromApp('/v1/prices'), envFor(new FakeKV()), makeDeps(fakeFetch({}).fn, OPEN));
    expect(res.status).toBe(503);
  });

  it('GET /v1/quote serves a fresh stored quote without calling Alpaca', async () => {
    const kv = await seeded();
    const f = fakeFetch({});
    const res = await handleRequest(fromApp('/v1/quote/aapl'), envFor(kv), makeDeps(f.fn, new Date(OPEN.getTime() + 60_000)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ symbol: 'AAPL', onDemand: false, quote: { p: 333.75 } });
    expect(f.calls).toHaveLength(0);
  });

  it('GET /v1/quote refetches a quote older than 4 minutes from Alpaca only', async () => {
    const kv = await seeded();
    const later = new Date(OPEN.getTime() + 5 * 60_000);
    const f = fakeFetch({ [ALPACA_SNAP]: url => jsonRes(alpacaBody(url, new Date(later.getTime() - 5_000).toISOString(), () => 340)) });
    const res = await handleRequest(fromApp('/v1/quote/AAPL'), envFor(kv), makeDeps(f.fn, later));
    expect(await res.json()).toMatchObject({ onDemand: true, quote: { p: 340, src: 'alpaca' } });
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]).toContain('symbols=AAPL');
  });

  it('GET /v1/quote keeps the stored quote if Alpaca fails, and never calls Finnhub', async () => {
    const kv = await seeded();
    const later = new Date(OPEN.getTime() + 5 * 60_000);
    const f = fakeFetch({ [ALPACA_SNAP]: () => jsonRes({}, 500) });
    const res = await handleRequest(fromApp('/v1/quote/AAPL'), envFor(kv), makeDeps(f.fn, later));
    expect(await res.json()).toMatchObject({ onDemand: false, quote: { p: 333.75 } });
    expect(f.calls.every(u => u.startsWith(ALPACA_SNAP))).toBe(true);
  });

  it('GET /v1/quote maps SQ to XYZ and rejects unknown symbols', async () => {
    const kv = await seeded();
    const deps = makeDeps(fakeFetch({}).fn, OPEN);
    expect(await (await handleRequest(fromApp('/v1/quote/SQ'), envFor(kv), deps)).json()).toMatchObject({ symbol: 'XYZ' });
    expect((await handleRequest(fromApp('/v1/quote/FAKE'), envFor(kv), deps)).status).toBe(404);
  });

  it('GET /v1/quote outside market hours makes no upstream call', async () => {
    const kv = await seeded();
    const night = new Date('2026-10-08T03:00:00Z');
    const f = fakeFetch({});
    const res = await handleRequest(fromApp('/v1/quote/AAPL'), envFor(kv), makeDeps(f.fn, night));
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

  it('CORS: allowed origins get the header (exact or pattern); others are refused with none', async () => {
    const kv = await seeded();
    const env = makeEnv(kv, { ALLOWED_ORIGINS: 'https://app.example.com, https://investmentapp-*-team.vercel.app' });
    const deps = makeDeps(fakeFetch({}).fn, OPEN);
    const get = (origin: string) => handleRequest(new Request(`${BASE}/v1/prices`, { headers: { Origin: origin } }), env, deps);
    expect((await get('https://app.example.com')).headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
    expect((await get('https://investmentapp-git-x-team.vercel.app')).headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    const evil = await get('https://evil.example.com');
    expect(evil.status).toBe(403);
    expect(evil.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('origin patterns cannot be stretched across hostname dots', () => {
    expect(originAllowed('https://investmentapp-a.evil.com-team.vercel.app', 'https://investmentapp-*-team.vercel.app')).toBe(false);
  });

  it('rejects writes', async () => {
    const res = await handleRequest(new Request(`${BASE}/v1/prices`, { method: 'POST' }), makeEnv(new FakeKV()), makeDeps(fakeFetch({}).fn, OPEN));
    expect(res.status).toBe(405);
  });
});

describe('origin enforcement: /v1/prices and /v1/quote/* only answer allowed sites', () => {
  beforeEach(() => { clearSessionMemo(); clearHttpMemo(); });
  const deps = () => makeDeps(fakeFetch({}).fn, OPEN);

  it('an allowed origin passes, and gets the CORS header', async () => {
    const kv = await seeded();
    const res = await handleRequest(fromApp('/v1/prices'), envFor(kv), deps());
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(APP);
  });

  it('a request with no Origin (curl, a script, a browser tab on the URL) is refused', async () => {
    const kv = await seeded();
    const res = await handleRequest(new Request(`${BASE}/v1/prices`), envFor(kv), deps());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'origin not allowed' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('a wrong origin is refused: another site, a lookalike host, the wrong scheme, "null"', async () => {
    const kv = await seeded();
    for (const origin of ['https://evil.example.com', 'https://app.example.com.evil.com', 'http://app.example.com', 'https://sub.app.example.com', 'null']) {
      const res = await handleRequest(new Request(`${BASE}/v1/prices`, { headers: { Origin: origin } }), envFor(kv), deps());
      expect(res.status, origin).toBe(403);
    }
  });

  it('/v1/health stays open: no origin, a wrong origin, and an allowed one all get it', async () => {
    const kv = await seeded();
    const variants: Record<string, string>[] = [{}, { Origin: 'https://evil.example.com' }, { Origin: APP }];
    for (const headers of variants) {
      const res = await handleRequest(new Request(`${BASE}/v1/health`, { headers }), envFor(kv), deps());
      expect(res.status, JSON.stringify(headers)).toBe(200);
      expect(await res.json()).toMatchObject({ ok: true });
    }
  });

  it('/v1/quote/* is enforced the same way', async () => {
    const kv = await seeded();
    expect((await handleRequest(fromApp('/v1/quote/AAPL'), envFor(kv), deps())).status).toBe(200);
    expect((await handleRequest(new Request(`${BASE}/v1/quote/AAPL`), envFor(kv), deps())).status).toBe(403);
    expect((await handleRequest(new Request(`${BASE}/v1/quote/AAPL`, { headers: { Origin: 'https://evil.example.com' } }), envFor(kv), deps())).status).toBe(403);
  });

  it('a refused request does no work: no KV read, no Alpaca call', async () => {
    const kv = await seeded();
    let reads = 0;
    const counting = { ...kv, get: async (...a: Parameters<FakeKV['get']>) => { reads++; return kv.get(...a); } };
    const f = fakeFetch({});
    const later = makeDeps(f.fn, new Date(OPEN.getTime() + 5 * 60_000));     // old enough that an allowed request WOULD call Alpaca
    const env = envFor(counting as unknown as FakeKV);
    await handleRequest(new Request(`${BASE}/v1/quote/AAPL`), env, later);
    await handleRequest(new Request(`${BASE}/v1/prices`), env, later);
    expect(reads).toBe(0);
    expect(f.calls).toHaveLength(0);
  });

  it('an unknown symbol is 403, not 404, without an origin (symbols are not probed)', async () => {
    const kv = await seeded();
    expect((await handleRequest(new Request(`${BASE}/v1/quote/FAKE`), envFor(kv), deps())).status).toBe(403);
  });

  it('a response cached for the app is not served to a request without an origin', async () => {
    const kv = await seeded();
    const env = envFor(kv);
    expect((await handleRequest(fromApp('/v1/prices'), env, deps())).status).toBe(200);          // now in the Worker's memory
    expect((await handleRequest(new Request(`${BASE}/v1/prices`), env, deps())).status).toBe(403);
    expect((await handleRequest(new Request(`${BASE}/v1/prices`, { method: 'HEAD' }), env, deps())).status).toBe(403);
  });

  it('a preflight from an allowed site is answered; from another site it gets no CORS headers', async () => {
    const env = envFor(new FakeKV());
    const ok = await handleRequest(new Request(`${BASE}/v1/prices`, { method: 'OPTIONS', headers: { Origin: APP } }), env, deps());
    expect(ok.status).toBe(204);
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe(APP);
    const bad = await handleRequest(new Request(`${BASE}/v1/prices`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example.com' } }), env, deps());
    expect(bad.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('with no ALLOWED_ORIGINS set, everything is refused (fails closed)', async () => {
    const kv = await seeded();
    const res = await handleRequest(fromApp('/v1/prices'), makeEnv(kv), deps());
    expect(res.status).toBe(403);
  });
});

describe('localhost is a development setting only', () => {
  beforeEach(() => { clearSessionMemo(); clearHttpMemo(); });
  const deps = () => makeDeps(fakeFetch({}).fn, OPEN);
  const local = (origin: string, host = 'http://127.0.0.1:8787') =>
    new Request(`${host}/v1/prices`, { headers: { Origin: origin } });

  it('localhost origins are refused by default, as in production', async () => {
    const kv = await seeded();
    for (const origin of ['http://localhost:8081', 'http://127.0.0.1:3000', 'http://localhost']) {
      expect((await handleRequest(local(origin), envFor(kv), deps())).status, origin).toBe(403);
      expect((await handleRequest(new Request(`${BASE}/v1/prices`, { headers: { Origin: origin } }), envFor(kv), deps())).status, origin).toBe(403);
    }
    expect(originAllowed('http://localhost:8081', APP)).toBe(false);
  });

  it('DEV_ALLOW_LOCALHOST=1 allows localhost origins when the Worker is reached at localhost (wrangler dev)', async () => {
    const kv = await seeded();
    const env = envFor(kv, { DEV_ALLOW_LOCALHOST: '1' });
    const res = await handleRequest(local('http://localhost:8081'), env, deps());
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8081');
    expect((await handleRequest(local('https://evil.example.com'), env, deps())).status).toBe(403);   // only localhost is added
  });

  it('DEV_ALLOW_LOCALHOST set by mistake on the deployed Worker still allows nothing', async () => {
    const kv = await seeded();
    const env = envFor(kv, { DEV_ALLOW_LOCALHOST: '1' });
    expect((await handleRequest(new Request(`${BASE}/v1/prices`, { headers: { Origin: 'http://localhost:8081' } }), env, deps())).status).toBe(403);
  });

  it('wrangler.toml, the file that is deployed, has no dev setting and no localhost origin', () => {
    const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
    const live = toml.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
    expect(live).not.toMatch(/DEV_/);
    expect(live).not.toMatch(/localhost|127\.0\.0\.1/);
    const origins = /^ALLOWED_ORIGINS\s*=\s*"([^"]*)"/m.exec(live)?.[1] ?? '';
    expect(origins.split(',').map(s => s.trim()).filter(Boolean).every(o => o.startsWith('https://'))).toBe(true);
  });
});

describe('/v1/prices serves only what the app reads', () => {
  beforeEach(() => { clearSessionMemo(); clearHttpMemo(); });

  // Mirrors the app's validators in src/services/priceRobotAdapter.ts
  // (isRobotPrices / isQuote) and what stockDataService does with a quote.
  function appAccepts(body: any): boolean {
    if (!(body && body.v === 1 && typeof body.asOf === 'string' && Number.isFinite(Date.parse(body.asOf)) && body.quotes && typeof body.quotes === 'object')) return false;
    if (!['open', 'closed', 'after-close'].includes(body.market)) return false;     // getPricesLabel switches on it
    return Object.values<any>(body.quotes).every(q =>
      typeof q.p === 'number' && q.p > 0 && typeof q.t === 'string' && Number.isFinite(Date.parse(q.t)) && (q.src === 'alpaca' || q.src === 'finnhub')
      && (q.pc === null || typeof q.pc === 'number')
      && (q.hi === undefined || typeof q.hi === 'number') && (q.lo === undefined || typeof q.lo === 'number'));
  }

  it('the top level is exactly v, asOf, market and quotes', async () => {
    const kv = await seeded();
    const body = await (await handleRequest(fromApp('/v1/prices'), envFor(kv), makeDeps(fakeFetch({}).fn, OPEN))).json() as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['asOf', 'market', 'quotes', 'v']);
  });

  it('every quote has only price, previous close, trade time, source and day high/low', async () => {
    const kv = await seeded();
    const body = await (await handleRequest(fromApp('/v1/prices'), envFor(kv), makeDeps(fakeFetch({}).fn, OPEN))).json() as { quotes: Record<string, Record<string, unknown>> };
    const allowed = new Set(['p', 'pc', 't', 'src', 'hi', 'lo']);
    for (const [sym, q] of Object.entries(body.quotes)) {
      for (const key of Object.keys(q)) expect(allowed.has(key), `${sym}.${key}`).toBe(true);
      expect(q).toHaveProperty('p');
      expect(q).toHaveProperty('t');
      expect(q).toHaveProperty('src');
    }
    expect(body.quotes.AAPL).toMatchObject({ p: 333.75, src: 'alpaca' });
  });

  it('the payload still passes the app\'s own checks', async () => {
    const kv = await seeded();
    const body = await (await handleRequest(fromApp('/v1/prices'), envFor(kv), makeDeps(fakeFetch({}).fn, OPEN))).json();
    expect(appAccepts(body)).toBe(true);
  });

  it('a field the Worker adds later is not served until it is added to the allow-list', () => {
    const blob = {
      v: 1, asOf: '2026-10-07T18:00:00.000Z', market: 'open', final: true, alpacaOk: true, alpacaFails: 2, retry: ['AAPL'],
      session: { date: '2026-10-07', open: 570, close: 960, source: 'calendar' },
      authError: { source: 'alpaca', status: 403, at: '2026-10-07T17:00:00.000Z' },
      quotes: {
        AAPL: { p: 333.75, pc: 333.69, t: '2026-10-07T17:59:30.000Z', src: 'alpaca', hi: 335, lo: 331, chk: 0.1, chkAt: '2026-10-07T17:58:00.000Z', stale: true, futureField: 'secret' },
      },
    } as unknown as PriceBlob;
    const view = publicView(blob);
    expect(Object.keys(view).sort()).toEqual(['asOf', 'market', 'quotes', 'v']);
    expect(view.quotes.AAPL).toEqual({ p: 333.75, pc: 333.69, t: '2026-10-07T17:59:30.000Z', src: 'alpaca', hi: 335, lo: 331 });
    expect(JSON.stringify(view)).not.toMatch(/stale|futureField|secret|chk|retry|authError|session|final|alpacaOk/);
  });

  it('hi and lo are left out, not null, when the source gave none', () => {
    const blob = { v: 1, asOf: '2026-10-07T18:00:00.000Z', market: 'open', quotes: { KO: { p: 70, pc: null, t: '2026-10-07T17:59:00.000Z', src: 'finnhub' } } } as unknown as PriceBlob;
    expect(publicView(blob).quotes.KO).toEqual({ p: 70, pc: null, t: '2026-10-07T17:59:00.000Z', src: 'finnhub' });
  });
});
