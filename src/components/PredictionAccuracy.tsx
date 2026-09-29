/**
 * Prediction accuracy — how often what a student predicted actually happened,
 * by their own grade. It replaces two P&L stats: "avg return" shown beside
 * "thesis correct" as if they measured the same thing, and the decision
 * journal's ranking of reasons by win rate. Nothing here involves price.
 *
 * Every rate (overall, per reason, per confidence level) is withheld until
 * MIN_GRADED_FOR_RATE predictions in that group have been graded.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { JournalEntry, REASON_CONFIG } from '../services/tradeJournalStore';
import { predictionAccuracy, AccuracyGroup, MIN_GRADED_FOR_RATE } from '../services/predictionGrading';

function RateCell({ g }: { g: AccuracyGroup }) {
  const { theme } = useTheme();
  return g.rate === null ? (
    <Text style={[st.pending, { color: theme.colors.textTertiary }]}>{g.graded} of {MIN_GRADED_FOR_RATE} graded</Text>
  ) : (
    <Text style={[st.rate, { color: theme.colors.textPrimary }]}>{g.rate.toFixed(0)}%</Text>
  );
}

const counts = (g: AccuracyGroup) => `${g.yes} yes · ${g.partly} partly · ${g.no} no`;

export function PredictionAccuracy({ entries }: { entries: JournalEntry[] }) {
  const { theme } = useTheme();
  const r = predictionAccuracy(entries);
  const rowStyle = [st.row, { borderTopColor: theme.colors.border }];

  return (
    <View>
      <Text style={[st.label, { color: theme.colors.textTertiary }]}>PREDICTION ACCURACY</Text>

      {r.overall.graded === 0 ? (
        <Text style={[st.body, { color: theme.colors.textSecondary }]}>
          {r.ungraded > 0
            ? `You have ${r.ungraded} prediction${r.ungraded === 1 ? '' : 's'} waiting to be graded. Your accuracy appears after you've graded ${MIN_GRADED_FOR_RATE}.`
            : `Write a prediction before your next buy. Your accuracy appears after you've graded ${MIN_GRADED_FOR_RATE}.`}
        </Text>
      ) : (
        <>
          <View style={st.overall}>
            {r.overall.rate === null ? (
              <Text style={[st.body, { color: theme.colors.textSecondary }]}>
                {r.overall.graded} of {MIN_GRADED_FOR_RATE} graded — your accuracy appears after {MIN_GRADED_FOR_RATE}.
              </Text>
            ) : (
              <>
                <Text style={[st.big, { color: theme.colors.textPrimary }]}>{r.overall.rate.toFixed(0)}%</Text>
                <Text style={[st.body, { color: theme.colors.textSecondary, flex: 1 }]}>
                  of what you predicted happened, by your own grades ({counts(r.overall)}; partly counts as half).
                </Text>
              </>
            )}
          </View>

          <Text style={[st.sub, { color: theme.colors.textTertiary }]}>BY WHAT IT WAS BASED ON</Text>
          {r.byReason.map(g => {
            const cfg = REASON_CONFIG[g.reason];
            return (
              <View key={g.reason} style={rowStyle}>
                <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                <Text style={[st.rowLabel, { color: theme.colors.textPrimary }]}>{cfg.label}</Text>
                <Text style={[st.rowMeta, { color: theme.colors.textTertiary }]}>{counts(g)}</Text>
                <RateCell g={g} />
              </View>
            );
          })}

          <Text style={[st.sub, { color: theme.colors.textTertiary }]}>BY HOW CONFIDENT YOU WERE</Text>
          {r.byConfidence.map(g => (
            <View key={g.confidence} style={rowStyle}>
              <Text style={[st.rowLabel, { color: theme.colors.textPrimary }]}>Confidence {g.confidence}/5</Text>
              <Text style={[st.rowMeta, { color: theme.colors.textTertiary }]}>{counts(g)}</Text>
              <RateCell g={g} />
            </View>
          ))}
        </>
      )}

      {r.excludedPreGate > 0 && (
        <Text style={[st.fine, { color: theme.colors.textTertiary }]}>
          {r.excludedPreGate} older entr{r.excludedPreGate === 1 ? 'y was' : 'ies were'} written before predictions and
          {r.excludedPreGate === 1 ? " isn't" : " aren't"} counted. {r.excludedPreGate === 1 ? "It's" : "They're"} still in your journal to read.
        </Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  sub: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 16, marginBottom: 4 },
  overall: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  big: { fontSize: 30, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderTopWidth: 0.5 },
  rowLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  rowMeta: { fontSize: 11 },
  rate: { fontSize: 14, fontWeight: '800', minWidth: 44, textAlign: 'right' },
  pending: { fontSize: 11, minWidth: 44, textAlign: 'right' },
  fine: { fontSize: 11, lineHeight: 16, marginTop: 14 },
});
