import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props { onBack: () => void; onSubscribePress: () => void; isPremium: boolean; }

type GoalType = 'retirement' | 'house' | 'car' | 'business' | 'education' | 'custom';
type ReturnProfile = 'conservative' | 'moderate' | 'aggressive';

const RETURN_RATES: Record<ReturnProfile, { annual: number; label: string; color: string; desc: string }> = {
  conservative: { annual: 0.05, label: 'Conservative',  color: '#10B981', desc: 'Mostly bonds & dividend stocks' },
  moderate:     { annual: 0.08, label: 'Moderate',      color: '#F59E0B', desc: 'Balanced index portfolio' },
  aggressive:   { annual: 0.12, label: 'Aggressive',    color: '#F87171', desc: 'Growth stocks, high volatility' },
};

const GOALS: { id: GoalType; emoji: string; label: string; default: number }[] = [
  { id: 'retirement', emoji: '🏖️', label: 'Retirement', default: 1000000 },
  { id: 'house',      emoji: '🏠', label: 'House Down Payment', default: 80000 },
  { id: 'car',        emoji: '🚗', label: 'Dream Car', default: 50000 },
  { id: 'business',   emoji: '🏢', label: 'Start a Business', default: 150000 },
  { id: 'education',  emoji: '🎓', label: 'Education', default: 60000 },
  { id: 'custom',     emoji: '🎯', label: 'Custom Goal', default: 100000 },
];

function monteCarlo(monthly: number, years: number, annualRate: number, runs = 200): number[] {
  const results: number[] = [];
  const monthlyRate = annualRate / 12;
  for (let r = 0; r < runs; r++) {
    let balance = 0;
    for (let m = 0; m < years * 12; m++) {
      const randomReturn = monthlyRate + (Math.random() - 0.5) * monthlyRate * 0.8;
      balance = balance * (1 + randomReturn) + monthly;
    }
    results.push(balance);
  }
  return results.sort((a, b) => a - b);
}

function pctile(arr: number[], p: number) { return arr[Math.floor(arr.length * p)]; }
function fmt(n: number) { return n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1000)}K`; }

export function FutureSimulatorScreen({ onBack, onSubscribePress, isPremium }: Props) {
  const { theme } = useTheme();
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(20);
  const [profile, setProfile] = useState<ReturnProfile>('moderate');
  const [goalType, setGoalType] = useState<GoalType>('retirement');
  const [goalAmount, setGoalAmount] = useState(1000000);
  const [currentSavings, setCurrentSavings] = useState(5000);
  const s = styles(theme);

  const goal = GOALS.find(g => g.id === goalType)!;
  const rate = RETURN_RATES[profile];

  const simResults = useMemo(() => monteCarlo(monthly, years, rate.annual), [monthly, years, rate.annual]);
  const pessimistic = pctile(simResults, 0.1);
  const realistic   = pctile(simResults, 0.5) + currentSavings * Math.pow(1 + rate.annual / 12, years * 12);
  const optimistic  = pctile(simResults, 0.9);

  const yearsToGoal = useMemo(() => {
    for (let y = 1; y <= 40; y++) {
      const r = monteCarlo(monthly, y, rate.annual, 50);
      if (pctile(r, 0.5) + currentSavings * Math.pow(1 + rate.annual / 12, y * 12) >= goalAmount) return y;
    }
    return null;
  }, [monthly, rate.annual, goalAmount, currentSavings]);

  const goalReached = realistic >= goalAmount;

  if (!isPremium) return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity></View>
      <View style={s.centered}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🔮</Text>
        <Text style={[s.bigTitle, { color: theme.colors.textPrimary }]}>Future Simulator</Text>
        <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>See your wealth 5, 10, 30 years from now. Premium only.</Text>
        <TouchableOpacity onPress={onSubscribePress} style={[s.primaryBtn, { backgroundColor: theme.colors.primary }]}>
          <Text style={s.primaryBtnText}>💎 Unlock with Premium</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>🔮 Future Simulator</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.pad} showsVerticalScrollIndicator={false}>

        {/* Goal Selection */}
        <Text style={s.sectionLabel}>YOUR GOAL</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 0 }}>
            {GOALS.map(g => (
              <TouchableOpacity key={g.id} onPress={() => { setGoalType(g.id); setGoalAmount(g.default); }}
                style={[s.goalChip, { borderColor: goalType === g.id ? theme.colors.primary : theme.colors.border },
                  goalType === g.id && { backgroundColor: theme.colors.primaryGlow }]}>
                <Text style={{ fontSize: 16 }}>{g.emoji}</Text>
                <Text style={[s.goalChipText, { color: goalType === g.id ? theme.colors.primary : theme.colors.textSecondary }]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Inputs */}
        <View style={[s.inputsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {[
            { label: `${goal.emoji} Goal Amount ($)`, val: goalAmount, set: setGoalAmount, min: 1000, max: 10000000, step: 10000 },
            { label: '💰 Starting Savings ($)', val: currentSavings, set: setCurrentSavings, min: 0, max: 500000, step: 1000 },
            { label: '📅 Monthly Investment ($)', val: monthly, set: setMonthly, min: 50, max: 10000, step: 50 },
            { label: '⏳ Time Horizon (years)', val: years, set: setYears, min: 1, max: 40, step: 1 },
          ].map(inp => (
            <View key={inp.label} style={s.inputRow}>
              <Text style={[s.inputLabel, { color: theme.colors.textSecondary }]}>{inp.label}</Text>
              <View style={s.inputControls}>
                <TouchableOpacity onPress={() => inp.set(Math.max(inp.min, inp.val - inp.step))} style={[s.inputBtn, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Text style={[s.inputBtnText, { color: theme.colors.textPrimary }]}>−</Text>
                </TouchableOpacity>
                <Text style={[s.inputVal, { color: theme.colors.primary }]}>
                  {inp.label.includes('years') ? `${inp.val}y` : `$${inp.val.toLocaleString()}`}
                </Text>
                <TouchableOpacity onPress={() => inp.set(Math.min(inp.max, inp.val + inp.step))} style={[s.inputBtn, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Text style={[s.inputBtnText, { color: theme.colors.textPrimary }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Return Profile */}
        <Text style={s.sectionLabel}>INVESTMENT STRATEGY</Text>
        <View style={s.profileRow}>
          {(Object.entries(RETURN_RATES) as [ReturnProfile, typeof RETURN_RATES[ReturnProfile]][]).map(([key, r]) => (
            <TouchableOpacity key={key} onPress={() => setProfile(key)}
              style={[s.profileBtn, { borderColor: profile === key ? r.color : theme.colors.border },
                profile === key && { backgroundColor: r.color + '15' }]}>
              <Text style={[s.profileLabel, { color: profile === key ? r.color : theme.colors.textSecondary }]}>{r.label}</Text>
              <Text style={[s.profileRate, { color: profile === key ? r.color : theme.colors.textTertiary }]}>{(r.annual * 100).toFixed(0)}%/yr</Text>
              <Text style={[s.profileDesc, { color: theme.colors.textTertiary }]}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Results */}
        <View style={[s.resultsCard, { backgroundColor: goalReached ? '#10B98112' : '#F8717112', borderColor: goalReached ? '#10B98140' : '#F8717140' }]}>
          <Text style={[s.resultsTitle, { color: theme.colors.textPrimary }]}>
            {goal.emoji} {goal.label} in {years} years
          </Text>
          <Text style={[s.goalStatusText, { color: goalReached ? theme.colors.success : theme.colors.danger }]}>
            {goalReached ? `✅ Goal REACHED with ${fmt(realistic - goalAmount)} to spare!` : `❌ ${fmt(goalAmount - realistic)} short of goal`}
          </Text>
          {yearsToGoal && (
            <Text style={[s.yearsToGoal, { color: theme.colors.textSecondary }]}>
              At this rate, you reach {fmt(goalAmount)} in <Text style={{ fontWeight: '800', color: theme.colors.primary }}>{yearsToGoal} years</Text>
            </Text>
          )}
        </View>

        {/* Monte Carlo Outcomes */}
        <Text style={s.sectionLabel}>PROJECTED OUTCOMES (200 SIMULATIONS)</Text>
        {[
          { label: 'Pessimistic (10th pctile)', val: pessimistic, color: theme.colors.danger, icon: '😟' },
          { label: 'Realistic (50th pctile)',   val: realistic,   color: theme.colors.primary, icon: '😊' },
          { label: 'Optimistic (90th pctile)',  val: optimistic,  color: theme.colors.success,  icon: '🤩' },
        ].map(row => (
          <View key={row.label} style={[s.outcomeRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={{ fontSize: 24 }}>{row.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.outcomeLabel, { color: theme.colors.textSecondary }]}>{row.label}</Text>
              <View style={[s.outcomeBar, { backgroundColor: theme.colors.border }]}>
                <View style={[s.outcomeBarFill, { backgroundColor: row.color, width: `${Math.min(100, (row.val / goalAmount) * 100)}%` }]} />
              </View>
            </View>
            <Text style={[s.outcomeVal, { color: row.color }]}>{fmt(row.val)}</Text>
          </View>
        ))}

        {/* Growth Chart (simplified visual) */}
        <Text style={s.sectionLabel}>GROWTH OVER TIME</Text>
        <View style={[s.chartCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={s.chartArea}>
            {[5, 10, 15, 20, 25, 30].filter(y => y <= years).map(y => {
              const sim = monteCarlo(monthly, y, rate.annual, 30);
              const val = pctile(sim, 0.5) + currentSavings * Math.pow(1 + rate.annual / 12, y * 12);
              const maxVal = realistic;
              const barHeight = Math.max(4, (val / maxVal) * 120);
              return (
                <View key={y} style={s.barCol}>
                  <Text style={[s.barLabel, { color: theme.colors.textTertiary }]}>{fmt(val)}</Text>
                  <View style={[s.bar, { height: barHeight, backgroundColor: rate.color }]} />
                  <Text style={[s.barYear, { color: theme.colors.textTertiary }]}>{y}yr</Text>
                </View>
              );
            })}
          </View>
          <Text style={[s.chartDisclaimer, { color: theme.colors.textTertiary }]}>
            Median projection · Monte Carlo simulation · Past performance not indicative of future results
          </Text>
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
  goalChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, backgroundColor: theme.colors.surface },
  goalChipText: { fontSize: 12, fontWeight: '600' },
  inputsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 0.5, borderBottomColor: theme.colors.border },
  inputLabel: { fontSize: 13, flex: 1 },
  inputControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  inputBtnText: { fontSize: 18, fontWeight: '700' },
  inputVal: { fontSize: 15, fontWeight: '800', minWidth: 80, textAlign: 'center' },
  profileRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  profileBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
  profileLabel: { fontSize: 11, fontWeight: '700' },
  profileRate: { fontSize: 16, fontWeight: '900' },
  profileDesc: { fontSize: 9, textAlign: 'center' },
  resultsCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginTop: 12, marginBottom: 4 },
  resultsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  goalStatusText: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  yearsToGoal: { fontSize: 13, lineHeight: 19 },
  outcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  outcomeLabel: { fontSize: 11, marginBottom: 4 },
  outcomeBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  outcomeBarFill: { height: 6, borderRadius: 3 },
  outcomeVal: { fontSize: 16, fontWeight: '800', width: 60, textAlign: 'right' },
  chartCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 8 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, marginBottom: 8 },
  barCol: { alignItems: 'center', flex: 1, gap: 4 },
  barLabel: { fontSize: 9, textAlign: 'center' },
  bar: { width: '70%', borderRadius: 4 },
  barYear: { fontSize: 10, fontWeight: '600' },
  chartDisclaimer: { fontSize: 10, textAlign: 'center', fontStyle: 'italic' },
});
