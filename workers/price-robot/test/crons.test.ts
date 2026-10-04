import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REFRESH_CRON, WATCHDOG_CRON } from '../src/crons';

describe('cron schedules', () => {
  it('match wrangler.toml', () => {
    const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
    const crons = /crons\s*=\s*\[([^\]]*)\]/.exec(toml)?.[1] ?? '';
    expect([...crons.matchAll(/"([^"]+)"/g)].map(m => m[1])).toEqual([REFRESH_CRON, WATCHDOG_CRON]);
  });
  it('the entry module exports only the handler (Workers rejects other named exports)', () => {
    const src = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
    expect(src.match(/^export (?!default)/gm)).toBeNull();
  });
});
