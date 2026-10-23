import { beforeEach, describe, expect, it } from 'vitest';
import { activeDemand, clearDemandMemo, DEMAND_TTL_MS, flushDemand, noteDemand, parseHeld, readDemand, WRITES_PER_DAY, type DemandDoc } from '../src/demand';
import { DEMAND_KEY } from '../src/kv';
import { FakeKV } from './helpers';

const NOW = new Date('2026-10-07T18:00:00Z');
const at = (s: number) => new Date(NOW.getTime() + s * 1000);
const kvOf = (kv: FakeKV) => kv as unknown as KVNamespace;

describe('demand (priority tickers)', () => {
  beforeEach(() => clearDemandMemo());

  it('parses ?held=: case, aliases, unknowns, duplicates', () => {
    expect(parseHeld('aapl, VOO,SQ,NOPE,AAPL')).toEqual(['AAPL', 'VOO', 'XYZ']);
    expect(parseHeld(null)).toEqual([]);
    expect(parseHeld(Array(100).fill('AAPL').join(',') + ',VOO')).toEqual(['AAPL']); // capped at 40 entries
  });

  it('writes new tickers, at most once a minute per isolate', async () => {
    const kv = new FakeKV();
    noteDemand(['AAPL'], NOW.getTime());
    expect(await flushDemand(kvOf(kv), NOW)).toBe(true);
    noteDemand(['VOO'], at(10).getTime());
    expect(await flushDemand(kvOf(kv), at(10))).toBe(false);          // too soon
    expect(await flushDemand(kvOf(kv), at(61))).toBe(true);
    expect(activeDemand(await readDemand(kvOf(kv)), at(61)).sort()).toEqual(['AAPL', 'VOO']);
  });

  it('does not rewrite a ticker KV saw in the last 10 minutes', async () => {
    const kv = new FakeKV();
    noteDemand(['AAPL'], NOW.getTime());
    await flushDemand(kvOf(kv), NOW);
    noteDemand(['AAPL'], at(120).getTime());
    expect(await flushDemand(kvOf(kv), at(120))).toBe(false);
    noteDemand(['AAPL'], at(660).getTime());
    expect(await flushDemand(kvOf(kv), at(660))).toBe(true);
    expect(kv.puts).toBe(2);
  });

  it('forgets tickers after 30 minutes', async () => {
    const kv = new FakeKV();
    noteDemand(['AAPL'], NOW.getTime());
    await flushDemand(kvOf(kv), NOW);
    const doc = await readDemand(kvOf(kv));
    expect(activeDemand(doc, at(DEMAND_TTL_MS / 1000 - 1))).toEqual(['AAPL']);
    expect(activeDemand(doc, at(DEMAND_TTL_MS / 1000 + 1))).toEqual([]);
  });

  it('stops writing at the daily cap, and starts again the next day', async () => {
    const kv = new FakeKV();
    kv.store.set(DEMAND_KEY, JSON.stringify({ date: '2026-10-07', writes: WRITES_PER_DAY, seen: {} } satisfies DemandDoc));
    noteDemand(['AAPL'], NOW.getTime());
    expect(await flushDemand(kvOf(kv), NOW)).toBe(false);
    const tomorrow = new Date('2026-10-08T14:00:00Z');
    noteDemand(['AAPL'], tomorrow.getTime());
    expect(await flushDemand(kvOf(kv), tomorrow)).toBe(true);
    expect(kv.json<DemandDoc>(DEMAND_KEY)).toMatchObject({ date: '2026-10-08', writes: 1 });
  });

  it('ignores junk in KV', async () => {
    const kv = new FakeKV();
    kv.store.set(DEMAND_KEY, JSON.stringify({ date: '2026-10-07', writes: 0, seen: { NOPE: NOW.toISOString(), aapl: NOW.toISOString(), VOO: 'x' } }));
    expect(activeDemand(await readDemand(kvOf(kv)), NOW)).toEqual([]);
  });
});
