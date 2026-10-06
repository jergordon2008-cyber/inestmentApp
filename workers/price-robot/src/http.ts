/**
 * The app-facing API. Read-only and public by design: prices aren't secret,
 * and the API keys never leave the Worker.
 *
 *   GET /v1/prices       every ticker, from KV, cached 30 s
 *   GET /v1/quote/:sym   one ticker; refetched from Alpaca if > 4 min old, cached 15 s
 *   GET /v1/health       age and source counts; 503 when stale in session
 *
 * CORS only lets the app's own web origins read from a browser. Native apps
 * send no Origin, so this limits other websites, not access in general.
 */
import { fetchAlpacaSnapshots } from './alpaca';
import { defaultSession, etNow, phaseAt, type Session } from './calendar';
import { readBlob } from './kv';
import { FRESH_MS } from './merge';
import { resolveSymbol } from './symbols';
import type { Deps, Env, PriceBlob, Quote } from './types';
import { STALE_AFTER_MS } from './watchdog';

/** A quote older than this during the session is refetched on demand. */
export const ON_DEMAND_AFTER_MS = 4 * 60_000;
const PRICES_MAX_AGE = 30;
const QUOTE_MAX_AGE = 15;

export function originAllowed(origin: string, allowed: string | undefined): boolean {
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  for (const raw of (allowed ?? '').split(',')) {
    const pattern = raw.trim();
    if (!pattern) continue;
    if (pattern === origin) return true;
    if (pattern.includes('*')) {
      // "*" matches one run of letters, digits and dashes inside a hostname,
      // e.g. https://<project>-*-<team>.vercel.app for Vercel preview URLs.
      const re = new RegExp('^' + pattern.split('*').map(p => p.replace(/[.+?^${}()|[\]\\/]/g, '\\$&')).join('[a-z0-9-]*') + '$');
      if (re.test(origin)) return true;
    }
  }
  return false;
}

function withCors(res: Response, req: Request, env: Env): Response {
  const origin = req.headers.get('Origin');
  const headers = new Headers(res.headers);
  headers.append('Vary', 'Origin');
  if (origin && originAllowed(origin, env.ALLOWED_ORIGINS)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return new Response(res.body, { status: res.status, headers });
}

function json(body: unknown, status: number, maxAge: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${maxAge}` },
  });
}

/** What the app sees: quotes and status, without the robot's bookkeeping. */
export function publicView(blob: PriceBlob) {
  const quotes: Record<string, Omit<Quote, 'chk' | 'chkAt'>> = {};
  for (const [sym, q] of Object.entries(blob.quotes)) {
    const { chk: _chk, chkAt: _chkAt, ...rest } = q;
    quotes[sym] = rest;
  }
  return {
    v: blob.v,
    asOf: blob.asOf,
    market: blob.market,
    final: blob.final,
    session: blob.session ? { date: blob.session.date } : null,
    alpacaOk: blob.alpacaOk,
    quotes,
  };
}

function edgeCache(): Cache | null {
  const c = (globalThis as { caches?: { default?: Cache } }).caches;
  return c?.default ?? null;
}

// Responses kept in this Worker instance's memory. On *.workers.dev the
// Cache API does nothing, so this is what keeps KV reads (100,000/day) far
// below the request count: one instance serves many requests in a row.
const memo = new Map<string, { status: number; headers: [string, string][]; body: string; expires: number }>();

export function clearHttpMemo(): void {
  memo.clear();
}

/** Serves `key` from memory, then the edge cache (custom domains only), else builds it. */
async function cached(key: string, maxAge: number, now: Date, build: () => Promise<Response>, ctx?: ExecutionContext): Promise<Response> {
  const hit = memo.get(key);
  if (hit && hit.expires > now.getTime()) {
    return new Response(hit.body, { status: hit.status, headers: hit.headers });
  }
  const cache = edgeCache();
  const req = new Request(`https://price-robot.cache/${key}`);
  let res = cache ? await cache.match(req) : undefined;
  if (!res) {
    res = await build();
    if (cache && res.status === 200) {
      const put = cache.put(req, res.clone());
      if (ctx) ctx.waitUntil(put);
      else await put;
    }
  }
  if (res.status === 200) {
    const body = await res.text();
    memo.set(key, { status: res.status, headers: [...res.headers], body, expires: now.getTime() + maxAge * 1000 });
    return new Response(body, { status: res.status, headers: res.headers });
  }
  return res;
}

function sessionFor(blob: PriceBlob | null, now: Date, env: Env): Session {
  const et = etNow(now);
  if (env.DEV_FORCE_OPEN === '1') return { date: et.date, open: 0, close: 24 * 60, source: 'default' };
  if (blob?.session?.date === et.date) return blob.session;
  return defaultSession(et);
}

export async function handleRequest(req: Request, env: Env, deps: Deps, ctx?: ExecutionContext): Promise<Response> {
  if (req.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), req, env);
  if (req.method !== 'GET' && req.method !== 'HEAD') return withCors(json({ error: 'method not allowed' }, 405, 0), req, env);

  const path = new URL(req.url).pathname.replace(/\/+$/, '');

  if (path === '/v1/prices') {
    const res = await cached('v1/prices', PRICES_MAX_AGE, deps.now(), async () => {
      const blob = await readBlob(env.PRICES, PRICES_MAX_AGE);
      return blob ? json(publicView(blob), 200, PRICES_MAX_AGE) : json({ error: 'no prices yet' }, 503, 0);
    }, ctx);
    return withCors(res, req, env);
  }

  const quoteMatch = /^\/v1\/quote\/([A-Za-z.]{1,10})$/.exec(path);
  if (quoteMatch) {
    const sym = resolveSymbol(quoteMatch[1]!);
    if (!sym) return withCors(json({ error: 'unknown symbol' }, 404, 300), req, env);
    const res = await cached(`v1/quote/${sym}`, QUOTE_MAX_AGE, deps.now(), () => quoteResponse(sym, env, deps), ctx);
    return withCors(res, req, env);
  }

  if (path === '/v1/health') {
    const now = deps.now();
    const blob = await readBlob(env.PRICES);
    const session = sessionFor(blob, now, env);
    const et = etNow(now);
    const ageMs = blob ? now.getTime() - Date.parse(blob.asOf) : null;
    const inSession = phaseAt(et.minutes, session) !== 'closed';
    const ok = !!blob && (!inSession || (blob.final && blob.session?.date === et.date) || (ageMs ?? Infinity) <= STALE_AFTER_MS);
    const counts = { alpaca: 0, finnhub: 0, stale: 0 };
    for (const q of Object.values(blob?.quotes ?? {})) {
      if (q.stale) counts.stale++;
      else counts[q.src]++;
    }
    return withCors(json({
      ok,
      asOf: blob?.asOf ?? null,
      ageSec: ageMs === null ? null : Math.round(ageMs / 1000),
      market: blob?.market ?? null,
      final: blob?.final ?? false,
      alpacaOk: blob?.alpacaOk ?? null,
      authError: blob?.authError ? { source: blob.authError.source, status: blob.authError.status } : null,
      counts,
    }, ok ? 200 : 503, 0), req, env);
  }

  if (path === '' || path === '/') {
    return withCors(new Response('price-robot: see /v1/prices, /v1/quote/:symbol, /v1/health\n', { headers: { 'Content-Type': 'text/plain' } }), req, env);
  }
  return withCors(json({ error: 'not found' }, 404, 300), req, env);
}

/**
 * On demand: a ticker a student opens jumps the queue. If the stored quote is
 * more than 4 minutes old during the session (or stale), ask Alpaca for that
 * one ticker right away. Not written to KV (the 2-minute run catches up), and
 * Finnhub isn't called here, so its rate stays within the approved ~8/min.
 */
async function quoteResponse(sym: string, env: Env, deps: Deps): Promise<Response> {
  const now = deps.now();
  const blob = await readBlob(env.PRICES, PRICES_MAX_AGE);
  let quote: Quote | undefined = blob?.quotes[sym];
  const phase = phaseAt(etNow(now).minutes, sessionFor(blob, now, env));
  const old = !quote || !!quote.stale || now.getTime() - Date.parse(quote.t) > ON_DEMAND_AFTER_MS;
  let onDemand = false;

  if (phase !== 'closed' && old) {
    const live = await fetchAlpacaSnapshots([sym], env, deps.fetch, deps.sleep, []);
    const a = live.ok ? live.quotes[sym] : undefined;
    if (a && (!quote || Date.parse(a.t) > Date.parse(quote.t))) {
      quote = { ...a, src: 'alpaca' };
      if (now.getTime() - Date.parse(a.t) > FRESH_MS) quote.stale = true;
      onDemand = true;
    }
  }

  if (!quote) return json({ error: 'no price yet' }, 503, 0);
  const { chk: _chk, chkAt: _chkAt, ...rest } = quote;
  return json({ symbol: sym, quote: rest, asOf: onDemand ? now.toISOString() : blob?.asOf ?? null, onDemand, market: blob?.market ?? null }, 200, QUOTE_MAX_AGE);
}
