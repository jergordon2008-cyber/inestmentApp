/**
 * Analytics Dashboard — admin-only, reads the `analytics_events` Firestore
 * collection written by src/services/analyticsService.ts.
 *
 * Only reachable from AdminScreen, which is itself gated on the `admins/`
 * Firestore collection (see App.tsx) and enforced server-side by
 * firestore.rules — this screen inherits that gate rather than re-checking.
 *
 * Every number here is computed from real events in the last WINDOW_DAYS.
 * If there's no data yet, metrics show an explicit empty state — never an
 * estimate or placeholder number.
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, limit as fsLimit, getDocs } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { getFirebaseDb } from '../services/firebase';
import { sp, fs } from '../constants/responsive';
import { tier1Lessons } from '../data/curriculum';
import { tier2Lessons } from '../data/tier2curriculum';
import { tier3Lessons } from '../data/tier3curriculum';

const ALL_LESSONS = [...tier1Lessons, ...tier2Lessons, ...tier3Lessons];
const lessonTitle = (id: string) => ALL_LESSONS.find(l => l.id === id)?.title ?? id;

const WINDOW_DAYS = 45;
const MAX_DOCS = 20000;
const MIN_LESSON_SAMPLE = 3; // don't call a lesson "the drop-off point" on n=1

interface RawEvent {
  uid: string;
  event: string;
  ts: number;
  lesson_id?: string;
  session_id?: string;
  screens?: { screen: string; ts: number }[];
  [key: string]: unknown;
}

interface Metrics {
  latestDay: string | null;
  dau: number;
  d1: { rate: number | null; eligible: number };
  d7: { rate: number | null; eligible: number };
  d30: { rate: number | null; eligible: number };
  overallCompletionRate: number | null;
  biggestDropoff: { lessonId: string; rate: number; started: number } | null;
  medianSessionSeconds: number | null;
  lessonsPerActiveUser: number | null;
  totalEvents: number;
}

function dayOf(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function computeMetrics(events: RawEvent[]): Metrics {
  const activeDaysByUid = new Map<string, Set<string>>();
  events.filter(e => e.event === 'session_start').forEach(e => {
    if (!activeDaysByUid.has(e.uid)) activeDaysByUid.set(e.uid, new Set());
    activeDaysByUid.get(e.uid)!.add(dayOf(e.ts));
  });

  const allDays = new Set<string>();
  activeDaysByUid.forEach(days => days.forEach(d => allDays.add(d)));
  const sortedDays = Array.from(allDays).sort();
  const latestDay = sortedDays[sortedDays.length - 1] ?? null;

  const dau = latestDay
    ? Array.from(activeDaysByUid.values()).filter(days => days.has(latestDay)).length
    : 0;

  const cohortDayByUid = new Map<string, string>();
  activeDaysByUid.forEach((days, uid) => {
    cohortDayByUid.set(uid, Array.from(days).sort()[0]);
  });

  function retention(n: number) {
    if (!latestDay) return { rate: null, eligible: 0 };
    let eligible = 0, retained = 0;
    cohortDayByUid.forEach((cohortDay, uid) => {
      const targetDay = addDays(cohortDay, n);
      if (targetDay > latestDay) return; // cohort not old enough to measure yet
      eligible++;
      if (activeDaysByUid.get(uid)?.has(targetDay)) retained++;
    });
    return { eligible, rate: eligible > 0 ? retained / eligible : null };
  }

  const startedByLesson = new Map<string, Set<string>>();
  const completedByLesson = new Map<string, Set<string>>();
  events.forEach(e => {
    if (e.event === 'lesson_started' && e.lesson_id) {
      if (!startedByLesson.has(e.lesson_id)) startedByLesson.set(e.lesson_id, new Set());
      startedByLesson.get(e.lesson_id)!.add(e.uid);
    }
    if (e.event === 'lesson_completed' && e.lesson_id) {
      if (!completedByLesson.has(e.lesson_id)) completedByLesson.set(e.lesson_id, new Set());
      completedByLesson.get(e.lesson_id)!.add(e.uid);
    }
  });

  let totalStarted = 0, totalCompleted = 0;
  startedByLesson.forEach(s => { totalStarted += s.size; });
  completedByLesson.forEach(s => { totalCompleted += s.size; });
  const overallCompletionRate = totalStarted > 0 ? totalCompleted / totalStarted : null;

  let biggestDropoff: Metrics['biggestDropoff'] = null;
  startedByLesson.forEach((starters, lessonId) => {
    if (starters.size < MIN_LESSON_SAMPLE) return;
    const completers = completedByLesson.get(lessonId)?.size ?? 0;
    const rate = completers / starters.size;
    if (!biggestDropoff || rate < biggestDropoff.rate) {
      biggestDropoff = { lessonId, rate, started: starters.size };
    }
  });

  // Median session length, from batched screen_view docs grouped by session_id
  // (a long session may have flushed as more than one doc).
  const spanBySession = new Map<string, { min: number; max: number }>();
  events.forEach(e => {
    if (e.event !== 'screen_view' || !e.session_id || !Array.isArray(e.screens)) return;
    const timestamps = e.screens.map(s => s.ts).filter(n => typeof n === 'number');
    if (timestamps.length === 0) return;
    const min = Math.min(...timestamps), max = Math.max(...timestamps);
    const existing = spanBySession.get(e.session_id);
    if (existing) {
      existing.min = Math.min(existing.min, min);
      existing.max = Math.max(existing.max, max);
    } else {
      spanBySession.set(e.session_id, { min, max });
    }
  });
  const sessionLengths = Array.from(spanBySession.values())
    .map(({ min, max }) => (max - min) / 1000)
    .sort((a, b) => a - b);
  const medianSessionSeconds = sessionLengths.length > 0
    ? sessionLengths[Math.floor(sessionLengths.length / 2)]
    : null;

  const uidLessonPairs = new Set<string>();
  completedByLesson.forEach((uids, lessonId) => uids.forEach(uid => uidLessonPairs.add(`${uid}::${lessonId}`)));
  const activeUidCount = activeDaysByUid.size;
  const lessonsPerActiveUser = activeUidCount > 0 ? uidLessonPairs.size / activeUidCount : null;

  return {
    latestDay,
    dau,
    d1: retention(1), d7: retention(7), d30: retention(30),
    overallCompletionRate,
    biggestDropoff,
    medianSessionSeconds,
    lessonsPerActiveUser,
    totalEvents: events.length,
  };
}

function formatPct(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface Props { onBack: () => void; }

export function AnalyticsDashboardScreen({ onBack }: Props) {
  const { theme } = useTheme();
  const [events, setEvents] = useState<RawEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const db = getFirebaseDb();
      if (!db) { setEvents([]); return; }
      const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
      const q = query(
        collection(db, 'analytics_events'),
        where('ts', '>=', cutoff),
        orderBy('ts', 'desc'),
        fsLimit(MAX_DOCS),
      );
      const snap = await getDocs(q);
      setEvents(snap.docs.map(d => d.data() as RawEvent));
    } catch (e) {
      console.warn('[analytics-dashboard] failed to load events', e);
      setError('Could not load analytics data.');
      setEvents(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => events ? computeMetrics(events) : null, [events]);
  const s = styles(theme);

  const noData = metrics !== null && metrics.totalEvents === 0;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={[s.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.backText, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.textPrimary }]}>Analytics</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
        Last {WINDOW_DAYS} days{metrics?.latestDay ? ` · most recent activity ${metrics.latestDay}` : ''}
      </Text>

      {loading ? (
        <View style={s.loadingWrap}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : error ? (
        <View style={s.empty}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.colors.textTertiary} />
          <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
        >
          {noData ? (
            <View style={s.empty}>
              <Ionicons name="analytics-outline" size={40} color={theme.colors.textTertiary} />
              <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>
                No analytics events yet. This fills in as students start using the app.
              </Text>
            </View>
          ) : (
            <>
              <View style={s.grid}>
                <MetricCard theme={theme} icon="people-outline" label="DAU (most recent day)"
                  value={String(metrics!.dau)} />
                <MetricCard theme={theme} icon="repeat-outline" label="D1 return rate"
                  value={formatPct(metrics!.d1.rate)} sub={metrics!.d1.eligible > 0 ? `n=${metrics!.d1.eligible}` : 'not enough data yet'} />
                <MetricCard theme={theme} icon="calendar-outline" label="D7 return rate"
                  value={formatPct(metrics!.d7.rate)} sub={metrics!.d7.eligible > 0 ? `n=${metrics!.d7.eligible}` : 'not enough data yet'} />
                <MetricCard theme={theme} icon="calendar-number-outline" label="D30 return rate"
                  value={formatPct(metrics!.d30.rate)} sub={metrics!.d30.eligible > 0 ? `n=${metrics!.d30.eligible}` : 'not enough data yet'} />
                <MetricCard theme={theme} icon="school-outline" label="Lesson completion rate"
                  value={formatPct(metrics!.overallCompletionRate)} />
                <MetricCard theme={theme} icon="time-outline" label="Median session length"
                  value={formatDuration(metrics!.medianSessionSeconds)} />
                <MetricCard theme={theme} icon="book-outline" label="Lessons / active user"
                  value={metrics!.lessonsPerActiveUser === null ? '—' : metrics!.lessonsPerActiveUser.toFixed(1)} />
              </View>

              <View style={[s.dropoffCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong }]}>
                <View style={s.dropoffHeader}>
                  <Ionicons name="trending-down-outline" size={18} color={theme.colors.danger} />
                  <Text style={[s.dropoffTitle, { color: theme.colors.textPrimary }]}>Biggest drop-off point</Text>
                </View>
                {metrics!.biggestDropoff ? (
                  <>
                    <Text style={[s.dropoffLesson, { color: theme.colors.textPrimary }]}>
                      {lessonTitle(metrics!.biggestDropoff.lessonId)}
                    </Text>
                    <Text style={[s.dropoffSub, { color: theme.colors.textSecondary }]}>
                      {formatPct(metrics!.biggestDropoff.rate)} completion · {metrics!.biggestDropoff.started} students started
                    </Text>
                  </>
                ) : (
                  <Text style={[s.dropoffSub, { color: theme.colors.textSecondary }]}>
                    Not enough per-lesson data yet (need ≥{MIN_LESSON_SAMPLE} students starting the same lesson).
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetricCard({ theme, icon, label, value, sub }: {
  theme: any; icon: any; label: string; value: string; sub?: string;
}) {
  const s = styles(theme);
  return (
    <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong }]}>
      <Ionicons name={icon} size={18} color={theme.colors.primary} />
      <Text style={[s.cardValue, { color: theme.colors.textPrimary }]}>{value}</Text>
      <Text style={[s.cardLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      {sub ? <Text style={[s.cardSub, { color: theme.colors.textTertiary }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: sp(16), paddingVertical: sp(12), borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backText: { fontSize: fs(15), fontWeight: '600' },
  headerTitle: { fontSize: fs(17), fontWeight: '700' },
  subtitle: { fontSize: fs(13), paddingHorizontal: sp(16), paddingTop: sp(10), paddingBottom: sp(4) },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: sp(60), paddingHorizontal: sp(32), gap: sp(10) },
  emptyText: { fontSize: fs(14), textAlign: 'center' },
  scroll: { padding: sp(16), paddingBottom: sp(40) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: sp(10) },
  card: {
    width: '47%', borderRadius: sp(14), borderWidth: 1, padding: sp(14), gap: sp(4),
  },
  cardValue: { fontSize: fs(22), fontWeight: '800', marginTop: sp(4) },
  cardLabel: { fontSize: fs(12), fontWeight: '600' },
  cardSub: { fontSize: fs(11) },
  dropoffCard: { marginTop: sp(10), borderRadius: sp(14), borderWidth: 1, padding: sp(16), gap: sp(4) },
  dropoffHeader: { flexDirection: 'row', alignItems: 'center', gap: sp(8), marginBottom: sp(4) },
  dropoffTitle: { fontSize: fs(14), fontWeight: '700' },
  dropoffLesson: { fontSize: fs(16), fontWeight: '700' },
  dropoffSub: { fontSize: fs(13) },
});
