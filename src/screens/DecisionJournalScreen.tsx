import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { PredictionAccuracy } from '../components/PredictionAccuracy';
import {
  useTradeJournalStore, REASON_CONFIG, TradeReason, Confidence, Prediction, CheckBackPeriod,
  CHECK_BACK_OPTIONS, PREDICTION_MIN_CLAIM, PREDICTION_MIN_FALSIFIER, looksLikePriceCall,
} from '../services/tradeJournalStore';

interface Props { onBack: () => void; }

export function DecisionJournalScreen({ onBack }: Props) {
  const { theme } = useTheme();
  // Reads the merged trade journal. The Insights tab once ranked reasons by
  // win rate — P&L, which the thesis gate deliberately doesn't grade. It now
  // shows prediction accuracy by the student's own grades, broken down by
  // reason and by confidence (PredictionAccuracy, shared with Trade Journal).
  const entries = useTradeJournalStore(s => s.entries);
  const [tab, setTab] = useState<'insights' | 'log'>('log');
  const s = styles(theme);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backRow}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
          <Text style={s.back}>Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Decision Journal</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.tabRow}>
        {(['log', 'insights'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[s.tabBtn, tab === t && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}>
            <Text style={[s.tabLabel, { color: tab === t ? theme.colors.primary : theme.colors.textTertiary }]}>
              {t === 'insights' ? 'Insights' : `Log (${entries.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.pad} showsVerticalScrollIndicator={false}>
        {tab === 'insights' ? (
          <View style={[s.statCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <PredictionAccuracy entries={entries} />
          </View>
        ) : (
          <>
            {entries.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="list-outline" size={40} color={theme.colors.textTertiary} style={{ marginBottom: 10 }} />
                <Text style={s.emptyTitle}>No entries yet</Text>
                <Text style={s.emptySub}>Your reasoning gets logged automatically before every trade.</Text>
              </View>
            ) : [...entries].reverse().map(e => {
              const cfg = e.reasonCategory ? REASON_CONFIG[e.reasonCategory] : null;
              return (
                <View key={e.id} style={[s.logRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {cfg && <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />}
                    <Text style={[s.logSymbol, { color: theme.colors.textPrimary }]}>{e.symbol}</Text>
                    {e.action && (
                      <Text style={[s.logAction, { color: e.action === 'buy' ? theme.colors.success : theme.colors.danger }]}>
                        {e.action.toUpperCase()}
                      </Text>
                    )}
                    <View style={{ flex: 1 }} />
                    <Text style={[s.logDate, { color: theme.colors.textTertiary }]}>{new Date(e.createdAt).toLocaleDateString()}</Text>
                  </View>
                  {!!e.buyReason && <Text style={[s.logNote, { color: theme.colors.textSecondary }]}>{e.buyReason}</Text>}
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

// ── Pre-trade prediction form (the thesis gate) ─────────────────────────────

/**
 * Shown before every buy. It has no Skip: a buy can't execute without a
 * prediction (executeTrade enforces that too, so this form isn't the only
 * lock). It does have Cancel, which abandons the trade entirely — without
 * it a student would be trapped here, and cancelling means no trade, so it
 * isn't a way around the gate.
 *
 * Sells never open this. Blocking a sale until you write something would
 * trap the position.
 */
export function DecisionJournalModal({
  visible, symbol, onSubmit, onCancel,
}: {
  visible: boolean;
  symbol: string;
  onSubmit: (prediction: Prediction) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const [claim, setClaim] = useState('');
  const [falsifier, setFalsifier] = useState('');
  const [checkBack, setCheckBack] = useState<CheckBackPeriod>('1m');
  const [reason, setReason] = useState<TradeReason | null>(null);
  const [confidence, setConfidence] = useState<Confidence>(3);
  const s = styles(theme);

  const claimShort = PREDICTION_MIN_CLAIM - claim.trim().length;
  const falsifierShort = PREDICTION_MIN_FALSIFIER - falsifier.trim().length;
  const ready = claimShort <= 0 && falsifierShort <= 0 && !!reason;
  const priceHint = claim.trim().length > 0 && looksLikePriceCall(claim);

  const reset = () => {
    setClaim(''); setFalsifier(''); setCheckBack('1m'); setReason(null); setConfidence(3);
  };

  const handleSubmit = () => {
    if (!ready || !reason) return;
    onSubmit({
      symbol,
      claim: claim.trim(),
      falsifier: falsifier.trim(),
      checkBack,
      reasonCategory: reason,
      confidence,
    });
    reset();
  };

  const handleCancel = () => { reset(); onCancel(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[s.modalCard, { backgroundColor: theme.colors.surface }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[s.modalTitle, { color: theme.colors.textPrimary }]}>Make a prediction</Text>
            <Text style={[s.modalSub, { color: theme.colors.textSecondary }]}>
              BUY {symbol} — write down what you expect, so you can check it later.
              You'll grade it against what you said, not against whether you made money.
            </Text>

            <Text style={[s.noteLabel, { color: theme.colors.textPrimary }]}>What will happen?</Text>
            <TextInput
              value={claim}
              onChangeText={setClaim}
              placeholder="e.g. Services revenue keeps growing faster than iPhone sales next quarter"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              accessibilityLabel="What will happen"
              style={[s.noteInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.textPrimary }]}
            />
            {claimShort > 0 && claim.length > 0 && (
              <Text style={[s.helper, { color: theme.colors.textTertiary }]}>
                {claimShort} more character{claimShort === 1 ? '' : 's'} — be specific enough to check later.
              </Text>
            )}
            {priceHint && (
              <View style={[s.hintBox, { backgroundColor: theme.colors.gold + '14', borderColor: theme.colors.gold + '40' }]}>
                <Ionicons name="bulb-outline" size={14} color={theme.colors.gold} />
                <Text style={[s.hintText, { color: theme.colors.gold }]}>
                  This sounds like a call on the price. Predictions teach more when they're about
                  what the company does — its sales, a launch, its next earnings. You can still continue.
                </Text>
              </View>
            )}

            <Text style={[s.noteLabel, { color: theme.colors.textPrimary }]}>How will you know you're wrong?</Text>
            <TextInput
              value={falsifier}
              onChangeText={setFalsifier}
              placeholder="e.g. Services growth drops below 10% in the next report"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              accessibilityLabel="How will you know you're wrong"
              style={[s.noteInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.textPrimary }]}
            />
            {falsifierShort > 0 && falsifier.length > 0 && (
              <Text style={[s.helper, { color: theme.colors.textTertiary }]}>
                {falsifierShort} more character{falsifierShort === 1 ? '' : 's'}.
              </Text>
            )}

            <Text style={[s.noteLabel, { color: theme.colors.textPrimary }]}>Check back in</Text>
            <View style={s.reasonGrid}>
              {CHECK_BACK_OPTIONS.map(o => (
                <TouchableOpacity key={o.value} onPress={() => setCheckBack(o.value)}
                  style={[s.reasonChip, { borderColor: checkBack === o.value ? theme.colors.primary : theme.colors.border },
                    checkBack === o.value && { backgroundColor: theme.colors.primary + '20' }]}>
                  <Text style={[s.reasonChipText, { color: checkBack === o.value ? theme.colors.primary : theme.colors.textSecondary }]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.noteLabel, { color: theme.colors.textPrimary }]}>What's it based on?</Text>
            <View style={s.reasonGrid}>
              {(Object.keys(REASON_CONFIG) as TradeReason[]).map(r => {
                const cfg = REASON_CONFIG[r];
                return (
                  <TouchableOpacity key={r} onPress={() => setReason(r)}
                    style={[s.reasonChip, { borderColor: reason === r ? cfg.color : theme.colors.border },
                      reason === r && { backgroundColor: cfg.color + '20' }]}>
                    <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                    <Text style={[s.reasonChipText, { color: reason === r ? cfg.color : theme.colors.textSecondary }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[s.noteLabel, { color: theme.colors.textPrimary }]}>How confident are you?</Text>
            <View style={s.confidenceRow}>
              {([1, 2, 3, 4, 5] as const).map(c => (
                <TouchableOpacity key={c} onPress={() => setConfidence(c)}
                  style={[s.confDot, { borderColor: theme.colors.border },
                    confidence >= c && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
                  <Text style={{ color: confidence >= c ? '#07070D' : theme.colors.textTertiary, fontWeight: '700' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!ready}
              style={[s.submitBtn, { backgroundColor: theme.colors.primary, opacity: ready ? 1 : 0.4 }]}
            >
              <Text style={s.submitBtnText}>Continue to trade</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCancel} style={{ marginTop: 12, alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ color: theme.colors.textTertiary, fontSize: 13 }}>Cancel trade</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  back: { color: theme.colors.primary, fontSize: 16, fontWeight: '600' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
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
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '92%' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSub: { fontSize: 13, lineHeight: 18, marginBottom: 16 },

  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  reasonChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  reasonChipText: { fontSize: 12, fontWeight: '700' },

  noteLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  noteInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 60, fontSize: 14, marginBottom: 8, textAlignVertical: 'top' },
  helper: { fontSize: 11, marginBottom: 10 },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },

  confidenceRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  confDot: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  submitBtn: { paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#07070D' },
});
