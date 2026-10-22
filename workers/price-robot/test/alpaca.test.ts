import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fetchAlpacaSession, fetchAlpacaSnapshots } from '../src/alpaca';
import { ALPACA_CAL, ALPACA_SNAP, alpacaBody, calendarRoute, fakeFetch, jsonRes } from './helpers';

// The Alpaca adapter is disabled (no display approval) but kept for the
// future. These tests keep it compiling and correct, and make sure nothing
// in the live path uses it.
const keys = { ALPACA_KEY_ID: 'k', ALPACA_SECRET_KEY: 's' };

describe('Alpaca adapter (disabled)', () => {
  it('no source file except alpaca.ts imports it, and the Worker has no Alpaca secrets', () => {
    const dir = new URL('../src/', import.meta.url);
    for (const file of readdirSync(dir)) {
      if (file === 'alpaca.ts') continue;
      expect(readFileSync(new URL(file, dir), 'utf8'), file).not.toMatch(/from '\.\/alpaca'/);
    }
    const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
    expect(toml).not.toMatch(/ALPACA_KEY_ID|ALPACA_SECRET_KEY/);
  });

  it('parses a snapshot', async () => {
    const t = '2026-10-07T17:59:30.000Z';
    const f = fakeFetch({ [ALPACA_SNAP]: url => jsonRes(alpacaBody(url, t, () => 333.75)) });
    const r = await fetchAlpacaSnapshots(['AAPL'], keys, f.fn, async () => {});
    expect(r).toMatchObject({ ok: true, quotes: { AAPL: { p: 333.75, pc: 331.75, t } } });
  });

  it('reads the calendar, holidays included', async () => {
    expect(await fetchAlpacaSession('2026-10-07', keys, fakeFetch({ [ALPACA_CAL]: calendarRoute() }).fn)).toMatchObject({ open: 570, close: 960 });
    expect(await fetchAlpacaSession('2026-11-26', keys, fakeFetch({ [ALPACA_CAL]: calendarRoute('09:30', '16:00', true) }).fn)).toMatchObject({ open: null });
  });
});
