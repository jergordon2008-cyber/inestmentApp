/**
 * What the admin dashboard may assume about the documents it lists — pure,
 * no I/O, so it's testable against real data shapes.
 *
 * The dashboard lists every document in users/, and any of them can be
 * incomplete: an account that signed up but never finished onboarding, or a
 * profile emptied to repair a cross-account copy (users/upLV41 is just
 * { id }). The list used to read displayName / lessonsCompleted straight off
 * each one, so a single such document threw during render and blanked the
 * whole app. Anything the screens read is checked here first.
 */

import type { User } from '../types';
import { isUsableProfile } from './profileReconcile';
import { changeSign } from '../utils/change';

/** One document of users/ with its own document id (the id field inside can be wrong or missing). */
export interface ProfileDoc { uid: string; data: Partial<User> }

export interface IncompleteProfile { uid: string }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * A complete profile with every field the dashboard reads present and
 * well-typed. Values that were already fine are unchanged.
 */
export function normalizeStudent(u: User): User {
  return {
    ...u,
    email: typeof u.email === 'string' ? u.email : '',
    currentTier: ([1, 2, 3] as const).includes(u.currentTier as 1 | 2 | 3) ? u.currentTier : 1,
    lessonsCompleted: Array.isArray(u.lessonsCompleted) ? u.lessonsCompleted.filter((x): x is string => typeof x === 'string') : [],
    streak: isNum(u.streak) ? u.streak : 0,
    totalTradesExecuted: isNum(u.totalTradesExecuted) ? u.totalTradesExecuted : 0,
  };
}

/**
 * Splits users/ into profiles the dashboard can show in full and ones it can
 * only acknowledge. "Complete" is the rule sign-in uses (isUsableProfile): the
 * profile belongs to its own document (id matches) and was actually built.
 * Complete ones are sorted as before — most trades first; incomplete ones by
 * account id so the list doesn't reshuffle between loads.
 */
export function partitionProfiles(docs: ProfileDoc[]): { complete: User[]; incomplete: IncompleteProfile[] } {
  const complete: User[] = [];
  const incomplete: IncompleteProfile[] = [];
  for (const d of docs) {
    if (isUsableProfile(d.data, d.uid)) complete.push(normalizeStudent(d.data));
    else incomplete.push({ uid: d.uid });
  }
  complete.sort((a, b) => b.totalTradesExecuted - a.totalTradesExecuted);
  incomplete.sort((a, b) => a.uid.localeCompare(b.uid));
  return { complete, incomplete };
}

// ── Safe formatting for values that may be missing on a partial document ─────

/** "—" for anything that isn't a finite number. */
export function fmtFixed(n: unknown, digits: number): string {
  return isNum(n) ? n.toFixed(digits) : '—';
}

/** "$100,000", or "—". */
export function fmtMoney0(n: unknown): string {
  return isNum(n) ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—';
}

/** Locale date, or "—" for a missing or invalid one (never "Invalid Date"). */
export function fmtDate(v: unknown): string {
  if (typeof v !== 'string' && typeof v !== 'number') return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** "+$12.34 (1.23%)" as before; "—" with no return; just the amount with no percent. */
export function fmtReturn(totalReturn: unknown, percent: unknown): string {
  if (!isNum(totalReturn)) return '—';
  const base = `${changeSign(totalReturn)}$${totalReturn.toFixed(2)}`;
  return isNum(percent) ? `${base} (${percent.toFixed(2)}%)` : base;
}

/** An array's length, or "—" if what's stored isn't an array. */
export function countOrDash(v: unknown): number | '—' {
  return Array.isArray(v) ? v.length : '—';
}

/**
 * A short, readable reason for a failed load, for the admin. Firestore errors
 * carry a message like "Missing or insufficient permissions."; anything else
 * falls back to its string form. Never throws and never returns empty.
 */
export function describeLoadError(e: unknown): string {
  let msg = '';
  try {
    msg = typeof e === 'string' ? e
      : e && typeof (e as { message?: unknown }).message === 'string' ? (e as { message: string }).message
      : '';
  } catch { /* an object whose message getter throws: treat as unknown */ }
  const text = msg.trim() || 'Unknown error';
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}
