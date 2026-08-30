import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useBehavioralStore } from '../services/behavioralStore';
import {
  behavioralQuestions, BIAS_LABELS, BIAS_DESCRIPTIONS, BIAS_EMOJIS,
  BIAS_FIXES, getBiasSeverityLabel, getBiasSeverityColor, BiasCategory,
  calculateBiasProfile,
} from '../data/behavioralAssessment';

interface Props { onBack: () => void; onComplete?: () => void; onLessonPress?: (id: string) => void; }

export function BehavioralAssessmentScreen({ onBack, onComplete }: Props) {
  const { theme } = useTheme();
  const { completeAssessment } = useBehavioralStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<'intro' | 'questions' | 'results'>('intro');
  const [resultProfile, setResultProfile] = useState<any>(null);
  const s = styles(theme);
  const totalQ = behavioralQuestions.length;
  const current = behavioralQuestions[currentIndex];

  const handleAnswer = (optionIndex: number) => {
    const updated = { ...answers, [current.id]: optionIndex };
    setAnswers(updated);
    if (currentIndex < totalQ - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      const profile = calculateBiasProfile(updated);
      completeAssessment(updated);
      setResultProfile(profile);
      setPhase('results');
    }
  };

  if (phase === 'intro') return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>← Back</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.centered}>
        <Text style={{ fontSize: 64, textAlign: 'center', marginBottom: 16 }}>🧠</Text>
        <Text style={[s.bigTitle, { color: theme.colors.textPrimary }]}>Investor Psychology{'\n'}Assessment</Text>
        <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
          Discover the hidden biases costing you money. 12 questions · 5 minutes · completely private.
        </Text>
        <Text style={[s.body, { color: theme.colors.textSecondary }]}>
          Every investor has psychological biases — hardwired patterns that feel rational but consistently destroy returns. The best investors know their biases and build systems to counteract them.
        </Text>
        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setPhase('questions')}>
          <Text style={s.primaryBtnText}>Start Assessment →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  if (phase === 'questions') return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => currentIndex === 0 ? setPhase('intro') : setCurrentIndex(i => i - 1)} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={[s.counterText, { color: theme.colors.textSecondary }]}>{currentIndex + 1} / {totalQ}</Text>
      </View>
      <View style={[s.progressTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
        <View style={[s.progressFill, { backgroundColor: theme.colors.primary, width: `${(currentIndex / totalQ) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={s.questionPad}>
        <View style={[s.badge, { backgroundColor: theme.colors.primaryGlow }]}>
          <Text style={[s.badgeText, { color: theme.colors.primary }]}>{BIAS_EMOJIS[current.category]} {BIAS_LABELS[current.category]}</Text>
        </View>
        <Text style={[s.question, { color: theme.colors.textPrimary }]}>{current.question}</Text>
        {current.options.map((opt, i) => (
          <TouchableOpacity key={i} style={[s.optionBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => handleAnswer(i)}>
            <View style={[s.optLetter, { backgroundColor: theme.colors.primaryGlow }]}>
              <Text style={[s.optLetterText, { color: theme.colors.primary }]}>{String.fromCharCode(65 + i)}</Text>
            </View>
            <Text style={[s.optText, { color: theme.colors.textPrimary }]}>{opt.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );

  if (!resultProfile) return null;
  const { topBiases, scores } = resultProfile;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>✕ Close</Text></TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.textPrimary }]}>Your Bias Profile</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.resultsPad}>
        <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 8 }}>🎯</Text>
        <Text style={[s.bigTitle, { color: theme.colors.textPrimary }]}>Assessment Complete</Text>
        <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>Your top 3 biases to overcome</Text>

        {topBiases.map((bias: BiasCategory, i: number) => {
          const score = scores[bias];
          const color = getBiasSeverityColor(score);
          return (
            <View key={bias} style={[s.biasCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={s.biasRow}>
                <Text style={[s.rankNum, { color: theme.colors.textTertiary }]}>#{i + 1}</Text>
                <Text style={{ fontSize: 22 }}>{BIAS_EMOJIS[bias]}</Text>
                <Text style={[s.biasName, { color: theme.colors.textPrimary }]}>{BIAS_LABELS[bias]}</Text>
                <View style={{ flex: 1 }} />
                <View style={[s.severityBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[{ fontSize: 11, fontWeight: '700' }, { color }]}>{getBiasSeverityLabel(score)}</Text>
                </View>
              </View>
              <View style={[s.scoreTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
                <View style={[s.scoreFill, { backgroundColor: color, width: `${score * 10}%` }]} />
              </View>
              <Text style={[s.biasDesc, { color: theme.colors.textSecondary }]}>{BIAS_DESCRIPTIONS[bias]}</Text>
              <View style={[s.fixBox, { backgroundColor: theme.colors.primaryGlow }]}>
                <Text style={[s.fixLabel, { color: theme.colors.primary }]}>🔧 Fix it:</Text>
                <Text style={[s.fixText, { color: theme.colors.textPrimary }]}>{BIAS_FIXES[bias]}</Text>
              </View>
            </View>
          );
        })}

        <View style={[s.allCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[s.allCardTitle, { color: theme.colors.textPrimary }]}>All Bias Scores</Text>
          {(Object.entries(scores) as [BiasCategory, number][]).sort(([,a],[,b]) => b-a).map(([bias, score]) => (
            <View key={bias} style={s.miniRow}>
              <Text style={{ fontSize: 14, width: 22 }}>{BIAS_EMOJIS[bias]}</Text>
              <Text style={[s.miniName, { color: theme.colors.textSecondary }]}>{BIAS_LABELS[bias]}</Text>
              <View style={[s.miniTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
                <View style={[s.miniFill, { backgroundColor: getBiasSeverityColor(score), width: `${score * 10}%` }]} />
              </View>
              <Text style={[s.miniScore, { color: getBiasSeverityColor(score) }]}>{score}/10</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: theme.colors.primary, marginBottom: 40 }]} onPress={() => { onComplete?.(); onBack(); }}>
          <Text style={s.primaryBtnText}>Save Profile & Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  backBtn: { padding: 8 },
  backText: { color: theme.colors.primary, fontSize: 15 },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  counterText: { fontSize: 14 },
  progressTrack: { height: 3, marginHorizontal: 16, borderRadius: 2 },
  progressFill: { height: 3, borderRadius: 2 },
  centered: { padding: 24, alignItems: 'center' },
  bigTitle: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  questionPad: { padding: 20, paddingTop: 24 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  question: { fontSize: 20, fontWeight: '700', lineHeight: 28, marginBottom: 28 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 10 },
  optLetter: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optLetterText: { fontSize: 14, fontWeight: '700' },
  optText: { flex: 1, fontSize: 15, lineHeight: 22 },
  resultsPad: { padding: 20 },
  biasCard: { borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1 },
  biasRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  rankNum: { fontSize: 18, fontWeight: '700', width: 28 },
  biasName: { fontSize: 16, fontWeight: '700' },
  severityBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  scoreTrack: { height: 6, borderRadius: 3, marginBottom: 12 },
  scoreFill: { height: 6, borderRadius: 3 },
  biasDesc: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  fixBox: { borderRadius: 10, padding: 12 },
  fixLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  fixText: { fontSize: 13, lineHeight: 19 },
  allCard: { borderRadius: 16, padding: 18, marginBottom: 24, borderWidth: 1 },
  allCardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  miniName: { fontSize: 12, flex: 1 },
  miniTrack: { width: 60, height: 4, borderRadius: 2 },
  miniFill: { height: 4, borderRadius: 2 },
  miniScore: { fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
});
