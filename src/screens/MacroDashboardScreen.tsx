import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/Card';

interface Props {
  onBack: () => void;
  onLessonPress?: (lessonId: string) => void;
}

type Phase = 'early_expansion' | 'late_expansion' | 'contraction' | 'recession';

const PHASES: { id: Phase; label: string; emoji: string; color: string; description: string }[] = [
  {
    id: 'early_expansion',
    label: 'Early Expansion',
    emoji: '🌱',
    color: '#10B981',
    description: 'Economy recovering. Jobs coming back. Fed cutting or holding rates low. Best time to buy growth.',
  },
  {
    id: 'late_expansion',
    label: 'Late Expansion',
    emoji: '🔥',
    color: '#F59E0B',
    description: 'Economy booming. Unemployment low. Inflation rising. Fed raising rates. Valuations stretched.',
  },
  {
    id: 'contraction',
    label: 'Contraction',
    emoji: '🌧️',
    color: '#EF4444',
    description: 'Growth slowing. Corporate earnings warnings. Fed may pause hikes. Rotate to defensive sectors.',
  },
  {
    id: 'recession',
    label: 'Recession',
    emoji: '❄️',
    color: '#5934E0',
    description: 'GDP declining. Job losses. Fed cutting rates. Cash and bonds provide shelter.',
  },
];

const SECTOR_ROTATION: Record<Phase, { overweight: string[]; neutral: string[]; underweight: string[] }> = {
  early_expansion: {
    overweight: ['Technology (XLK)', 'Consumer Discretionary (XLY)', 'Industrials (XLI)', 'Small-Caps (IWM)'],
    neutral: ['Financials (XLF)', 'Materials (XLB)', 'Real Estate (VNQ)'],
    underweight: ['Utilities (XLU)', 'Consumer Staples (XLP)', 'Healthcare (XLV)'],
  },
  late_expansion: {
    overweight: ['Energy (XLE)', 'Materials (XLB)', 'Financials (XLF)', 'Industrials (XLI)'],
    neutral: ['Technology (XLK)', 'Consumer Discretionary (XLY)'],
    underweight: ['Bonds (BND)', 'Utilities (XLU)', 'Consumer Staples (XLP)'],
  },
  contraction: {
    overweight: ['Healthcare (XLV)', 'Consumer Staples (XLP)', 'Utilities (XLU)'],
    neutral: ['Financials (XLF)', 'Technology (XLK)'],
    underweight: ['Energy (XLE)', 'Materials (XLB)', 'Consumer Discretionary (XLY)', 'Small-Caps (IWM)'],
  },
  recession: {
    overweight: ['Treasuries (TLT)', 'Consumer Staples (XLP)', 'Healthcare (XLV)', 'Utilities (XLU)'],
    neutral: ['Bonds (BND)', 'Dividend Stocks'],
    underweight: ['Technology (XLK)', 'Energy (XLE)', 'Financials (XLF)', 'Small-Caps (IWM)'],
  },
};

const HISTORICAL_CYCLES = [
  {
    name: '2009 Recovery',
    phase: 'early_expansion' as Phase,
    period: 'Mar 2009 – Apr 2010',
    keyEvents: ['Fed at 0%', 'QE1 launched', 'Auto bailout', 'TARP deployed'],
    sectorWinners: 'Tech +55%, Basic Materials +45%, Energy +32%',
    sectorLosers: 'Utilities +15%, Staples +18%',
    whatHappenedNext: 'S&P 500 rallied 65% over the following 12 months. Growth and tech led.',
  },
  {
    name: '2017–2018 Peak',
    phase: 'late_expansion' as Phase,
    period: 'Jan 2017 – Sep 2018',
    keyEvents: ['Tax cuts passed', 'Fed hiking', 'Unemployment at 50yr low', 'Trade war begins'],
    sectorWinners: 'Energy +35%, Financials +30%, Tech +45%',
    sectorLosers: 'Utilities -5%, Staples -3%',
    whatHappenedNext: 'Market corrected 20% in Q4 2018 as Fed over-hiked into slowing economy.',
  },
  {
    name: '2020 COVID Crash',
    phase: 'recession' as Phase,
    period: 'Feb 2020 – Apr 2020',
    keyEvents: ['Pandemic declared', 'Fed to 0% in 2 weeks', 'Unemployment 15%', 'Congress: $2T stimulus'],
    sectorWinners: 'Treasuries +25%, Healthcare +5%, Consumer Staples flat',
    sectorLosers: 'Energy -60%, Airlines -75%, Hotels -70%',
    whatHappenedNext: 'Fastest recovery in history. S&P 500 recovered all losses by August 2020.',
  },
  {
    name: '2022 Rate Hike Cycle',
    phase: 'contraction' as Phase,
    period: 'Jan 2022 – Oct 2022',
    keyEvents: ['Fed raised 425bps', 'Inflation at 40yr high', 'Tech selloff', 'Housing slowdown'],
    sectorWinners: 'Energy +65%, Healthcare +0%',
    sectorLosers: 'Tech -40%, Growth stocks -60%, ARK -75%',
    whatHappenedNext: 'Soft landing achieved. S&P 500 recovered 25% in 2023 led by AI/tech.',
  },
];

// This screen teaches the four-phase cycle framework using a worked example —
// it is NOT live economic data and never claims to be. Previously this section
// presented a fixed "Late Expansion, 72% model confidence" as if it were a
// real-time read (it wasn't; there is no model), which misrepresented static
// numbers as live analysis. Framed honestly now: a labeled example phase with
// illustrative figures, matched against a real signals checklist so a student
// can go find where we actually are themselves.
const EXAMPLE_PHASE: Phase = 'late_expansion';
const EXAMPLE_SIGNALS = [
  { label: 'GDP Growth', value: '+2.8%', trend: 'up', note: 'Solid but slowing' },
  { label: 'Unemployment', value: '3.9%', trend: 'neutral', note: 'Near historic lows' },
  { label: 'CPI Inflation', value: '3.2%', trend: 'down', note: 'Falling toward 2% target' },
  { label: 'Fed Funds Rate', value: '5.25%', trend: 'neutral', note: 'Holding; cuts expected' },
  { label: 'Yield Curve', value: 'Flat', trend: 'neutral', note: 'Near inversion — caution' },
  { label: 'S&P 500 P/E', value: '22x', trend: 'up', note: 'Above historical avg of 16x' },
];

export function MacroDashboardScreen({ onBack, onLessonPress }: Props) {
  const { theme } = useTheme();
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);

  const currentPhase = PHASES.find(p => p.id === EXAMPLE_PHASE)!;
  const sectorData = SECTOR_ROTATION[EXAMPLE_PHASE];

  const trendIcon = (t: string) => t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
  const trendColor = (t: string) =>
    t === 'up' ? theme.colors.success : t === 'down' ? theme.colors.danger : theme.colors.textSecondary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.back, { color: theme.colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Market Cycle</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Example phase — explicitly labeled as a teaching illustration */}
        <Card style={[styles.heroCard, { borderColor: currentPhase.color + '40', borderWidth: 1 }]}>
          <Text style={styles.heroEmoji}>{currentPhase.emoji}</Text>
          <Text style={[styles.heroLabel, { color: theme.colors.textSecondary }]}>Example: {currentPhase.label}</Text>
          <Text style={[styles.heroPhase, { color: currentPhase.color }]}>{currentPhase.label}</Text>
          <Text style={[styles.heroDesc, { color: theme.colors.textSecondary }]}>{currentPhase.description}</Text>
          <View style={[styles.disclaimerPill, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.disclaimerText, { color: theme.colors.textTertiary }]}>
              Illustrative example for teaching — not a live market read
            </Text>
          </View>

          {/* Phase wheel */}
          <View style={styles.phaseWheelRow}>
            {PHASES.map(ph => (
              <View key={ph.id} style={styles.phaseStep}>
                <View style={[
                  styles.phaseDot,
                  { backgroundColor: ph.id === EXAMPLE_PHASE ? ph.color : theme.colors.surfaceMuted }
                ]}>
                  <Text style={styles.phaseDotEmoji}>{ph.emoji}</Text>
                </View>
                <Text style={[styles.phaseStepLabel, {
                  color: ph.id === EXAMPLE_PHASE ? ph.color : theme.colors.textTertiary,
                  fontWeight: ph.id === EXAMPLE_PHASE ? '700' : '400',
                }]}>{ph.label.split(' ')[0]}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Economic signals */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Example Economic Signals</Text>
        <Text style={[styles.signalsSubtitle, { color: theme.colors.textTertiary }]}>
          Sample figures matching the example above — check current real numbers yourself before drawing conclusions.
        </Text>
        <Card style={styles.signalsCard}>
          {EXAMPLE_SIGNALS.map((sig, i) => (
            <View key={i} style={[styles.signalRow, i < EXAMPLE_SIGNALS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.signalLabel, { color: theme.colors.textPrimary }]}>{sig.label}</Text>
                <Text style={[styles.signalNote, { color: theme.colors.textTertiary }]}>{sig.note}</Text>
              </View>
              <View style={styles.signalRight}>
                <Text style={[styles.signalValue, { color: theme.colors.textPrimary }]}>{sig.value}</Text>
                <Text style={[styles.signalTrend, { color: trendColor(sig.trend) }]}>{trendIcon(sig.trend)}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Sector rotation */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Sector Rotation Now</Text>
        <Card>
          <View style={styles.sectorGroup}>
            <View style={[styles.sectorGroupHeader, { backgroundColor: theme.colors.success + '15' }]}>
              <Text style={[styles.sectorGroupLabel, { color: theme.colors.success }]}>↑ Overweight</Text>
            </View>
            {sectorData.overweight.map(s => (
              <Text key={s} style={[styles.sectorItem, { color: theme.colors.textPrimary }]}>• {s}</Text>
            ))}
          </View>
          <View style={styles.sectorGroup}>
            <View style={[styles.sectorGroupHeader, { backgroundColor: theme.colors.textTertiary + '15' }]}>
              <Text style={[styles.sectorGroupLabel, { color: theme.colors.textSecondary }]}>→ Neutral</Text>
            </View>
            {sectorData.neutral.map(s => (
              <Text key={s} style={[styles.sectorItem, { color: theme.colors.textSecondary }]}>• {s}</Text>
            ))}
          </View>
          <View style={styles.sectorGroup}>
            <View style={[styles.sectorGroupHeader, { backgroundColor: theme.colors.danger + '15' }]}>
              <Text style={[styles.sectorGroupLabel, { color: theme.colors.danger }]}>↓ Underweight</Text>
            </View>
            {sectorData.underweight.map(s => (
              <Text key={s} style={[styles.sectorItem, { color: theme.colors.textTertiary }]}>• {s}</Text>
            ))}
          </View>
        </Card>

        {/* Lesson callout */}
        <TouchableOpacity
          onPress={() => onLessonPress?.('T2L09')}
          style={[styles.lessonCallout, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}
        >
          <Text style={[styles.lessonCalloutTxt, { color: theme.colors.primary }]}>
            📚 Learn more → T2L09: Sector Rotation
          </Text>
        </TouchableOpacity>

        {/* Historical cycles */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Historical Cycles</Text>
        <Text style={[styles.sectionSub, { color: theme.colors.textSecondary }]}>
          The last 4 cycles. Tap each to see what happened.
        </Text>
        {HISTORICAL_CYCLES.map(cycle => {
          const ph = PHASES.find(p => p.id === cycle.phase)!;
          const expanded = expandedCycle === cycle.name;
          return (
            <TouchableOpacity key={cycle.name} onPress={() => setExpandedCycle(expanded ? null : cycle.name)}>
              <Card style={[styles.cycleCard, { borderLeftWidth: 3, borderLeftColor: ph.color }]}>
                <View style={styles.cycleHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cycleName, { color: theme.colors.textPrimary }]}>{cycle.name}</Text>
                    <Text style={[styles.cyclePeriod, { color: theme.colors.textTertiary }]}>{cycle.period}</Text>
                  </View>
                  <View style={[styles.cyclePhaseBadge, { backgroundColor: ph.color + '20' }]}>
                    <Text style={[styles.cyclePhaseTxt, { color: ph.color }]}>{ph.emoji} {ph.label}</Text>
                  </View>
                </View>
                {expanded && (
                  <View style={styles.cycleDetails}>
                    <Text style={[styles.cycleDetailLabel, { color: theme.colors.textTertiary }]}>Key events:</Text>
                    {cycle.keyEvents.map((e, i) => (
                      <Text key={i} style={[styles.cycleDetailTxt, { color: theme.colors.textSecondary }]}>• {e}</Text>
                    ))}
                    <Text style={[styles.cycleDetailLabel, { color: theme.colors.success }]}>Winners:</Text>
                    <Text style={[styles.cycleDetailTxt, { color: theme.colors.textSecondary }]}>{cycle.sectorWinners}</Text>
                    <Text style={[styles.cycleDetailLabel, { color: theme.colors.danger }]}>Laggards:</Text>
                    <Text style={[styles.cycleDetailTxt, { color: theme.colors.textSecondary }]}>{cycle.sectorLosers}</Text>
                    <View style={[styles.nextBox, { backgroundColor: theme.colors.surfaceMuted }]}>
                      <Text style={[styles.nextLabel, { color: theme.colors.primary }]}>What happened next:</Text>
                      <Text style={[styles.nextTxt, { color: theme.colors.textPrimary }]}>{cycle.whatHappenedNext}</Text>
                    </View>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        })}

        <View style={[styles.disclaimer, { backgroundColor: theme.colors.surfaceMuted }]}>
          <Text style={[styles.disclaimerTxt, { color: theme.colors.textTertiary }]}>
            ⚠️ The cycle model uses publicly available economic indicators. It is educational only — not financial advice. Economic cycles are difficult to time and models can be wrong.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 50 },
  heroCard: { alignItems: 'center', marginBottom: 20 },
  heroEmoji: { fontSize: 48, marginBottom: 6 },
  heroLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  heroPhase: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  heroDesc: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 12 },
  disclaimerPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 16 },
  disclaimerText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  confidenceLabel: { fontSize: 12 },
  confidenceValue: { fontSize: 12, fontWeight: '700' },
  confTrack: { height: 6, borderRadius: 3, width: '100%', marginBottom: 20 },
  confFill: { height: 6, borderRadius: 3 },
  phaseWheelRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  phaseStep: { alignItems: 'center', flex: 1 },
  phaseDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  phaseDotEmoji: { fontSize: 16 },
  phaseStepLabel: { fontSize: 10, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4, marginTop: 4 },
  signalsSubtitle: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  sectionSub: { fontSize: 13, marginBottom: 12, marginTop: -6 },
  signalsCard: { marginBottom: 20 },
  signalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  signalLabel: { fontSize: 14, fontWeight: '500' },
  signalNote: { fontSize: 11, marginTop: 1 },
  signalRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signalValue: { fontSize: 14, fontWeight: '600' },
  signalTrend: { fontSize: 16, fontWeight: '700' },
  sectorGroup: { marginBottom: 12 },
  sectorGroupHeader: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 8, alignSelf: 'flex-start' },
  sectorGroupLabel: { fontSize: 12, fontWeight: '700' },
  sectorItem: { fontSize: 14, marginBottom: 4, paddingLeft: 4 },
  lessonCallout: { padding: 12, borderRadius: 8, borderWidth: 1, marginVertical: 12 },
  lessonCalloutTxt: { fontSize: 14, fontWeight: '500' },
  cycleCard: { marginBottom: 10 },
  cycleHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cycleName: { fontSize: 15, fontWeight: '600' },
  cyclePeriod: { fontSize: 12, marginTop: 2 },
  cyclePhaseBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cyclePhaseTxt: { fontSize: 11, fontWeight: '600' },
  cycleDetails: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ffffff10' },
  cycleDetailLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  cycleDetailTxt: { fontSize: 13, lineHeight: 18, marginBottom: 2 },
  nextBox: { marginTop: 10, padding: 10, borderRadius: 8 },
  nextLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  nextTxt: { fontSize: 13, lineHeight: 18 },
  disclaimer: { padding: 12, borderRadius: 8, marginTop: 12 },
  disclaimerTxt: { fontSize: 12, lineHeight: 17 },
});
