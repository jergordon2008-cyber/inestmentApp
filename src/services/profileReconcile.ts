/**
 * Profile fields that can be changed on this device before the cloud has
 * them — the rules for keeping them at sign-in, with no store or I/O.
 *
 * Profiles load cloud-wins (App.tsx loadAccount). That erases anything done
 * here but not yet saved: offline, or the app closed before the save went
 * through. The streak has its own rule (dailyStreak.reconcileStreak); this is
 * the one for lesson progress. The caller passes the local user only when it
 * belongs to the account being loaded (same id), never another account's.
 */

import type { User } from '../types';

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
