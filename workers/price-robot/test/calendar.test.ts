import { describe, expect, it } from 'vitest';
import { defaultSession, etNow, fetchSession, formatEt, phaseAt } from '../src/calendar';
import { fakeFetch, FINNHUB_HOLIDAYS, holidaysRoute, jsonRes } from './helpers';

describe('New York time', () => {
  it('handles daylight saving (EDT in October, EST in November)', () => {
    expect(etNow(new Date('2026-10-07T13:30:00Z'))).toMatchObject({ date: '2026-10-07', minutes: 9 * 60 + 30, weekday: 3 });
    expect(etNow(new Date('2026-11-18T14:30:00Z'))).toMatchObject({ date: '2026-11-18', minutes: 9 * 60 + 30, weekday: 3 });
  });
  it('rolls the date at New York midnight, not UTC', () => {
    expect(etNow(new Date('2026-10-08T02:00:00Z')).date).toBe('2026-10-07');
  });
  it('formats alert times', () => {
    expect(formatEt('2026-10-07T19:58:00Z')).toBe('15:58 ET');
  });
});

describe('phases', () => {
  const regular = { date: '2026-10-07', open: 570, close: 960, source: 'finnhub' as const };
  it('is open from a minute before the open until the close', () => {
    expect(phaseAt(568, regular)).toBe('closed');
    expect(phaseAt(569, regular)).toBe('open');
    expect(phaseAt(959, regular)).toBe('open');
  });
  it('allows the closing snapshot for 6 minutes after the close', () => {
    expect(phaseAt(960, regular)).toBe('after-close');
    expect(phaseAt(966, regular)).toBe('after-close');
    expect(phaseAt(967, regular)).toBe('closed');
  });
  it('honors early closes', () => {
    const early = { date: '2026-11-27', open: 570, close: 780, source: 'finnhub' as const };
    expect(phaseAt(800, early)).toBe('closed');
    expect(phaseAt(780, early)).toBe('after-close');
  });
  it('is closed all day on a holiday or weekend', () => {
    expect(phaseAt(700, { date: '2026-11-26', open: null, close: null, source: 'finnhub' })).toBe('closed');
    expect(defaultSession(etNow(new Date('2026-10-10T15:00:00Z'))).open).toBeNull(); // Saturday
  });
});

describe('Finnhub holiday calendar', () => {
  const f = () => fakeFetch({ [FINNHUB_HOLIDAYS]: holidaysRoute() });
  it('reads a regular day (not on the list)', async () => {
    expect(await fetchSession('2026-10-07', 'k', f().fn)).toEqual({ date: '2026-10-07', open: 570, close: 960, source: 'finnhub' });
  });
  it('a listed day with no trading hours is a holiday', async () => {
    expect(await fetchSession('2026-11-26', 'k', f().fn)).toMatchObject({ open: null, close: null });
  });
  it('a listed day with hours is an early close', async () => {
    expect(await fetchSession('2026-11-27', 'k', f().fn)).toMatchObject({ open: 570, close: 780 });
    expect(await fetchSession('2026-12-24', 'k', f().fn)).toMatchObject({ open: 570, close: 780 });
  });
  it('weekends are closed', async () => {
    expect(await fetchSession('2026-10-10', 'k', f().fn)).toMatchObject({ open: null });
  });
  it('sends the key in a header', async () => {
    let header: string | null = null;
    const g = fakeFetch({ [FINNHUB_HOLIDAYS]: (_u, init) => { header = new Headers(init?.headers).get('X-Finnhub-Token'); return holidaysRoute()(_u, init); } });
    await fetchSession('2026-10-07', 'secret-key', g.fn);
    expect(header).toBe('secret-key');
    expect(g.calls[0]).not.toContain('secret-key');
  });
  it('returns null on errors so the caller can fall back', async () => {
    expect(await fetchSession('2026-10-07', 'k', fakeFetch({ [FINNHUB_HOLIDAYS]: () => jsonRes({ error: 'x' }, 500) }).fn)).toBeNull();
    expect(await fetchSession('2026-10-07', 'k', fakeFetch({ [FINNHUB_HOLIDAYS]: () => jsonRes({ nope: 1 }) }).fn)).toBeNull();
  });
});
