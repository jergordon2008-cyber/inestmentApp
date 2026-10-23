/**
 * The app-facing API. Read-only; the API keys never leave the Worker.
 *
 *   GET /v1/prices       every ticker, from KV, cached 30 s. ?held=AAPL,VOO
 *                        marks the student's holdings as priority tickers.
 *   GET /v1/quote/:sym   one ticker, from KV, cached 15 s; marks it as a
 *                        priority ticker ("recently opened")
 *   GET /v1/health       age and freshness counts; 503 when stale in session
 *
 * None of these call Finnhub: only the cron does, so the 45/min budget holds
 * whatever the traffic.
 *
 * /v1/prices and /v1/quote/* answer 403 unless the request's Origin header is
 * one of ALLOWED_ORIGINS (so a request with no Origin, e.g. curl or a browser
 * tab opened on the URL, is refused too). The check runs before anything is
 * read, cached or fetched upstream. /v1/health stays open.
 *
 * What this is and isn't: browsers always send Origin and a web page can't
 * change it, so other websites can't use the API, and a link to it opens
 * nothing. A script outside a browser can still send any Origin it likes, so
 * this is not authentication and does not stop deliberate scraping.
 */
import { defaultSession, etNow, phaseAt, type Session } from './calendar';
import { flushDemand, noteDemand, parseHeld } from './demand';
import { readBlob } from './kv';
import { countOld } from './merge';
import { resolveSymbol, SYMBOLS } from './symbols';
import type { Deps, Env, PriceBlob, Quote } from './types';
import { STALE_AFTER_MS } from './watchdog';
const PRICES_MAX_AGE = 30;
const QUOTE_MAX_AGE = 15;

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Local development only. Needs DEV_ALLOW_LOCALHOST=1 AND the Worker itself
 * being reached at localhost, which only `wrangler dev` does: a deployed
 * Worker is reached at *.workers.dev, so a stray DEV_ALLOW_LOCALHOST there
 * would still allow nothing.
 */
function localhostAllowed(req: Request, env: Env): boolean {
  return env.DEV_ALLOW_LOCALHOST === '1' && LOCAL_HOSTS.has(new URL(req.url).hostname);
}

export function originAllowed(origin: string, allowed: string | undefined, allowLocalhost = false): boolean {
  if (allowLocalhost && LOCAL_ORIGIN.test(origin)) return true;
  for (const raw of (allowed ?? '').split(',')) {
    const pattern = raw.trim();
    if (!pattern) continue;
    if (pattern === origin) return true;
    if (pattern.includes('*')) {
      // "*" matches one run of letters, digits and dashes inside a hostname,
      // e.g. https://investmentapp-*-malik-c31f.vercel.app for preview URLs.
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
  if (origin && originAllowed(origin, env.ALLOWED_ORIGINS, localhostAllowed(req, env))) {
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

/**
 * 403 for a request that isn't from an allowed site. No CORS headers (the
 * browser reports it as blocked), no caching, and nothing has been read from
 * KV by the time this is returned.
 */
function refuseUnlessAllowedOrigin(req: Request, env: Env): Response | null {
  const origin = req.headers.get('Origin');
  if (origin && originAllowed(origin, env.ALLOWED_ORIGINS, localhostAllowed(req, env))) return null;
  return new Response(JSON.stringify({ error: 'origin not allowed' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/**
 * The fields the app reads from a quote (priceRobotAdapter + stockDataService:
 * price, previous close, trade time, source, day high/low, and when the robot
 * last confirmed it with Finnhub). An allow-list on purpose: a field added to
 * Quote later is not served until it is added here.
 */
export type PublicQuote = Pick<Quote, 'p' | 'pc' | 't' | 'src' | 'hi' | 'lo' | 'at'>;

function publicQuote(q: Quote): PublicQuote {
  const out: PublicQuote = { p: q.p, pc: q.pc, t: q.t, src: q.src, at: q.at ?? '' };
  if (q.hi !== undefined) out.hi = q.hi;
  if (q.lo !== undefined) out.lo = q.lo;
  return out;
}

/**
 * What /v1/prices serves: only what the app reads (v, asOf, market and each
 * quote's PublicQuote fields). Not served: the robot's bookkeeping (auth
 * errors, failure counts) and the session/final/closeFrom status, none of
 * which the app uses; /v1/health has the status.
 */
export function publicView(blob: PriceBlob) {
  const quotes: Record<string, PublicQuote> = {};
  for (const [sym, q] of Object.entries(blob.quotes)) quotes[sym] = publicQuote(q);
  return { v: blob.v, asOf: blob.asOf, market: blob.market, quotes };
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
    const refused = refuseUnlessAllowedOrigin(req, env);
    if (refused) return refused;
    recordDemand(parseHeld(new URL(req.url).searchParams.get('held')), env, deps, ctx);
    const res = await cached('v1/prices', PRICES_MAX_AGE, deps.now(), async () => {
      const blob = await readBlob(env.PRICES, PRICES_MAX_AGE);
      return blob ? json(publicView(blob), 200, PRICES_MAX_AGE) : json({ error: 'no prices yet' }, 503, 0);
    }, ctx);
    return withCors(res, req, env);
  }

  const quoteMatch = /^\/v1\/quote\/([A-Za-z.]{1,10})$/.exec(path);
  if (quoteMatch) {
    const refused = refuseUnlessAllowedOrigin(req, env);
    if (refused) return refused;
    const sym = resolveSymbol(quoteMatch[1]!);
    if (!sym) return withCors(json({ error: 'unknown symbol' }, 404, 300), req, env);
    recordDemand([sym], env, deps, ctx);
    const res = await cached(`v1/quote/${sym}`, QUOTE_MAX_AGE, deps.now(), () => quoteResponse(sym, env), ctx);
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
    const quotes = Object.keys(blob?.quotes ?? {}).length;
    const old = countOld(blob, now);
    return withCors(json({
      ok,
      asOf: blob?.asOf ?? null,
      ageSec: ageMs === null ? null : Math.round(ageMs / 1000),
      market: blob?.market ?? null,
      final: blob?.final ?? false,
      finnhubOk: blob?.finnhubOk ?? null,
      authError: blob?.authError ? { source: blob.authError.source, status: blob.authError.status } : null,
      // Out of all 109 (SYMBOLS): confirmed = a Finnhub price within the last 5 minutes (tradable).
      counts: { quotes, confirmed: SYMBOLS.length - old, old },
    }, ok ? 200 : 503, 0), req, env);
  }

  if (path === '' || path === '/') {
    return withCors(new Response('price-robot: see /v1/prices, /v1/quote/:symbol, /v1/health\n', { headers: { 'Content-Type': 'text/plain' } }), req, env);
  }
  return withCors(json({ error: 'not found' }, 404, 300), req, env);
}

/**
 * Notes priority tickers in memory and, at most once a minute per isolate,
 * merges them into KV after the response is sent (demand.ts).
 */
function recordDemand(symbols: string[], env: Env, deps: Deps, ctx?: ExecutionContext): void {
  if (symbols.length === 0) return;
  const now = deps.now();
  noteDemand(symbols, now.getTime());
  const flush = flushDemand(env.PRICES, now).catch(() => false);
  if (ctx) ctx.waitUntil(flush);
}

/**
 * One ticker, from KV. No upstream call: a ticker a student opens becomes a
 * priority ticker instead, so the next run (within a minute) refreshes it.
 */
async function quoteResponse(sym: string, env: Env): Promise<Response> {
  const blob = await readBlob(env.PRICES, PRICES_MAX_AGE);
  const quote = blob?.quotes[sym];
  if (!quote) return json({ error: 'no price yet' }, 503, 0);
  return json({ symbol: sym, quote: publicQuote(quote), asOf: blob.asOf, market: blob.market }, 200, QUOTE_MAX_AGE);
}
