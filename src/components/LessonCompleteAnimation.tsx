/**
 * LessonCompleteAnimation
 *
 * Full-screen celebration that fires when a lesson is passed.
 * Built entirely with React Native's Animated API — no third-party libs.
 *
 * Sequence:
 *   1. Dark overlay fades in
 *   2. Card slides up + fades in
 *   3. Checkmark scales in with a spring bounce
 *   4. XP counter counts up from 0
 *   5. Particles burst outward from center
 *   6. Stats stagger in one by one
 *   7. Continue button fades in
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Modal,
  TouchableOpacity, Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Particle ────────────────────────────────────────────────────────────────
interface ParticleConfig {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  shape: 'circle' | 'square' | 'diamond';
}

function createParticles(count: number, colors: string[]): ParticleConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
    color: colors[i % colors.length],
    size: 6 + Math.random() * 8,
    shape: (['circle', 'square', 'diamond'] as const)[i % 3],
  }));
}

function Particle({ p }: { p: ParticleConfig }) {
  const borderRadius = p.shape === 'circle' ? p.size / 2 : p.shape === 'square' ? 2 : 0;
  const rotate = p.shape === 'diamond' ? '45deg' : '0deg';
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: p.size, height: p.size, backgroundColor: p.color,
          borderRadius, transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }, { rotate }] },
        { opacity: p.opacity },
      ]}
    />
  );
}

// ── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, color, prefix = '+', suffix = ' XP' }: {
  target: number; color: string; prefix?: string; suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = 600;
    setTimeout(() => {
      Animated.timing(anim, {
        toValue: target, duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, delay);
    const listener = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    return () => anim.removeListener(listener);
  }, [target]);

  return (
    <Text style={{ fontSize: 32, fontWeight: '900', color, letterSpacing: -0.5 }}>
      {prefix}{display.toLocaleString()}{suffix}
    </Text>
  );
}

// ── Checkmark ─────────────────────────────────────────────────────────────────
function AnimatedCheck({ color }: { color: string }) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, tension: 180, friction: 10, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 200);
  }, []);

  return (
    <Animated.View style={[
      cs.checkCircle,
      { backgroundColor: color + '20', borderColor: color, transform: [{ scale }], opacity },
    ]}>
      <Text style={{ fontSize: 44 }}>✓</Text>
    </Animated.View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  lessonTitle: string;
  xpEarned: number;
  streakDays?: number;
  isFirstLesson?: boolean;
  onContinue: () => void;
}

export function LessonCompleteAnimation({
  visible, lessonTitle, xpEarned, streakDays = 1, isFirstLesson = false, onContinue,
}: Props) {
  const { theme } = useTheme();
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardY          = useRef(new Animated.Value(80)).current;
  const cardOpacity    = useRef(new Animated.Value(0)).current;
  const continueFade   = useRef(new Animated.Value(0)).current;
  const titleScale     = useRef(new Animated.Value(0.8)).current;
  const [statsVisible, setStatsVisible] = useState(false);

  const PARTICLE_COLORS = [
    theme.colors.primary, theme.colors.gold,
    '#60A5FA', '#A78BFA', '#F472B6',
    theme.colors.primary + 'CC', theme.colors.gold + 'CC',
  ];
  const particles = useRef(createParticles(28, PARTICLE_COLORS)).current;

  const fireParticles = () => {
    particles.forEach((p, i) => {
      const angle  = (i / particles.length) * Math.PI * 2;
      const radius = 80 + Math.random() * 130;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius - 60;
      const duration = 700 + Math.random() * 500;
      const delay    = Math.random() * 180;

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(p.opacity, { toValue: 1,  duration: 80,      useNativeDriver: true }),
          Animated.spring(p.scale,   { toValue: 1,  tension: 200, friction: 12, useNativeDriver: true }),
          Animated.timing(p.x,       { toValue: dx, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.y,       { toValue: dy, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  useEffect(() => {
    if (!visible) return;

    // Reset all values
    overlayOpacity.setValue(0); cardY.setValue(80); cardOpacity.setValue(0);
    continueFade.setValue(0); titleScale.setValue(0.8);
    particles.forEach(p => { p.x.setValue(0); p.y.setValue(0); p.opacity.setValue(0); p.scale.setValue(0); });
    setStatsVisible(false);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Phase 1: overlay + card slide in
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(cardY,      { toValue: 0, tension: 200, friction: 18, useNativeDriver: true }),
      Animated.timing(cardOpacity,{ toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(titleScale, { toValue: 1, tension: 200, friction: 14, useNativeDriver: true }),
    ]).start();

    // Phase 2: particles burst
    setTimeout(() => {
      fireParticles();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 250);

    // Phase 3: stats + continue
    setTimeout(() => setStatsVisible(true), 700);
    setTimeout(() => {
      Animated.timing(continueFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 1100);
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onContinue}>
      <Animated.View style={[cs.overlay, { backgroundColor: theme.colors.overlay, opacity: overlayOpacity }]}>

        {/* Particle origin */}
        <View style={cs.particleOrigin} pointerEvents="none">
          {particles.map(p => <Particle key={p.id} p={p} />)}
        </View>

        {/* Card */}
        <Animated.View style={[
          cs.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong,
            transform: [{ translateY: cardY }], opacity: cardOpacity },
        ]}>

          {/* Checkmark */}
          <AnimatedCheck color={theme.colors.primary} />

          {/* Title */}
          <Animated.View style={{ transform: [{ scale: titleScale }], alignItems: 'center', marginTop: 16 }}>
            <Text style={[cs.topLabel, { color: theme.colors.textTertiary }]}>LESSON COMPLETE</Text>
            <Text style={[cs.lessonTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {lessonTitle}
            </Text>
          </Animated.View>

          {/* XP Counter */}
          <View style={[cs.xpRow, { backgroundColor: theme.colors.primaryGlow, borderColor: theme.colors.primary + '30' }]}>
            <AnimatedCounter target={xpEarned} color={theme.colors.primary} />
            <Text style={[cs.xpSub, { color: theme.colors.textTertiary }]}>Knowledge banked</Text>
          </View>

          {/* Stats */}
          {statsVisible && (
            <View style={cs.statsGrid}>
              {[
                { label: 'Streak',      value: `${streakDays} day${streakDays !== 1 ? 's' : ''}`, icon: 'flame' },
                { label: 'XP Earned',   value: `+${xpEarned}`,     icon: 'flash' },
                { label: isFirstLesson ? 'First Lesson' : 'Keep going', value: isFirstLesson ? 'Unlocked!' : '→ Next',  icon: isFirstLesson ? 'trophy' : 'book' },
              ].map((stat, i) => (
                <StatPill key={stat.label} stat={stat} delay={i * 100} theme={theme} />
              ))}
            </View>
          )}

          {/* Continue */}
          <Animated.View style={{ opacity: continueFade, width: '100%' }}>
            <TouchableOpacity onPress={onContinue}
              style={[cs.continueBtn, { backgroundColor: theme.colors.primary,
                shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.5, shadowRadius: 16, elevation: 6 }]}>
              <Text style={cs.continueBtnText}>Continue →</Text>
            </TouchableOpacity>
          </Animated.View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Stat Pill (stagger-in) ────────────────────────────────────────────────────
function StatPill({ stat, delay, theme }: { stat: { label: string; value: string; icon: string }; delay: number; theme: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setTimeout(() => {
      Animated.spring(anim, { toValue: 1, tension: 220, friction: 14, useNativeDriver: true }).start();
    }, delay);
  }, []);

  return (
    <Animated.View style={[
      cs.statPill,
      { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border,
        opacity: anim, transform: [{ scale: anim }] },
    ]}>
      <Ionicons name={stat.icon as any} size={18} color={theme.colors.primary} />
      <Text style={[cs.statValue, { color: theme.colors.textPrimary }]}>{stat.value}</Text>
      <Text style={[cs.statLabel, { color: theme.colors.textTertiary }]}>{stat.label}</Text>
    </Animated.View>
  );
}

const cs = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  particleOrigin: { position: 'absolute', top: '45%', left: '50%' },
  card: {
    width: '100%', maxWidth: 380, borderRadius: 28, borderWidth: 1,
    padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5, shadowRadius: 40, elevation: 20,
  },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  topLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  lessonTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 26, letterSpacing: -0.3 },
  xpRow: {
    marginTop: 18, borderRadius: 16, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 24,
    alignItems: 'center', width: '100%',
  },
  xpSub: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 6, width: '100%' },
  statPill: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 10, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 13, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '500' },
  continueBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 18, width: '100%' },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});
