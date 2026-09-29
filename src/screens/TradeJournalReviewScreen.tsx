/**
 * Trade Journal — where predictions get graded.
 *
 * Each prediction written through the thesis gate comes due at its check-back
 * date and is graded against the student's own words: did what they said
 * would happen, happen? The price change is revealed only after that grade is
 * saved (see GradePredictionCard), and accuracy is by grade, never by P&L.
 *
 * This screen used to show "Avg return" beside "Thesis correct" as if they
 * measured the same thing, and its reflection form recorded the P&L at the
 * moment of reflecting. Both are gone. Entries from before the thesis gate
 * (a category label instead of a claim, no way to be wrong) are still listed,
 * read-only, and excluded from accuracy.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/Card';
import { GradePredictionCard } from '../components/GradePredictionCard';
import { PredictionAccuracy } from '../components/PredictionAccuracy';
import { useTradeJournalStore, JournalEntry } from '../services/tradeJournalStore';
import { gradeStatus } from '../services/predictionGrading';

interface TradeJournalReviewScreenProps {
  onBack: () => void;
  onStockPress?: (symbol: string) => void;
}

const newestFirst = (a: JournalEntry, b: JournalEntry) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

export function TradeJournalReviewScreen({
  onBack,
  onStockPress
}: TradeJournalReviewScreenProps) {
  const { theme } = useTheme();
  const entries = useTradeJournalStore(state => state.entries);

  // Predictions that were due when the screen opened stay in "Ready to grade"
  // after they're graded, so the price reveal and follow-up question appear
  // in place instead of the card jumping to another section.
  const [openedDue] = useState(() => new Set(entries.filter(e => gradeStatus(e, new Date()) === 'due').map(e => e.id)));
  const now = new Date();
  const ready   = entries.filter(e => gradeStatus(e, now) === 'due' || openedDue.has(e.id)).sort(newestFirst);
  const waiting = entries.filter(e => gradeStatus(e, now) === 'waiting' && !openedDue.has(e.id)).sort(newestFirst);
  const graded  = entries.filter(e => gradeStatus(e, now) === 'graded' && !openedDue.has(e.id)).sort(newestFirst);
  const preGate = entries.filter(e => gradeStatus(e, now) === 'pre-gate').sort(newestFirst);
  const dueCount = entries.filter(e => gradeStatus(e, now) === 'due').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Trade Journal
        </Text>
        <View style={{ minWidth: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Empty state */}
        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="journal-outline" size={48} color={theme.colors.textTertiary} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              Your journal is empty
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
              Every buy starts with a written prediction, and each one lands here. When its check-back date arrives, you grade it against what you said.
            </Text>
          </View>
        )}

        {entries.length > 0 && (
          <Card variant="elevated" padding="md" style={styles.statsCard}>
            <PredictionAccuracy entries={entries} />
          </Card>
        )}

        {ready.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Ready to grade</Text>
              {dueCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.colors.warningGlow }]}>
                  <Text style={[styles.badgeText, { color: theme.colors.warning }]}>{dueCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              These have reached their check-back date. Did what you predicted happen?
            </Text>
            {ready.map(e => <GradePredictionCard key={e.id} entry={e} onStockPress={onStockPress} />)}
          </View>
        )}

        {waiting.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Waiting for check-back</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              You'll grade each one on the date you chose when you wrote it.
            </Text>
            {waiting.map(e => <GradePredictionCard key={e.id} entry={e} onStockPress={onStockPress} />)}
          </View>
        )}

        {graded.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Graded</Text>
            {graded.map(e => <GradePredictionCard key={e.id} entry={e} onStockPress={onStockPress} />)}
          </View>
        )}

        {preGate.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Before predictions</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Written before every buy needed a prediction. Kept for reference; not graded or counted.
            </Text>
            {preGate.map(entry => entry.postTradeReflection ? (
              <ReflectedEntryCard key={entry.id} entry={entry} onPress={() => onStockPress?.(entry.symbol)} theme={theme} />
            ) : (
              <PreGateEntryCard key={entry.id} entry={entry} onPress={() => onStockPress?.(entry.symbol)} theme={theme} />
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Read-only view of an entry from before the thesis gate. */
function PreGateEntryCard({ entry, onPress, theme }: { entry: JournalEntry; onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card variant="default" padding="md" style={styles.entryCard}>
        <Text style={[styles.entrySymbol, { color: theme.colors.textPrimary }]}>{entry.symbol}</Text>
        <Text style={[styles.entryDate, { color: theme.colors.textTertiary }]}>
          {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        {!!entry.buyReason && (
          <>
            <Text style={[styles.thesisLabel, { color: theme.colors.textTertiary, marginTop: 8 }]}>REASON</Text>
            <Text style={[styles.thesisText, { color: theme.colors.textSecondary }]}>"{entry.buyReason}"</Text>
          </>
        )}
        {!!entry.exitPlan && (
          <>
            <Text style={[styles.thesisLabel, { color: theme.colors.textTertiary, marginTop: 8 }]}>EXIT PLAN</Text>
            <Text style={[styles.thesisText, { color: theme.colors.textSecondary }]}>"{entry.exitPlan}"</Text>
          </>
        )}
      </Card>
    </TouchableOpacity>
  );
}

function ReflectedEntryCard({
  entry,
  onPress,
  theme
}: {
  entry: JournalEntry;
  onPress: () => void;
  theme: any;
}) {
  const r = entry.postTradeReflection!;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card variant="default" padding="md" style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View>
            <Text style={[styles.entrySymbol, { color: theme.colors.textPrimary }]}>
              {entry.symbol}
            </Text>
            <Text style={[styles.entryDate, { color: theme.colors.textTertiary }]}>
              Reviewed {new Date(r.reflectionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={[
            styles.outcomeBadge,
            {
              backgroundColor: r.thesisPlayedOut === 'yes' ? theme.colors.successGlow :
                               r.thesisPlayedOut === 'partially' ? theme.colors.warningGlow :
                               theme.colors.dangerGlow,
            },
          ]}>
            <Ionicons
              name={r.thesisPlayedOut === 'yes' ? 'checkmark' :
                    r.thesisPlayedOut === 'partially' ? 'remove' : 'close'}
              size={11}
              color={r.thesisPlayedOut === 'yes' ? theme.colors.success :
                     r.thesisPlayedOut === 'partially' ? theme.colors.warning :
                     theme.colors.danger}
            />
            <Text style={[
              styles.outcomeBadgeText,
              {
                color: r.thesisPlayedOut === 'yes' ? theme.colors.success :
                       r.thesisPlayedOut === 'partially' ? theme.colors.warning :
                       theme.colors.danger,
              },
            ]}>
              {r.thesisPlayedOut === 'yes' ? 'Played out' :
               r.thesisPlayedOut === 'partially' ? 'Partial' :
               'Did not'}
            </Text>
          </View>
        </View>

        <Text style={[styles.thesisLabel, { color: theme.colors.textTertiary, marginTop: 8 }]}>
          ORIGINAL THESIS
        </Text>
        <Text
          style={[styles.thesisText, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          "{entry.buyReason}"
        </Text>

        <Text style={[styles.thesisLabel, { color: theme.colors.textTertiary, marginTop: 8 }]}>
          LEARNING
        </Text>
        <Text style={[styles.thesisText, { color: theme.colors.textPrimary }]}>
          {r.keyLearnings}
        </Text>

        <View style={[styles.reflectMeta, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.reflectMetaText, { color: theme.colors.textTertiary }]}>
            Held {r.actualHoldDays} days ·
            {r.wouldRepeat === 'yes' ? ' Would repeat' :
             r.wouldRepeat === 'with_changes' ? ' Would tweak' :
             ' Would not repeat'}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backText: { fontSize: 16, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20 },

  statsCard: { marginBottom: 24 },
  statsLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { alignItems: 'flex-start' },
  statValue: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '500' },
  learningBox: { padding: 12, borderRadius: 10 },
  learningLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  learningText: { fontSize: 13, lineHeight: 19, fontStyle: 'italic' },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  sectionSubtitle: { fontSize: 12, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  entryCard: { marginBottom: 12 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  entrySymbolBlock: {},
  entrySymbol: { fontSize: 18, fontWeight: '700' },
  entryDate: { fontSize: 11, marginTop: 2 },
  viewButton: {},
  viewButtonText: { fontSize: 13, fontWeight: '600' },

  thesisBox: { padding: 12, borderRadius: 10, marginTop: 12 },
  thesisLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 },
  thesisText: { fontSize: 13, lineHeight: 19 },

  outcomeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  outcomeBadgeText: { fontSize: 11, fontWeight: '700' },

  reflectionForm: { marginTop: 16 },
  reflectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  optionRow: { flexDirection: 'row', gap: 8 },
  optionChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionChipText: { fontSize: 13, fontWeight: '600' },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' },

  reflectMeta: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  reflectMetaText: { fontSize: 11, fontWeight: '500' },
});
