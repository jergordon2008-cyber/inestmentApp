/**
 * Admin Dashboard — view every real student account.
 *
 * Only reachable if the signed-in uid exists in the `admins/` Firestore
 * collection (checked in App.tsx and enforced server-side by
 * firestore.rules — the client-side gate here is UX, not the real security
 * boundary). Lists every student's profile, lets the admin tap in to see
 * that student's live portfolio, curriculum progress, and journal.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { changeColor } from '../utils/change';
import { listAllUserProfiles, adminLoadPortfolio, adminLoadJournal } from '../services/firestoreSync';
import { User, Portfolio } from '../types';
import { partitionProfiles, fmtFixed, fmtMoney0, fmtDate, fmtReturn, countOrDash, describeLoadError, IncompleteProfile } from '../services/adminProfiles';
import { JournalEntry } from '../services/tradeJournalStore';
import { sp, fs } from '../constants/responsive';
import { tier1Lessons } from '../data/curriculum';
import { tier2Lessons } from '../data/tier2curriculum';
import { tier3Lessons } from '../data/tier3curriculum';

const ALL_LESSONS = [...tier1Lessons, ...tier2Lessons, ...tier3Lessons];

interface Props { onBack: () => void; onAnalyticsPress?: () => void; }

export function AdminScreen({ onBack, onAnalyticsPress }: Props) {
  const { theme } = useTheme();
  // Complete profiles show in full; incomplete ones (no onboarding, or a
  // profile emptied to repair a copy) get a plain row — see adminProfiles.
  const [students, setStudents] = useState<User[]>([]);
  const [incomplete, setIncomplete] = useState<IncompleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { complete, incomplete: partial } = partitionProfiles(await listAllUserProfiles());
      setStudents(complete);
      setIncomplete(partial);
    } catch (e) {
      console.warn('[admin] failed to load students', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (selected) {
    return <StudentDetail student={selected} onBack={() => setSelected(null)} theme={theme} />;
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={[s.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.backText, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.textPrimary }]}>Admin Dashboard</Text>
        {onAnalyticsPress ? (
          <TouchableOpacity onPress={onAnalyticsPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="stats-chart-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ minWidth: 60 }} />
        )}
      </View>

      <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
        {students.length} student{students.length === 1 ? '' : 's'} signed up
        {incomplete.length > 0 && (
          <Text style={{ color: theme.colors.warning }}>{` · ${incomplete.length} incomplete`}</Text>
        )}
      </Text>

      {loading ? (
        <View style={s.loadingWrap}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
        >
          {students.length === 0 && incomplete.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={40} color={theme.colors.textTertiary} />
              <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>No students have signed up yet.</Text>
            </View>
          )}
          {students.map(student => (
            <TouchableOpacity
              key={student.id}
              onPress={() => setSelected(student)}
              style={[s.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              activeOpacity={0.75}
            >
              <View style={[s.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[s.avatarInitial, { color: theme.colors.primary }]}>
                  {student.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>{student.displayName}</Text>
                <Text style={[s.email, { color: theme.colors.textTertiary }]} numberOfLines={1}>{student.email}</Text>
                <Text style={[s.meta, { color: theme.colors.textSecondary }]}>
                  Tier {student.currentTier} · {student.lessonsCompleted.length} lessons · {student.totalTradesExecuted} trades · {student.streak}d streak
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
          {incomplete.map(p => (
            // Not pressable: there's no profile to open.
            <View
              key={p.uid}
              accessibilityLabel="Incomplete profile"
              style={[s.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: 0.85 }]}
            >
              <View style={[s.avatar, { backgroundColor: theme.colors.textTertiary + '20' }]}>
                <Ionicons name="person-outline" size={fs(18)} color={theme.colors.textTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: theme.colors.textSecondary }]}>
                  Incomplete profile · hasn't finished onboarding
                </Text>
                <Text selectable style={[s.meta, { color: theme.colors.textTertiary }]}>Account id: {p.uid}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StudentDetail({ student, onBack, theme }: { student: User; onBack: () => void; theme: any }) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  // Each part fails on its own: a journal that can't load doesn't hide a
  // portfolio that did (and vice versa). Before, one Promise.all with no catch:
  // any failure left the spinner up forever with nothing shown.
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);   // bumped by "Try again"

  useEffect(() => {
    let cancelled = false;   // another student opened, or the screen closed, meanwhile
    setLoading(true);
    (async () => {
      const [p, j] = await Promise.allSettled([
        adminLoadPortfolio(student.id),
        adminLoadJournal(student.id),
      ]);
      if (cancelled) return;
      if (p.status === 'fulfilled') { setPortfolio(p.value); setPortfolioError(null); }
      else { console.error('[admin] portfolio load failed', p.reason); setPortfolio(null); setPortfolioError(describeLoadError(p.reason)); }
      if (j.status === 'fulfilled') { setJournal(j.value); setJournalError(null); }
      else { console.error('[admin] journal load failed', j.reason); setJournal([]); setJournalError(describeLoadError(j.reason)); }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [student.id, attempt]);

  /** The in-place failure state: what failed, why, and a way to retry. */
  const failedCard = (label: string, what: string, reason: string) => (
    <View style={[s.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[s.detailLabel, { color: theme.colors.textTertiary }]}>{label}</Text>
      <Text style={[s.detailValue, { color: theme.colors.textSecondary }]}>Couldn't load this student's {what}.</Text>
      <Text selectable style={[s.posLine, { color: theme.colors.textTertiary }]}>{reason}</Text>
      <TouchableOpacity onPress={() => setAttempt(a => a + 1)} accessibilityRole="button" style={{ marginTop: sp(8) }}>
        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: fs(13) }}>Try again</Text>
      </TouchableOpacity>
    </View>
  );

  // A stored portfolio can be partial: read these defensively (adminProfiles).
  const positions = Array.isArray(portfolio?.positions) ? portfolio!.positions.filter(p => p && typeof p === 'object') : [];
  const journalList = Array.isArray(journal) ? journal : [];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={[s.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.backText, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>{student.displayName}</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      {loading ? (
        <View style={s.loadingWrap}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={[s.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[s.detailLabel, { color: theme.colors.textTertiary }]}>EMAIL</Text>
            <Text style={[s.detailValue, { color: theme.colors.textPrimary }]}>{student.email}</Text>
            <Text style={[s.detailLabel, { color: theme.colors.textTertiary, marginTop: sp(12) }]}>JOINED</Text>
            <Text style={[s.detailValue, { color: theme.colors.textPrimary }]}>{fmtDate(student.createdAt)}</Text>
          </View>

          <View style={[s.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[s.detailLabel, { color: theme.colors.textTertiary }]}>
              CURRICULUM PROGRESS ({student.lessonsCompleted.length}/{ALL_LESSONS.length})
            </Text>
            <Text style={[s.detailValue, { color: theme.colors.textPrimary, marginBottom: sp(8) }]}>
              Tier {student.currentTier} · {student.streak} day streak
            </Text>
            {student.lessonsCompleted.length === 0 ? (
              <Text style={[s.detailValue, { color: theme.colors.textSecondary }]}>No lessons completed yet.</Text>
            ) : (
              [1, 2, 3].map(tier => {
                const tierLessons = ALL_LESSONS.filter(l => l.tier === tier);
                const done = tierLessons.filter(l => student.lessonsCompleted.includes(l.id));
                if (done.length === 0) return null;
                return (
                  <View key={tier} style={{ marginTop: sp(10) }}>
                    <Text style={[s.posLine, { color: theme.colors.textTertiary, fontWeight: '700' }]}>
                      TIER {tier} — {done.length}/{tierLessons.length}
                    </Text>
                    {done.map(l => (
                      <View key={l.id} style={s.posLineRow}>
                        <Ionicons name="checkmark" size={fs(12)} color={theme.colors.textSecondary} />
                        <Text style={[s.posLine, { color: theme.colors.textSecondary }]}>{l.title}</Text>
                      </View>
                    ))}
                  </View>
                );
              })
            )}
          </View>

          {portfolioError !== null ? failedCard('PORTFOLIO', 'portfolio', portfolioError) : portfolio ? (
            <View style={[s.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[s.detailLabel, { color: theme.colors.textTertiary }]}>PORTFOLIO</Text>
              <Text style={[s.bigValue, { color: theme.colors.textPrimary }]}>
                {fmtMoney0(portfolio.totalValue)}
              </Text>
              <Text style={{ color: changeColor(portfolio.totalReturn, theme), fontWeight: '700', marginBottom: sp(10) }}>
                {fmtReturn(portfolio.totalReturn, portfolio.totalReturnPercent)}
              </Text>
              <Text style={[s.detailValue, { color: theme.colors.textSecondary }]}>
                {countOrDash(portfolio.positions)} open position{countOrDash(portfolio.positions) === 1 ? '' : 's'} · {countOrDash(portfolio.trades)} total trades
              </Text>
              {positions.map((p, i) => (
                <Text key={`${p.symbol}-${i}`} style={[s.posLine, { color: theme.colors.textTertiary }]}>
                  {p.symbol ?? '—'} — {fmtFixed(p.shares, 4)} sh @ ${fmtFixed(p.averageCost, 2)}
                </Text>
              ))}
            </View>
          ) : (
            <View style={[s.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[s.detailValue, { color: theme.colors.textSecondary }]}>No portfolio data yet.</Text>
            </View>
          )}

          {journalError !== null ? failedCard('JOURNAL (— entries)', 'journal', journalError) : (
          <View style={[s.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[s.detailLabel, { color: theme.colors.textTertiary }]}>JOURNAL ({journalList.length} entries)</Text>
            {journalList.length === 0
              ? <Text style={[s.detailValue, { color: theme.colors.textSecondary }]}>No journal entries yet.</Text>
              : journalList.slice(0, 10).map(e => (
                  <View key={e.id} style={{ marginTop: sp(8) }}>
                    <Text style={[s.detailValue, { color: theme.colors.textPrimary }]}>{e.symbol} — {e.buyReason}</Text>
                    <Text style={[s.posLine, { color: theme.colors.textTertiary }]}>{fmtDate(e.createdAt)}</Text>
                  </View>
                ))}
          </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: sp(16), paddingVertical: sp(14), borderBottomWidth: 1,
  },
  backText: { fontSize: fs(16), fontWeight: '500', minWidth: 60 },
  headerTitle: { fontSize: fs(17), fontWeight: '700', flex: 1, textAlign: 'center' },
  subtitle: { fontSize: fs(12), textAlign: 'center', marginTop: sp(8), marginBottom: sp(4) },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: sp(16), paddingBottom: sp(48) },
  empty: { alignItems: 'center', paddingTop: sp(60), gap: sp(10) },
  emptyText: { fontSize: fs(14) },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: sp(12),
    borderRadius: sp(16), borderWidth: 1, padding: sp(14), marginBottom: sp(10),
  },
  avatar: { width: sp(42), height: sp(42), borderRadius: sp(21), alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: fs(16), fontWeight: '800' },
  name: { fontSize: fs(14), fontWeight: '700' },
  email: { fontSize: fs(11), marginTop: 1 },
  meta: { fontSize: fs(11), marginTop: sp(3) },

  detailCard: { borderRadius: sp(16), borderWidth: 1, padding: sp(16), marginBottom: sp(12) },
  detailLabel: { fontSize: fs(10), fontWeight: '800', letterSpacing: 1 },
  detailValue: { fontSize: fs(14), fontWeight: '600', marginTop: sp(3) },
  bigValue: { fontSize: fs(26), fontWeight: '800', marginTop: sp(4) },
  posLine: { fontSize: fs(12), marginTop: sp(3) },
  posLineRow: { flexDirection: 'row', alignItems: 'center', gap: sp(4) },
});
