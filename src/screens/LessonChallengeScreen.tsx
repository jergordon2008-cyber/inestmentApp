/**
 * LessonChallengeScreen — Learn → Practice → Apply
 *
 * Surfaces immediately after a lesson is completed. Shows a real paper-trading
 * challenge that directly applies the concept just learned. The user can:
 *   - Accept the challenge (opens stock browser pre-filtered)
 *   - Skip (goes straight to home)
 *
 * This is the single biggest differentiator vs. every competitor:
 * lessons connect directly to real action.
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, Animated, Easing, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { LessonChallenge } from '../data/lessonChallenges';
import { useSkillTreeStore } from '../services/skillTreeStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  challenge:     LessonChallenge;
  lessonTitle:   string;
  onAccept:      (symbols: string[]) => void;  // open stock browser
  onSkip:        () => void;
  onStockPress?: (symbol: string) => void;     // tap a suggested symbol directly
}

const ACTION_CONFIG: Record<string, { icon: IoniconName; label: string; color: string }> = {
  buy:       { icon: 'trending-up',        label: 'Buy Challenge',   color: '#34D399' },
  sell:      { icon: 'trending-down',      label: 'Sell Challenge',  color: '#F87171' },
  browse:    { icon: 'search',             label: 'Explore Stocks',  color: '#6C47FF' },
  watchlist: { icon: 'bookmark-outline',   label: 'Watchlist Task',  color: '#F5A623' },
};

export function LessonChallengeScreen({ challenge, lessonTitle, onAccept, onSkip, onStockPress }: Props) {
  const { theme } = useTheme();
  const { addXP } = useSkillTreeStore();

  // Entry animations
  const fadeY  = useRef(new Animated.Value(40)).current;
  const fadeA  = useRef(new Animated.Value(0)).current;
  const cardS  = useRef(new Animated.Value(0.92)).current;
  const pulseA = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeA, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(fadeY, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
      Animated.spring(cardS, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();

    // Pulse the accept button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseA, { toValue: 1.04, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseA, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const cfg = ACTION_CONFIG[challenge.action] ?? ACTION_CONFIG.browse;

  const handleAccept = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addXP(challenge.xpBonus);
    onAccept(challenge.suggestedSymbols);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#07070D' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top badge ── */}
          <Animated.View style={[s.topRow, { opacity: fadeA, transform: [{ translateY: fadeY }] }]}>
            <View style={[s.completedBadge, { backgroundColor: theme.colors.successGlow }]}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
              <Text style={[s.completedText, { color: theme.colors.success }]}>LESSON COMPLETE</Text>
            </View>
            <Text style={[s.lessonName, { color: theme.colors.textTertiary }]} numberOfLines={1}>
              {lessonTitle}
            </Text>
          </Animated.View>

          {/* ── Main challenge card ── */}
          <Animated.View style={{ opacity: fadeA, transform: [{ translateY: fadeY }, { scale: cardS }] }}>
            <LinearGradient
              colors={[cfg.color + '18', cfg.color + '06', 'transparent']}
              style={[s.challengeCard, { borderColor: cfg.color + '35' }]}
            >
              {/* XP bonus badge */}
              <View style={[s.xpBadge, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '40' }]}>
                <Ionicons name="star" size={11} color={cfg.color} />
                <Text style={[s.xpBadgeText, { color: cfg.color }]}>+{challenge.xpBonus} XP BONUS</Text>
              </View>

              {/* Action icon */}
              <View style={[s.iconRing, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '40' }]}>
                <Ionicons name={cfg.icon} size={32} color={cfg.color} />
              </View>

              <Text style={[s.challengeTitle, { color: theme.colors.textPrimary }]}>
                {challenge.title}
              </Text>

              <Text style={[s.challengeInstruction, { color: theme.colors.textSecondary }]}>
                {challenge.instruction}
              </Text>

              {/* Criteria pill */}
              <View style={[s.criteriaPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="filter-outline" size={13} color={cfg.color} />
                <Text style={[s.criteriaText, { color: theme.colors.textSecondary }]}>
                  {challenge.criteria}
                </Text>
              </View>

              {/* Hint */}
              <View style={[s.hintBox, { backgroundColor: theme.colors.primaryGlow, borderColor: theme.colors.primary + '25' }]}>
                <Ionicons name="bulb-outline" size={15} color={theme.colors.primary} />
                <Text style={[s.hintText, { color: theme.colors.textSecondary }]}>
                  {challenge.hint}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Suggested stocks ── */}
          {challenge.suggestedSymbols.length > 0 && (
            <Animated.View style={[s.suggestedSection, { opacity: fadeA }]}>
              <View style={s.suggestedHeader}>
                <Text style={[s.suggestedLabel, { color: theme.colors.textTertiary }]}>SUGGESTED STOCKS</Text>
                {onStockPress && (
                  <Text style={[s.suggestedHint, { color: theme.colors.textTertiary }]}>Tap to open →</Text>
                )}
              </View>
              <View style={s.symbolRow}>
                {challenge.suggestedSymbols.map(sym => (
                  onStockPress ? (
                    <TouchableOpacity
                      key={sym}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onStockPress(sym); }}
                      activeOpacity={0.7}
                      style={[s.symbolChip, s.symbolChipTappable, { backgroundColor: theme.colors.surface, borderColor: cfg.color + '60' }]}
                    >
                      <Text style={[s.symbolText, { color: cfg.color }]}>{sym}</Text>
                      <Ionicons name="chevron-forward" size={11} color={cfg.color + 'BB'} />
                    </TouchableOpacity>
                  ) : (
                    <View key={sym} style={[s.symbolChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <Text style={[s.symbolText, { color: theme.colors.textPrimary }]}>{sym}</Text>
                    </View>
                  )
                ))}
              </View>
            </Animated.View>
          )}

          {/* ── CTA buttons ── */}
          <Animated.View style={[s.buttons, { opacity: fadeA }]}>
            <Animated.View style={{ transform: [{ scale: pulseA }], alignSelf: 'stretch' }}>
              <TouchableOpacity
                onPress={handleAccept}
                activeOpacity={0.85}
                style={[s.acceptBtn, { backgroundColor: cfg.color, shadowColor: cfg.color }]}
              >
                <Ionicons name={cfg.icon} size={18} color="#07070D" />
                <Text style={s.acceptBtnText}>{cfg.label} →</Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity onPress={onSkip} activeOpacity={0.6} style={s.skipBtn}>
              <Text style={[s.skipText, { color: theme.colors.textTertiary }]}>
                Skip challenge for now
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:     { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  // Top
  topRow:         { alignItems: 'center', marginBottom: 28 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  completedText:  { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  lessonName:     { fontSize: 13, fontWeight: '500', textAlign: 'center' },

  // Challenge card
  challengeCard: {
    borderRadius: 24, borderWidth: 1.5,
    padding: 24, marginBottom: 20,
    alignItems: 'center',
  },
  xpBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  xpBadgeText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  iconRing:     { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginBottom: 18 },
  challengeTitle:       { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: '#F1F5F9', textAlign: 'center', marginBottom: 12, lineHeight: 28 },
  challengeInstruction: { fontSize: 15, lineHeight: 23, textAlign: 'center', marginBottom: 18 },
  criteriaPill: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, marginBottom: 14, width: '100%' },
  criteriaText: { fontSize: 13, lineHeight: 18, flex: 1 },
  hintBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, width: '100%' },
  hintText:     { fontSize: 13, lineHeight: 20, flex: 1 },

  // Suggested symbols
  suggestedSection:  { marginBottom: 28 },
  suggestedHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  suggestedLabel:    { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  suggestedHint:     { fontSize: 10, fontWeight: '500' },
  symbolRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symbolChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  symbolChipTappable:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  symbolText:        { fontSize: 13, fontWeight: '700' },

  // Buttons
  buttons:       { gap: 12, alignItems: 'center' },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 18,
    width: '100%',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 18, elevation: 10,
  },
  acceptBtnText: { fontSize: 16, fontWeight: '800', color: '#07070D', letterSpacing: 0.2 },
  skipBtn:       { paddingVertical: 12 },
  skipText:      { fontSize: 13, fontWeight: '500' },
});
