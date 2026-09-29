/**
 * One prediction's grade: the prompt when it's due, and the locked result
 * afterwards.
 *
 * Order matters and is the point of the design:
 *   1. The claim and the way-to-be-wrong, quoted word for word.
 *   2. "Did it happen?" — yes / partly / no / too early to tell.
 *   3. Only after a yes/partly/no is SAVED: the price change since purchase,
 *      from a live quote, labelled as not part of the grade.
 *   4. Optional: "Did the stock move because of what you predicted?" — asked
 *      after the price, since it's a question about the move.
 * No price appears anywhere before step 3, and "too early" doesn't reveal it
 * either — the student will be grading this again later.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Card } from './Card';
import { Button } from './Button';
import {
  useTradeJournalStore, JournalEntry, GradeResult, MovedBecause, REASON_CONFIG, isFinalGrade,
} from '../services/tradeJournalStore';
import { usePortfolioStore } from '../services/portfolioStore';
import { useUserStore } from '../services/userStore';
import { fetchStock, isLiveQuote, LIVE_DATA_ENABLED } from '../services/marketDataFacade';
import { gradeStatus, nextGradeDate, priceChangePercent } from '../services/predictionGrading';
import { showAlert } from '../utils/alert';
import { changeColor, changeSign } from '../utils/change';

const GRADE_OPTIONS: { value: GradeResult; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'partly', label: 'Partly' },
  { value: 'no', label: 'No' },
  { value: 'too_early', label: 'Too early to tell' },
];
const GRADE_LABEL: Record<string, string> = { yes: 'It happened', partly: 'Partly happened', no: "Didn't happen" };
const MOVED_OPTIONS: { value: MovedBecause; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'partly', label: 'Partly' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not sure' },
];

const fmtDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function GradePredictionCard({ entry, onStockPress }: { entry: JournalEntry; onStockPress?: (symbol: string) => void }) {
  const { theme } = useTheme();
  const gradePrediction = useTradeJournalStore(s => s.gradePrediction);
  const recordPriceCheck = useTradeJournalStore(s => s.recordPriceCheck);
  const answerMovedBecause = useTradeJournalStore(s => s.answerMovedBecause);
  const trades = usePortfolioStore(s => s.portfolio?.trades);
  const recordActivity = useUserStore(s => s.recordActivity);
  const [choice, setChoice] = useState<GradeResult | null>(null);

  const status = gradeStatus(entry, new Date());
  const grade = entry.grade;
  const final = isFinalGrade(grade?.result);
  const reason = entry.reasonCategory ? REASON_CONFIG[entry.reasonCategory] : null;

  const save = () => {
    if (!choice) return;
    if (!gradePrediction(entry.id, choice)) {
      showAlert('Already graded', 'This prediction already has a grade, and grades can’t be changed.');
      return;
    }
    // A final grade is one of the day's qualifying actions (dailyStreak);
    // "too early to tell" isn't a grade, so it doesn't count.
    if (isFinalGrade(choice)) recordActivity();
    if (choice === 'too_early') {
      const next = nextGradeDate({ ...entry, grade: { result: 'too_early', gradedAt: new Date().toISOString() } });
      showAlert('Saved', next ? `We’ll ask you again on ${fmtDate(next)}.` : 'We’ll ask you again later.');
    }
    setChoice(null);
  };

  return (
    <Card variant="default" padding="md" style={s.card}>
      <View style={s.headerRow}>
        <View>
          <Text style={[s.symbol, { color: theme.colors.textPrimary }]}>{entry.symbol}</Text>
          <Text style={[s.meta, { color: theme.colors.textTertiary }]}>
            Predicted {fmtDate(entry.createdAt)}
            {reason ? ` · ${reason.label}` : ''}
            {entry.confidence ? ` · confidence ${entry.confidence}/5` : ''}
          </Text>
        </View>
        {onStockPress && (
          <TouchableOpacity onPress={() => onStockPress(entry.symbol)}>
            <Text style={[s.link, { color: theme.colors.primary }]}>View stock ›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 1. Word for word — the student grades against exactly this. */}
      <View style={[s.quoteBox, { backgroundColor: theme.colors.surfaceMuted }]}>
        <Text style={[s.quoteLabel, { color: theme.colors.textTertiary }]}>YOU SAID THIS WOULD HAPPEN</Text>
        <Text style={[s.quote, { color: theme.colors.textPrimary }]}>“{entry.buyReason}”</Text>
        <Text style={[s.quoteLabel, { color: theme.colors.textTertiary, marginTop: 10 }]}>YOU’D KNOW YOU WERE WRONG IF</Text>
        <Text style={[s.quote, { color: theme.colors.textPrimary }]}>“{entry.exitPlan}”</Text>
      </View>

      {status === 'due' && (
        <View style={s.section}>
          <Text style={[s.question, { color: theme.colors.textPrimary }]}>Did it happen?</Text>
          {grade?.result === 'too_early' && (
            <Text style={[s.meta, { color: theme.colors.textTertiary, marginBottom: 8 }]}>
              On {fmtDate(grade.gradedAt)} you said it was too early to tell.
            </Text>
          )}
          <View style={s.optionWrap}>
            {GRADE_OPTIONS.map(o => (
              <TouchableOpacity
                key={o.value}
                onPress={() => setChoice(o.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: choice === o.value }}
                style={[s.option, {
                  borderColor: choice === o.value ? theme.colors.primary : theme.colors.border,
                  backgroundColor: choice === o.value ? theme.colors.primary + '20' : theme.colors.surface,
                }]}
              >
                <Text style={[s.optionText, { color: choice === o.value ? theme.colors.primary : theme.colors.textSecondary }]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[s.fine, { color: theme.colors.textTertiary }]}>
            Grade it on your own words above, not on the stock price. Once saved, a grade can’t be changed.
          </Text>
          <Button label="Save grade" onPress={save} variant="primary" size="md" fullWidth disabled={!choice} style={{ marginTop: 10 }} />
        </View>
      )}

      {status === 'waiting' && (
        <Text style={[s.meta, { color: theme.colors.textTertiary, marginTop: 10 }]}>
          {grade?.result === 'too_early' ? 'Too early to tell. ' : ''}
          Ready to grade on {fmtDate(nextGradeDate(entry)!)}.
        </Text>
      )}

      {final && grade && (
        <>
          <View style={[s.gradeRow, { borderTopColor: theme.colors.border }]}>
            <Ionicons
              name={grade.result === 'yes' ? 'checkmark-circle' : grade.result === 'partly' ? 'remove-circle' : 'close-circle'}
              size={18}
              color={grade.result === 'yes' ? theme.colors.success : grade.result === 'partly' ? theme.colors.warning : theme.colors.danger}
            />
            <Text style={[s.gradeText, { color: theme.colors.textPrimary }]}>Your grade: {GRADE_LABEL[grade.result]}</Text>
            <View style={{ flex: 1 }} />
            <Text style={[s.meta, { color: theme.colors.textTertiary }]}>{fmtDate(grade.gradedAt)}</Text>
          </View>
          <PriceReveal entry={entry} tradePrice={trades?.find(t => t.id === entry.tradeId)?.pricePerShare} onRecord={c => recordPriceCheck(entry.id, c)} />
          {(grade.result === 'yes' || grade.result === 'partly') && (
            <View style={s.section}>
              <Text style={[s.question, { color: theme.colors.textPrimary }]}>
                Did the stock move because of what you predicted? <Text style={{ color: theme.colors.textTertiary, fontWeight: '500' }}>(optional)</Text>
              </Text>
              <View style={s.optionWrap}>
                {MOVED_OPTIONS.map(o => {
                  const on = grade.movedBecause === o.value;
                  return (
                    <TouchableOpacity
                      key={o.value}
                      onPress={() => answerMovedBecause(entry.id, o.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      style={[s.option, {
                        borderColor: on ? theme.colors.primary : theme.colors.border,
                        backgroundColor: on ? theme.colors.primary + '20' : theme.colors.surface,
                      }]}
                    >
                      <Text style={[s.optionText, { color: on ? theme.colors.primary : theme.colors.textSecondary }]}>{o.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}
    </Card>
  );
}

/**
 * The price change, shown only after a final grade exists. Uses a live quote
 * or nothing: a snapshot price here would invent a gain or loss.
 */
function PriceReveal({ entry, tradePrice, onRecord }: {
  entry: JournalEntry;
  tradePrice: number | undefined;
  onRecord: (c: { entryPrice: number; price: number; checkedAt: string }) => void;
}) {
  const { theme } = useTheme();
  const check = entry.grade?.priceCheck;
  const [state, setState] = useState<'idle' | 'loading' | 'unavailable'>('idle');

  const load = async () => {
    if (!tradePrice) return;
    setState('loading');
    try {
      const stock = LIVE_DATA_ENABLED ? await fetchStock(entry.symbol) : null;
      if (stock && isLiveQuote(stock)) {
        onRecord({ entryPrice: tradePrice, price: stock.price, checkedAt: new Date().toISOString() });
        setState('idle');
      } else {
        setState('unavailable');
      }
    } catch (e) {
      console.error('[grade] live quote failed', e);
      setState('unavailable');
    }
  };

  useEffect(() => { if (!check && tradePrice) void load(); }, [entry.id]); // once per card

  const pct = check ? priceChangePercent(check) : null;
  return (
    <View style={[s.reveal, { borderColor: theme.colors.border }]}>
      <Text style={[s.quoteLabel, { color: theme.colors.textTertiary }]}>PRICE CHANGE · NOT PART OF YOUR GRADE</Text>
      {check && pct !== null ? (
        <Text style={[s.revealText, { color: theme.colors.textSecondary }]}>
          <Text style={{ color: changeColor(pct, theme), fontWeight: '800' }}>{changeSign(pct)}{pct.toFixed(1)}%</Text>
          {`  from $${check.entryPrice.toFixed(2)} when you bought to $${check.price.toFixed(2)} on ${fmtDate(check.checkedAt)}.`}
        </Text>
      ) : !tradePrice ? (
        <Text style={[s.revealText, { color: theme.colors.textTertiary }]}>
          The purchase for this prediction isn’t on this device, so there’s no price change to show.
        </Text>
      ) : state === 'loading' ? (
        <ActivityIndicator size="small" color={theme.colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[s.revealText, { color: theme.colors.textTertiary, flex: 1 }]}>
            Couldn’t get a live price right now. Your grade is saved.
          </Text>
          <TouchableOpacity onPress={() => void load()}>
            <Text style={[s.link, { color: theme.colors.primary }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  symbol: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },
  link: { fontSize: 13, fontWeight: '600' },
  quoteBox: { padding: 12, borderRadius: 10, marginTop: 12 },
  quoteLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 },
  quote: { fontSize: 13, lineHeight: 19 },
  section: { marginTop: 14 },
  question: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  optionText: { fontSize: 13, fontWeight: '600' },
  fine: { fontSize: 11, lineHeight: 16, marginTop: 10 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 0.5 },
  gradeText: { fontSize: 14, fontWeight: '700' },
  reveal: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed' },
  revealText: { fontSize: 13, lineHeight: 19 },
});
