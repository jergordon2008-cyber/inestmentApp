/**
 * Feature flags
 *
 * Phase 3 consolidates the app from six tabs to three (Learn, Portfolio, Me).
 * A dozen features come out of navigation as part of that — but nothing is
 * deleted: the screens, their stores, and every Firestore document they wrote
 * stay exactly where they are. These flags decide only whether a route gets
 * registered and whether its entry point renders.
 *
 * Flip LEGACY_FEATURES to true to bring the whole set back at once (useful for
 * checking that a hidden screen still works before re-launching it). Any single
 * feature can also be un-hidden on its own by replacing its LEGACY_FEATURES
 * reference below with a literal true.
 */

/** Master switch for everything removed from navigation in Phase 3. */
export const LEGACY_FEATURES = false;

export const FEATURES = {
  // ── Removed from navigation in Phase 3 ──
  leagues:         LEGACY_FEATURES,
  aiTutor:         LEGACY_FEATURES,
  playbooks:       LEGACY_FEATURES,
  marketCycle:     LEGACY_FEATURES,
  investorDNA:     LEGACY_FEATURES,
  timeMachine:     LEGACY_FEATURES,
  futureSimulator: LEGACY_FEATURES,
  healthScore:     LEGACY_FEATURES,
  insightOfTheDay: LEGACY_FEATURES,
  behavioralQuiz:  LEGACY_FEATURES,
  exploreTab:      LEGACY_FEATURES,
  connectTab:      LEGACY_FEATURES,

  // ── Hidden before Phase 3 and staying hidden ──
  // Not tied to LEGACY_FEATURES: the forum has no moderation story, so it
  // should not come back just because someone flips the master switch.
  forum: false,

  // Market News sub-tab on the Portfolio screen. Its only data source is
  // src/data/newsFeed.ts — five hand-written stories attributed to Reuters/
  // Bloomberg/CNBC/WSJ/NYT with example.com URLs, re-stamped "2 hours ago" on
  // every load, rendered under a LIVE pill. Hidden (not deleted) until it is
  // backed by real Finnhub news; that work is sequenced after the shared-key
  // rate-limiting fix, since the news endpoint would draw on the same quota.
  // Deliberately not tied to LEGACY_FEATURES for the same reason as forum.
  marketNews: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature];
}
