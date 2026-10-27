/**
 * Which tickers students care about right now: the ones they hold (the app
 * sends them with its /v1/prices poll as ?held=…) and the ones they open
 * (/v1/quote/:sym). The refresh gives these up to PRIORITY_SLOTS of its
 * Finnhub calls each run.
 *
 * Kept in KV key `demand:v1`. Requests only note tickers in this isolate's
 * memory; at most once a minute an isolate merges them into KV, and only
 * writes when it has a ticker KV doesn't know or hasn't seen for
 * REFRESH_MS. A daily cap (WRITES_PER_DAY) bounds the KV writes whatever
 * the traffic, so the refresh's ~400 writes a day stay well under 1,000.
 * Two isolates writing at once can drop each other's tickers; the next
 * flush adds them back. Best effort by design: the rotation still refreshes
 * every ticker every few minutes.
 */
import { etNow } from './calendar';
import { DEMAND_KEY, writeJson } from './kv';
import { resolveSymbol } from './symbols';

/** A ticker stays a priority this long after a student last asked for it. */
export const DEMAND_TTL_MS = 30 * 60_000;
/** A ticker already in KV is re-stamped at most this often. */
export const REFRESH_MS = 10 * 60_000;
export const FLUSH_EVERY_MS = 60_000;
export const WRITES_PER_DAY = 200;
/** At most this many tickers taken from one request's ?held= list. */
export const MAX_HELD = 40;

export interface DemandDoc {
  date: string;                   // New York date the write count applies to
  writes: number;                 // KV writes of this key today
  seen: Record<string, string>;   // ticker → ISO time a student last asked for it
}

const pending = new Map<string, number>();
let lastFlush = 0;

/** "AAPL,voo,SQ,nope" → ['AAPL', 'VOO', 'XYZ']; unknown tickers are dropped. */
export function parseHeld(raw: string | null): string[] {
  if (!raw) return [];
  const out = new Set<string>();
  for (const part of raw.split(',').slice(0, MAX_HELD)) {
    const sym = resolveSymbol(part);
    if (sym) out.add(sym);
  }
  return [...out];
}

export function noteDemand(symbols: readonly string[], nowMs: number): void {
  for (const s of symbols) pending.set(s, nowMs);
}

export async function readDemand(kv: KVNamespace): Promise<DemandDoc | null> {
  try {
    const doc = await kv.get<DemandDoc>(DEMAND_KEY, { type: 'json' });
    return doc && typeof doc.seen === 'object' ? doc : null;
  } catch {
    return null;
  }
}

/** The priority tickers: asked for within DEMAND_TTL_MS, most recent first. */
export function activeDemand(doc: DemandDoc | null, now: Date): string[] {
  if (!doc) return [];
  const cutoff = now.getTime() - DEMAND_TTL_MS;
  return Object.entries(doc.seen)
    .filter(([sym, at]) => resolveSymbol(sym) === sym && Date.parse(at) >= cutoff)
    .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
    .map(([sym]) => sym);
}

/** Merges this isolate's noted tickers into KV. Returns whether it wrote. */
export async function flushDemand(kv: KVNamespace, now: Date, force = false): Promise<boolean> {
  const nowMs = now.getTime();
  if (pending.size === 0 || (!force && nowMs - lastFlush < FLUSH_EVERY_MS)) return false;
  lastFlush = nowMs;
  const today = etNow(now).date;
  const stored = await readDemand(kv);
  const doc: DemandDoc = stored && stored.date === today
    ? { date: today, writes: stored.writes, seen: { ...stored.seen } }
    : { date: today, writes: 0, seen: { ...(stored?.seen ?? {}) } };

  let changed = false;
  for (const [sym, at] of pending) {
    const prev = Date.parse(doc.seen[sym] ?? '');
    if (!(prev >= at - REFRESH_MS)) {
      doc.seen[sym] = new Date(at).toISOString();
      changed = true;
    }
  }
  pending.clear();
  if (!changed || doc.writes >= WRITES_PER_DAY) return false;

  const cutoff = nowMs - DEMAND_TTL_MS;
  for (const [sym, at] of Object.entries(doc.seen)) if (!(Date.parse(at) >= cutoff)) delete doc.seen[sym];
  doc.writes++;
  return writeJson(kv, DEMAND_KEY, doc);
}

/** Test helper. */
export function clearDemandMemo(): void {
  pending.clear();
  lastFlush = 0;
}
