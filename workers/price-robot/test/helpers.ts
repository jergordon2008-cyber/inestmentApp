import { refresh } from '../src/refresh';
import { SYMBOLS } from '../src/symbols';
import type { Deps, Env } from '../src/types';

/** In-memory stand-in for a KV namespace (only what the Worker uses). */
export class FakeKV {
  store = new Map<string, string>();
  puts = 0;
  failNextPuts = 0;
  async get(key: string, opts?: { type?: string } | string): Promise<unknown> {
    const v = this.store.get(key);
    if (v === undefined) return null;
    const type = typeof opts === 'string' ? opts : opts?.type;
    return type === 'json' ? JSON.parse(v) : v;
  }
  async put(key: string, value: string): Promise<void> {
    if (this.failNextPuts > 0) {
      this.failNextPuts--;
      throw new Error('KV put failed');
    }
    this.puts++;
    this.store.set(key, value);
  }
  json<T>(key: string): T | null {
    const v = this.store.get(key);
    return v === undefined ? null : (JSON.parse(v) as T);
  }
}

type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>;

/** fetch() that routes by URL prefix and records every call. Unrouted URLs throw. */
export function fakeFetch(routes: Record<string, Handler>) {
  const calls: string[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    calls.push(url.href);
    for (const [prefix, handler] of Object.entries(routes)) {
      if (url.href.startsWith(prefix)) return handler(url, init);
    }
    throw new Error(`unexpected fetch ${url.href}`);
  }) as typeof fetch;
  return { fn, calls };
}

// Alpaca: only for the disabled adapter's own tests (test/alpaca.test.ts).
export const ALPACA_SNAP = 'https://data.alpaca.markets/v2/stocks/snapshots';
export const ALPACA_CAL = 'https://paper-api.alpaca.markets/v2/calendar';
export const FINNHUB = 'https://finnhub.io/api/v1/quote';
export const FINNHUB_HOLIDAYS = 'https://finnhub.io/api/v1/stock/market-holiday';

export function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Alpaca snapshot body: every requested symbol traded at `price(sym)` at `tradeTime`. */
export function alpacaBody(url: URL, tradeTime: string, price: (sym: string) => number = () => 100) {
  const syms = (url.searchParams.get('symbols') ?? '').split(',').filter(Boolean);
  const body: Record<string, unknown> = {};
  for (const s of syms) {
    body[s] = {
      latestTrade: { p: price(s), t: tradeTime },
      dailyBar: { h: price(s) + 1, l: price(s) - 1, t: tradeTime.slice(0, 10) + 'T04:00:00Z' },
      prevDailyBar: { c: price(s) - 2 },
    };
  }
  return body;
}

/** Finnhub /quote body at `price`, timestamp `tradeTime`. */
export function finnhubBody(price: number, tradeTime: string) {
  return { c: price, pc: price - 2, h: price + 1, l: price - 1, t: Math.floor(Date.parse(tradeTime) / 1000) };
}

/** Finnhub's US holiday list, shaped like the real answer (checked 2026-10-22). */
export const HOLIDAYS = [
  { eventName: 'Christmas', atDate: '2026-12-25', tradingHour: '', postMarket: '' },
  { eventName: 'Christmas', atDate: '2026-12-24', tradingHour: '09:30-13:00', postMarket: '13:00:17:00' },
  { eventName: 'Thanksgiving Day', atDate: '2026-11-27', tradingHour: '09:30-13:00', postMarket: '13:00:17:00' },
  { eventName: 'Thanksgiving Day', atDate: '2026-11-26', tradingHour: '', postMarket: '' },
  { eventName: 'Labor Day', atDate: '2026-09-07', tradingHour: '', postMarket: '' },
];

export function holidaysRoute(status = 200): Handler {
  return () => jsonRes(status === 200 ? { data: HOLIDAYS, exchange: 'US', timezone: 'America/New_York' } : { error: 'x' }, status);
}

/** Alpaca calendar (disabled adapter only). */
export function calendarRoute(open = '09:30', close = '16:00', holiday = false): Handler {
  return url => {
    const date = url.searchParams.get('start');
    return jsonRes(holiday ? [] : [{ date, open, close }]);
  };
}

export function makeEnv(kv: FakeKV, extra: Partial<Env> = {}): Env {
  return {
    PRICES: kv as unknown as KVNamespace,
    FINNHUB_KEY: 'test-finnhub',
    ...extra,
  };
}

export function makeDeps(fetchFn: typeof fetch, now: Date | (() => Date)): Deps {
  return {
    fetch: fetchFn,
    now: typeof now === 'function' ? now : () => now,
    sleep: async () => {},
  };
}

export const ALL = SYMBOLS;

/** Finnhub answering every quote at `price(sym)`, traded 30 s before `now()`. */
export function finnhubWorld(now: () => Date, price: (sym: string) => number = () => 100, extra: Record<string, Handler> = {}) {
  return fakeFetch({
    [FINNHUB_HOLIDAYS]: holidaysRoute(),
    [FINNHUB]: url => jsonRes(finnhubBody(price(url.searchParams.get('symbol') ?? ''), new Date(now().getTime() - 30_000).toISOString())),
    ...extra,
  });
}

/** Three runs a minute apart, ending at `now`: every ticker gets a price (45 a run). */
export async function seedAll(kv: FakeKV, now: Date, price?: (sym: string) => number): Promise<void> {
  for (let i = 2; i >= 0; i--) {
    const at = new Date(now.getTime() - i * 60_000);
    await refresh(makeEnv(kv), makeDeps(finnhubWorld(() => at, price).fn, at));
  }
}
