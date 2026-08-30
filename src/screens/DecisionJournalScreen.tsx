import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { showAlert } from '../utils/alert';
import { useTheme } from '../context/ThemeContext';
import { useDecisionJournalStore, REASON_CONFIG, TradeReason } from '../services/decisionJournalStore';

interface Props { onBack: () => void; }

export function DecisionJournalScreen({ onBack }: Props) {
  const { theme } = useTheme();
  const { entries, getReasonStats } = useDecisionJournalStore();
  const [tab, setTab] = useState<'insights' | 'log'>('insights');
  const s = styles(theme);

  const stats = getReasonStats();
  const totalWithOutcome = entries.filter(e => e.outcome !== undefined).length;
  const sortedReasons = (Object.keys(stats) as TradeReason[])
    .filter(r => stats[r].count > 0)
    .sort((a, b) => stats[b].avgOutcome - stats[a].avgOutcome);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>📓 Decision Journal</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.tabRow}>
        {(['insights', 'log'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[s.tabBtn, tab === t && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}>
            <Text style={[s.tabLabel, { color: tab === t ? theme.colors.primary : theme.colors.textTertiary }]}>
              {t === 'insights' ? '💡 Insights' : `📋 Log (${entries.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.pad} showsVerticalScrollIndicator={false}>
        {tab === 'insights' ? (
          <>
            {totalWithOutcome === 0 ? (
              <View style={s.empty}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>📓</Text>
                <Text style={s.emptyTitle}>No closed trades yet</Text>
                <Text style={s.emptySub}>Once you close positions you journaled, we'll show which reasons actually win for you.</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionTitle}>WHICH REASONS WIN FOR YOU</Text>
                {sortedReasons.map(r => {
                  const cfg = REASON_CONFIG[r];
                  const stat = stats[r];
                  const isPositive = stat.avgOutcome >= 0;
                  return (
                    <View key={r} style={[s.statCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Text style={{ fontSize: 18 }}>{cfg.icon}</Text>
                        <Text style={[s.statLabel, { color: theme.colors.textPrimary }]}>{cfg.label}</Text>
                        <View style={{ flex: 1 }} />
                        <Text style={{ color: isPositive ? theme.colors.success : theme.colors.danger, fontWeight: '800' }}>
                          {isPositive ? '+' : ''}{stat.avgOutcome.toFixed(1)}%
                        </Text>
                      </View>
                      <Text style={[s.statMeta, { color: theme.colors.textTertiary }]}>
                        {stat.count} trade{stat.count === 1 ? '' : 's'} · {(stat.winRate * 100).toFixed(0)}% win rate
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </>
        ) : (
          <>
            {entries.length === 0 ? (
              <View style={s.empty}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>📋</Text>
                <Text style={s.emptyTitle}>No entries yet</Text>
                <Text style={s.emptySub}>Your reasoning gets logged automatically before every trade.</Text>
              </View>
            ) : entries.map(e => {
              const cfg = REASON_CONFIG[e.reason];
              return (
                <View key={e.id} style={[s.logRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
                    <Text style={[s.logSymbol, { color: theme.colors.textPrimary }]}>{e.symbol}</Text>
                    <Text style={[s.logAction, { color: e.action === 'buy' ? theme.colors.success : theme.colors.danger }]}>
                      {e.action.toUpperCase()}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[s.logDate, { color: theme.colors.textTertiary }]}>{new Date(e.timestamp).toLocaleDateString()}</Text>
                  </View>
                  {!!e.reasonNote && <Text style={[s.logNote, { color: theme.colors.textSecondary }]}>{e.reasonNote}</Text>}
                </View>
              );
            })}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Pre-trade decision capture modal ────────────────────────────────────────

export function DecisionJournalModal({
  visible, symbol, action, onSubmit, onSkip
}: {
  visible: boolean; symbol: string; action: string;
  onSubmit: (reason: TradeReason, note: string, confidence: 1|2|3|4|5) => void;
  onSkip: () => void;
}) {
  const { theme } = useTheme();
  const [reason, setReason] = useState<TradeReason | null>(null);
  const [note, setNote] = useState('');
  const [confidence, setConfidence] = useState<1|2|3|4|5>(3);
  const s = styles(theme);

  const handleSubmit = () => {
    if (!reason) { showAlert('Pick a reason', 'Select why you are making this trade.'); return; }
    onSubmit(reason, note, confidence);
    setReason(null); setNote(''); setConfidence(3);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onSkip}>
      <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[s.modalCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[s.modalTitle, { color: theme.colors.textPrimary }]}>📓 Why this trade?</Text>
          <Text style={[s.modalSub, { color: theme.colors.textSecondary }]}>
            {action.toUpperCase()} {symbol} — recording your reason builds self-awareness over time.
          </Text>

          <View style={s.reasonGrid}>
            {(Object.keys(REASON_CONFIG) as TradeReason[]).map(r => {
              const cfg = REASON_CONFIG[r];
              return (
                <TouchableOpacity key={r} onPress={() => setReason(r)}
                  style={[s.reasonChip, { borderColor: reason === r ? cfg.color : theme.colors.border },
                    reason === r && { backgroundColor: cfg.color + '20' }]}>
                  <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
                  <Text style={[s.reasonChipText, { color: reason === r ? cfg.color : theme.colors.textSecondary }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[s.noteLabel, { color: theme.colors.textSecondary }]}>Add a note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What's your specific thesis?"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            style={[s.noteInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.textPrimary }]}
          />

          <Text style={[s.noteLabel, { color: theme.colors.textSecondary }]}>How confident are you?</Text>
          <View style={s.confidenceRow}>
            {([1,2,3,4,5] as const).map(c => (
              <TouchableOpacity key={c} onPress={() => setConfidence(c)}
                style={[s.confDot, { borderColor: theme.colors.border },
                  confidence >= c && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
                <Text style={{ color: confidence >= c ? '#07070D' : theme.colors.textTertiary, fontWeight: '700' }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={handleSubmit} style={[s.submitBtn, { backgroundColor: theme.colors.primary }]}>
            <Text style={s.submitBtnText}>Continue to Trade</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 13 }}>Skip journaling</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  back: { color: theme.colors.primary, fontSize: 16, fontWeight: '600' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700' },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 13, fontWeight: '700' },

  pad: { padding: 16 },
  sectionTitle: { color: theme.colors.textTertiary, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },

  statCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  statLabel: { fontSize: 14, fontWeight: '700' },
  statMeta: { fontSize: 12 },

  logRow: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  logSymbol: { fontSize: 13, fontWeight: '800' },
  logAction: { fontSize: 11, fontWeight: '800' },
  logDate: { fontSize: 11 },
  logNote: { fontSize: 13, lineHeight: 18 },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSub: { fontSize: 13, lineHeight: 18, marginBottom: 16 },

  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  reasonChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  reasonChipText: { fontSize: 12, fontWeight: '700' },

  noteLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  noteInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 60, fontSize: 14, marginBottom: 16, textAlignVertical: 'top' },

  confidenceRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  confDot: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  submitBtn: { paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#07070D' },
});
