/**
 * TourGuide — Interactive First-Run App Walkthrough
 *
 * A step-by-step overlay that:
 * - Positions tooltips at specific UI areas (top / mid / bottom)
 * - Draws an animated arrow pointing at the target area
 * - Requires the user to confirm they've found/tapped each feature
 * - Can be skipped at any step
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Easing, Dimensions, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TourStep {
  id: string;
  icon: IoniconName;
  iconColor: string;
  title: string;
  body: string;
  tip: string;
  ctaLabel: string;              // button text
  // Where to position the tooltip card: 'top' | 'center' | 'bottom'
  cardPosition: 'top' | 'center' | 'bottom';
  // Arrow pointing direction from card to the target
  arrowTarget?: {
    position: 'bottom' | 'top' | 'none';
    label: string;               // small label next to the arrow
  };
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    icon: 'rocket-outline',
    iconColor: '#6C47FF',
    title: 'Welcome to InvestIQ! 🎉',
    body: 'You\'ve just unlocked $100,000 in paper money to practice real investing with zero real-money risk. This 6-step tour shows you where everything lives.',
    tip: 'Paper trading = real decisions, real market prices, no real consequences. The fastest way to learn.',
    ctaLabel: 'Show me around →',
    cardPosition: 'center',
    arrowTarget: { position: 'none', label: '' },
  },
  {
    id: 'home',
    icon: 'home-outline',
    iconColor: '#34D399',
    title: 'Home — Your Dashboard',
    body: 'The Home tab (bottom left) shows your portfolio balance, a quick watchlist, and your next lesson — all at a glance.',
    tip: 'Tap the Home tab now, then come back and tap "Got it!" to continue.',
    ctaLabel: 'Got it! →',
    cardPosition: 'top',
    arrowTarget: { position: 'bottom', label: 'Tap Home ↓' },
  },
  {
    id: 'learn',
    icon: 'school-outline',
    iconColor: '#F5A623',
    title: 'Learn — Your Investing Path',
    body: 'The Learn tab (second from left) has structured lessons from total beginner to confident investor. Start with Tier 1\'s 12 lessons — built for you.',
    tip: 'After each lesson you get a real challenge to paper-trade what you just learned.',
    ctaLabel: 'Got it! →',
    cardPosition: 'top',
    arrowTarget: { position: 'bottom', label: 'Tap Learn ↓' },
  },
  {
    id: 'market',
    icon: 'trending-up-outline',
    iconColor: '#A78BFA',
    title: 'Market — Browse & Trade',
    body: 'The Market tab lets you search stocks, view real-time prices, and execute paper trades. Blue chip stocks are labelled 💎 — those are your Tier 1 picks.',
    tip: 'Try searching "AAPL" or filtering by dividend yield to find income stocks.',
    ctaLabel: 'Got it! →',
    cardPosition: 'top',
    arrowTarget: { position: 'bottom', label: 'Tap Market ↓' },
  },
  {
    id: 'discover',
    icon: 'compass-outline',
    iconColor: '#F87171',
    title: 'Discover — AI Tutor & Tools',
    body: 'The Discover tab has your AI Tutor, Playbooks, Market Pulse, Mind Check and more. When stuck on a concept, the AI Tutor explains it in plain English instantly.',
    tip: 'Ask the AI Tutor: "What is a P/E ratio?" — it adapts to your learning level.',
    ctaLabel: 'Got it! →',
    cardPosition: 'top',
    arrowTarget: { position: 'bottom', label: 'Tap Discover ↓' },
  },
  {
    id: 'start',
    icon: 'checkmark-circle-outline',
    iconColor: '#34D399',
    title: 'You\'re Ready to Invest!',
    body: 'Your first lesson is queued on the Home screen. Complete it, do the challenge, and your learning streak starts today.',
    tip: 'Consistent learners — even 10 minutes a day — outperform occasional ones by 3×. Your streak is your most important metric.',
    ctaLabel: 'Start Learning →',
    cardPosition: 'center',
    arrowTarget: { position: 'none', label: '' },
  },
];

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_MARGIN = 20;
const CARD_WIDTH  = SW - CARD_MARGIN * 2;

interface Props {
  visible: boolean;
  onComplete: () => void;
}

export function TourGuide({ visible, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const fadeA  = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(30)).current;
  const scaleA = useRef(new Animated.Value(0.94)).current;
  const arrowBounce = useRef(new Animated.Value(0)).current;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Entry anim when step changes
  useEffect(() => {
    if (!visible) return;
    fadeA.setValue(0);
    slideY.setValue(30);
    scaleA.setValue(0.94);
    Animated.parallel([
      Animated.timing(fadeA,  { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: 110, friction: 16, useNativeDriver: true }),
      Animated.spring(scaleA, { toValue: 1, tension: 110, friction: 14, useNativeDriver: true }),
    ]).start();
  }, [visible, step]);

  // Arrow bounce loop
  useEffect(() => {
    if (!visible || currentStep.arrowTarget?.position === 'none') return;
    arrowBounce.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowBounce, { toValue: 8, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(arrowBounce, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, step]);

  const animateNext = (cb: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(fadeA,  { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: -20, duration: 160, useNativeDriver: true }),
    ]).start(() => cb());
  };

  const handleNext = () => {
    if (isLast) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
      setStep(0);
    } else {
      animateNext(() => setStep(s => s + 1));
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
    setStep(0);
  };

  if (!visible) return null;

  // Card vertical position
  const cardTop = currentStep.cardPosition === 'top'
    ? 100
    : currentStep.cardPosition === 'bottom'
      ? SH - 420
      : SH / 2 - 220;

  const showArrowDown  = currentStep.arrowTarget?.position === 'bottom';
  const showArrowUp    = currentStep.arrowTarget?.position === 'top';
  const arrowLabel     = currentStep.arrowTarget?.label ?? '';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={s.overlay}>

        {/* Dim overlay with subtle radial highlight where card is */}
        <View style={[s.dimLayer, { backgroundColor: 'rgba(7,7,13,0.88)' }]} />

        <SafeAreaView style={s.safe} pointerEvents="box-none">

          {/* Top bar: dots + skip */}
          <Animated.View style={[s.topBar, { opacity: fadeA }]}>
            <View style={s.dotsRow}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.dot,
                    { backgroundColor: i === step ? '#FFFFFF' : 'rgba(255,255,255,0.25)' },
                    i === step && s.dotActive,
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity onPress={handleSkip} style={s.skipBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={s.skipText}>Skip tour</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Main card */}
          <Animated.View
            style={[
              s.cardWrap,
              { top: cardTop, opacity: fadeA, transform: [{ translateY: slideY }, { scale: scaleA }] },
            ]}
          >
            <View style={s.card}>
              <LinearGradient
                colors={[currentStep.iconColor + '18', currentStep.iconColor + '06', 'transparent']}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Step badge */}
              <View style={[s.stepBadge, { backgroundColor: currentStep.iconColor + '22' }]}>
                <Text style={[s.stepBadgeText, { color: currentStep.iconColor }]}>
                  STEP {step + 1} OF {STEPS.length}
                </Text>
              </View>

              {/* Icon */}
              <View style={[s.iconCircle, { backgroundColor: currentStep.iconColor + '20', borderColor: currentStep.iconColor + '40' }]}>
                <Ionicons name={currentStep.icon} size={30} color={currentStep.iconColor} />
              </View>

              <Text style={s.cardTitle}>{currentStep.title}</Text>
              <Text style={s.cardBody}>{currentStep.body}</Text>

              {/* Tip */}
              <View style={s.tipBox}>
                <Ionicons name="bulb-outline" size={13} color={currentStep.iconColor} />
                <Text style={s.tipText}>{currentStep.tip}</Text>
              </View>

              {/* CTA */}
              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.85}
                style={[s.nextBtn, { backgroundColor: currentStep.iconColor }]}
              >
                <Text style={s.nextBtnText}>{currentStep.ctaLabel}</Text>
              </TouchableOpacity>
            </View>

            {/* Animated arrow pointing down to tab bar */}
            {showArrowDown && (
              <Animated.View style={[s.arrowWrap, { transform: [{ translateY: arrowBounce }] }]}>
                <Text style={[s.arrowLabel, { color: currentStep.iconColor }]}>{arrowLabel}</Text>
                <Ionicons name="arrow-down" size={28} color={currentStep.iconColor} />
                <View style={[s.arrowPulse, { borderColor: currentStep.iconColor + '40' }]} />
              </Animated.View>
            )}

            {/* Arrow pointing up */}
            {showArrowUp && (
              <Animated.View style={[s.arrowWrapUp, { transform: [{ translateY: Animated.multiply(arrowBounce, new Animated.Value(-1)) as any }] }]}>
                <Ionicons name="arrow-up" size={28} color={currentStep.iconColor} />
                <Text style={[s.arrowLabel, { color: currentStep.iconColor }]}>{arrowLabel}</Text>
              </Animated.View>
            )}
          </Animated.View>

        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1 },
  dimLayer: { ...StyleSheet.absoluteFillObject },
  safe:    { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 18, paddingBottom: 8,
  },
  dotsRow:  { flexDirection: 'row', gap: 6 },
  dot:      { width: 6, height: 6, borderRadius: 3 },
  dotActive:{ width: 20, borderRadius: 3 },
  skipBtn:  { paddingHorizontal: 10, paddingVertical: 6 },
  skipText: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },

  cardWrap: {
    position: 'absolute',
    left: CARD_MARGIN, right: CARD_MARGIN,
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: '#12131F',
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 22,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 36,
    elevation: 18,
  },
  stepBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 12 },
  stepBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  iconCircle: {
    width: 66, height: 66, borderRadius: 33,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: 14,
  },
  cardTitle: {
    fontSize: 20, fontWeight: '800', color: '#F1F5F9',
    textAlign: 'center', letterSpacing: -0.4, lineHeight: 26, marginBottom: 10,
  },
  cardBody: {
    fontSize: 14, color: 'rgba(255,255,255,0.68)',
    textAlign: 'center', lineHeight: 21, marginBottom: 16,
  },
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 18, width: '100%',
  },
  tipText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.58)', lineHeight: 18 },
  nextBtn: {
    paddingVertical: 14, borderRadius: 16, width: '100%',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 6,
  },
  nextBtnText: { fontSize: 15, fontWeight: '800', color: '#07070D', letterSpacing: 0.2 },

  // Arrow (pointing down at tab bar)
  arrowWrap: {
    alignItems: 'center', marginTop: 16, gap: 4,
  },
  arrowWrapUp: {
    alignItems: 'center', marginBottom: 16, gap: 4, position: 'absolute', top: -70,
  },
  arrowLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  arrowPulse: {
    position: 'absolute', width: 48, height: 48, borderRadius: 24,
    borderWidth: 1.5, bottom: -8, opacity: 0.4,
  },
});
