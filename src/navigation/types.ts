/**
 * Route map
 *
 * The contract the Phase 3 navigator is built against. Params mirror the
 * payloads the old ModalScreen union in App.tsx carried, so no screen loses
 * context in the migration.
 *
 * Shape: a root native-stack holds the auth flow, the tab navigator, and the
 * overlays that any tab can open (a lesson from Classroom, a stock from a Home
 * signal, a trade from a lesson challenge). Tab-local screens live in their
 * own stack so each tab keeps an independent back history.
 *
 * The `path` comment on each route is the URL it gets on web; linking.ts in
 * step 2 is the implementation of that map.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { TradeType } from '../types';

// ── Learn tab ────────────────────────────────────────────────────────────────
export type LearnStackParamList = {
  LearnHome:    undefined;  // path: /learn          (HomeScreen — next lesson, streak, quick actions)
  LessonsList:  undefined;  // path: /learn/lessons  (the full curriculum)
  SkillTree:    undefined;  // path: /learn/skills
  MicroLesson:  undefined;  // path: /learn/quick
};

// ── Portfolio tab ────────────────────────────────────────────────────────────
export type PortfolioStackParamList = {
  PortfolioHome:   undefined;  // path: /portfolio            (MarketScreen — News / Your Portfolio)
  TradeJournal:    undefined;  // path: /portfolio/journal
  DecisionJournal: undefined;  // path: /portfolio/decisions
};

// ── Me tab ───────────────────────────────────────────────────────────────────
export type MeStackParamList = {
  MeHome:    undefined;                            // path: /me           (ProfileScreen)
  Classroom: undefined;                            // path: /me/classroom
  Customize: undefined;                            // path: /me/appearance
  Legal:     { kind: 'privacy' | 'terms' };        // path: /me/legal/:kind
  Admin:     undefined;                            // path: /me/admin
  Analytics: undefined;                            // path: /me/admin/analytics
};

/** Three tabs, each owning a stack. */
export type TabParamList = {
  Learn:     NavigatorScreenParams<LearnStackParamList>;
  Portfolio: NavigatorScreenParams<PortfolioStackParamList>;
  Me:        NavigatorScreenParams<MeStackParamList>;
};

// ── Root ─────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  // Auth flow — shown while unauthenticated or un-onboarded.
  Welcome:    undefined;  // path: /
  Login:      undefined;  // path: /login
  Signup:     undefined;  // path: /signup
  Onboarding: undefined;  // path: /onboarding

  Tabs: NavigatorScreenParams<TabParamList>;

  // Overlays reachable from more than one tab. These were the full-screen
  // modals in the old union; keeping them at root preserves that any screen
  // can open any of them without the tab stacks duplicating routes.
  Lesson:          { lessonId: string };                      // path: /lesson/:lessonId
  LessonChallenge: { lessonId: string; lessonTitle: string }; // path: /lesson/:lessonId/challenge
  StockBrowser:    undefined;                                 // path: /stocks
  StockDetail:     { symbol: string; fromBrowser?: boolean }; // path: /stocks/:symbol
  Trade:           { symbol: string; action: TradeType };     // path: /stocks/:symbol/:action
  Subscription:    { lockedFeature?: string };                // path: /premium
  Leaderboard:     undefined;                                 // path: /leaderboard  (entered from Classroom only)

  // ── Flagged off in Phase 3 (see src/config/features.ts) ──
  // Registered only when the matching flag is on. Typed here so the flag-on
  // path still compiles and these screens can be brought back without
  // reconstructing their params.
  Leagues:              undefined;                 // path: /leagues
  TutorChat:            undefined;                 // path: /tutor
  Playbooks:            undefined;                 // path: /playbooks
  PlaybookDetail:       { playbookId: string };    // path: /playbooks/:playbookId
  MacroDashboard:       undefined;                 // path: /market-cycle
  BehavioralAssessment: undefined;                 // path: /mind-check
  InvestorDNA:          undefined;                 // path: /investor-dna
  TimeMachine:          undefined;                 // path: /time-machine
  FutureSimulator:      undefined;                 // path: /future
  PortfolioHealth:      undefined;                 // path: /health-score
  Community:            undefined;                 // path: /forum
  // The old Explore and Connect tabs. They lost their place in the tab bar
  // when six tabs became three; their screens are still routable by URL until
  // the flags in step 4 unregister them.
  Discover:             undefined;                 // path: /explore
  Social:               undefined;                 // path: /connect
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
