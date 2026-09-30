/**
 * Profile data that can exist on this device before the cloud has it — the
 * rules for keeping it at sign-in.
 *
 * Profiles load cloud-wins (App.tsx loadAccount). That erases anything done
 * here but not yet saved: offline, or the app closed before the save went
 * through. The streak has its own rule (dailyStreak.reconcileStreak); this
 * module has the one for lesson progress, and the one for a whole profile
 * that never reached the cloud (a first save after onboarding that failed).
 * Candidates from this device are used only when they belong to the account
 * being loaded (same id), never another account's.
 *
 * The rules are pure. The unsaved-profile stash at the bottom is the only
 * I/O, the same device-only kind as the portfolio and journal backups.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';

/**
 * Whether `p` is a real profile of account `uid`: its own id, and built (every
 * profile createNewUser makes has displayName and createdAt). Rules out a
 * profile copied from another account and one emptied to repair that.
 */
export function isUsableProfile(p: Partial<User> | null | undefined, uid: string): p is User {
  return !!p && p.id === uid && typeof p.displayName === 'string' && !!p.createdAt;
}

/**
 * When the cloud has no profile for `uid`: the one to use instead, from
 * candidates held on this device (the local user; a profile stashed at
 * sign-out). The newest usable one belonging to `uid`, or null — in which
 * case the account genuinely hasn't onboarded.
 */
export function recoverProfile(uid: string, candidates: (Partial<User> | null | undefined)[]): User | null {
  const usable = candidates.filter((c): c is User => isUsableProfile(c, uid));
  if (usable.length === 0) return null;
  const t = (u: User) => { const v = Date.parse(u.updatedAt ?? u.createdAt); return Number.isFinite(v) ? v : 0; };
  return usable.reduce((a, b) => (t(b) > t(a) ? b : a));
}

export type LessonProgress = Pick<User, 'lessonsCompleted' | 'totalLessonsWatched'>;

const idsOf = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const countOf = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

/**
 * Lessons are never un-completed, so the local copy is "newer" exactly when
 * it has lessons the cloud lacks. Result: the cloud's lessons in their order,
 * then any the local copy adds. totalLessonsWatched counts each lesson added
 * back (completeLesson increments it once per new lesson), so two devices
 * that each finished a different lesson both count, and it never drops below
 * the local count. `changed` says whether the cloud profile needs saving.
 */
export function reconcileLessons(
  cloud: Partial<LessonProgress>,
  local: Partial<LessonProgress> | null,
): { progress: LessonProgress; changed: boolean } {
  const cloudIds = idsOf(cloud.lessonsCompleted);
  const cloudTotal = countOf(cloud.totalLessonsWatched);
  const base: LessonProgress = { lessonsCompleted: cloudIds, totalLessonsWatched: cloudTotal };
  if (!local) return { progress: base, changed: false };

  const have = new Set(cloudIds);
  const added = [...new Set(idsOf(local.lessonsCompleted))].filter(id => !have.has(id));
  const total = Math.max(cloudTotal + added.length, countOf(local.totalLessonsWatched));
  if (added.length === 0 && total === cloudTotal) return { progress: base, changed: false };
  return { progress: { lessonsCompleted: [...cloudIds, ...added], totalLessonsWatched: total }, changed: true };
}

// ============================================================================
// UNSAVED PROFILE STASH (device only)
// ============================================================================
// Sign-out clears the local user. If its profile never reached the cloud —
// the first save after onboarding failed — that was the only copy, and the
// next sign-in sent the student through onboarding again. Sign-out stashes it
// here first (one entry per account); loadAccount recovers it when the cloud
// has no profile, and clears the entry once a profile is adopted.

const STASH_KEY = 'investapp-unsaved-profiles';

async function readStash(): Promise<Record<string, User>> {
  try {
    const raw = await AsyncStorage.getItem(STASH_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Keeps `user` for its own account. Ignores anything that isn't a usable profile. */
export async function stashUnsavedProfile(user: User | null | undefined): Promise<void> {
  if (!user || !isUsableProfile(user, user.id)) return;
  const stash = await readStash();
  stash[user.id] = user;
  await AsyncStorage.setItem(STASH_KEY, JSON.stringify(stash));
}

/** The profile stashed for `uid`, if any (and only if it's that account's). */
export async function readUnsavedProfile(uid: string): Promise<User | null> {
  const p = (await readStash())[uid];
  return isUsableProfile(p, uid) ? p : null;
}

export async function clearUnsavedProfile(uid: string): Promise<void> {
  const stash = await readStash();
  if (!(uid in stash)) return;
  delete stash[uid];
  await AsyncStorage.setItem(STASH_KEY, JSON.stringify(stash));
}
