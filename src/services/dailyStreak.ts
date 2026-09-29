/**
 * Daily streak — the rules, with no store, no clock and no I/O (callers pass
 * `today`). Used by userStore (recording activity), App.tsx (sign-in) and the
 * screens that show the streak.
 *
 * WHY THIS REPLACED streakStore's STREAK
 * The old streak lived only on the device, belonged to nobody (it survived a
 * sign-out into the next account on that device), counted days in UTC (a
 * student in the US evening rolled into "tomorrow" hours early), and never
 * reached the cloud — the profile's `streak`, which classmates see, was
 * never incremented and stayed 0. The streak now lives on the profile and
 * saves through the same guarded path as the rest of it.
 *
 * DAYS
 * A day is the student's LOCAL calendar date, 'YYYY-MM-DD'. Gaps are counted
 * in calendar days, not 24-hour periods, so daylight-saving changes and
 * late-night activity can't miscount.
 *
 * WHAT COUNTS
 * One qualifying action per day: a finished lesson, a finished Market Minute,
 * or a graded prediction. Opening the app doesn't count.
 */

export interface StreakFields {
  streak: number;
  longestStreak: number;
  /** Local 'YYYY-MM-DD' of the last qualifying day; '' if never. */
  lastActiveDate: string;
  freezesAvailable: number;
  totalDaysActive: number;
}

export const EMPTY_STREAK: StreakFields = { streak: 0, longestStreak: 0, lastActiveDate: '', freezesAvailable: 0, totalDaysActive: 0 };
export const MAX_FREEZES = 3;
/** A freeze is earned every this many consecutive days. */
export const FREEZE_EVERY = 7;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The local calendar date of `d`. */
export function localDay(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). NaN if either isn't a day. */
export function daysBetween(from: string, to: string): number {
  if (!DAY_RE.test(from) || !DAY_RE.test(to)) return NaN;
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Missing or malformed fields become the empty values (profiles created before these fields existed). */
export function streakFieldsOf(src: Partial<StreakFields> | null | undefined): StreakFields {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  const day = typeof src?.lastActiveDate === 'string' && DAY_RE.test(src.lastActiveDate) ? src.lastActiveDate : '';
  return {
    streak: n(src?.streak),
    longestStreak: Math.max(n(src?.longestStreak), n(src?.streak)),
    lastActiveDate: day,
    freezesAvailable: Math.min(n(src?.freezesAvailable), MAX_FREEZES),
    totalDaysActive: n(src?.totalDaysActive),
  };
}

export type ActivityEvent =
  | 'first'      // first qualifying day ever
  | 'same-day'   // already counted today: nothing changes
  | 'continued'  // yesterday was active
  | 'frozen'     // missed exactly one day; a freeze covered it
  | 'broken'     // missed more; starts again at 1
  | 'earlier';   // today is before the last active day (clock/timezone moved back): nothing changes

/** Records one qualifying action on `today`. Pure: returns new fields, never mutates. */
export function applyActivity(s: StreakFields, today: string): { next: StreakFields; event: ActivityEvent } {
  if (!s.lastActiveDate) {
    return { next: { ...s, streak: 1, longestStreak: Math.max(1, s.longestStreak), lastActiveDate: today, totalDaysActive: s.totalDaysActive + 1 }, event: 'first' };
  }
  const gap = daysBetween(s.lastActiveDate, today);
  if (!Number.isFinite(gap) || gap === 0) return { next: s, event: 'same-day' };
  if (gap < 0) return { next: s, event: 'earlier' };

  let streak: number, freezes = s.freezesAvailable, event: ActivityEvent;
  if (gap === 1) { streak = s.streak + 1; event = 'continued'; }
  else if (gap === 2 && freezes > 0) { streak = s.streak + 1; freezes -= 1; event = 'frozen'; }
  else { streak = 1; event = 'broken'; }

  if (event !== 'broken' && streak % FREEZE_EVERY === 0) freezes = Math.min(freezes + 1, MAX_FREEZES);
  return {
    next: { streak, longestStreak: Math.max(s.longestStreak, streak), lastActiveDate: today, freezesAvailable: freezes, totalDaysActive: s.totalDaysActive + 1 },
    event,
  };
}

/**
 * The streak as it stands on `today`, for display and for classmates. The
 * stored number only changes on activity, so a student who stopped three
 * days ago still has streak: 5 saved — but their current streak is 0.
 * Active today or yesterday: the stored streak. One missed day with a freeze
 * in hand: still alive (the next activity uses the freeze). Otherwise 0.
 */
export function currentStreak(s: StreakFields, today: string): number {
  if (!s.lastActiveDate) return 0;
  const gap = daysBetween(s.lastActiveDate, today);
  if (!Number.isFinite(gap) || gap < 0) return s.streak;
  if (gap <= 1) return s.streak;
  if (gap === 2 && s.freezesAvailable > 0) return s.streak;
  return 0;
}

/**
 * Sign-in: which streak to keep when the cloud profile arrives. Profiles load
 * cloud-wins, which would erase activity recorded on this device but not yet
 * saved (offline, or the app closed first). `candidates` are copies already
 * known to belong to this account (the caller checks ownership). The one with
 * the latest lastActiveDate wins; on a tie, the higher streak. longestStreak
 * and totalDaysActive never go down. Returns `changed` so the caller knows
 * whether the cloud profile needs saving.
 */
export function reconcileStreak(cloud: StreakFields, candidates: StreakFields[]): { fields: StreakFields; changed: boolean } {
  let best = cloud;
  for (const c of candidates) {
    const newer = c.lastActiveDate && (!best.lastActiveDate || c.lastActiveDate > best.lastActiveDate);
    const tieHigher = c.lastActiveDate === best.lastActiveDate && c.streak > best.streak;
    if (newer || tieHigher) best = c;
  }
  const all = [cloud, ...candidates];
  const fields: StreakFields = {
    ...best,
    longestStreak: Math.max(...all.map(x => x.longestStreak), best.streak),
    totalDaysActive: Math.max(...all.map(x => x.totalDaysActive)),
  };
  const changed = (Object.keys(fields) as (keyof StreakFields)[]).some(k => fields[k] !== cloud[k]);
  return { fields: changed ? fields : cloud, changed };
}

/** The retired device-only streakStore's fields, as StreakFields. Its dates were UTC days; they're taken as-is (at most a day off, once). */
export function fromLegacyStreakStore(s: { currentStreak?: number; longestStreak?: number; lastActiveDate?: string | null; freezesAvailable?: number; totalDaysActive?: number } | null | undefined): StreakFields | null {
  if (!s || !s.lastActiveDate) return null;
  return streakFieldsOf({ streak: s.currentStreak, longestStreak: s.longestStreak, lastActiveDate: s.lastActiveDate, freezesAvailable: s.freezesAvailable, totalDaysActive: s.totalDaysActive });
}
