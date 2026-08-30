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
  LessonsList:  undefined;  // path: /learn/lessons
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

/**
 * The Phase 3 target: three tabs, each owning a stack. Not wired yet — step 2
 * swaps the navigation library while keeping today's six tabs, so that a
 * regression can only be the navigator and not the tab consolidation. Step 3
 * switches the tab navigator to this list and moves the routes marked
 * "moves to a tab stack in step 3" below into LearnStack/PortfolioStack/MeStack.
 */
export type TabParamList = {
  Learn:     NavigatorScreenParams<LearnStackParamList>;
  Portfolio: NavigatorScreenParams<PortfolioStackParamList>;
  Me:        NavigatorScreenParams<MeStackParamList>;
};

/** Today's six tabs, carried unchanged through step 2. Deleted in step 3. */
export type TransitionalTabParamList = {
  Home:      undefined;  // path: /home       HomeScreen
  Learn:     undefined;  // path: /learn      LessonsListScreen
  Market:    undefined;  // path: /portfolio  MarketScreen
  Social:    undefined;  // path: /connect    SocialScreen
  Discover:  undefined;  // path: /explore    DiscoverScreen
  Me:        undefined;  // path: /me         ProfileScreen
};

// ── Root ─────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  // Auth flow — shown while unauthenticated or un-onboarded.
  Welcome:    undefined;  // path: /
  Login:      undefined;  // path: /login
  Signup:     undefined;  // path: /signup
  Onboarding: undefined;  // path: /onboarding

  Tabs: NavigatorScreenParams<TransitionalTabParamList>;

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

  // ── Tab-local screens, living at root until step 3 ──
  // These belong to a single tab (see the stack lists above) but are root
  // routes while the six-tab layout is still in place. They move to a tab
  // stack in step 3; their paths do not change.
  SkillTree:       undefined;  // path: /learn/skills
  MicroLesson:     undefined;  // path: /learn/quick
  TradeJournal:    undefined;  // path: /portfolio/journal
  DecisionJournal: undefined;  // path: /portfolio/decisions
  Classroom:       undefined;  // path: /me/classroom
  Customize:       undefined;  // path: /me/appearance
  Legal:           { kind: 'privacy' | 'terms' };  // path: /me/legal/:kind
  Admin:           undefined;  // path: /me/admin
  Analytics:       undefined;  // path: /me/admin/analytics

  // ── Flagged off in Phase 3 (see src/config/features.ts) ──
  // Registered only when the matching flag is on. Typed here so the flag-on
  // path still compiles and these screens can be brought back without
  // reconstructing their params. The Explore and Connect tabs are not here:
  // they are tab entries, and step 4 drops them from the tab list.
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
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
