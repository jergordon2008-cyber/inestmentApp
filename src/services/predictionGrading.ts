/**
 * Prediction grading rules — which entries can be graded, when, and what the
 * accuracy numbers are. Pure: no store, no clock (callers pass `now`).
 *
 * WHAT COUNTS
 * Only predictions written through the thesis gate: they carry `checkBackAt`
 * and a claim and falsifier that pass the gate's length rules. Entries from
 * before the gate have neither a real claim (often just the category label,
 * e.g. "Fundamentals") nor a way to be wrong, so there is nothing to grade
 * them against. They stay viewable and never touch a rate.
 *
 * THE RATE
 * yes = 1, partly = ½, no = 0, over final grades. "Too early to tell" never
 * counts. No rate is shown — overall or for any category or confidence level
 * — until MIN_GRADED_FOR_RATE predictions in that group are graded: 1 of 1
 * isn't "100% accurate", it's one prediction.
 */
import {
  JournalEntry, TradeReason, Confidence, REASON_CONFIG, isPredictionTextValid, isFinalGrade,
} from './tradeJournalStore';
import { MOOD_CONFIG, Mood } from './moodStore';

export const MIN_GRADED_FOR_RATE = 3;
/** After "too early to tell", ask again this many days later (the shortest check-back option). */
export const TOO_EARLY_RECHECK_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Written through the thesis gate, so it has something real to be graded against. */
export function isGradablePrediction(e: JournalEntry): boolean {
  return !!e.checkBackAt
    && Number.isFinite(Date.parse(e.checkBackAt))
    && isPredictionTextValid(e.buyReason, e.exitPlan);
}

export type GradeStatus =
  | 'pre-gate'  // not a gated prediction; view only
  | 'waiting'   // check-back date not reached
  | 'due'       // ready to grade
  | 'graded';   // final grade saved (locked)

/** When the prompt (re)appears: the check-back date, or 14 days after "too early". */
export function nextGradeDate(e: JournalEntry): Date | null {
  if (!isGradablePrediction(e) || isFinalGrade(e.grade?.result)) return null;
  const checkBack = Date.parse(e.checkBackAt!);
  if (e.grade?.result === 'too_early') {
    const again = Date.parse(e.grade.gradedAt) + TOO_EARLY_RECHECK_DAYS * DAY_MS;
    return new Date(Math.max(checkBack, Number.isFinite(again) ? again : checkBack));
  }
  return new Date(checkBack);
}

export function gradeStatus(e: JournalEntry, now: Date): GradeStatus {
  if (!isGradablePrediction(e)) return 'pre-gate';
  if (isFinalGrade(e.grade?.result)) return 'graded';
  const next = nextGradeDate(e);
  return next && now.getTime() >= next.getTime() ? 'due' : 'waiting';
}

export function duePredictions(entries: JournalEntry[], now: Date): JournalEntry[] {
  return entries.filter(e => gradeStatus(e, now) === 'due');
}

// ============================================================================
// ACCURACY
// ============================================================================

export interface AccuracyGroup {
  graded: number;
  yes: number;
  partly: number;
  no: number;
  /** 0–100, or null until `graded` reaches MIN_GRADED_FOR_RATE. */
  rate: number | null;
}

export interface AccuracyReport {
  overall: AccuracyGroup;
  /** Only categories with at least one graded prediction, most graded first. */
  byReason: ({ reason: TradeReason } & AccuracyGroup)[];
  /** Only confidence levels with at least one graded prediction, 1 → 5. */
  byConfidence: ({ confidence: Confidence } & AccuracyGroup)[];
  /** Only moods with at least one graded prediction, in MOOD_CONFIG order. */
  byMood: ({ mood: Mood } & AccuracyGroup)[];
  /** Graded predictions with no mood recorded (no mood check was taken). Never guessed. */
  gradedWithoutMood: number;
  /** Gated predictions not yet graded (waiting, due, or answered "too early"). */
  ungraded: number;
  /** Entries from before the thesis gate, excluded from every number here. */
  excludedPreGate: number;
}

function group(entries: JournalEntry[]): AccuracyGroup {
  let yes = 0, partly = 0, no = 0;
  for (const e of entries) {
    const r = e.grade?.result;
    if (r === 'yes') yes++; else if (r === 'partly') partly++; else if (r === 'no') no++;
  }
  const graded = yes + partly + no;
  return {
    graded, yes, partly, no,
    rate: graded >= MIN_GRADED_FOR_RATE ? ((yes + partly / 2) / graded) * 100 : null,
  };
}

export function predictionAccuracy(entries: JournalEntry[]): AccuracyReport {
  const gradable = entries.filter(isGradablePrediction);
  const graded = gradable.filter(e => isFinalGrade(e.grade?.result));

  const byReason = (Object.keys(REASON_CONFIG) as TradeReason[])
    .map(reason => ({ reason, ...group(graded.filter(e => e.reasonCategory === reason)) }))
    .filter(g => g.graded > 0)
    .sort((a, b) => b.graded - a.graded);

  const byConfidence = ([1, 2, 3, 4, 5] as Confidence[])
    .map(confidence => ({ confidence, ...group(graded.filter(e => e.confidence === confidence)) }))
    .filter(g => g.graded > 0);

  const byMood = (Object.keys(MOOD_CONFIG) as Mood[])
    .map(mood => ({ mood, ...group(graded.filter(e => e.mood === mood)) }))
    .filter(g => g.graded > 0);

  return {
    overall: group(graded),
    byReason,
    byConfidence,
    byMood,
    gradedWithoutMood: graded.filter(e => !e.mood).length,
    ungraded: gradable.length - graded.length,
    excludedPreGate: entries.length - gradable.length,
  };
}

/** Percent change from purchase to the price at grading. For display beside a grade, never in one. */
export function priceChangePercent(check: { entryPrice: number; price: number }): number | null {
  if (!(check.entryPrice > 0) || !Number.isFinite(check.price)) return null;
  return ((check.price - check.entryPrice) / check.entryPrice) * 100;
}

// ============================================================================
// CLASSROOM ACTIVITY (published to public_stats, shown on the class board)
// ============================================================================
// Counts that only rise by doing the work. Accuracy is deliberately NOT here:
// it's self-graded, a teacher can't check it without reading the journal,
// and ranking on it would reward generous grading. It stays in the student's
// own Trade Journal / Decision Journal views.

/** A review is on time if the prediction was first answered within this many days of its check-back date. */
export const ON_TIME_DAYS = 7;

export interface PredictionActivity {
  /** Thesis-gate predictions written (pre-gate entries excluded). */
  predictionsWritten: number;
  /** Final grades (yes / partly / no). "Too early" is not a review. */
  predictionsReviewed: number;
  /** Reviews whose first answer came no later than ON_TIME_DAYS after the check-back date. */
  reviewedOnTime: number;
  /** Earliest check-back date among written predictions — when reviews can start. Null if none written. */
  earliestCheckBackAt: string | null;
}

export function predictionActivity(entries: JournalEntry[]): PredictionActivity {
  const gradable = entries.filter(isGradablePrediction);
  let reviewed = 0, onTime = 0, earliest = Infinity;
  for (const e of gradable) {
    const due = Date.parse(e.checkBackAt!);
    if (due < earliest) earliest = due;
    if (!isFinalGrade(e.grade?.result)) continue;
    reviewed++;
    const first = Date.parse(e.grade!.firstAnsweredAt ?? e.grade!.gradedAt);
    if (Number.isFinite(first) && first <= due + ON_TIME_DAYS * DAY_MS) onTime++;
  }
  return {
    predictionsWritten: gradable.length,
    predictionsReviewed: reviewed,
    reviewedOnTime: onTime,
    earliestCheckBackAt: Number.isFinite(earliest) ? new Date(earliest).toISOString() : null,
  };
}

/** Once any student's earliest check-back date has passed, reviews exist to count. Before that, it's week one. */
export function classReviewsOpen(earliestCheckBackDates: (string | null | undefined)[], now: Date): boolean {
  return earliestCheckBackDates.some(d => !!d && Date.parse(d) <= now.getTime());
}
