/**
 * LessonsListScreen — Guided Learning Path
 *
 * Redesigned to be less overwhelming for beginners:
 *  • "Continue" hero card always shows your next lesson
 *  • Lessons are grouped into themed Learning Tracks (3-4 per track)
 *  • Daily streak + XP motivation bar at top
 *  • Completed lessons shown as compact checkmarks, not a wall of text
 *  • Tier 2 preview teases what's coming without overwhelming
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../services/userStore';
import { useSkillTreeStore } from '../services/skillTreeStore';
import { useStreakStore } from '../services/streakStore';
import { useSubscriptionStore } from '../services/subscriptionStore';
import { tier1Lessons } from '../data/curriculum';
import { tier2Lessons } from '../data/tier2curriculum';
import { tier3Lessons } from '../data/tier3curriculum';
import { Lesson } from '../types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
interface Props { onLessonPress: (lessonId: string) => void; onSkillTreePress?: () => void; onSubscribePress?: () => void; }

// ── Learning Tracks ───────────────────────────────────────────────────────────
// Grouped lesson collections — makes the path feel achievable not overwhelming

interface Track {
  id:      string;
  title:   string;
  tagline: string;
  icon:    IoniconName;
  color:   string;
  ids:     string[];   // lesson IDs in this track
  tier:    1 | 2 | 3;
}

const TRACKS: Track[] = [
  // ── Tier 1 ────────────────────────────────────────────────────────────────
  {
    id: 't1_basics', title: 'Investing Foundations', tagline: 'What is a stock? How does the market work?',
    icon: 'school-outline', color: '#6C47FF', tier: 1,
    ids: ['T1L01', 'T1L02', 'T1L03'],
  },
  {
    id: 't1_reading', title: 'Risk & Your Goals', tagline: 'Understanding risk, your first investment decision, and blue chips',
    icon: 'bar-chart-outline', color: '#34D399', tier: 1,
    ids: ['T1L04', 'T1L05', 'T1L06'],
  },
  {
    id: 't1_risk', title: 'Income & Market Cycles', tagline: 'Dividends, economic cycles, your first paper trade',
    icon: 'shield-checkmark-outline', color: '#F5A623', tier: 1,
    ids: ['T1L07', 'T1L08', 'T1L09'],
  },
  {
    id: 't1_portfolio', title: 'Building Your Portfolio', tagline: 'Rebalancing, news literacy, long-term mindset',
    icon: 'pie-chart-outline', color: '#F87171', tier: 1,
    ids: ['T1L10', 'T1L11', 'T1L12'],
  },
  // ── Tier 2 ────────────────────────────────────────────────────────────────
  {
    id: 't2_bonds', title: 'Bonds & Fixed Income', tagline: 'Bonds, dividends, REITs, ETF construction',
    icon: 'trending-up-outline', color: '#6C47FF', tier: 2,
    ids: ['T2L01', 'T2L02', 'T2L03', 'T2L04'],
  },
  {
    id: 't2_value', title: 'Value Investing', tagline: 'Moats, DCF, margin of safety',
    icon: 'search-outline', color: '#34D399', tier: 2,
    ids: ['T2L05', 'T2L10', 'T2L13'],
  },
  {
    id: 't2_growth', title: 'Growth & Momentum', tagline: 'SaaS metrics, technical analysis, momentum',
    icon: 'rocket-outline', color: '#F5A623', tier: 2,
    ids: ['T2L06', 'T2L07', 'T2L16', 'T2L21'],
  },
  {
    id: 't2_macro', title: 'Macro & Fed', tagline: 'Interest rates, inflation, sector rotation',
    icon: 'globe-outline', color: '#F87171', tier: 2,
    ids: ['T2L08', 'T2L09', 'T2L12'],
  },
  {
    id: 't2_advanced', title: 'Advanced Portfolio', tagline: 'Position sizing, psychology, tax efficiency',
    icon: 'analytics-outline', color: '#A78BFA', tier: 2,
    ids: ['T2L14', 'T2L15', 'T2L17', 'T2L18', 'T2L19', 'T2L20'],
  },
  // ── Tier 3 — Mastery ──────────────────────────────────────────────────────
  {
    id: 't3_options', title: 'Options Mastery', tagline: 'Calls, puts, income strategies, hedging',
    icon: 'swap-horizontal-outline', color: '#6C47FF', tier: 3,
    ids: ['T3L01', 'T3L02', 'T3L03'],
  },
  {
    id: 't3_advanced_trading', title: 'Shorts & Leverage', tagline: 'Short selling, margin, leveraged ETFs',
    icon: 'flash-outline', color: '#F87171', tier: 3,
    ids: ['T3L04', 'T3L05'],
  },
  {
    id: 't3_macro_alts', title: 'Macro & Alternatives', tagline: 'Rates, currencies, gold, commodities, crypto',
    icon: 'earth-outline', color: '#F5A623', tier: 3,
    ids: ['T3L06', 'T3L07'],
  },
  {
    id: 't3_mastery', title: 'The Complete Investor', tagline: 'Factor investing, DCF mastery, your permanent system',
    icon: 'trophy-outline', color: '#34D399', tier: 3,
    ids: ['T3L08', 'T3L09', 'T3L10'],
  },
];

// All lessons in one map for quick lookup
const ALL_LESSONS = [...tier1Lessons, ...tier2Lessons, ...tier3Lessons];
const LESSON_MAP = Object.fromEntries(ALL_LESSONS.map(l => [l.id, l]));

// ── Slide-in animation wrapper ─────────────────────────────────────────────────
function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(a, { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, tension: 140, friction: 20, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: a, transform: [{ translateY: y }] }}>{children}</Animated.View>;
}

// ── Progress ring (SVG-free simple arc using border trick) ───────────────────
function ProgressRing({ pct, size = 56, color, children }: { pct: number; size?: number; color: string; children?: React.ReactNode }) {
  const deg = Math.round(pct * 360);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Rough "ring" using nested Views — no SVG dependency */}
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 4, borderColor: color + '30',
        alignItems: 'center', justifyContent: 'center',
        position: 'absolute',
      }} />
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 4,
        borderTopColor: pct > 0 ? color : 'transparent',
        borderRightColor: pct > 0.25 ? color : 'transparent',
        borderBottomColor: pct > 0.5 ? color : 'transparent',
        borderLeftColor: pct > 0.75 ? color : 'transparent',
        position: 'absolute',
      }} />
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export function LessonsListScreen({ onLessonPress, onSkillTreePress, onSubscribePress }: Props) {
  const { theme }  = useTheme();
  const user       = useUserStore(s => s.user);
  const { xp, level, completedNodes } = useSkillTreeStore();
  const streak     = useStreakStore(s => s.currentStreak);
  const canUseFeature = useSubscriptionStore(s => s.canUseFeature);
  const completed  = user?.lessonsCompleted ?? [];

  const tier1Done  = completed.filter(id => id.startsWith('T1')).length;
  const tier2Done  = completed.filter(id => id.startsWith('T2')).length;
  const tier3Done  = completed.filter(id => id.startsWith('T3')).length;
  const totalDone  = completed.length;
  const totalAll   = ALL_LESSONS.length;
  const overallPct = totalDone / totalAll;

  // Tier 1 is free for everyone. Tier 2/3 (active investing & mastery)
  // require a Premium subscription — admin bypass is automatic via
  // canUseFeature('advancedLessons').
  const tier2Unlocked = canUseFeature('advancedLessons');
  const tier3Unlocked = canUseFeature('advancedLessons');

  // Next lesson to do
  const nextLesson = tier1Lessons.find(l => !completed.includes(l.id))
    ?? (tier2Unlocked ? tier2Lessons.find(l => !completed.includes(l.id)) : null)
    ?? (tier3Unlocked ? tier3Lessons.find(l => !completed.includes(l.id)) : null);

  // Expand/collapse tracks
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <FadeUp delay={0}>
          <View style={s.header}>
            <View>
              <Text style={[s.title, { color: theme.colors.textPrimary }]}>Learn</Text>
              <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
                Your personalised investing path
              </Text>
            </View>
            {/* Level badge */}
            <LinearGradient colors={['#6C47FF', '#5934E0']} style={s.lvlBadge}>
              <Text style={s.lvlNum}>{level}</Text>
              <Text style={s.lvlLbl}>LVL</Text>
            </LinearGradient>
          </View>
        </FadeUp>

        {/* ── Stats strip ── */}
        <FadeUp delay={60}>
          <View style={s.statsStrip}>
            <StatPill icon="flame-outline"   value={`${streak}`}   label="day streak" color="#F97316" theme={theme} />
            <StatPill icon="star-outline"    value={xp.toLocaleString()} label="XP earned"  color="#F5A623" theme={theme} />
            <StatPill icon="book-outline"    value={`${totalDone}/${totalAll}`} label="lessons" color={theme.colors.primary} theme={theme} />
          </View>
        </FadeUp>

        {/* ── Overall progress bar ── */}
        <FadeUp delay={100}>
          <View style={[s.progressCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <LinearGradient
              colors={[theme.colors.primary + '12', 'transparent']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Text style={[s.progressLabel, { color: theme.colors.primary }]}>OVERALL PROGRESS</Text>
                <Text style={[s.progressTitle, { color: theme.colors.textPrimary }]}>
                  {totalDone === 0 ? "Let's begin your journey" : `${totalDone} lesson${totalDone > 1 ? 's' : ''} mastered`}
                </Text>
              </View>
              <Text style={[s.pctNum, { color: theme.colors.primary }]}>{Math.round(overallPct * 100)}%</Text>
            </View>
            <ProgressBarAnim pct={overallPct} color={theme.colors.primary} track={theme.colors.border} />
          </View>
        </FadeUp>

        {/* ── Skill Tree quick link ── */}
        {onSkillTreePress && (
          <FadeUp delay={130}>
            <TouchableOpacity onPress={onSkillTreePress} activeOpacity={0.85} style={[s.skillTreeBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <LinearGradient colors={['#6C47FF18', 'transparent']} style={StyleSheet.absoluteFillObject} />
              <View style={[s.skillTreeIcon, { backgroundColor: '#6C47FF20' }]}>
                <Ionicons name="git-network-outline" size={20} color="#6C47FF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.skillTreeTitle, { color: theme.colors.textPrimary }]}>Skill Tree</Text>
                <Text style={[s.skillTreeSub, { color: theme.colors.textSecondary }]}>{completedNodes.length} nodes unlocked · Lvl {level}</Text>
              </View>
              <View style={[s.skillTreeBadge, { backgroundColor: '#6C47FF20' }]}>
                <Text style={s.skillTreeBadgeText}>Lvl {level}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </FadeUp>
        )}

        {/* ── "Continue Learning" hero card ── */}
        {nextLesson && (
          <FadeUp delay={140}>
            <Text style={[s.sectionTitle, { color: theme.colors.textTertiary }]}>UP NEXT</Text>
            <TouchableOpacity onPress={() => onLessonPress(nextLesson.id)} activeOpacity={0.85}>
              <LinearGradient
                colors={[theme.colors.primary + '28', theme.colors.primary + '08']}
                style={[s.continueCard, { borderColor: theme.colors.primary + '40' }]}
              >
                <View style={[s.continueBadge, { backgroundColor: theme.colors.primary + '22' }]}>
                  <Ionicons name="play-circle" size={14} color={theme.colors.primary} />
                  <Text style={[s.continueBadgeText, { color: theme.colors.primary }]}>CONTINUE LEARNING</Text>
                </View>
                <Text style={[s.continueTitle, { color: theme.colors.textPrimary }]}>{nextLesson.title}</Text>
                <Text style={[s.continueSub, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {nextLesson.subtitle}
                </Text>
                <View style={s.continueFooter}>
                  <View style={[s.chip, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name="time-outline" size={11} color={theme.colors.textTertiary} />
                    <Text style={[s.chipText, { color: theme.colors.textTertiary }]}>{nextLesson.estimatedMinutes} min</Text>
                  </View>
                  {nextLesson.topics.slice(0, 2).map(t => (
                    <View key={t} style={[s.chip, { backgroundColor: theme.colors.primary + '18' }]}>
                      <Text style={[s.chipText, { color: theme.colors.primary }]}>{t}</Text>
                    </View>
                  ))}
                  <View style={{ flex: 1 }} />
                  <View style={[s.continueBtn, { backgroundColor: theme.colors.primary }]}>
                    <Text style={s.continueBtnText}>Start →</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </FadeUp>
        )}

        {/* ── Tier 1 Tracks ── */}
        <FadeUp delay={180}>
          <View style={s.trackTierHeader}>
            <View style={[s.tierPill, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary + '35' }]}>
              <Text style={[s.tierPillText, { color: theme.colors.primary }]}>TIER 1 · FOUNDATIONS</Text>
            </View>
            <Text style={[s.trackTierSub, { color: theme.colors.textTertiary }]}>
              {tier1Done}/{tier1Lessons.length} complete
            </Text>
          </View>
        </FadeUp>

        {TRACKS.filter(t => t.tier === 1).map((track, i) => (
          <FadeUp key={track.id} delay={200 + i * 50}>
            <TrackCard
              track={track}
              completed={completed}
              expanded={expandedTrack === track.id}
              onToggle={() => setExpandedTrack(expandedTrack === track.id ? null : track.id)}
              onLessonPress={onLessonPress}
              theme={theme}
            />
          </FadeUp>
        ))}

        {/* ── Tier 2 Tracks ── */}
        <FadeUp delay={420}>
          <View style={[s.trackTierHeader, { marginTop: 8 }]}>
            <View style={[s.tierPill, { backgroundColor: tier2Unlocked ? theme.colors.gold + '18' : theme.colors.surfaceMuted, borderColor: tier2Unlocked ? theme.colors.gold + '35' : theme.colors.border }]}>
              <Text style={[s.tierPillText, { color: tier2Unlocked ? theme.colors.gold : theme.colors.textTertiary }]}>
                TIER 2 · ACTIVE INVESTING
              </Text>
            </View>
            <Text style={[s.trackTierSub, { color: theme.colors.textTertiary }]}>
              {tier2Done}/{tier2Lessons.length} complete
            </Text>
          </View>
        </FadeUp>

        {TRACKS.filter(t => t.tier === 2).map((track, i) => (
          <FadeUp key={track.id} delay={440 + i * 40}>
            <TrackCard
              track={track}
              completed={completed}
              expanded={expandedTrack === track.id}
              onToggle={() => setExpandedTrack(expandedTrack === track.id ? null : track.id)}
              onLessonPress={tier2Unlocked ? onLessonPress : () => onSubscribePress?.()}
              theme={theme}
              locked={!tier2Unlocked}
            />
          </FadeUp>
        ))}

        {/* ── Tier 3 Tracks ── */}
        <FadeUp delay={600}>
          <View style={[s.trackTierHeader, { marginTop: 8 }]}>
            <View style={[s.tierPill, { backgroundColor: tier3Unlocked ? '#A78BFA18' : theme.colors.surfaceMuted, borderColor: tier3Unlocked ? '#A78BFA35' : theme.colors.border }]}>
              <Text style={[s.tierPillText, { color: tier3Unlocked ? '#A78BFA' : theme.colors.textTertiary }]}>
                TIER 3 · MASTERY
              </Text>
            </View>
            <Text style={[s.trackTierSub, { color: theme.colors.textTertiary }]}>
              {tier3Done}/{tier3Lessons.length} complete
            </Text>
          </View>
        </FadeUp>

        {TRACKS.filter(t => t.tier === 3).map((track, i) => (
          <FadeUp key={track.id} delay={620 + i * 40}>
            <TrackCard
              track={track}
              completed={completed}
              expanded={expandedTrack === track.id}
              onToggle={() => setExpandedTrack(expandedTrack === track.id ? null : track.id)}
              onLessonPress={tier3Unlocked ? onLessonPress : () => onSubscribePress?.()}
              theme={theme}
              locked={!tier3Unlocked}
            />
          </FadeUp>
        ))}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Track Card ─────────────────────────────────────────────────────────────────

function TrackCard({ track, completed, expanded, onToggle, onLessonPress, theme, locked = false }: {
  track: Track; completed: string[]; expanded: boolean;
  onToggle: () => void; onLessonPress: (id: string) => void;
  theme: any; locked?: boolean;
}) {
  const lessons     = track.ids.map(id => LESSON_MAP[id]).filter(Boolean);
  const doneLessons = lessons.filter(l => completed.includes(l.id));
  const allDone     = doneLessons.length === lessons.length;
  const pct         = lessons.length ? doneLessons.length / lessons.length : 0;
  const nextInTrack = lessons.find(l => !completed.includes(l.id));

  // Animated expand
  const expandAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0, duration: 240,
      easing: Easing.out(Easing.quad), useNativeDriver: false,
    }).start();
  }, [expanded]);

  return (
    <View style={[s.trackCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, allDone && { borderColor: track.color + '40' }]}>
      {/* Track header row — locked tracks route straight to the upsell
          (onLessonPress is swapped for onSubscribePress by the caller when
          locked, so this call ignores its unused arg) instead of expanding */}
      <TouchableOpacity onPress={locked ? () => onLessonPress('') : onToggle} activeOpacity={0.75} style={s.trackHeader}>
        {/* Icon */}
        <View style={[s.trackIcon, { backgroundColor: track.color + '18' }]}>
          <Ionicons name={locked ? 'lock-closed' : track.icon} size={18} color={locked ? theme.colors.textTertiary : track.color} />
        </View>

        {/* Info */}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[s.trackTitle, { color: locked ? theme.colors.textTertiary : theme.colors.textPrimary }]}>
            {track.title}
          </Text>
          <Text style={[s.trackTagline, { color: theme.colors.textTertiary }]} numberOfLines={1}>
            {track.tagline}
          </Text>
          {/* Mini progress bar */}
          {!locked && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: theme.colors.border, overflow: 'hidden' }}>
                <View style={{ height: 3, borderRadius: 2, backgroundColor: track.color, width: `${Math.round(pct * 100)}%` }} />
              </View>
              <Text style={[s.trackProgress, { color: theme.colors.textTertiary }]}>
                {doneLessons.length}/{lessons.length}
              </Text>
            </View>
          )}
        </View>

        {/* Expand chevron / done check */}
        {allDone
          ? <Ionicons name="checkmark-circle" size={20} color={track.color} />
          : <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textTertiary} />
        }
      </TouchableOpacity>

      {/* Expanded lesson list */}
      {expanded && !locked && (
        <View style={[s.trackLessons, { borderTopColor: theme.colors.border }]}>
          {lessons.map((lesson, i) => {
            const isDone = completed.includes(lesson.id);
            const isNext = !isDone && lesson.id === nextInTrack?.id;
            return (
              <TouchableOpacity
                key={lesson.id}
                onPress={() => onLessonPress(lesson.id)}
                activeOpacity={0.75}
                style={[
                  s.lessonItem,
                  { borderBottomColor: theme.colors.border },
                  isNext && { backgroundColor: track.color + '08' },
                ]}
              >
                {/* Status dot */}
                <View style={[s.lessonDot, {
                  backgroundColor: isDone ? track.color : isNext ? track.color + '30' : theme.colors.border,
                  borderColor: isDone ? track.color : isNext ? track.color : theme.colors.border,
                  borderWidth: isDone ? 0 : 2,
                }]}>
                  {isDone && <Ionicons name="checkmark" size={11} color="#07070D" />}
                  {!isDone && <Text style={[s.dotNum, { color: isNext ? track.color : theme.colors.textTertiary }]}>{i + 1}</Text>}
                </View>

                {/* Title + meta */}
                <View style={{ flex: 1 }}>
                  <Text style={[s.lessonItemTitle, { color: isDone ? theme.colors.textTertiary : theme.colors.textPrimary }]}>
                    {lesson.title}
                  </Text>
                  <Text style={[s.lessonItemMeta, { color: theme.colors.textTertiary }]}>
                    {lesson.estimatedMinutes} min
                  </Text>
                </View>

                {/* Arrow or done */}
                {isDone
                  ? <Ionicons name="checkmark-circle-outline" size={16} color={track.color} />
                  : isNext
                    ? <View style={[s.startPill, { backgroundColor: track.color }]}>
                        <Text style={s.startPillText}>Start</Text>
                      </View>
                    : <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} />
                }
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ icon, value, label, color, theme }: { icon: IoniconName; value: string; label: string; color: string; theme: any }) {
  return (
    <View style={[s.statPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[s.statVal, { color: theme.colors.textPrimary }]}>{value}</Text>
      <Text style={[s.statLbl, { color: theme.colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

// ── Animated progress bar ─────────────────────────────────────────────────────
function ProgressBarAnim({ pct, color, track }: { pct: number; color: string; track: string }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct * 100, duration: 900, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct]);
  const width = w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: color, width }} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { paddingBottom: 40 },

  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title:     { fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  subtitle:  { fontSize: 13, marginTop: 2 },
  lvlBadge:  { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', shadowColor: '#6C47FF', shadowRadius: 8, shadowOpacity: 0.5, shadowOffset: { width:0, height:0 }, elevation: 6 },
  lvlNum:    { fontSize: 16, fontWeight: '900', color: '#FFF', lineHeight: 18 },
  lvlLbl:    { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },

  // Stats strip
  statsStrip: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  statPill:   { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1, gap: 2 },
  statVal:    { fontSize: 14, fontWeight: '800' },
  statLbl:    { fontSize: 9, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },

  // Progress card
  progressCard:  { marginHorizontal: 16, borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 24, overflow: 'hidden' },
  progressLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginBottom: 3 },
  progressTitle: { fontSize: 16, fontWeight: '700' },
  pctNum:        { fontSize: 26, fontWeight: '800', letterSpacing: -1 },

  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, paddingHorizontal: 20, marginBottom: 10 },

  // Continue card
  continueCard:   { marginHorizontal: 16, borderRadius: 22, borderWidth: 1.5, padding: 20, marginBottom: 24, overflow: 'hidden' },
  continueBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  continueBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  continueTitle:  { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 6, lineHeight: 26 },
  continueSub:    { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  continueFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  chipText:       { fontSize: 10, fontWeight: '700' },
  continueBtn:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  continueBtnText:{ fontSize: 13, fontWeight: '800', color: '#07070D' },

  // Track tier header
  trackTierHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
  tierPill:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  tierPillText:    { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  trackTierSub:    { fontSize: 11, fontWeight: '600' },

  // Track card
  trackCard:    { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  trackHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  trackIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trackTitle:   { fontSize: 14, fontWeight: '700' },
  trackTagline: { fontSize: 11, fontWeight: '500' },
  trackProgress:{ fontSize: 10, fontWeight: '700' },

  // Expanded lessons
  trackLessons: { borderTopWidth: 0.5, paddingTop: 4 },
  lessonItem:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5 },
  lessonDot:    { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dotNum:       { fontSize: 9, fontWeight: '800' },
  lessonItemTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  lessonItemMeta:  { fontSize: 10, fontWeight: '500', marginTop: 2 },
  startPill:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  startPillText:{ fontSize: 11, fontWeight: '800', color: '#07070D' },

  // Tier 3 callout
  t3Card:  { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, padding: 20, alignItems: 'center', marginTop: 8 },
  t3Title: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  t3Sub:   { fontSize: 13, lineHeight: 20, textAlign: 'center' },

  // Skill tree quick link
  skillTreeBtn:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, borderWidth: 1, padding: 14, overflow: 'hidden' },
  skillTreeIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  skillTreeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  skillTreeSub:   { fontSize: 11 },
  skillTreeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  skillTreeBadgeText: { fontSize: 11, fontWeight: '800', color: '#6C47FF' },
});
