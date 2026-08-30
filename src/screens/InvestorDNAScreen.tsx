import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useBehavioralStore } from '../services/behavioralStore';
import { BIAS_LABELS } from '../data/behavioralAssessment';

interface Props { onBack: () => void; onAssessmentPress: () => void; onSubscribePress: () => void; isPremium: boolean; }

interface Archetype {
  id: string; name: string; tagline: string; emoji: string;
  color: string; gradient: string;
  strengths: string[]; blindspots: string[];
  idealStrategy: string; famousExample: string;
  description: string;
  matchCondition: (scores: Record<string, number>) => boolean;
}

const ARCHETYPES: Archetype[] = [
  {
    id: 'systematic', name: 'The Systematic Strategist', tagline: 'Data over drama. Process over panic.',
    emoji: '🎯', color: '#5B5FEF', gradient: '#5B5FEF',
    strengths: ['Emotionally disciplined', 'Follows rules consistently', 'Avoids FOMO traps'],
    blindspots: ['May miss intuitive opportunities', 'Can be too rigid in fast markets'],
    idealStrategy: 'Rules-based investing: Index + Chill or systematic value',
    famousExample: 'Ray Dalio — Pure process. Pure system.',
    description: 'You lead with logic and stick to your plan. Your superpower is that markets don\'t rattle you. When others panic, you execute your checklist.',
    matchCondition: (s) => Object.values(s).reduce((sum, v) => sum + v, 0) < 35,
  },
  {
    id: 'value', name: 'The Value Detective', tagline: 'You find treasure where others see trash.',
    emoji: '🔍', color: '#10B981', gradient: '#10B981',
    strengths: ['Patient long-term thinker', 'Contrarian by nature', 'Strong fundamental analysis'],
    blindspots: ['May hold undervalued stocks too long', 'Can miss growth opportunities'],
    idealStrategy: 'Buffett Value or Dividend Income playbook',
    famousExample: 'Warren Buffett — Buy what you understand. Hold forever.',
    description: 'You\'re skeptical of hype and excited by neglect. You dig deeper than the crowd, and your patience is your edge.',
    matchCondition: (s) => (s.fomoSusceptibility ?? 0) < 5 && (s.overconfidence ?? 0) < 6 && (s.herdingBias ?? 0) < 5,
  },
  {
    id: 'bold', name: 'The Bold Contrarian', tagline: 'Zigging when the world zags.',
    emoji: '⚡', color: '#F59E0B', gradient: '#F59E0B',
    strengths: ['High conviction in own research', 'Comfortable with volatility', 'Independent thinker'],
    blindspots: ['Overconfidence can lead to oversizing', 'May dismiss important information'],
    idealStrategy: 'Growth & Momentum or concentrated value',
    famousExample: 'Michael Burry — Bet against the world. Win big.',
    description: 'You trust your own analysis and don\'t need external validation. Your confidence can create outsized returns — or painful losses.',
    matchCondition: (s) => (s.overconfidence ?? 0) >= 7 && (s.herdingBias ?? 0) < 5,
  },
  {
    id: 'guardian', name: 'The Cautious Guardian', tagline: 'Protect first. Grow second.',
    emoji: '🛡️', color: '#06B6D4', gradient: '#06B6D4',
    strengths: ['Capital preservation expert', 'Low drawdowns', 'Steady compounder'],
    blindspots: ['May miss major bull runs', 'Loss aversion can cause premature selling'],
    idealStrategy: 'Retiree Income or all-weather portfolio',
    famousExample: 'Howard Marks — Know what you don\'t know.',
    description: 'You understand that not losing is the hardest skill in investing. Your caution keeps you in the game when others blow up.',
    matchCondition: (s) => (s.lossAversion ?? 0) >= 7,
  },
  {
    id: 'momentum', name: 'The Momentum Rider', tagline: 'Surfing the wave before it breaks.',
    emoji: '🏄', color: '#8B5CF6', gradient: '#8B5CF6',
    strengths: ['Excellent market timing instincts', 'Adapts quickly to trends', 'High energy, engaged'],
    blindspots: ['FOMO can cause buying tops', 'Herding behavior in crowded trades'],
    idealStrategy: 'Growth & Momentum or Sector Rotation playbook',
    famousExample: 'Cathie Wood — Big bets on disruption. High variance.',
    description: 'You feel the market\'s pulse. Trends pull you in early — but staying disciplined about exits is your biggest challenge.',
    matchCondition: (s) => (s.fomoSusceptibility ?? 0) >= 7 || (s.herdingBias ?? 0) >= 7,
  },
  {
    id: 'analyst', name: 'The Deep Analyst', tagline: 'If it can\'t be modeled, it can\'t be bought.',
    emoji: '📐', color: '#F87171', gradient: '#F87171',
    strengths: ['Thorough research process', 'Rarely surprised by earnings', 'Strong sector expertise'],
    blindspots: ['Analysis paralysis — may never pull the trigger', 'Can over-research simple decisions'],
    idealStrategy: 'Sector-focused value or individual stock picking',
    famousExample: 'Peter Lynch — Know what you own. Know why you own it.',
    description: 'You never buy without a full model. Your research is your moat. The risk is that perfect becomes the enemy of good.',
    matchCondition: (s) => (s.analysisParalysis ?? 0) >= 7,
  },
  {
    id: 'emotional', name: 'The Emotional Investor', tagline: 'Your biggest enemy is the mirror.',
    emoji: '🎭', color: '#EC4899', gradient: '#EC4899',
    strengths: ['High engagement with markets', 'Passionate about investing', 'Learns fast from mistakes'],
    blindspots: ['Emotions drive most decisions', 'FOMO and panic both frequent'],
    idealStrategy: 'Automate first. Rules-based systems to remove emotion.',
    famousExample: 'Every retail investor in 2021 — and the lesson that followed.',
    description: 'You feel every market move personally. This makes the journey intense. The breakthrough comes when you automate decisions and remove your own bias.',
    matchCondition: (s) => (s.lossAversion ?? 0) >= 6 && (s.fomoSusceptibility ?? 0) >= 6,
  },
  {
    id: 'builder', name: 'The Patient Builder', tagline: 'Slow is smooth. Smooth is fast.',
    emoji: '🌳', color: '#84CC16', gradient: '#84CC16',
    strengths: ['Long time horizon', 'Consistent dollar-cost averaging', 'Ignores short-term noise'],
    blindspots: ['Can be too passive in opportunities', 'May underweight conviction plays'],
    idealStrategy: 'Index & Chill or Dividend Income',
    famousExample: 'Jack Bogle — Just buy the index. Beat 90% of pros.',
    description: 'You play the long game and win by not losing. Compound interest is your best friend, and you give it time to work.',
    matchCondition: () => true, // default
  },
];

function getArchetype(scores: Record<string, number>): Archetype {
  return ARCHETYPES.find(a => a.matchCondition(scores)) ?? ARCHETYPES[ARCHETYPES.length - 1];
}

export function InvestorDNAScreen({ onBack, onAssessmentPress, onSubscribePress, isPremium }: Props) {
  const { theme } = useTheme();
  const { profile } = useBehavioralStore();
  const s = styles(theme);

  if (!isPremium) return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity></View>
      <View style={s.centered}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🧬</Text>
        <Text style={[s.bigTitle, { color: theme.colors.textPrimary }]}>Investor DNA</Text>
        <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>Discover your full investor archetype. Premium only.</Text>
        <TouchableOpacity onPress={onSubscribePress} style={[s.primaryBtn, { backgroundColor: theme.colors.primary }]}>
          <Text style={s.primaryBtnText}>💎 Unlock with Premium</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (!profile) return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity></View>
      <View style={s.centered}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🧠</Text>
        <Text style={[s.bigTitle, { color: theme.colors.textPrimary }]}>Take the Mind Check First</Text>
        <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>Your Investor DNA is calculated from your behavioral assessment results.</Text>
        <TouchableOpacity onPress={onAssessmentPress} style={[s.primaryBtn, { backgroundColor: theme.colors.primary }]}>
          <Text style={s.primaryBtnText}>Take the Mind Check →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const archetype = getArchetype(profile.scores);
  const topBiasLabels = profile.topBiases.slice(0, 3).map(b => BIAS_LABELS[b]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My Investor DNA: ${archetype.emoji} "${archetype.name}"\n"${archetype.tagline}"\n\nDiscover yours on InvestApp!`,
        title: 'My Investor DNA',
      });
    } catch {}
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Investor DNA</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.pad} showsVerticalScrollIndicator={false}>

        {/* DNA Card — shareable */}
        <View style={[s.dnaCard, { backgroundColor: archetype.color }]}>
          <Text style={s.dnaEmoji}>{archetype.emoji}</Text>
          <View style={[s.dnaLabel, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={s.dnaLabelText}>INVESTOR DNA</Text>
          </View>
          <Text style={s.dnaName}>{archetype.name}</Text>
          <Text style={s.dnaTagline}>"{archetype.tagline}"</Text>
          <TouchableOpacity onPress={handleShare} style={[s.shareBtn, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={s.shareBtnText}>📤  Share My DNA</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[s.cardTitle, { color: theme.colors.textPrimary }]}>Who You Are</Text>
          <Text style={[s.cardBody, { color: theme.colors.textSecondary }]}>{archetype.description}</Text>
          <View style={[s.exampleBox, { backgroundColor: theme.colors.primaryGlow }]}>
            <Text style={[s.exampleLabel, { color: theme.colors.primary }]}>🏆 Famous Parallel</Text>
            <Text style={[s.exampleText, { color: theme.colors.textPrimary }]}>{archetype.famousExample}</Text>
          </View>
        </View>

        {/* Strengths & Blindspots */}
        <View style={s.row}>
          <View style={[s.halfCard, { backgroundColor: '#10B98112', borderColor: '#10B98130' }]}>
            <Text style={[s.halfTitle, { color: theme.colors.success }]}>💪 Strengths</Text>
            {archetype.strengths.map((s2, i) => (
              <Text key={i} style={[s.halfItem, { color: theme.colors.textSecondary }]}>• {s2}</Text>
            ))}
          </View>
          <View style={[s.halfCard, { backgroundColor: '#F8717112', borderColor: '#F8717130' }]}>
            <Text style={[s.halfTitle, { color: theme.colors.danger }]}>⚠️ Watch Out</Text>
            {archetype.blindspots.map((b, i) => (
              <Text key={i} style={[s.halfItem, { color: theme.colors.textSecondary }]}>• {b}</Text>
            ))}
          </View>
        </View>

        {/* Top Biases */}
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[s.cardTitle, { color: theme.colors.textPrimary }]}>Your Top Biases</Text>
          <View style={s.biasRow}>
            {topBiasLabels.map((b, i) => (
              <View key={i} style={[s.biasPill, { backgroundColor: archetype.color + '20' }]}>
                <Text style={[s.biasPillText, { color: archetype.color }]}>{b}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Ideal Strategy */}
        <View style={[s.stratCard, { backgroundColor: archetype.color + '15', borderColor: archetype.color + '40' }]}>
          <Text style={[s.stratTitle, { color: archetype.color }]}>🎯 Your Ideal Strategy</Text>
          <Text style={[s.stratText, { color: theme.colors.textPrimary }]}>{archetype.idealStrategy}</Text>
        </View>

        {/* All Archetypes */}
        <Text style={s.sectionLabel}>ALL 8 ARCHETYPES</Text>
        {ARCHETYPES.map(a => (
          <View key={a.id} style={[s.archetypeRow, { backgroundColor: theme.colors.surface, borderColor: a.id === archetype.id ? a.color : theme.colors.border },
            a.id === archetype.id && { borderWidth: 2 }]}>
            <Text style={{ fontSize: 22, width: 36 }}>{a.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.archetypeName, { color: a.id === archetype.id ? a.color : theme.colors.textPrimary }]}>{a.name}</Text>
              <Text style={[s.archetypeTag, { color: theme.colors.textTertiary }]}>{a.tagline}</Text>
            </View>
            {a.id === archetype.id && <Text style={[s.youBadge, { color: a.color }]}>← You</Text>}
          </View>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  back: { color: theme.colors.primary, fontSize: 16, fontWeight: '500', width: 60 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  pad: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', padding: 32 },
  bigTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  primaryBtn: { borderRadius: 14, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dnaCard: { borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 16, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  dnaEmoji: { fontSize: 70, marginBottom: 12 },
  dnaLabel: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  dnaLabelText: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  dnaName: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 6 },
  dnaTagline: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', textAlign: 'center', marginBottom: 18 },
  shareBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  shareBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  cardBody: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  exampleBox: { borderRadius: 10, padding: 12 },
  exampleLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  exampleText: { fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  halfCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1 },
  halfTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  halfItem: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  biasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  biasPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  biasPillText: { fontSize: 12, fontWeight: '700' },
  stratCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
  stratTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  stratText: { fontSize: 14, lineHeight: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textTertiary, letterSpacing: 1, marginBottom: 8 },
  archetypeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6, gap: 8 },
  archetypeName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  archetypeTag: { fontSize: 11 },
  youBadge: { fontSize: 12, fontWeight: '800' },
});
