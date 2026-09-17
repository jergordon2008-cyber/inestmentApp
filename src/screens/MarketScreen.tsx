/**
 * MarketScreen — News + Trade Fused
 *
 * Replaces the separate Trade and News tabs with a unified Market view.
 * Philosophy: educated traders use news context to make decisions.
 *
 * Sub-tabs:
 *   Market News  — breaking stories + "Trade This Story" CTAs
 *   Portfolio    — your positions + quick access to trade
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../services/userStore';
import { usePortfolioStore } from '../services/portfolioStore';
import { getTierFilteredNews, getFramingForTier } from '../data/newsFeed';
import { FEATURES } from '../config/features';
import { PortfolioScreen } from './PortfolioScreen';
import { NewsItem } from '../types';
import { fs, sp } from '../constants/responsive';
import { changeColor } from '../utils/change';

type Tab = 'news' | 'portfolio';
type NewsFilter = 'all' | 'high_impact' | 'positive' | 'negative';

interface Props {
  onStockPress:  (symbol: string) => void;
  onTradePress:  (symbol: string, action: 'buy' | 'sell') => void;
  onBrowsePress: () => void;
  // Passed straight through to the embedded PortfolioScreen, which is where
  // the journals are reached from.
  onTradeJournalPress?:    () => void;
  onDecisionJournalPress?: () => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Tab pill using a measured sliding highlight — no centering drift
const TP_MARGIN = sp(16);
const TP_PAD    = sp(4);

function TabPill({ tabs, active, onPress, accent, theme }: {
  tabs: { id: Tab; label: string; icon: IoniconName }[];
  active: Tab;
  onPress: (t: Tab) => void;
  accent: string;
  theme: any;
}) {
  // Measure the real inner width — Dimensions math drifts on iPad and rotation
  const [innerW, setInnerW] = useState(0);
  const btnW  = innerW / tabs.length;
  const pillX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!btnW) return;
    const idx = tabs.findIndex(t => t.id === active);
    Animated.spring(pillX, {
      toValue: idx * btnW,
      tension: 220, friction: 24,
      useNativeDriver: true,
    }).start();
  }, [active, btnW]);

  return (
    <View
      onLayout={e => setInnerW(e.nativeEvent.layout.width - TP_PAD * 2)}
      style={[tp.container, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}
    >
      {btnW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[tp.pill, { width: btnW, backgroundColor: accent, transform: [{ translateX: pillX }] }]}
        />
      )}
      {tabs.map(tab => {
        const isActive = active === tab.id;
        const labelColor = isActive ? '#07070D' : theme.colors.textSecondary;
        return (
          <TouchableOpacity key={tab.id} onPress={() => onPress(tab.id)} style={tp.btn} activeOpacity={0.75}>
            <Ionicons name={tab.icon} size={fs(14)} color={labelColor} style={{ marginRight: sp(5) }} />
            <Text style={[tp.label, { color: labelColor, fontSize: fs(13) }]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tp = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: TP_MARGIN,
    borderRadius: sp(16),
    borderWidth: 1,
    padding: TP_PAD,
    position: 'relative',
    overflow: 'hidden',
  },
  pill:  { position: 'absolute', top: TP_PAD, left: TP_PAD, height: sp(38), borderRadius: sp(12) },
  btn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: sp(38), zIndex: 1, paddingHorizontal: sp(4) },
  label: { fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────────

export function MarketScreen({ onStockPress, onTradePress, onBrowsePress, onTradeJournalPress, onDecisionJournalPress }: Props) {
  const { theme }  = useTheme();
  const user       = useUserStore(s => s.user);
  const portfolio  = usePortfolioStore(s => s.portfolio);
  const tier       = (user?.currentTier ?? 1) as 1 | 2 | 3;

  // With Market News flagged off there is exactly one sub-tab, so land on it.
  const [activeTab, setActiveTab] = useState<Tab>(FEATURES.marketNews ? 'news' : 'portfolio');
  const [filter, setFilter]       = useState<NewsFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Flag off → don't even build the list; the mock feed shouldn't be computed
  // for a surface that isn't rendered.
  let news = FEATURES.marketNews ? getTierFilteredNews(tier, 25) : [];
  if (filter === 'positive')    news = news.filter(n => n.sentiment === 'positive');
  if (filter === 'negative')    news = news.filter(n => n.sentiment === 'negative');
  if (filter === 'high_impact') news = news.filter(n => n.importance >= 4);

  const perf  = changeColor(portfolio?.totalReturn, theme);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          {/* Titled for the tab it now backs — the Portfolio tab, since the
              six-tab bar collapsed to three. */}
          <Text style={[s.title, { color: theme.colors.textPrimary }]}>Portfolio</Text>
          <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
            {FEATURES.marketNews ? 'News · Trade · Positions' : 'Trade · Positions'}
          </Text>
        </View>
        {/* Live indicator — described the news feed, so it goes with the feed.
            Positions carry their own honest "Delayed up to 15 min" label. */}
        {FEATURES.marketNews && (
          <View style={[s.livePill, { backgroundColor: theme.colors.success + '18', borderColor: theme.colors.success + '40' }]}>
            <View style={[s.liveDot, { backgroundColor: theme.colors.success }]} />
            <Text style={[s.liveText, { color: theme.colors.success }]}>LIVE</Text>
          </View>
        )}
      </View>

      {/* ── Sub-tab pills ── only meaningful with two tabs; hidden with news off */}
      {FEATURES.marketNews && (
        <TabPill
          tabs={[
            { id: 'news',      label: 'Market News',   icon: 'newspaper-outline'  },
            { id: 'portfolio', label: 'Your Portfolio', icon: 'pie-chart-outline'  },
          ]}
          active={activeTab}
          onPress={setActiveTab}
          accent={theme.colors.primary}
          theme={theme}
        />
      )}

      {/* ── Content ── news only renders when the flag is on; NewsTab and
          MarketNewsCard below stay intact so flipping the flag restores it. */}
      {FEATURES.marketNews && activeTab === 'news' ? (
        <NewsTab
          news={news}
          filter={filter}
          setFilter={setFilter}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          tier={tier}
          onStockPress={onStockPress}
          onTradePress={onTradePress}
          theme={theme}
        />
      ) : (
        <View style={{ flex: 1, marginTop: sp(12) }}>
          <PortfolioScreen
            embedded
            onBack={() => setActiveTab('news')}
            onStockPress={onStockPress}
            onBrowsePress={onBrowsePress}
            onTradeJournalPress={onTradeJournalPress}
            onDecisionJournalPress={onDecisionJournalPress}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// ── News Tab ──────────────────────────────────────────────────────────────────

function NewsTab({ news, filter, setFilter, expandedId, setExpandedId, tier, onStockPress, onTradePress, theme }: any) {
  // Switching filter swaps the list contents underneath a scroll position that
  // belonged to the previous filter, landing the reader mid-list.
  const listRef = useRef<ScrollView>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ y: 0, animated: false });
  }, [filter]);

  const filters: { id: NewsFilter; label: string; icon: IoniconName }[] = [
    { id: 'all',         label: 'All',        icon: 'globe-outline'         },
    { id: 'high_impact', label: 'High Impact', icon: 'flash-outline'         },
    { id: 'positive',    label: 'Bullish',     icon: 'trending-up-outline'   },
    { id: 'negative',    label: 'Bearish',     icon: 'trending-down-outline' },
  ];

  return (
    <>
      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow} style={{ marginTop: sp(14), flexGrow: 0 }}>
        {filters.map((f: any) => {
          const active = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[s.filterChip, {
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                borderColor: active ? theme.colors.primary : theme.colors.border,
              }]}
            >
              <Ionicons name={f.icon} size={fs(12)} color={active ? '#07070D' : theme.colors.textSecondary} />
              <Text numberOfLines={1} style={[s.filterText, { color: active ? '#07070D' : theme.colors.textSecondary, fontSize: fs(12) }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Trade this story tip */}
      <View style={[s.tradeTip, { backgroundColor: theme.colors.primaryGlow, borderColor: theme.colors.primary + '25' }]}>
        <Ionicons name="bulb-outline" size={14} color={theme.colors.primary} />
        <Text style={[s.tradeTipText, { color: theme.colors.textSecondary }]}>
          Tap <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Trade Story</Text> to act on any news event instantly.
        </Text>
      </View>

      {/* News list */}
      <ScrollView ref={listRef} style={{ flex: 1 }} contentContainerStyle={s.newsScroll} showsVerticalScrollIndicator={false}>
        {news.map((item: NewsItem) => (
          <MarketNewsCard
            key={item.id}
            item={item}
            tier={tier}
            expanded={expandedId === item.id}
            onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
            onStockPress={onStockPress}
            onTradePress={onTradePress}
            theme={theme}
          />
        ))}
        <View style={{ height: 48 }} />
      </ScrollView>
    </>
  );
}

// ── Market News Card ──────────────────────────────────────────────────────────

function MarketNewsCard({ item, tier, expanded, onPress, onStockPress, onTradePress, theme }: {
  item: NewsItem; tier: 1|2|3; expanded: boolean;
  onPress: () => void; onStockPress: (s: string) => void;
  onTradePress: (s: string, a: 'buy'|'sell') => void; theme: any;
}) {
  const framing   = getFramingForTier(item, tier);  // returns tier-appropriate string
  const sentColor = item.sentiment === 'positive' ? theme.colors.success
    : item.sentiment === 'negative' ? theme.colors.danger
    : theme.colors.textTertiary;
  const categoryLabel = item.sentiment === 'positive' ? 'BULLISH'
    : item.sentiment === 'negative' ? 'BEARISH' : 'NEUTRAL';

  const expandA = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(expandA, { toValue: expanded ? 1 : 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [expanded]);
  const expandH = expandA.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.newsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Sentiment line */}
      <View style={[s.sentimentBar, { backgroundColor: sentColor }]} />

      <View style={s.newsCardInner}>
        {/* Top row: sentiment badge + importance dots + time */}
        <View style={s.newsCardTop}>
          <View style={[s.categoryChip, { backgroundColor: sentColor + '18' }]}>
            <Text style={[s.categoryText, { color: sentColor }]}>{categoryLabel}</Text>
          </View>
          {Array.from({ length: Math.min(5, item.importance) }).map((_, i) => (
            <Ionicons key={i} name="ellipse" size={5} color={sentColor} />
          ))}
          <View style={{ flex: 1 }} />
          <Text style={[s.timeAgo, { color: theme.colors.textTertiary }]}>{item.publishedAt}</Text>
        </View>

        {/* Headline */}
        <Text style={[s.newsHeadline, { color: theme.colors.textPrimary }]} numberOfLines={expanded ? 0 : 2}>
          {item.headline}
        </Text>

        {/* Tier-appropriate framing / summary */}
        <Text style={[s.newsContext, { color: theme.colors.textSecondary }]} numberOfLines={expanded ? 0 : 2}>
          {framing}
        </Text>

        {/* Related symbols */}
        {item.relatedSymbols.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.symbolsRow}>
            {item.relatedSymbols.map(sym => (
              <TouchableOpacity key={sym} onPress={() => onStockPress(sym)} style={[s.symbolChip, { backgroundColor: theme.colors.primaryGlow, borderColor: theme.colors.primary + '30' }]}>
                <Text style={[s.symbolText, { color: theme.colors.primary }]}>{sym}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Expanded: full summary + Trade this story CTA */}
        <Animated.View style={{ overflow: 'hidden', maxHeight: expandH }}>
          <View style={[s.expandedBox, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
            <Text style={[s.expandedLabel, { color: theme.colors.textTertiary }]}>WHAT IT MEANS FOR YOU</Text>
            <Text style={[s.expandedText, { color: theme.colors.textSecondary }]}>{item.summary}</Text>
          </View>

          {/* Form your own view — replaces a prior "Trade this story" shortcut
              that auto-picked buy/sell from the article's sentiment tag,
              handing the user a verdict in a product whose whole point is
              teaching them to form their own. */}
          <View style={[s.reasoningBox, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
            <Text style={[s.reasoningLabel, { color: theme.colors.textTertiary }]}>BEFORE YOU ACT, ASK:</Text>
            <Text style={[s.reasoningQ, { color: theme.colors.textSecondary }]}>• What would confirm this story is right?</Text>
            <Text style={[s.reasoningQ, { color: theme.colors.textSecondary }]}>• What would prove it wrong?</Text>
          </View>
          {item.relatedSymbols.length > 0 && (
            <View style={s.tradeRow}>
              <Ionicons name="search" size={13} color={theme.colors.textTertiary} />
              <Text style={[s.tradeRowLabel, { color: theme.colors.textTertiary }]}>Research the names above, then decide for yourself.</Text>
            </View>
          )}
        </Animated.View>

        {/* Expand / collapse */}
        <View style={s.expandRow}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textTertiary} />
          <Text style={[s.expandText, { color: theme.colors.textTertiary }]}>
            {expanded ? 'Less' : 'Analysis + Trade'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  title:     { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  subtitle:  { fontSize: 12, marginTop: 2 },
  livePill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  liveDot:   { width: 7, height: 7, borderRadius: 3.5 },
  liveText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  // Filter row
  filtersRow: { paddingHorizontal: sp(16), gap: sp(8), paddingBottom: sp(4), alignItems: 'center' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp(5),
    paddingHorizontal: sp(14), height: sp(34),
    borderRadius: sp(17), borderWidth: 1,
  },
  filterText: { fontWeight: '700', includeFontPadding: false },

  // Trade tip
  tradeTip:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10, marginBottom: 2, padding: 11, borderRadius: 12, borderWidth: 1 },
  tradeTipText: { fontSize: 12, lineHeight: 17, flex: 1 },

  // News scroll
  newsScroll: { paddingHorizontal: 16, paddingTop: 12 },

  // News card
  newsCard:       { borderRadius: 18, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  sentimentBar:   { height: 3 },
  newsCardInner:  { padding: 14 },
  newsCardTop:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  categoryChip:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  categoryText:   { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  timeAgo:        { fontSize: 10, fontWeight: '500' },
  newsHeadline:   { fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 6 },
  newsContext:    { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  symbolsRow:     { gap: 6, marginBottom: 8 },
  symbolChip:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  symbolText:     { fontSize: 12, fontWeight: '700' },
  expandedBox:    { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  expandedLabel:  { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 5 },
  expandedText:   { fontSize: 12, lineHeight: 18 },
  reasoningBox:   { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  reasoningLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  reasoningQ:     { fontSize: 12, lineHeight: 18 },
  tradeRow:       { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tradeRowLabel:  { fontSize: 11, fontWeight: '600' },
  tradeStoryBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  tradeStoryText: { fontSize: 11, fontWeight: '700' },
  expandRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 6 },
  expandText:     { fontSize: 11, fontWeight: '600' },

  // Portfolio tab
  portScroll:   { paddingHorizontal: 16, paddingTop: 16 },
  portCard:     { borderRadius: 22, borderWidth: 1, padding: 20, marginBottom: 16, overflow: 'hidden' },
  portLabel:    { fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginBottom: 8 },
  portCurrency: { fontSize: 20, fontWeight: '600', marginBottom: 2 },
  portValue:    { fontSize: 36, fontWeight: '800', letterSpacing: -1.5, lineHeight: 40 },
  portReturn:   { fontSize: 14, fontWeight: '700', marginTop: 4, marginBottom: 14 },
  portMetaRow:  { flexDirection: 'row', gap: 8 },
  portMeta:     { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  portMetaLabel:{ fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  portMetaVal:  { fontSize: 14, fontWeight: '800' },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  qBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, shadowOffset:{width:0,height:6}, shadowOpacity:0.4, shadowRadius:12, elevation:6 },
  qBtnText:     { fontSize: 14, fontWeight: '800', color: '#07070D' },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  posRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 8 },
  posSymbolBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  posSymbol:    { fontSize: 11, fontWeight: '800' },
  posName:      { fontSize: 13, fontWeight: '700' },
  posAvg:       { fontSize: 11, fontWeight: '500' },
  posValue:     { fontSize: 14, fontWeight: '700' },
  posReturn:    { fontSize: 12, fontWeight: '700' },
  sellBtn:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, borderWidth: 1 },
  sellBtnText:  { fontSize: 11, fontWeight: '700' },
  emptyPort:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle:   { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySub:     { fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
