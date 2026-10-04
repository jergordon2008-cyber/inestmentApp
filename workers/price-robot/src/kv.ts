/**
 * Workers KV access. Free plan: 1,000 writes a day, so the refresh writes one
 * key once per run (~200 a trading day) and the watchdog writes its own key
 * only when an alert state changes.
 */
import type { PriceBlob } from './types';

export const PRICES_KEY = 'prices:v1';
export const WATCHDOG_KEY = 'watchdog:v1';

export async function readBlob(kv: KVNamespace, cacheTtl?: number): Promise<PriceBlob | null> {
  try {
    const blob = await kv.get<PriceBlob>(PRICES_KEY, cacheTtl ? { type: 'json', cacheTtl } : { type: 'json' });
    return blob && blob.v === 1 ? blob : null;
  } catch {
    return null;
  }
}

/** One retry: a failed write would otherwise leave the app on the previous run's prices. */
export async function writeJson(kv: KVNamespace, key: string, value: unknown): Promise<boolean> {
  const body = JSON.stringify(value);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await kv.put(key, body);
      return true;
    } catch {
      // fall through to the retry
    }
  }
  return false;
}
