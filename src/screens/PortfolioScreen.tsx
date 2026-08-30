import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { usePortfolioStore } from '../services/portfolioStore';
import { fetchStocks } from '../services/marketDataFacade';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { CompanyLogo } from '../components/CompanyLogo';
import { PortfolioPieChart } from '../components/PortfolioPieChart';
import { Position } from '../types';

interface Props {
  onBack: () => void; onStockPress: (sym: string) => void; onBrowsePress: () => void;
  // When embedded inside another screen (e.g. MarketScreen's "Your Portfolio"
  // sub-tab) we skip our own SafeAreaView/title bar since the host already
  // provides one — avoids doubled headers and backgrounds.
  embedded?: boolean;
}

function SlideUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y       = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, tension: 160, friction: 22, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>{children}</Animated.View>;
}

export function PortfolioScreen({ onBack, onStockPress, onBrowsePress, embedded }: Props) {
  const { theme }              = useTheme();
  const Wrapper: any = embedded ? View : SafeAreaView;
  const portfolio              = usePortfolioStore(s => s.portfolio);
  const updatePositionPrices   = usePortfolioStore(s => s.updatePositionPrices);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshPrices();
    // Auto-refresh every 30 seconds so balance updates as prices move
    const interval = setInterval(refreshPrices, 30_000);
    return () => clearInterval(interval);
  }, []);

  const refreshPrices = async () => {
    if (!portfolio?.positions.length) return;
    setRefreshing(true);
    const syms   = portfolio.positions.map(p => p.symbol);
    const stocks = await fetchStocks(syms);
    const map    = stocks.reduce((a, s) => ({ ...a, [s.symbol]: s.price }), {} as Record<string, number>);
    updatePositionPrices(map);
    setRefreshing(false);
  };

  if (!portfolio) return (
    <Wrapper style={[s.container, !embedded && { backgroundColor: theme.colors.background }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={onBrowsePress} style={[s.investBtn, { backgroundColor: theme.colors.primary }]}>
          <Text style={s.investBtnText}>+ Start Investing</Text>
        </TouchableOpacity>
      </View>
      <View style={s.empty}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>📊</Text>
        <Text style={[s.emptyTitle, { color: theme.colors.textPrimary }]}>No portfolio yet</Text>
        <Text style={[s.emptyBody, { color: theme.colors.textSecondary }]}>
          Complete onboarding to start with $100,000 paper money.
        </Text>
      </View>
    </Wrapper>
  );

  const totalReturn    = portfolio.totalReturn ?? 0;
  const isUp           = totalReturn >= 0;
  const perf           = isUp ? theme.colors.success : theme.colors.danger;
  const investedValue  = portfolio.totalValue - portfolio.currentCash;
  const cashPct        = (portfolio.currentCash / portfolio.totalValue) * 100;

  return (
    <Wrapper style={[s.container, !embedded && { backgroundColor: theme.colors.background }]}>
      {/* Top bar — hidden when embedded, since the host screen (e.g.
          MarketScreen) already renders its own title + tab pills */}
      {!embedded && (
        <View style={s.topBar}>
          <Text style={[s.screenTitle, { color: theme.colors.textPrimary }]}>Portfolio</Text>
          <TouchableOpacity onPress={onBrowsePress} style={[s.investBtn, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.investBtnText}>Invest</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshPrices} tintColor={theme.colors.primary} />}
      >
        {/* ── Balance Hero ── */}
        <SlideUp delay={0}>
          <LinearGradient
            colors={[theme.colors.surfaceElevated, theme.colors.surface]}
            style={[s.balanceCard, { borderColor: theme.colors.border }]}
          >
            {/* performance glow */}
            <LinearGradient
              colors={[perf + '14', 'transparent']}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={[theme.colors.primary + '16', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />

            <Text style={[s.balLabel, { color: theme.colors.textTertiary }]}>TOTAL BALANCE</Text>

            <View style={s.balRow}>
              <Text style={[s.balCurrency, { color: theme.colors.textSecondary }]}>$</Text>
              <AnimatedNumber
                value={portfolio.totalValue}
                formatter={n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                duration={900}
                style={[s.balValue, { color: theme.colors.textPrimary }]}
              />
            </View>

            <View style={s.balChips}>
              <View style={[s.balChip, { backgroundColor: perf + '18' }]}>
                <Text style={[s.balChipLabel, { color: theme.colors.textTertiary }]}>All-time return</Text>
                <Text style={[s.balChipVal, { color: perf }]}>
                  {isUp ? '+' : ''}${Math.abs(totalReturn).toFixed(2)} ({portfolio.totalReturnPercent?.toFixed(2) ?? '0.00'}%)
                </Text>
              </View>
              <View style={[s.balChip, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[s.balChipLabel, { color: theme.colors.textTertiary }]}>Available cash</Text>
                <Text style={[s.balChipVal, { color: theme.colors.textSecondary }]}>
                  ${portfolio.currentCash.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </View>

            {/* Allocation mini bar */}
            <View style={[s.allocMiniTrack, { backgroundColor: theme.colors.border }]}>
              <View style={[s.allocMiniInvested, {
                backgroundColor: theme.colors.primary,
                width: `${100 - cashPct}%`,
              }]} />
            </View>
            <View style={s.allocLegend}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={[s.legendText, { color: theme.colors.textTertiary }]}>
                  Invested {(100 - cashPct).toFixed(0)}%
                </Text>
              </View>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: theme.colors.textTertiary }]} />
                <Text style={[s.legendText, { color: theme.colors.textTertiary }]}>
                  Cash {cashPct.toFixed(0)}%
                </Text>
              </View>
            </View>
          </LinearGradient>
        </SlideUp>

        {/* ── Positions ── */}
        <SlideUp delay={120}>
          <View style={s.sectionRow}>
            <Text style={[s.sectionTitle, { color: theme.colors.textPrimary }]}>
              Positions
            </Text>
            <View style={[s.countBadge, { backgroundColor: theme.colors.primary + '18' }]}>
              <Text style={[s.countText, { color: theme.colors.primary }]}>
                {portfolio.positions.length}
              </Text>
            </View>
          </View>

          {portfolio.positions.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>🌱</Text>
              <Text style={[{ fontSize: 16, fontWeight: '700', marginBottom: 6 }, { color: theme.colors.textPrimary }]}>
                No positions yet
              </Text>
              <Text style={[{ fontSize: 13, textAlign: 'center', lineHeight: 19 }, { color: theme.colors.textSecondary }]}>
                Browse stocks and place your first paper trade.
              </Text>
              <TouchableOpacity onPress={onBrowsePress} style={[s.emptyBtn, { backgroundColor: theme.colors.primary }]}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Browse Stocks</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.positionList}>
              {portfolio.positions.map((pos, i) => (
                <PositionCard
                  key={pos.id}
                  pos={pos}
                  index={i}
                  theme={theme}
                  onPress={() => onStockPress(pos.symbol)}
                />
              ))}
            </View>
          )}
        </SlideUp>

        {/* ── Animated Pie Chart ── */}
        {portfolio.positions.length > 0 && (
          <SlideUp delay={220}>
            <PortfolioPieChart
              positions={portfolio.positions}
              cash={portfolio.currentCash}
              totalValue={portfolio.totalValue}
              theme={theme}
            />
          </SlideUp>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Wrapper>
  );
}

function PositionCard({ pos, index, theme, onPress }: { pos: Position; index: number; theme: any; onPress: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y       = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: 160 + index * 70, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, tension: 180, friction: 24, delay: 160 + index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const up = pos.unrealizedGain >= 0;
  const c  = up ? theme.colors.success : theme.colors.danger;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>
      <AnimatedPressable onPress={onPress} scaleTarget={0.97}
        style={[s.posCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <LinearGradient
          colors={[c + '0A', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <CompanyLogo symbol={pos.symbol} size={46} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
            <Text style={[s.posSym, { color: theme.colors.textPrimary }]}>{pos.symbol}</Text>
            <Text style={[s.posValue, { color: theme.colors.textPrimary }]}>
              ${pos.currentValue.toFixed(2)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
            <Text style={[s.posShares, { color: theme.colors.textTertiary }]}>
              {pos.shares.toFixed(4)} shares
            </Text>
            <View style={[s.posReturnPill, { backgroundColor: c + '18' }]}>
              <Ionicons name={up ? 'caret-up' : 'caret-down'} size={9} color={c} />
              <Text style={[s.posReturn, { color: c }]}>
                {up ? '+' : ''}{pos.unrealizedGain.toFixed(2)} ({pos.unrealizedGainPercent.toFixed(2)}%)
              </Text>
            </View>
          </View>
          <View style={[s.posTrack, { backgroundColor: theme.colors.border }]}>
            <View style={[s.posFill, { backgroundColor: c, width: `${Math.min(100, Math.abs(pos.unrealizedGainPercent))}%` }]} />
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1 },
  topBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  screenTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  investBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  investBtnText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  scroll:      { paddingBottom: 24 },

  // Balance card
  balanceCard: {
    marginHorizontal: 16, borderRadius: 26, borderWidth: 1, padding: 24, marginBottom: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 10,
  },
  balLabel:    { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginBottom: 10 },
  balRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  balCurrency: { fontSize: 22, fontWeight: '700', marginTop: 6, marginRight: 2 },
  balValue:    { fontSize: 50, fontWeight: '800', letterSpacing: -2 },
  balChips:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  balChip:     { flex: 1, borderRadius: 14, padding: 12 },
  balChipLabel:{ fontSize: 10, fontWeight: '500', marginBottom: 4 },
  balChipVal:  { fontSize: 13, fontWeight: '700' },
  allocMiniTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  allocMiniInvested: { height: 5, borderRadius: 3 },
  allocLegend: { flexDirection: 'row', gap: 16 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 6, height: 6, borderRadius: 3 },
  legendText:  { fontSize: 11 },

  // Sections
  sectionRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, marginBottom: 12 },
  sectionTitle:{ fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  countBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countText:   { fontSize: 13, fontWeight: '700' },

  // Positions
  positionList:{ paddingHorizontal: 16, gap: 10 },
  posCard:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  posSym:      { fontSize: 15, fontWeight: '800' },
  posValue:    { fontSize: 15, fontWeight: '700' },
  posShares:   { fontSize: 11 },
  posReturnPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  posReturn:   { fontSize: 11, fontWeight: '700' },
  posTrack:    { height: 3, borderRadius: 2, overflow: 'hidden' },
  posFill:     { height: 3, borderRadius: 2 },

  // Allocation
  allocCard:   { marginHorizontal: 16, borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
  allocRow:    { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, gap: 12, position: 'relative' },
  allocFill:   { position: 'absolute', left: 0, top: 0, bottom: 0 },
  allocSym:    { fontSize: 13, fontWeight: '700', width: 52 },
  allocPct:    { fontSize: 12, flex: 1 },
  allocVal:    { fontSize: 13, fontWeight: '700' },

  // Empty
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle:  { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  emptyBody:   { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  emptyCard:   { marginHorizontal: 16, borderRadius: 22, borderWidth: 1, padding: 28, alignItems: 'center' },
  emptyBtn:    { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
});
