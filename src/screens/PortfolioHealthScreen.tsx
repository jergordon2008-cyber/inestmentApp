import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { usePortfolioStore } from '../services/portfolioStore';
import { useBehavioralStore } from '../services/behavioralStore';
import { useTradeJournalStore } from '../services/tradeJournalStore';

interface Props { onBack: () => void; onSubscribePress: () => void; isPremium: boolean; }

function scoreToColor(score: number, theme: any) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return '#F59E0B';
  return theme.colors.danger;
}

export function PortfolioHealthScreen({ onBack, onSubscribePress, isPremium }: Props) {
  const { theme } = useTheme();
  const portfolio = usePortfolioStore(s => s.portfolio);
  const { profile: biasProfile } = useBehavioralStore();
  const entries = useTradeJournalStore(s => s.entries);
  const s = styles(theme);

  if (!isPremium) return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity></View>
      <View style={s.centered}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>📊</Text>
        <Text style={[s.bigTitle, { color: theme.colors.textPrimary }]}>Portfolio Health Score</Text>
        <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>Your complete portfolio health breakdown. Premium only.</Text>
        <TouchableOpacity onPress={onSubscribePress} style={[s.primaryBtn, { backgroundColor: theme.colors.primary }]}>
          <Text style={s.primaryBtnText}>💎 Unlock with Premium</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (!portfolio) return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity></View>
      <View style={s.centered}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>📊</Text>
        <Text style={[s.bigTitle, { color: theme.colors.textPrimary }]}>No Portfolio Yet</Text>
        <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>Make your first paper trade to generate a health score.</Text>
      </View>
    </SafeAreaView>
  );

  const positions = portfolio.positions ?? [];
  const posCount = positions.length;
  const totalVal = portfolio.totalValue ?? 10000;
  const initCash = portfolio.initialCash ?? 10000;
  const totalReturn = ((totalVal - initCash) / initCash) * 100;
  const cashPct = (portfolio.currentCash ?? initCash) / totalVal;

  // Diversification Score (25pt)
  const uniqueSectors = new Set(positions.map(p => p.symbol.slice(0, 1))).size;
  const concentrationMax = positions.length > 0 ? Math.max(...positions.map(p => p.currentValue / totalVal)) : 1;
  const divScore = Math.round(Math.min(25, posCount * 4 + (1 - concentrationMax) * 15));

  // Risk-Adjusted Return Score (25pt)
  const riskScore = Math.round(Math.min(25, Math.max(0, 12.5 + totalReturn * 0.5)));

  // Behavioral Score (25pt)
  const biasCount = biasProfile?.topBiases?.length ?? 3;
  const badTrades = entries.filter(e => e.reasonCategory === 'fomo' || e.reasonCategory === 'tip').length;
  const behavScore = Math.round(Math.max(0, 25 - biasCount * 3 - badTrades * 2));

  // Cash Management Score (25pt)
  const cashScore = Math.round(cashPct > 0.8 ? 8 : cashPct > 0.5 ? 14 : cashPct > 0.1 ? 22 : cashPct > 0.02 ? 25 : 20);

  const totalScore = divScore + riskScore + behavScore + cashScore;
  const overallColor = scoreToColor(totalScore, theme);
  const grade = totalScore >= 85 ? 'A' : totalScore >= 70 ? 'B' : totalScore >= 55 ? 'C' : totalScore >= 40 ? 'D' : 'F';

  const COMPONENTS = [
    {
      label: 'Diversification', score: divScore, max: 25, icon: '🌐',
      description: `${posCount} positions held. ${concentrationMax > 0.4 ? 'High concentration risk — largest position is ' + (concentrationMax * 100).toFixed(0) + '% of portfolio.' : 'Good spread across positions.'}`,
      tip: concentrationMax > 0.4 ? 'Consider trimming your largest position to under 20%.' : 'Keep positions well-spread. Target 10–15 stocks minimum.',
    },
    {
      label: 'Risk-Adjusted Return', score: riskScore, max: 25, icon: '📈',
      description: `Portfolio return: ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}% since inception.`,
      tip: totalReturn < 0 ? 'Focus on quality positions with strong fundamentals.' : 'Strong returns. Monitor if it came from luck or skill.',
    },
    {
      label: 'Behavioral Discipline', score: behavScore, max: 25, icon: '🧠',
      description: `${biasCount} active biases identified. ${badTrades} FOMO/tip-based trades recorded.`,
      tip: biasCount > 2 ? 'Work through the Mind Check lessons to improve discipline.' : 'Your behavioral control is strong. Keep using the Decision Journal.',
    },
    {
      label: 'Cash Management', score: cashScore, max: 25, icon: '💵',
      description: `${(cashPct * 100).toFixed(0)}% cash. ${cashPct > 0.5 ? 'Too much cash sitting idle — consider deploying into positions.' : cashPct < 0.03 ? 'Dangerously low cash — no dry powder for opportunities.' : 'Healthy cash buffer maintained.'}`,
      tip: cashPct > 0.5 ? 'Deploy excess cash gradually into your highest-conviction ideas.' : cashPct < 0.05 ? 'Build a 5-10% cash reserve for opportunities and emergencies.' : 'Cash position looks healthy.',
    },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Portfolio Health</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.pad} showsVerticalScrollIndicator={false}>

        {/* Big Score */}
        <View style={[s.scoreCard, { backgroundColor: overallColor + '15', borderColor: overallColor + '40' }]}>
          <View style={s.scoreRow}>
            <Text style={[s.scoreBig, { color: overallColor }]}>{totalScore}</Text>
            <Text style={[s.scoreOf, { color: theme.colors.textTertiary }]}>/100</Text>
            <View style={[s.gradePill, { backgroundColor: overallColor }]}>
              <Text style={s.gradeText}>{grade}</Text>
            </View>
          </View>
          <Text style={[s.scoreLabel, { color: theme.colors.textSecondary }]}>
            {totalScore >= 75 ? 'Excellent health! Your portfolio is well-structured.' :
             totalScore >= 55 ? 'Good foundation with room to improve.' :
             totalScore >= 40 ? 'Several areas need attention.' :
             'Your portfolio needs significant work.'}
          </Text>
          {/* Score bar */}
          <View style={[s.scoreTrack, { backgroundColor: theme.colors.border }]}>
            <View style={[s.scoreFill, { backgroundColor: overallColor, width: `${totalScore}%` }]} />
          </View>
        </View>

        {/* Component Breakdown */}
        <Text style={s.sectionLabel}>SCORE BREAKDOWN</Text>
        {COMPONENTS.map(comp => {
          const compColor = scoreToColor((comp.score / comp.max) * 100, theme);
          return (
            <View key={comp.label} style={[s.compCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={s.compHeader}>
                <Text style={{ fontSize: 22 }}>{comp.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.compLabel, { color: theme.colors.textPrimary }]}>{comp.label}</Text>
                  <Text style={[s.compDesc, { color: theme.colors.textSecondary }]}>{comp.description}</Text>
                </View>
                <Text style={[s.compScore, { color: compColor }]}>{comp.score}<Text style={[s.compMax, { color: theme.colors.textTertiary }]}>/{comp.max}</Text></Text>
              </View>
              <View style={[s.compTrack, { backgroundColor: theme.colors.border }]}>
                <View style={[s.compFill, { backgroundColor: compColor, width: `${(comp.score / comp.max) * 100}%` }]} />
              </View>
              <View style={[s.tipBox, { backgroundColor: compColor + '12' }]}>
                <Text style={[s.tipText, { color: theme.colors.textSecondary }]}>💡 {comp.tip}</Text>
              </View>
            </View>
          );
        })}

        {/* Portfolio Snapshot */}
        <Text style={s.sectionLabel}>PORTFOLIO SNAPSHOT</Text>
        <View style={[s.snapshotCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {[
            { label: 'Total Value', val: `$${totalVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: theme.colors.textPrimary },
            { label: 'Total Return', val: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`, color: totalReturn >= 0 ? theme.colors.success : theme.colors.danger },
            { label: 'Positions', val: String(posCount), color: theme.colors.primary },
            { label: 'Cash', val: `$${(portfolio.currentCash ?? 0).toFixed(0)}`, color: theme.colors.textPrimary },
          ].map(row => (
            <View key={row.label} style={[s.snapshotRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[s.snapshotLabel, { color: theme.colors.textSecondary }]}>{row.label}</Text>
              <Text style={[s.snapshotVal, { color: row.color }]}>{row.val}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
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
  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textTertiary, letterSpacing: 1, marginBottom: 8, marginTop: 12 },
  scoreCard: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 8 },
  scoreBig: { fontSize: 72, fontWeight: '900', lineHeight: 80, letterSpacing: -2 },
  scoreOf: { fontSize: 20, fontWeight: '600', marginBottom: 10 },
  gradePill: { marginLeft: 8, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  gradeText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  scoreLabel: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  scoreTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  scoreFill: { height: 8, borderRadius: 4 },
  compCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  compHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  compLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  compDesc: { fontSize: 12, lineHeight: 17 },
  compScore: { fontSize: 22, fontWeight: '900' },
  compMax: { fontSize: 14, fontWeight: '500' },
  compTrack: { height: 6, borderRadius: 3, marginBottom: 10, overflow: 'hidden' },
  compFill: { height: 6, borderRadius: 3 },
  tipBox: { borderRadius: 8, padding: 10 },
  tipText: { fontSize: 12, lineHeight: 18 },
  snapshotCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  snapshotRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 0.5 },
  snapshotLabel: { fontSize: 14 },
  snapshotVal: { fontSize: 14, fontWeight: '700' },
});
