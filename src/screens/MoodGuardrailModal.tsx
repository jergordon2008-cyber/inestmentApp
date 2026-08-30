import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useMoodStore, MOOD_CONFIG, Mood } from '../services/moodStore';

interface Props {
  visible: boolean;
  symbol: string;
  onProceed: () => void;
  onCancel: () => void;
}

export function MoodGuardrailModal({ visible, symbol, onProceed, onCancel }: Props) {
  const { theme } = useTheme();
  const { setMood } = useMoodStore();
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [step, setStep] = useState<'mood' | 'warning'>('mood');
  const s = styles(theme);

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    setMood(mood, symbol);
    if (MOOD_CONFIG[mood].safe) {
      onProceed(); // calm = proceed immediately
    } else {
      setStep('warning');
    }
  };

  const reset = () => { setSelectedMood(null); setStep('mood'); };

  const cfg = selectedMood ? MOOD_CONFIG[selectedMood] : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onCancel(); }}>
      <View style={[s.overlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
        <View style={[s.card, { backgroundColor: theme.colors.surface }]}>

          {step === 'mood' && (
            <>
              <Text style={[s.title, { color: theme.colors.textPrimary }]}>🎭 How are you feeling?</Text>
              <Text style={[s.sub, { color: theme.colors.textSecondary }]}>
                Before trading {symbol}, a quick check-in. Emotional state affects trading decisions more than most people realize.
              </Text>
              <View style={s.moodGrid}>
                {(Object.keys(MOOD_CONFIG) as Mood[]).map(mood => {
                  const m = MOOD_CONFIG[mood];
                  return (
                    <TouchableOpacity key={mood} onPress={() => handleMoodSelect(mood)}
                      style={[s.moodBtn, { backgroundColor: m.color + '15', borderColor: m.color + '50' }]}>
                      <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                      <Text style={[s.moodLabel, { color: m.color }]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity onPress={() => { reset(); onCancel(); }}>
                <Text style={[s.cancelText, { color: theme.colors.textTertiary }]}>Cancel trade</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'warning' && cfg && selectedMood && (
            <>
              <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>{cfg.emoji}</Text>
              <Text style={[s.title, { color: theme.colors.textPrimary }]}>Trading while {cfg.label.toLowerCase()}?</Text>
              <View style={[s.warningBox, { backgroundColor: cfg.color + '15', borderColor: cfg.color + '40' }]}>
                <Text style={[s.warningText, { color: theme.colors.textPrimary }]}>{cfg.warning}</Text>
              </View>

              <Text style={[s.moodStats, { color: theme.colors.textSecondary }]}>
                Traders in "{cfg.label}" mode historically underperform calm traders by 8–15% on average.*
              </Text>

              <View style={s.btnRow}>
                <TouchableOpacity onPress={() => { reset(); onCancel(); }}
                  style={[s.waitBtn, { borderColor: theme.colors.border }]}>
                  <Text style={[s.waitBtnText, { color: theme.colors.textSecondary }]}>⏸ Wait & Cool Down</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { reset(); onProceed(); }}
                  style={[s.proceedBtn, { backgroundColor: cfg.color }]}>
                  <Text style={s.proceedBtnText}>Proceed Anyway</Text>
                </TouchableOpacity>
              </View>

              <Text style={[s.disclaimer, { color: theme.colors.textTertiary }]}>*Simulated data for educational purposes</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = (theme: any) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 20 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 },
  moodBtn: { width: '28%', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 6 },
  moodLabel: { fontSize: 12, fontWeight: '700' },
  cancelText: { textAlign: 'center', fontSize: 14, textDecorationLine: 'underline' },
  warningBox: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 14 },
  warningText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  moodStats: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  waitBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center' },
  waitBtnText: { fontSize: 13, fontWeight: '600' },
  proceedBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  proceedBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disclaimer: { fontSize: 10, textAlign: 'center', fontStyle: 'italic' },
});
