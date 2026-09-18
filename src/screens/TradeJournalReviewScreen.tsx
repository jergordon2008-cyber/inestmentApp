/**
 * Trade Journal Review Screen
 *
 * The screen that turns trades into learning. For each closed trade, users review:
 * - What they thought would happen (their thesis)
 * - What actually happened (price action)
 * - Why the difference (their reflection)
 *
 * This is the single most powerful feature in the app for actually making
 * users better investors. Most retail investors NEVER do this. Doing it
 * just 10 times beats reading any number of books.
 *
 * Aggregate stats at the top show patterns:
 * - "You're right about your thesis 60% of the time"
 * - "Your average hold is 23 days but you said 60"
 * - "Most successful trades came from earnings beat signals"
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { changeColor, changeSign } from '../utils/change';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useTradeJournalStore, JournalEntry } from '../services/tradeJournalStore';
import { usePortfolioStore } from '../services/portfolioStore';
import { getStockSync } from '../services/marketDataFacade';

interface TradeJournalReviewScreenProps {
  onBack: () => void;
  onStockPress?: (symbol: string) => void;
}

export function TradeJournalReviewScreen({
  onBack,
  onStockPress
}: TradeJournalReviewScreenProps) {
  const { theme } = useTheme();
  const entries = useTradeJournalStore(state => state.entries);
  const getStats = useTradeJournalStore(state => state.getReflectedTradeStats);
  const portfolio = usePortfolioStore(state => state.portfolio);

  const stats = useMemo(() => getStats(), [getStats, entries]);

  // Group entries
  const unreflectedEntries = entries.filter(e => !e.postTradeReflection);
  const reflectedEntries = entries.filter(e => e.postTradeReflection);

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
              Every time you make a paper trade and write your thesis, an entry is added here. Reviewing them is how you actually get better at investing.
            </Text>
          </View>
        )}

        {/* Stats card */}
        {stats.totalReflected > 0 && (
          <Card variant="elevated" padding="md" style={styles.statsCard}>
            <Text style={[styles.statsLabel, { color: theme.colors.textTertiary }]}>
              YOUR PATTERNS
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {stats.totalReflected}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Trades reviewed
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.colors.success }]}>
                  {/* getStats() already returns this as a percentage
                      ((correctTheses / total) * 100), so it is rendered as-is.
                      Multiplying by 100 again here showed 3-of-5 as "6000%". */}
                  {stats.thesisCorrectRate.toFixed(0)}%
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Thesis correct
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[
                  styles.statValue,
                  { color: changeColor(stats.avgReturn, theme) }
                ]}>
                  {changeSign(stats.avgReturn)}{stats.avgReturn.toFixed(1)}%
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Avg return
                </Text>
              </View>
            </View>

            {stats.bestLearning && (
              <View style={[styles.learningBox, { backgroundColor: theme.colors.primaryGlow }]}>
                <Text style={[styles.learningLabel, { color: theme.colors.primary }]}>
                  BIGGEST LESSON SO FAR
                </Text>
                <Text style={[styles.learningText, { color: theme.colors.textPrimary }]}>
                  "{stats.bestLearning}"
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Needs reflection section */}
        {unreflectedEntries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Awaiting reflection
              </Text>
              <View style={[styles.badge, { backgroundColor: theme.colors.warningGlow }]}>
                <Text style={[styles.badgeText, { color: theme.colors.warning }]}>
                  {unreflectedEntries.length}
                </Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Open positions where you can check in on your thesis
            </Text>

            {unreflectedEntries.slice().reverse().map(entry => (
              <UnreflectedEntryCard
                key={entry.id}
                entry={entry}
                trades={portfolio?.trades ?? []}
                onPress={() => onStockPress?.(entry.symbol)}
                theme={theme}
              />
            ))}
          </View>
        )}

        {/* Reflected entries section */}
        {reflectedEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Past reflections
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Trades you've already reviewed — your learning record
            </Text>

            {reflectedEntries.slice().reverse().map(entry => (
              <ReflectedEntryCard
                key={entry.id}
                entry={entry}
                onPress={() => onStockPress?.(entry.symbol)}
                theme={theme}
              />
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

function UnreflectedEntryCard({
  entry,
  trades,
  onPress,
  theme
}: {
  entry: JournalEntry;
  trades: any[];
  onPress: () => void;
  theme: any;
}) {
  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState('');
  const [thesisPlayedOut, setThesisPlayedOut] = useState<'yes' | 'partially' | 'no' | null>(null);
  const [wouldRepeat, setWouldRepeat] = useState<'yes' | 'no' | 'with_changes' | null>(null);

  const addPostTradeReflection = useTradeJournalStore(state => state.addPostTradeReflection);

  const daysSince = Math.floor(
    (Date.now() - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleSubmit = () => {
    if (!thesisPlayedOut || !wouldRepeat || reflection.length < 10) {
      showAlert('Almost there', 'Please answer all questions and write at least 10 characters of reflection.');
      return;
    }

    const trade = trades.find(t => t.id === entry.tradeId);
    const currentStock = getStockSync(entry.symbol);
    const actualReturn = currentStock && trade
      ? ((currentStock.price - trade.pricePerShare) / trade.pricePerShare) * 100
      : 0;

    addPostTradeReflection(entry.id, {
      actualReturn,
      actualHoldDays: daysSince,
      thesisPlayedOut,
      keyLearnings: reflection,
      wouldRepeat,
      reflectionDate: new Date().toISOString(),
    });

    showAlert('Saved', 'Reflection added to your journal. Keep building that pattern recognition.');
    setShowReflection(false);
  };

  return (
    <Card variant="default" padding="md" style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.entrySymbolBlock}>
          <Text style={[styles.entrySymbol, { color: theme.colors.textPrimary }]}>
            {entry.symbol}
          </Text>
          <Text style={[styles.entryDate, { color: theme.colors.textTertiary }]}>
            {daysSince} day{daysSince === 1 ? '' : 's'} ago
          </Text>
        </View>
        <TouchableOpacity onPress={onPress} style={styles.viewButton}>
          <Text style={[styles.viewButtonText, { color: theme.colors.primary }]}>
            View stock ›
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.thesisBox, { backgroundColor: theme.colors.surfaceMuted }]}>
        <Text style={[styles.thesisLabel, { color: theme.colors.textTertiary }]}>
          YOUR THESIS
        </Text>
        <Text style={[styles.thesisText, { color: theme.colors.textPrimary }]}>
          "{entry.buyReason}"
        </Text>
        {entry.exitPlan && (
          <>
            <Text style={[styles.thesisLabel, { color: theme.colors.textTertiary, marginTop: 8 }]}>
              EXIT PLAN
            </Text>
            <Text style={[styles.thesisText, { color: theme.colors.textPrimary }]}>
              "{entry.exitPlan}"
            </Text>
          </>
        )}
      </View>

      {!showReflection ? (
        <Button
          label="Add reflection"
          onPress={() => setShowReflection(true)}
          variant="secondary"
          size="md"
          fullWidth
          style={{ marginTop: 12 }}
        />
      ) : (
        <View style={styles.reflectionForm}>
          <Text style={[styles.reflectionLabel, { color: theme.colors.textPrimary }]}>
            Has your thesis played out?
          </Text>
          <View style={styles.optionRow}>
            {(['yes', 'partially', 'no'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => setThesisPlayedOut(opt)}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: thesisPlayedOut === opt ? theme.colors.primary : theme.colors.surface,
                    borderColor: thesisPlayedOut === opt ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={[
                  styles.optionChipText,
                  { color: thesisPlayedOut === opt ? '#FFFFFF' : theme.colors.textSecondary },
                ]}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.reflectionLabel, { color: theme.colors.textPrimary, marginTop: 16 }]}>
            What did you learn?
          </Text>
          <TextInput
            value={reflection}
            onChangeText={setReflection}
            placeholder="The key lesson from this trade so far..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            numberOfLines={3}
            style={[
              styles.textarea,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
              },
            ]}
          />

          <Text style={[styles.reflectionLabel, { color: theme.colors.textPrimary, marginTop: 16 }]}>
            Would you make this trade again?
          </Text>
          <View style={styles.optionRow}>
            {([
              { v: 'yes', l: 'Yes' },
              { v: 'with_changes', l: 'With tweaks' },
              { v: 'no', l: 'No' },
            ] as const).map(opt => (
              <TouchableOpacity
                key={opt.v}
                onPress={() => setWouldRepeat(opt.v)}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: wouldRepeat === opt.v ? theme.colors.primary : theme.colors.surface,
                    borderColor: wouldRepeat === opt.v ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={[
                  styles.optionChipText,
                  { color: wouldRepeat === opt.v ? '#FFFFFF' : theme.colors.textSecondary },
                ]}>
                  {opt.l}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formActions}>
            <Button
              label="Cancel"
              onPress={() => setShowReflection(false)}
              variant="ghost"
              size="md"
            />
            <Button
              label="Save reflection"
              onPress={handleSubmit}
              variant="primary"
              size="md"
              disabled={!thesisPlayedOut || !wouldRepeat || reflection.length < 10}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}
    </Card>
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
