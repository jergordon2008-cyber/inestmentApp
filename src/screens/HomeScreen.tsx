import React, { useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Animated, Easing, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../services/userStore';
import { usePortfolioStore } from '../services/portfolioStore';
import { useStreakStore } from '../services/streakStore';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { CompanyLogo } from '../components/CompanyLogo';
import { tier1Lessons } from '../data/curriculum';
import { tier2Lessons } from '../data/tier2curriculum';
import { tier3Lessons } from '../data/tier3curriculum';
import { getStockSync } from '../services/marketDataFacade';
import { fs, sp, isTablet } from '../constants/responsive';
import { changeCaret, changeColor, changeSign } from '../utils/change';

const ALL_LESSONS = [...tier1Lessons, ...tier2Lessons, ...tier3Lessons];

const WATCHLIST = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'META', 'AMZN'];

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  onLessonPress: (id: string) => void;
  onPortfolioPress: () => void;
  onSignalPress: (id: string) => void;
  onMicroLessonPress?: () => void;
  // Home is the Learn tab's landing, so it owns the way into the full
  // curriculum — without this the lesson list has no entry point.
  onAllLessonsPress?: () => void;
  onJournalPress?: () => void;
  onBrowseStocksPress?: () => void;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function SlideUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y       = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, tension: 160, friction: 22, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>
      {children}
    </Animated.View>
  );
}

export function HomeScreen({
  onLessonPress, onPortfolioPress, onBrowseStocksPress,
  onJournalPress, onSignalPress, onMicroLessonPress, onAllLessonsPress,
}: Props) {
  const { theme } = useTheme();
  const user        = useUserStore(s => s.user);
  const portfolio   = usePortfolioStore(s => s.portfolio);
  const streak      = useStreakStore(s => s.currentStreak);

  const nextLesson = useMemo(() =>
    ALL_LESSONS.find(l => !user?.lessonsCompleted.includes(l.id)), [user]);

  const totalValue     = portfolio?.totalValue ?? 100000;
  const totalReturn    = portfolio?.totalReturn ?? 0;
  const totalReturnPct = portfolio?.totalReturnPercent ?? 0;
  const cash           = portfolio?.currentCash ?? 100000;
  const perf           = changeColor(totalReturn, theme);
  const returnCaret    = changeCaret(totalReturn);

  const QUICK_ACTIONS: { icon: IoniconName; label: string; onPress?: () => void; color: string }[] = [
    { icon: 'search',       label: 'Browse',    onPress: onBrowseStocksPress, color: theme.colors.info    },
    { icon: 'journal',      label: 'Journal',   onPress: onJournalPress,       color: theme.colors.gold    },
    { icon: 'flash',        label: 'Quick',     onPress: onMicroLessonPress,   color: theme.colors.primary },
    { icon: 'pie-chart',    label: 'Portfolio', onPress: onPortfolioPress,     color: theme.colors.success },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <SlideUp delay={0}>
          <View style={s.header}>
            <View>
              <Text style={[s.greeting, { color: theme.colors.textTertiary }]}>{greeting()}</Text>
              <Text style={[s.name, { color: theme.colors.textPrimary }]}>
                {user?.displayName?.split(' ')[0] ?? 'Investor'}
              </Text>
            </View>
            <View style={[s.streakBadge, {
              backgroundColor: theme.colors.gold + '18',
              borderColor: theme.colors.gold + '30',
            }]}>
              <Ionicons name="flame" size={fs(16)} color={theme.colors.gold} />
              <View>
                <Text style={[s.streakNum, { color: theme.colors.gold }]}>{streak}</Text>
                <Text style={[s.streakLabel, { color: theme.colors.gold + '99' }]}>day streak</Text>
              </View>
            </View>
          </View>
        </SlideUp>

        {/* ── Portfolio Hero Card ── */}
        <SlideUp delay={80}>
          <Pressable onPress={onPortfolioPress} style={s.heroWrap}>
            <LinearGradient
              colors={[theme.colors.surfaceElevated, theme.colors.surface, theme.colors.background]}
              locations={[0, 0.55, 1]}
              style={[s.heroCard, { borderColor: theme.colors.border, shadowColor: perf }]}
            >
              <LinearGradient
                colors={[perf + '16', 'transparent']}
                style={StyleSheet.absoluteFillObject}
              />
              <LinearGradient
                colors={[theme.colors.primary + '20', 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: sp(26) }]}
              />

              <Text style={[s.heroLabel, { color: theme.colors.textTertiary }]}>
                TOTAL PORTFOLIO VALUE
              </Text>

              <View style={s.heroValueRow}>
                <Text style={[s.heroCurrency, { color: theme.colors.textSecondary }]}>$</Text>
                <AnimatedNumber
                  value={totalValue}
                  formatter={n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  duration={1000}
                  delay={150}
                  style={[s.heroValue, { color: theme.colors.textPrimary }]}
                />
              </View>

              <View style={s.heroChips}>
                <View style={[s.chip, { backgroundColor: perf + '18' }]}>
                  {returnCaret && <Ionicons name={returnCaret} size={fs(11)} color={perf} />}
                  <Text style={[s.chipText, { color: perf }]}>
                    {changeSign(totalReturn)}${Math.abs(totalReturn).toFixed(2)}
                  </Text>
                  <Text style={[s.chipSub, { color: perf + 'BB' }]}>
                    ({changeSign(totalReturnPct)}{totalReturnPct.toFixed(2)}%)
                  </Text>
                </View>
                <View style={[s.chip, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Ionicons name="cash-outline" size={fs(13)} color={theme.colors.textTertiary} />
                  <Text style={[s.chipText, { color: theme.colors.textSecondary }]}>
                    ${cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </Text>
                  <Text style={[s.chipSub, { color: theme.colors.textTertiary }]}>cash</Text>
                </View>
              </View>

              <View style={[s.heroCTA, { borderTopColor: theme.colors.border }]}>
                <Text style={[s.heroCTAText, { color: theme.colors.textTertiary }]}>
                  Tap to manage portfolio
                </Text>
                <Ionicons name="chevron-forward" size={fs(14)} color={theme.colors.primary} />
              </View>
            </LinearGradient>
          </Pressable>
        </SlideUp>

        {/* ── Quick Actions ── */}
        <SlideUp delay={160}>
          <View style={s.quickRow}>
            {QUICK_ACTIONS.map(a => (
              <QuickActionBtn key={a.label} {...a} theme={theme} />
            ))}
          </View>
        </SlideUp>

        {/* ── Continue Learning ── */}
        {/* The header renders whether or not a next lesson exists: it carries
            the only link to the full curriculum, so hiding it would strand a
            student who has finished every lesson in their tier. */}
        <SlideUp delay={240}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.colors.textPrimary }]}>Continue Learning</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp(10) }}>
              <View style={[s.tierPill, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary + '35' }]}>
                <Text style={[s.tierPillText, { color: theme.colors.primary }]}>
                  Tier {user?.currentTier ?? 1}
                </Text>
              </View>
              <TouchableOpacity onPress={onAllLessonsPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[s.seeAll, { color: theme.colors.primary }]}>All lessons →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SlideUp>
        {nextLesson && (
          <SlideUp delay={260}>
            <AnimatedPressable onPress={() => onLessonPress(nextLesson.id)} scaleTarget={0.97}
              style={[s.lessonCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <LinearGradient
                colors={[theme.colors.primary + '12', 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={[s.lessonIconBox, { backgroundColor: theme.colors.primary + '18' }]}>
                <Ionicons name="book" size={fs(22)} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.lessonTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                  {nextLesson.title}
                </Text>
                <Text style={[s.lessonMeta, { color: theme.colors.textTertiary }]}>
                  {nextLesson.estimatedMinutes} min · {nextLesson.topics[0]}
                </Text>
                <ProgressBar
                  pct={(user?.lessonsCompleted.length ?? 0) / ALL_LESSONS.length}
                  color={theme.colors.primary}
                  trackColor={theme.colors.border}
                />
              </View>
              <Ionicons name="chevron-forward" size={fs(18)} color={theme.colors.textTertiary} />
            </AnimatedPressable>
          </SlideUp>
        )}

        {/* ── Watchlist ── */}
        <SlideUp delay={320}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.colors.textPrimary }]}>Watchlist</Text>
            <TouchableOpacity onPress={onBrowseStocksPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[s.seeAll, { color: theme.colors.primary }]}>See all →</Text>
            </TouchableOpacity>
          </View>

          <View style={[s.watchlistCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {WATCHLIST.map((sym, i) => (
              <WatchlistRow
                key={sym}
                symbol={sym}
                index={i}
                isLast={i === WATCHLIST.length - 1}
                onPress={() => onSignalPress(sym)}
                theme={theme}
              />
            ))}
          </View>
        </SlideUp>

        {/* ── Stats Grid ── */}
        <SlideUp delay={400}>
          <View style={s.statsGrid}>
            {([
              { label: 'Lessons',    val: String(user?.lessonsCompleted?.length ?? 0), icon: 'book',        color: theme.colors.info },
              { label: 'Day Streak', val: String(streak),                              icon: 'flame',       color: theme.colors.gold },
              { label: 'Positions',  val: String(portfolio?.positions?.length ?? 0),   icon: 'trending-up', color: theme.colors.success },
              { label: 'Tier',       val: `Tier ${user?.currentTier ?? 1}`,            icon: 'star',        color: theme.colors.primary },
            ] as Array<{ label: string; val: string; icon: IoniconName; color: string }>).map(stat => (
              <StatCard key={stat.label} {...stat} theme={theme} />
            ))}
          </View>
        </SlideUp>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuickActionBtn({
  icon, label, onPress, color, theme,
}: { icon: IoniconName; label: string; onPress?: () => void; color: string; theme: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.88, tension: 320, friction: 20, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    tension: 240, friction: 16, useNativeDriver: true }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}
      style={{ flex: 1, alignItems: 'center' }}>
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}>
        <View style={[s.qaCircle, { backgroundColor: color + '1A', borderColor: color + '30' }]}>
          <Ionicons name={icon} size={fs(22)} color={color} />
        </View>
        <Text style={[s.qaLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function WatchlistRow({
  symbol, index, isLast, onPress, theme,
}: { symbol: string; index: number; isLast: boolean; onPress: () => void; theme: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y       = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: 320 + index * 50, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, tension: 140, friction: 22, delay: 320 + index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const stock = getStockSync(symbol);
  if (!stock) return null;

  const c       = changeColor(stock.changePercent, theme);
  const pctText = `${changeSign(stock.changePercent)}${(stock.changePercent ?? 0).toFixed(2)}%`;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          s.wlRow,
          !isLast && { borderBottomWidth: 0.5, borderBottomColor: theme.colors.border },
          pressed && { backgroundColor: theme.colors.surfaceElevated },
        ]}
      >
        {/* Left: logo + names */}
        <View style={s.wlLeft}>
          <CompanyLogo symbol={symbol} size={sp(38)} />
          <View style={s.wlNames}>
            <Text style={[s.wlSym, { color: theme.colors.textPrimary }]}>{symbol}</Text>
            <Text style={[s.wlName, { color: theme.colors.textTertiary }]} numberOfLines={1}>
              {stock.name.length > 14 ? stock.name.split(' ').slice(0, 2).join(' ') : stock.name}
            </Text>
          </View>
        </View>

        {/* Right: price + change */}
        <View style={s.wlRight}>
          <Text style={[s.wlPrice, { color: theme.colors.textPrimary }]}>
            ${stock.price >= 1000
              ? stock.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
              : stock.price.toFixed(2)}
          </Text>
          <View style={[s.wlPill, { backgroundColor: c + '1A' }]}>
            <Text style={[s.wlPct, { color: c }]}>{pctText}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ProgressBar({ pct, color, trackColor }: { pct: number; color: string; trackColor: string }) {
  const widthA = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthA, { toValue: Math.round(pct * 100), duration: 900, delay: 400, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [pct]);
  const w = widthA.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 3, borderRadius: 2, backgroundColor: trackColor, overflow: 'hidden', marginTop: 6 }}>
      <Animated.View style={{ height: 3, borderRadius: 2, backgroundColor: color, width: w }} />
    </View>
  );
}

function StatCard({ label, val, icon, color, theme }: { label: string; val: string; icon: IoniconName; color: string; theme: any }) {
  return (
    <View style={[s.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[s.statIconWrap, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={fs(18)} color={color} />
      </View>
      <Text style={[s.statVal, { color: theme.colors.textPrimary }]}>{val}</Text>
      <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { paddingBottom: 24 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: sp(24), paddingTop: sp(16), paddingBottom: sp(16) },
  greeting:    { fontSize: fs(12), fontWeight: '500', letterSpacing: 0.4, marginBottom: 3 },
  name:        { fontSize: fs(28), fontWeight: '800', letterSpacing: -0.8 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: sp(8), paddingHorizontal: sp(12), paddingVertical: sp(8), borderRadius: 22, borderWidth: 1 },
  streakNum:   { fontSize: fs(16), fontWeight: '800', lineHeight: fs(20) },
  streakLabel: { fontSize: fs(10), fontWeight: '500' },

  // Hero card
  heroWrap: { marginHorizontal: sp(16), marginBottom: sp(16) },
  heroCard: {
    borderRadius: sp(24), borderWidth: 1, padding: sp(24), overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 28, elevation: 10,
  },
  heroLabel:    { fontSize: fs(10), fontWeight: '700', letterSpacing: 1.6, marginBottom: sp(10) },
  heroValueRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: sp(14) },
  heroCurrency: { fontSize: fs(20), fontWeight: '700', marginTop: sp(6), marginRight: 2 },
  heroValue:    { fontSize: fs(50), fontWeight: '800', letterSpacing: -2, lineHeight: fs(56) },
  heroChips:    { flexDirection: 'row', gap: sp(8), marginBottom: sp(16), flexWrap: 'wrap' },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: sp(4), paddingHorizontal: sp(10), paddingVertical: sp(7), borderRadius: 22 },
  chipText:     { fontSize: fs(13), fontWeight: '700' },
  chipSub:      { fontSize: fs(12), fontWeight: '500' },
  heroCTA:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 0.5, paddingTop: sp(12) },
  heroCTAText:  { fontSize: fs(12), fontWeight: '500' },

  // Quick actions
  quickRow: { flexDirection: 'row', paddingHorizontal: sp(16), marginBottom: sp(26) },
  qaCircle: { width: sp(52), height: sp(52), borderRadius: sp(18), alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: sp(7) },
  qaLabel:  { fontSize: fs(11), fontWeight: '600' },

  // Sections
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: sp(24), marginBottom: sp(12) },
  sectionTitle:   { fontSize: fs(19), fontWeight: '800', letterSpacing: -0.4 },
  tierPill:       { paddingHorizontal: sp(10), paddingVertical: sp(4), borderRadius: 20, borderWidth: 1 },
  tierPillText:   { fontSize: fs(11), fontWeight: '700' },
  seeAll:         { fontSize: fs(13), fontWeight: '600' },

  // Lesson card
  lessonCard:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: sp(16), borderRadius: sp(20), borderWidth: 1, padding: sp(16), gap: sp(14), marginBottom: sp(24), overflow: 'hidden' },
  lessonIconBox: { width: sp(48), height: sp(48), borderRadius: sp(16), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lessonTitle:   { fontSize: fs(14), fontWeight: '700', marginBottom: 3 },
  lessonMeta:    { fontSize: fs(11), marginBottom: 3 },

  // Watchlist — vertical list card
  watchlistCard: {
    marginHorizontal: sp(16),
    marginBottom: sp(24),
    borderRadius: sp(20),
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  wlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(16),
    paddingVertical: sp(13),
  },
  wlLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(10),
    flex: 1,
    minWidth: 0,
  },
  wlNames: {
    flex: 1,
    minWidth: 0,
  },
  wlRight: {
    alignItems: 'flex-end',
    minWidth: sp(72),
  },
  wlSym:   { fontSize: fs(14), fontWeight: '800', letterSpacing: -0.2 },
  wlName:  { fontSize: fs(11), marginTop: 1 },
  wlPrice: { fontSize: fs(14), fontWeight: '700', marginBottom: 3 },
  wlPill:  { paddingHorizontal: sp(7), paddingVertical: sp(3), borderRadius: 8 },
  wlPct:   { fontSize: fs(11), fontWeight: '800' },

  // Stats grid
  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: sp(10), marginHorizontal: sp(16) },
  statCard:    { width: '47%', borderRadius: sp(20), borderWidth: 1, padding: sp(16), alignItems: 'center', gap: sp(6) },
  statIconWrap:{ width: sp(42), height: sp(42), borderRadius: sp(14), alignItems: 'center', justifyContent: 'center' },
  statVal:     { fontSize: fs(22), fontWeight: '800', letterSpacing: -0.6 },
  statLabel:   { fontSize: fs(10), fontWeight: '600', letterSpacing: 0.3 },
});
