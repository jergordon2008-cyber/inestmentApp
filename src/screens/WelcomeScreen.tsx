import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Animated, Easing, Dimensions, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { AnimatedNumber } from '../components/AnimatedNumber';

const { width: W, height: H } = Dimensions.get('window');

interface Props { onGetStarted: () => void; onSignIn: () => void; }

const CHART_BARS = [22, 35, 28, 44, 38, 52, 46, 60, 55, 70, 66, 80, 76, 90, 85];

export function WelcomeScreen({ onGetStarted, onSignIn }: Props) {
  const { theme } = useTheme();

  // Staggered entrance animations
  const logoA   = useRef(new Animated.Value(0)).current;
  const cardA   = useRef(new Animated.Value(0)).current;
  const cardY   = useRef(new Animated.Value(40)).current;
  const cardS   = useRef(new Animated.Value(0.88)).current;
  const copyA   = useRef(new Animated.Value(0)).current;
  const copyY   = useRef(new Animated.Value(24)).current;
  const ctaA    = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo fade in
    Animated.timing(logoA, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Card flies in
    Animated.parallel([
      Animated.timing(cardA, { toValue: 1, duration: 600, delay: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(cardY, { toValue: 0, tension: 90, friction: 20, delay: 200, useNativeDriver: true }),
      Animated.spring(cardS, { toValue: 1,  tension: 80, friction: 18, delay: 200, useNativeDriver: true }),
    ]).start();

    // Copy fades up
    Animated.parallel([
      Animated.timing(copyA, { toValue: 1, duration: 500, delay: 580, useNativeDriver: true }),
      Animated.spring(copyY, { toValue: 0, tension: 120, friction: 24, delay: 580, useNativeDriver: true }),
    ]).start();

    // CTA fades in
    Animated.timing(ctaA, { toValue: 1, duration: 400, delay: 900, useNativeDriver: true }).start();

    // Ambient glow pulse (loops)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });

  return (
    <View style={s.root}>
      {/* Full-screen gradient hero — deep navy to electric green, 135deg */}
      <LinearGradient
        colors={theme.mode === 'dark' ? [theme.colors.heroGradient[0], theme.colors.background] : [theme.colors.background, theme.colors.background]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Ambient radial glow — breathes slowly */}
      <Animated.View style={[s.ambientGlow, { opacity: glowOpacity, backgroundColor: theme.colors.primary }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.inner}>

          {/* ── Logo ── */}
          <Animated.View style={[s.logoRow, { opacity: logoA }]}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDim]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.logoIcon}
            >
              <Ionicons name="trending-up" size={20} color="#07070D" />
            </LinearGradient>
            <Text style={[s.logoName, { color: theme.colors.textPrimary }]}>InvestIQ</Text>
          </Animated.View>

          {/* ── Portfolio Preview Card ── */}
          <Animated.View style={[
            s.cardWrap,
            { opacity: cardA, transform: [{ translateY: cardY }, { scale: cardS }] },
          ]}>
            <LinearGradient
              colors={[theme.colors.surfaceElevated, theme.colors.surface]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={[s.card, { borderColor: theme.colors.borderStrong }]}
            >
              {/* Inner violet shimmer */}
              <LinearGradient
                colors={[theme.colors.primary + '18', 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.7 }}
                style={StyleSheet.absoluteFillObject}
              />

              <Text style={[s.cardLabel, { color: theme.colors.textTertiary }]}>PAPER PORTFOLIO</Text>

              <View style={s.balanceRow}>
                <Text style={[s.currencySign, { color: theme.colors.textSecondary }]}>$</Text>
                <AnimatedNumber
                  value={112453}
                  formatter={n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  duration={1100}
                  delay={400}
                  style={[s.balanceNum, { color: theme.colors.textPrimary }]}
                />
              </View>

              <View style={[s.gainBadge, { backgroundColor: theme.colors.success + '1A' }]}>
                <Text style={[s.gainText, { color: theme.colors.success }]}>
                  ▲  +$12,453  (12.4%)  all-time
                </Text>
              </View>

              {/* Mini bar chart */}
              <View style={s.chartRow}>
                {CHART_BARS.map((h, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      s.bar,
                      {
                        height: h * 0.52,
                        backgroundColor: i >= 11 ? theme.colors.primary : theme.colors.primary + '30',
                        borderRadius: 3,
                        transform: [{ scale: cardS }],
                      },
                    ]}
                  />
                ))}
              </View>

              <View style={[s.cardFooter, { borderTopColor: theme.colors.border }]}>
                <Text style={[s.footerLeft, { color: theme.colors.textTertiary }]}>Paper money · Zero real risk</Text>
                <View style={[s.livePill, { backgroundColor: theme.colors.success + '1A' }]}>
                  <View style={[s.liveDot, { backgroundColor: theme.colors.success }]} />
                  <Text style={[s.liveLabel, { color: theme.colors.success }]}>LIVE</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Copy ── */}
          <Animated.View style={[s.copyBlock, { opacity: copyA, transform: [{ translateY: copyY }] }]}>
            <Text style={[s.headline, { color: theme.colors.textPrimary }]}>
              Learn to invest{'\n'}like a pro.
            </Text>
            <Text style={[s.subline, { color: theme.colors.textSecondary }]}>
              62+ lessons · $100K paper portfolio · AI-powered tutor
            </Text>

            <View style={s.features}>
              {[
                { icon: 'library-outline',    text: 'Structured curriculum from beginner to advanced' },
                { icon: 'flag-outline',       text: 'Paper trading challenges tied to every lesson' },
                { icon: 'stats-chart-outline', text: 'Real market data. Zero real money at risk.' },
              ].map((f, i) => (
                <View key={i} style={s.featureRow}>
                  <View style={[s.featureIconBox, { backgroundColor: theme.colors.primary + '18' }]}>
                    <Ionicons name={f.icon as any} size={14} color={theme.colors.primary} />
                  </View>
                  <Text style={[s.featureText, { color: theme.colors.textSecondary }]}>{f.text}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

        </View>

        {/* ── CTAs ── */}
        <Animated.View style={[s.ctaBlock, { opacity: ctaA }]}>
          <PrimaryButton label="Get started — it's free" onPress={onGetStarted} theme={theme} />
          <Pressable onPress={onSignIn} style={s.ghostBtn}>
            <Text style={[s.ghostText, { color: theme.colors.textTertiary }]}>
              I already have an account
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ── Animated CTA button ─────────────────────────────────────────────────────
function PrimaryButton({ label, onPress, theme }: { label: string; onPress: () => void; theme: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.96, tension: 300, friction: 18, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    tension: 220, friction: 14, useNativeDriver: true }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDim]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[s.primaryBtn, { shadowColor: theme.colors.primary }]}
        >
          <Text style={s.primaryBtnText}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1 },
  ambientGlow: {
    position: 'absolute', top: -100, alignSelf: 'center',
    width: W * 1.4, height: W * 1.4, borderRadius: W * 0.7,
  },
  inner: { flex: 1, paddingHorizontal: 24 },

  // Logo
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 16, marginBottom: 24 },
  logoIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  logoEmoji:{ fontSize: 20 },
  logoName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.6 },

  // Card
  cardWrap: { marginBottom: 24 },
  card: {
    borderRadius: 26, borderWidth: 1, padding: 22, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 28, elevation: 10,
  },
  cardLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginBottom: 10 },
  balanceRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  currencySign:{ fontSize: 22, fontWeight: '700', marginTop: 8, marginRight: 2 },
  balanceNum:  { fontSize: 42, fontWeight: '800', letterSpacing: -2, lineHeight: 50 },
  gainBadge:   { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  gainText:    { fontSize: 13, fontWeight: '700' },
  chartRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 44, marginBottom: 14 },
  bar:         { flex: 1 },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, paddingTop: 12 },
  footerLeft:  { fontSize: 11 },
  livePill:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  liveDot:     { width: 5, height: 5, borderRadius: 3 },
  liveLabel:   { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },

  // Copy
  copyBlock:  { gap: 0 },
  headline:   { fontSize: 38, fontWeight: '800', letterSpacing: -1.5, lineHeight: 44, marginBottom: 10 },
  subline:    { fontSize: 14, lineHeight: 21, marginBottom: 20 },
  features:   { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIconBox: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText:    { flex: 1, fontSize: 14, lineHeight: 21 },

  // CTAs
  ctaBlock:     { paddingHorizontal: 24, paddingBottom: 36, gap: 0 },
  primaryBtn:   {
    paddingVertical: 17, paddingHorizontal: 28, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 8,
    marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  ghostBtn:     { alignItems: 'center', paddingVertical: 12 },
  ghostText:    { fontSize: 14, fontWeight: '500' },
});
