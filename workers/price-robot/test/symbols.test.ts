import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALIASES, resolveSymbol, SYMBOLS, TIER1 } from '../src/symbols';

const appFile = (rel: string) => readFileSync(new URL(`../../../${rel}`, import.meta.url), 'utf8');

describe('symbol list', () => {
  it('matches the app stock list (with aliases applied)', () => {
    const src = appFile('src/services/stockDataService.ts');
    const appSymbols = [...src.matchAll(/^\s+([A-Z.]+):\s*\{\s*symbol:/gm)].map(m => m[1]!);
    expect(appSymbols.length).toBeGreaterThan(100);
    const mapped = appSymbols.map(s => ALIASES[s] ?? s);
    expect([...mapped].sort()).toEqual([...SYMBOLS].sort());
  });

  it('Tier 1 list matches the app and is a subset', () => {
    const src = appFile('src/services/portfolioStore.ts');
    const block = /TIER_1_APPROVED_SYMBOLS\s*=\s*\[([\s\S]*?)\]/.exec(src)?.[1] ?? '';
    const appTier1 = [...block.matchAll(/'([A-Z.]+)'/g)].map(m => ALIASES[m[1]!] ?? m[1]!);
    expect([...TIER1].sort()).toEqual(appTier1.sort());
    for (const s of TIER1) expect(SYMBOLS).toContain(s);
  });

  it('has no duplicates and stays under the per-run CPU budget', () => {
    expect(new Set(SYMBOLS).size).toBe(SYMBOLS.length);
    expect(SYMBOLS.length).toBeLessThanOrEqual(500);
  });

  it('resolves case, aliases and unknown symbols', () => {
    expect(resolveSymbol('aapl')).toBe('AAPL');
    expect(resolveSymbol('SQ')).toBe('XYZ');
    expect(resolveSymbol('NOPE')).toBeNull();
  });
});
