import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Animated, Easing, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FEATURES } from '../config/features';
import { useUserStore } from '../services/userStore';
import { useBehavioralStore } from '../services/behavioralStore';
import { useSubscriptionStore } from '../services/subscriptionStore';
import { useSkillTreeStore } from '../services/skillTreeStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  onBehavioralAssessmentPress: () => void;
  onPlaybooksPress: () => void;
  onMacroDashboardPress: () => void;
  onTutorChatPress: () => void;
  onCustomizePress: () => void;
  onClassroomPress: () => void;
  onTimeMachinePress: () => void;
  onInvestorDNAPress: () => void;
  onFutureSimPress: () => void;
  onHealthScorePress: () => void;
  onSkillTreePress: () => void;
  onDecisionJournalPress: () => void;
  onSubscribePress: () => void;
}

function FadeSlide({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y       = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, tension: 160, friction: 22, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>{children}</Animated.View>;
}

export function DiscoverScreen({
  onBehavioralAssessmentPress, onPlaybooksPress, onMacroDashboardPress,
  onTutorChatPress, onCustomizePress, onClassroomPress,
  onTimeMachinePress, onInvestorDNAPress, onFutureSimPress, onHealthScorePress,
  onSkillTreePress, onDecisionJournalPress, onSubscribePress,
}: Props) {
  const { theme }                             = useTheme();
  const user                                  = useUserStore(s => s.user);
  const { profile: biasProfile }              = useBehavioralStore();
  const isPremium                             = useSubscriptionStore(s => s.isPremium());
  const { level, xp, completedNodes, gamificationEnabled } = useSkillTreeStore();

  const FREE_FEATURES: FeatureDef[] = [
    { icon: 'chatbubble-ellipses-outline', label: 'AI Tutor',        sub: 'Coming soon',           accent: theme.colors.primary, badge: 'SOON',       onPress: onTutorChatPress },
    { icon: 'book-outline',                label: 'Playbooks',        sub: '6 investment strategies',                accent: theme.colors.success, badge: null,       onPress: onPlaybooksPress },
    { icon: 'globe-outline',               label: 'Market Pulse',     sub: 'Economic cycles & sectors',              accent: theme.colors.gold,    badge: 'LIVE',     onPress: onMacroDashboardPress },
    { icon: 'analytics-outline',           label: 'Mind Check',       sub: biasProfile ? 'Profile complete ✓' : 'Discover your biases', accent: '#F87171', badge: biasProfile ? '✓' : null, onPress: onBehavioralAssessmentPress },
    { icon: 'journal-outline',             label: 'Decision Journal', sub: 'Track why you trade',                    accent: theme.colors.info,    badge: 'FREE',     onPress: onDecisionJournalPress },
  ];

  const PREMIUM_FEATURES: FeatureDef[] = [
    { icon: 'time-outline',     label: 'Time Machine',      sub: 'Trade 2008, COVID, 2022…', accent: '#F87171', badge: '💎', onPress: onTimeMachinePress },
    { icon: 'fitness-outline',  label: 'Investor DNA',      sub: 'Your archetype + share card', accent: '#A78BFA', badge: '💎', onPress: onInvestorDNAPress },
    { icon: 'telescope-outline',label: 'Future Simulator',  sub: 'Monte Carlo your goals',    accent: theme.colors.primary, badge: '💎', onPress: onFutureSimPress },
    { icon: 'pulse-outline',    label: 'Health Score',      sub: 'Full portfolio breakdown',   accent: theme.colors.success, badge: '💎', onPress: onHealthScorePress },
  ];

  const STATS = [
    { label: 'Tier',     value: `Tier ${user?.currentTier ?? 1}`, color: theme.colors.primary },
    { label: 'Lessons',  value: String(user?.lessonsCompleted?.length ?? 0), color: theme.colors.info },
    { label: gamificationEnabled ? 'XP' : 'Nodes', value: gamificationEnabled ? xp.toLocaleString() : String(completedNodes.length), color: theme.colors.gold },
    { label: 'Plan',     value: isPremium ? '💎 Premium' : 'Free', color: isPremium ? theme.colors.gold : theme.colors.textTertiary },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <FadeSlide delay={0}>
          <View style={s.header}>
            <Text style={[s.title, { color: theme.colors.textPrimary }]}>Discover</Text>
            <Text style={[s.sub, { color: theme.colors.textSecondary }]}>Your investing toolkit</Text>
          </View>
        </FadeSlide>

        {/* Stats strip */}
        <FadeSlide delay={60}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsStrip}>
            {STATS.map(stat => (
              <View key={stat.label} style={[s.statChip, { backgroundColor: stat.color + '14', borderColor: stat.color + '30' }]}>
                <Text style={[s.statVal, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>{stat.label}</Text>
              </View>
            ))}
          </ScrollView>
        </FadeSlide>

        {/* AI Tutor hero card */}
        <FadeSlide delay={120}>
          <TouchableOpacity onPress={onTutorChatPress} activeOpacity={0.85} style={s.heroWrap}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDim]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.hero, { shadowColor: theme.colors.primary }]}
            >
              {/* Subtle mesh overlay */}
              <View style={s.heroMesh} />
              <View style={{ flex: 1 }}>
                <View style={[s.heroBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={s.heroBadgeText}>COMING SOON</Text>
                </View>
                <Text style={s.heroTitle}>Ask the{'\n'}AI Tutor</Text>
                <Text style={s.heroSub}>Adapts to your tier, biases & progress</Text>
                <View style={[s.heroBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                  <Text style={s.heroBtnText}>Notify me</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </View>
              </View>
              <View style={s.heroIconBox}>
                <Ionicons name="chatbubble-ellipses" size={56} color="rgba(255,255,255,0.25)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </FadeSlide>

        {/* Premium upsell banner */}
        {!isPremium && (
          <FadeSlide delay={160}>
            <TouchableOpacity onPress={onSubscribePress} activeOpacity={0.8}>
              <LinearGradient
                colors={[theme.colors.gold + '22', theme.colors.gold + '0A']}
                style={[s.premBanner, { borderColor: theme.colors.gold + '35' }]}
              >
                <View style={[s.premIconBox, { backgroundColor: theme.colors.gold + '20' }]}>
                  <Text style={{ fontSize: 20 }}>💎</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.premTitle, { color: theme.colors.gold }]}>Unlock Premium · $5/month</Text>
                  <Text style={[s.premSub, { color: theme.colors.textSecondary }]}>
                    Time Machine · Investor DNA · Future Sim · Health Score
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.gold} />
              </LinearGradient>
            </TouchableOpacity>
          </FadeSlide>
        )}

        {/* Premium features */}
        <FadeSlide delay={200}>
          <SectionHeader title="💎 Premium" theme={theme} />
          <View style={s.grid}>
            {PREMIUM_FEATURES.map((f, i) => (
              <FeatureCard key={f.label} feature={f} theme={theme} locked={!isPremium} delay={220 + i * 40} />
            ))}
          </View>
        </FadeSlide>

        {/* Free features — full-width list so labels never truncate */}
        <FadeSlide delay={280}>
          <SectionHeader title="Your Toolkit" theme={theme} />
          <View style={s.listSection}>
            {FREE_FEATURES.map((f, i) => (
              <FeatureRow key={f.label} feature={f} theme={theme} delay={300 + i * 30} />
            ))}
          </View>
        </FadeSlide>

        {/* Insight of the Day — flagged off in Phase 3. This whole screen is
            unregistered while exploreTab is off; the separate flag keeps the
            insight hidden if Explore is ever turned back on. */}
        {FEATURES.insightOfTheDay && (
        <FadeSlide delay={360}>
          <View style={[s.tip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[s.tipIconBox, { backgroundColor: theme.colors.primary + '18' }]}>
              <Ionicons name="bulb-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.tipTitle, { color: theme.colors.textPrimary }]}>Insight of the Day</Text>
              <Text style={[s.tipText, { color: theme.colors.textSecondary }]}>
                {biasProfile
                  ? `Your top bias is "${biasProfile.topBiases?.[0]?.replace(/([A-Z])/g, ' $1').trim() ?? 'unknown'}." Use the Decision Journal to catch it before your next trade.`
                  : 'Take the Mind Check assessment to unlock personalized insights based on your investor psychology.'}
              </Text>
            </View>
          </View>
        </FadeSlide>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
interface FeatureDef {
  icon: IoniconName;
  label: string;
  sub: string;
  accent: string;
  badge: string | null;
  onPress?: () => void;
}

function FeatureCard({
  feature, theme, locked, delay,
}: { feature: FeatureDef; theme: any; locked: boolean; delay: number }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const y       = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 360, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, tension: 180, friction: 24, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn  = () => Animated.spring(scale, { toValue: 0.95, tension: 300, friction: 20, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    tension: 240, friction: 16, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: y }, { scale }], flex: 1 }}>
      <Pressable
        onPress={feature.onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[s.featureCard, {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: locked ? 0.72 : 1,
        }]}
      >
        <LinearGradient
          colors={[feature.accent + '0E', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[s.featureIconBox, { backgroundColor: feature.accent + '18' }]}>
          <Ionicons name={feature.icon} size={20} color={feature.accent} />
        </View>
        <Text style={[s.featureName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {feature.label}
        </Text>
        <Text style={[s.featureSub, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {feature.sub}
        </Text>
        {feature.badge && (
          <View style={[s.badge, {
            backgroundColor: feature.badge === '💎' ? theme.colors.gold + '20' : feature.accent + '20',
          }]}>
            <Text style={[s.badgeText, {
              color: feature.badge === '💎' ? theme.colors.gold : feature.accent,
            }]}>{feature.badge}</Text>
          </View>
        )}
        {locked && (
          <View style={s.lockOverlay}>
            <Ionicons name="lock-closed" size={12} color={theme.colors.textTertiary} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// Full-width row for toolkit items — text never wraps / truncates
function FeatureRow({
  feature, theme, delay,
}: { feature: FeatureDef; theme: any; delay: number }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const y       = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, tension: 200, friction: 26, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const pressIn  = () => Animated.spring(scale, { toValue: 0.97, tension: 300, friction: 20, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    tension: 240, friction: 16, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: y }, { scale }] }}>
      <Pressable
        onPress={feature.onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[s.featureRowCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      >
        <LinearGradient
          colors={[feature.accent + '10', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[s.featureRowIcon, { backgroundColor: feature.accent + '18' }]}>
          <Ionicons name={feature.icon} size={20} color={feature.accent} />
        </View>
        <View style={s.featureRowText}>
          <View style={s.featureRowTop}>
            <Text style={[s.featureRowName, { color: theme.colors.textPrimary }]}>
              {feature.label}
            </Text>
            {feature.badge && (
              <View style={[s.badge, { backgroundColor: feature.accent + '20' }]}>
                <Text style={[s.badgeText, { color: feature.accent }]}>{feature.badge}</Text>
              </View>
            )}
          </View>
          <Text style={[s.featureRowSub, { color: theme.colors.textSecondary }]}>
            {feature.sub}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

function SectionHeader({ title, theme }: { title: string; theme: any }) {
  return (
    <View style={s.sectionHeader}>
      <View style={[s.sectionLine, { backgroundColor: theme.colors.border }]} />
      <Text style={[s.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      <View style={[s.sectionLine, { backgroundColor: theme.colors.border }]} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { paddingBottom: 24 },

  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 10 },
  title:  { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 4 },
  sub:    { fontSize: 14 },

  statsStrip: { paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statChip:   { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderWidth: 1, alignItems: 'center', minWidth: 80 },
  statVal:    { fontSize: 17, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  statLabel:  { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },

  // Hero
  heroWrap: { marginHorizontal: 16, marginBottom: 14 },
  hero: {
    borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 24, elevation: 10,
  },
  heroMesh:      { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroBadge:     { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  heroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle:     { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 34, marginBottom: 6 },
  heroSub:       { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginBottom: 16 },
  heroBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  heroBtnText:   { color: '#fff', fontSize: 13, fontWeight: '700' },
  heroIconBox:   { marginLeft: 10 },

  // Premium banner
  premBanner:  { marginHorizontal: 16, marginBottom: 14, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  premIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  premTitle:   { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  premSub:     { fontSize: 12, lineHeight: 17 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 12, marginTop: 4 },
  sectionLine:   { flex: 1, height: 1 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },

  // Grid (premium 2x2)
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  featureCard: {
    width: '47%', borderRadius: 20, borderWidth: 1, padding: 14,
    overflow: 'hidden', minHeight: 130,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  featureIconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureName:    { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  featureSub:     { fontSize: 11, lineHeight: 16, flex: 1 },
  badge:          { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginTop: 8 },
  badgeText:      { fontSize: 10, fontWeight: '800' },
  lockOverlay:    { position: 'absolute', top: 10, right: 10 },

  // Full-width list (toolkit)
  listSection: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  featureRowCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 18, borderWidth: 1, padding: 14, overflow: 'hidden',
  },
  featureRowIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureRowText: { flex: 1, gap: 3 },
  featureRowTop:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  featureRowName: { fontSize: 14, fontWeight: '700' },
  featureRowSub:  { fontSize: 12, lineHeight: 18 },

  // Insight tip
  tip:       { marginHorizontal: 16, borderRadius: 20, padding: 16, flexDirection: 'row', gap: 12, borderWidth: 1 },
  tipIconBox:{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipTitle:  { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  tipText:   { fontSize: 12, lineHeight: 18 },
});
