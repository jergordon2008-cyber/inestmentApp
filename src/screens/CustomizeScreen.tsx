/**
 * CustomizeScreen — App Appearance & Experience
 *
 * Moved from Discover → Profile tab.
 * Features:
 *  • Theme mode (dark / light / system)
 *  • Accent colour (10 presets)
 *  • Font size (4 levels)
 *  • Chart style preference (line / area / candle)
 *  • Layout density (comfortable / compact)
 *  • Price display (full / abbreviated)
 *  • Gamification toggle
 *  • Haptic feedback toggle
 *  • Notification categories
 *  • Live preview strip
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Switch, Vibration,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme, ACCENT_OPTIONS, FontSize, ChartStyle } from '../context/ThemeContext';
import { useSkillTreeStore, XP_MILESTONES, getXPToNextLevel, XPMilestone } from '../services/skillTreeStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
interface Props { onBack: () => void; }

const FONT_SIZES: { id: FontSize; label: string; size: number }[] = [
  { id: 'small',   label: 'Small',    size: 11 },
  { id: 'default', label: 'Default',  size: 14 },
  { id: 'large',   label: 'Large',    size: 17 },
  { id: 'xlarge',  label: 'X-Large',  size: 20 },
];

const CHART_STYLES = [
  { id: 'line',  label: 'Line',   icon: '📈' },
  { id: 'area',  label: 'Area',   icon: '🏔️' },
  { id: 'candle',label: 'Candle', icon: '🕯️' },
] as const;

const DENSITIES = [
  { id: 'comfortable', label: 'Comfortable', icon: 'expand-outline' },
  { id: 'compact',     label: 'Compact',     icon: 'contract-outline' },
] as const;

const PRICE_FORMATS = [
  { id: 'full',  label: 'Full',   example: '$182.45'  },
  { id: 'abbr',  label: 'Short',  example: '$182'     },
] as const;

function SectionLabel({ text, theme }: { text: string; theme: any }) {
  return <Text style={[sl.sectionLabel, { color: theme.colors.textTertiary }]}>{text}</Text>;
}

function Card({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <View style={[sl.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {children}
    </View>
  );
}

function RowDivider({ theme }: { theme: any }) {
  return <View style={[sl.divider, { backgroundColor: theme.colors.border }]} />;
}

export function CustomizeScreen({ onBack }: Props) {
  const { theme, mode, accentColor, fontSize, chartStyle, setMode, setAccentColor, setFontSize, setChartStyle } = useTheme();
  const { gamificationEnabled, xp, level } = useSkillTreeStore();
  const xpProgress = getXPToNextLevel(xp);

  // Local prefs (stored in state — in a real app, persist to AsyncStorage)
  const [density, setDensity]         = useState<'comfortable' | 'compact'>('comfortable');
  const [priceFormat, setPriceFormat] = useState<'full' | 'abbr'>('full');
  const [haptics, setHaptics]         = useState(true);
  const [notifLessons, setNotifL]     = useState(true);
  const [notifNews, setNotifN]        = useState(true);
  const [notifPrices, setNotifP]      = useState(false);
  const [notifStreak, setNotifS]      = useState(true);

  const handleHapticToggle = (val: boolean) => {
    setHaptics(val);
    if (val) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={[sl.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[sl.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack} style={sl.backBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[sl.title, { color: theme.colors.textPrimary }]}>Customize</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={sl.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Live Preview ── */}
        <View style={[sl.preview, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[sl.previewLabel, { color: theme.colors.textTertiary }]}>LIVE PREVIEW</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <View style={[sl.previewBtn, { backgroundColor: theme.colors.primary }]}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Buy AAPL</Text>
            </View>
            <View style={[sl.previewBadge, { backgroundColor: theme.colors.primaryGlow, borderColor: theme.colors.primary }]}>
              <Text style={[{ color: theme.colors.primary, fontSize: 11, fontWeight: '700' }]}>+2.4%</Text>
            </View>
            <View style={[sl.previewDot, { backgroundColor: theme.colors.success }]} />
            <Text style={[{ fontSize: fontSize === 'small' ? 11 : fontSize === 'large' ? 16 : fontSize === 'xlarge' ? 19 : 13, color: theme.colors.textPrimary, fontWeight: '600' }]}>
              $182.45
            </Text>
          </View>
        </View>

        {/* ── Theme Mode ── */}
        <SectionLabel text="THEME" theme={theme} />
        <Card theme={theme}>
          <View style={sl.row3}>
            {(['dark', 'light', 'system'] as const).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[sl.optBtn, {
                  borderColor: mode === m ? theme.colors.primary : theme.colors.border,
                  backgroundColor: mode === m ? theme.colors.primaryGlow : theme.colors.surfaceMuted,
                }]}
              >
                <Text style={sl.optEmoji}>{m === 'light' ? '☀️' : m === 'dark' ? '🌙' : '⚙️'}</Text>
                <Text style={[sl.optLabel, { color: mode === m ? theme.colors.primary : theme.colors.textSecondary }]}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── Accent Colour ── */}
        <SectionLabel text="ACCENT COLOR" theme={theme} />
        <Card theme={theme}>
          <Text style={[sl.cardSub, { color: theme.colors.textSecondary }]}>
            Personalise buttons, highlights, and active states.
          </Text>
          <View style={sl.colorGrid}>
            {ACCENT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} onPress={() => setAccentColor(opt.value)} style={sl.colorItem} activeOpacity={0.8}>
                <View style={[sl.swatch, { backgroundColor: opt.value }, accentColor === opt.value && sl.swatchActive]}>
                  {accentColor === opt.value && <Text style={sl.swatchCheck}>✓</Text>}
                </View>
                <Text style={[sl.colorName, { color: theme.colors.textTertiary }]}>{opt.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── Font Size ── */}
        <SectionLabel text="TEXT SIZE" theme={theme} />
        <Card theme={theme}>
          <View style={sl.row4}>
            {FONT_SIZES.map(f => (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFontSize(f.id)}
                style={[sl.optBtn, {
                  borderColor: fontSize === f.id ? theme.colors.primary : theme.colors.border,
                  backgroundColor: fontSize === f.id ? theme.colors.primaryGlow : theme.colors.surfaceMuted,
                }]}
              >
                <Text style={[{ fontSize: f.size, fontWeight: '700', color: fontSize === f.id ? theme.colors.primary : theme.colors.textPrimary }]}>Aa</Text>
                <Text style={[sl.optLabel, { color: fontSize === f.id ? theme.colors.primary : theme.colors.textSecondary }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── Chart Style ── */}
        <SectionLabel text="CHART STYLE" theme={theme} />
        <Card theme={theme}>
          <View style={sl.row3}>
            {CHART_STYLES.map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setChartStyle(c.id as ChartStyle)}
                style={[sl.optBtn, {
                  borderColor: chartStyle === c.id ? theme.colors.primary : theme.colors.border,
                  backgroundColor: chartStyle === c.id ? theme.colors.primaryGlow : theme.colors.surfaceMuted,
                }]}
              >
                <Text style={sl.optEmoji}>{c.icon}</Text>
                <Text style={[sl.optLabel, { color: chartStyle === c.id ? theme.colors.primary : theme.colors.textSecondary }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── Layout Density ── */}
        <SectionLabel text="LAYOUT DENSITY" theme={theme} />
        <Card theme={theme}>
          <View style={sl.row2}>
            {DENSITIES.map(d => (
              <TouchableOpacity
                key={d.id}
                onPress={() => setDensity(d.id)}
                style={[sl.optBtn, { flex: 1,
                  borderColor: density === d.id ? theme.colors.primary : theme.colors.border,
                  backgroundColor: density === d.id ? theme.colors.primaryGlow : theme.colors.surfaceMuted,
                }]}
              >
                <Ionicons name={d.icon as IoniconName} size={20} color={density === d.id ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[sl.optLabel, { color: density === d.id ? theme.colors.primary : theme.colors.textSecondary }]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── Price Format ── */}
        <SectionLabel text="PRICE DISPLAY" theme={theme} />
        <Card theme={theme}>
          <View style={sl.row2}>
            {PRICE_FORMATS.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setPriceFormat(p.id)}
                style={[sl.optBtn, { flex: 1,
                  borderColor: priceFormat === p.id ? theme.colors.primary : theme.colors.border,
                  backgroundColor: priceFormat === p.id ? theme.colors.primaryGlow : theme.colors.surfaceMuted,
                }]}
              >
                <Text style={[sl.optEmoji, { fontSize: 14, fontWeight: '700', color: priceFormat === p.id ? theme.colors.primary : theme.colors.textPrimary }]}>
                  {p.example}
                </Text>
                <Text style={[sl.optLabel, { color: priceFormat === p.id ? theme.colors.primary : theme.colors.textSecondary }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── Display Mode ── */}
        <SectionLabel text="EXPERIENCE" theme={theme} />
        <Card theme={theme}>
          <ToggleItem
            icon="phone-portrait-outline"
            label="Haptic Feedback"
            sub="Vibration on taps and alerts"
            value={haptics}
            onToggle={handleHapticToggle}
            theme={theme}
          />
        </Card>

        {/* ── XP Perks (visible only in gamification mode) ── */}
        {gamificationEnabled && (
          <>
            <SectionLabel text="GAME MODE · XP PERKS" theme={theme} />
            <Card theme={theme}>
              {/* Level progress */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 20 }}>{XP_MILESTONES.find(m => m.level === level)?.icon ?? '🌱'}</Text>
                    <View>
                      <Text style={[sl.toggleLabel, { color: theme.colors.textPrimary }]}>Level {level} · {XP_MILESTONES.find(m => m.level === level)?.title ?? 'Starter'}</Text>
                      <Text style={[sl.toggleSub, { color: theme.colors.textTertiary }]}>{xp.toLocaleString()} XP earned</Text>
                    </View>
                  </View>
                  {xpProgress.nextMilestone && (
                    <Text style={[sl.toggleSub, { color: theme.colors.primary }]}>
                      {xpProgress.current}/{xpProgress.required} to Lvl {level + 1}
                    </Text>
                  )}
                </View>
                {/* Progress bar */}
                <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.border, overflow: 'hidden' }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, width: `${Math.round(xpProgress.pct * 100)}%` }} />
                </View>
              </View>

              {/* Perk list */}
              {XP_MILESTONES.map((m, i) => {
                const unlocked = level >= m.level;
                return (
                  <View key={m.level}>
                    {i > 0 && <View style={[sl.divider, { backgroundColor: theme.colors.border }]} />}
                    <View style={[sl.toggleRow, { opacity: unlocked ? 1 : 0.45 }]}>
                      <View style={[sl.toggleIcon, { backgroundColor: unlocked ? theme.colors.primary + '20' : theme.colors.surfaceMuted }]}>
                        <Text style={{ fontSize: 14 }}>{m.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[sl.toggleLabel, { color: unlocked ? theme.colors.textPrimary : theme.colors.textTertiary }]}>
                          Lvl {m.level} · {m.perkTitle}
                        </Text>
                        <Text style={[sl.toggleSub, { color: theme.colors.textTertiary }]}>{m.perkDescription}</Text>
                      </View>
                      {unlocked
                        ? <Text style={{ fontSize: 14, color: theme.colors.success }}>✓</Text>
                        : <Text style={[sl.toggleSub, { color: theme.colors.textTertiary }]}>{m.xpRequired.toLocaleString()} XP</Text>
                      }
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* ── Notifications ── */}
        <SectionLabel text="NOTIFICATIONS" theme={theme} />
        <Card theme={theme}>
          <ToggleItem icon="school-outline"     label="Daily Lessons"       sub="Reminder to keep your streak alive"     value={notifLessons} onToggle={setNotifL} theme={theme} />
          <RowDivider theme={theme} />
          <ToggleItem icon="newspaper-outline"  label="Breaking News"        sub="Major market events"                    value={notifNews}    onToggle={setNotifN} theme={theme} />
          <RowDivider theme={theme} />
          <ToggleItem icon="trending-up-outline" label="Price Alerts"        sub="When watchlist stocks move 5%+"         value={notifPrices}  onToggle={setNotifP} theme={theme} />
          <RowDivider theme={theme} />
          <ToggleItem icon="flame-outline"      label="Streak Reminders"     sub="Keep your daily streak going"           value={notifStreak}  onToggle={setNotifS} theme={theme} />
        </Card>

        {/* ── Reset ── */}
        <TouchableOpacity
          onPress={() => {
            showAlert('Reset to defaults?', 'This will restore all appearance settings.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => {
                setMode('dark');
                setAccentColor('#00D084');
                setFontSize('default');
                setChartStyle('area' as ChartStyle);
                setDensity('comfortable');
              }},
            ]);
          }}
          style={[sl.resetBtn, { borderColor: theme.colors.danger + '50' }]}
        >
          <Ionicons name="refresh-outline" size={15} color={theme.colors.danger} />
          <Text style={[sl.resetText, { color: theme.colors.danger }]}>Reset to Defaults</Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Toggle Item ────────────────────────────────────────────────────────────────
function ToggleItem({ icon, label, sub, value, onToggle, theme }: {
  icon: IoniconName; label: string; sub: string; value: boolean; onToggle: (v: boolean) => void; theme: any;
}) {
  return (
    <View style={sl.toggleRow}>
      <View style={[sl.toggleIcon, { backgroundColor: theme.colors.primary + '14' }]}>
        <Ionicons name={icon} size={15} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sl.toggleLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
        <Text style={[sl.toggleSub, { color: theme.colors.textTertiary }]}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.colors.surfaceElevated ?? theme.colors.surfaceMuted, true: theme.colors.primary + '70' }}
        thumbColor={value ? theme.colors.primary : theme.colors.textTertiary}
      />
    </View>
  );
}

const sl = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:     { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  scroll:    { padding: 16, gap: 0 },

  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 20, marginBottom: 8, paddingHorizontal: 4 },

  card:    { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 2 },
  cardSub: { fontSize: 12, lineHeight: 18, marginBottom: 14 },
  divider: { height: 0.5, marginVertical: 2 },

  // Preview strip
  preview:       { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 4 },
  previewLabel:  { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  previewBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  previewBadge:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  previewDot:    { width: 10, height: 10, borderRadius: 5 },

  // Option buttons
  row2:  { flexDirection: 'row', gap: 10 },
  row3:  { flexDirection: 'row', gap: 8 },
  row4:  { flexDirection: 'row', gap: 6 },
  optBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 13, borderWidth: 1.5, gap: 5 },
  optEmoji: { fontSize: 20 },
  optLabel: { fontSize: 10, fontWeight: '700' },

  // Color grid
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  colorItem: { alignItems: 'center', width: '16%' },
  swatch:      { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  swatchActive:{ borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.4, shadowRadius:6, elevation:4 },
  swatchCheck: { color: '#fff', fontSize: 16, fontWeight: '900' },
  colorName:   { fontSize: 9, fontWeight: '600', textAlign: 'center' },

  // Toggle rows
  toggleRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  toggleIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleLabel:{ fontSize: 14, fontWeight: '600' },
  toggleSub:  { fontSize: 11, marginTop: 1 },

  // Reset
  resetBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, borderWidth: 1, borderRadius: 14, padding: 14 },
  resetText: { fontSize: 14, fontWeight: '600' },
});
