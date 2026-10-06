import { describe, expect, it } from 'vitest';
import { defaultSession, etNow, fetchSession, formatEt, phaseAt } from '../src/calendar';
import { ALPACA_CAL, calendarRoute, fakeFetch, jsonRes } from './helpers';

const keys = { ALPACA_KEY_ID: 'k', ALPACA_SECRET_KEY: 's' };

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
  const regular = { date: '2026-10-07', open: 570, close: 960, source: 'alpaca' as const };
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
    const early = { date: '2026-11-27', open: 570, close: 780, source: 'alpaca' as const };
    expect(phaseAt(800, early)).toBe('closed');
    expect(phaseAt(780, early)).toBe('after-close');
  });
  it('is closed all day on a holiday or weekend', () => {
    expect(phaseAt(700, { date: '2026-11-26', open: null, close: null, source: 'alpaca' })).toBe('closed');
    expect(defaultSession(etNow(new Date('2026-10-10T15:00:00Z'))).open).toBeNull(); // Saturday
  });
});

describe('Alpaca calendar', () => {
  it('reads a regular day', async () => {
    const f = fakeFetch({ [ALPACA_CAL]: calendarRoute() });
    expect(await fetchSession('2026-10-07', keys, f.fn)).toEqual({ date: '2026-10-07', open: 570, close: 960, source: 'alpaca' });
  });
  it('treats an empty answer as a holiday', async () => {
    const f = fakeFetch({ [ALPACA_CAL]: calendarRoute('09:30', '16:00', true) });
    expect(await fetchSession('2026-11-26', keys, f.fn)).toMatchObject({ open: null, close: null });
  });
  it('returns null on errors so the caller can fall back', async () => {
    const f = fakeFetch({ [ALPACA_CAL]: () => jsonRes({ message: 'nope' }, 500) });
    expect(await fetchSession('2026-10-07', keys, f.fn)).toBeNull();
  });
});
