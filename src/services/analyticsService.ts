/**
 * Analytics Service — first-party event log, not Firebase/GA4 Analytics.
 *
 * The Firebase JS SDK's `firebase/analytics` module only works in a browser
 * environment (it needs IndexedDB/gtag) — it does not run on iOS/Android
 * under React Native. Since most of this cohort uses the native app, real
 * Firebase Analytics can't be the source of truth here, and GA4 data isn't
 * queryable in real time for an in-app dashboard anyway (it requires a
 * BigQuery export with 24-48h latency). Instead, events are written directly
 * to a Firestore `analytics_events` collection, which the admin dashboard
 * (AnalyticsDashboardScreen) reads straight from.
 *
 * Only the Firebase UID + numeric/enum/short-string properties go into an
 * event — never email, displayName, or free text.
 */
import { Platform, AppState, AppStateStatus } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { getCurrentUid } from './authService';

export type AnalyticsEventName =
  | 'session_start'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'onboarding_abandoned'
  | 'lesson_started'
  | 'lesson_completed'
  | 'lesson_abandoned'
  | 'quiz_answered'
  | 'micro_lesson_completed'
  | 'trade_submitted'
  | 'streak_continued'
  | 'streak_broken';

type EventProperties = Record<string, string | number | boolean>;

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function writeDoc(data: Record<string, unknown>) {
  const db = getFirebaseDb();
  if (!db) return;
  const id = genId('evt');
  setDoc(doc(db, 'analytics_events', id), { ...data, id }).catch(e => {
    console.warn('[analytics] failed to write event', data.event, e);
  });
}

/** Fire-and-forget — never blocks or throws into the caller's UI flow. */
export function logEvent(event: AnalyticsEventName, properties: EventProperties = {}): void {
  const uid = getCurrentUid();
  if (!uid) return;
  writeDoc({ uid, event, ...properties, ts: Date.now() });
}

// ── screen_view batching ─────────────────────────────────────────────────
// screen_view fires on every tab/modal change and would otherwise be the
// highest-volume event by far. Instead of one Firestore write per screen,
// buffer views in memory for the current session and flush them as a
// single doc when the session ends (backgrounded / tab hidden), or every
// MAX_BUFFERED_SCREENS views as a safety net for unusually long sessions.

const MAX_BUFFERED_SCREENS = 25;
let sessionId = genId('sess');
let screenBuffer: { screen: string; ts: number }[] = [];

export function flushScreenBuffer(): void {
  if (screenBuffer.length === 0) return;
  const screens = screenBuffer;
  screenBuffer = [];
  const uid = getCurrentUid();
  if (!uid) return;
  writeDoc({ uid, event: 'screen_view', session_id: sessionId, screens, ts: Date.now() });
}

export function logScreenView(screenName: string): void {
  screenBuffer.push({ screen: screenName, ts: Date.now() });
  if (screenBuffer.length >= MAX_BUFFERED_SCREENS) flushScreenBuffer();
}

/** Call once per login (uid becoming set) — starts a fresh session and fires session_start. */
export function startNewSession(): void {
  flushScreenBuffer(); // in case a stale buffer somehow survived a prior session
  sessionId = genId('sess');
  logEvent('session_start');
}

// ── Lifecycle wiring ─────────────────────────────────────────────────────
// Native: AppState 'background'/'inactive' is the session-end signal.
// Web: AppState doesn't fire the same way on Expo Web, so we use
// visibilitychange (fires reliably when a tab is hidden/closed/switched —
// more reliable than beforeunload, especially on mobile browsers) plus
// pagehide/beforeunload as a best-effort extra. None of these can
// *guarantee* an in-flight network write completes before a hard tab
// close, so on web this is "best effort," not a hard guarantee.

let lifecycleInitialized = false;

export function initAnalyticsLifecycle(): void {
  if (lifecycleInitialized) return;
  lifecycleInitialized = true;

  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushScreenBuffer();
      });
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', flushScreenBuffer);
      window.addEventListener('beforeunload', flushScreenBuffer);
    }
  } else {
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') flushScreenBuffer();
    });
  }
}
