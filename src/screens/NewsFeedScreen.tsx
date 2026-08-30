import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../services/userStore';
import { Card } from '../components/Card';
import { NewsItem } from '../types';
import { getTierFilteredNews, getFramingForTier } from '../data/newsFeed';

interface Props { onSymbolPress?: (symbol: string) => void; }

type NewsFilter = 'all' | 'positive' | 'negative' | 'high_impact';

const MARKET_IMPACT_DATA: Record<string, {
  shortTerm: string;
  sectors: { name: string; direction: 'up' | 'down' | 'neutral'; reason: string }[];
  tradingIdea: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
}> = {
  'news_001': {
    shortTerm: 'Semiconductor stocks likely to see momentum buying tomorrow. Watch for AI-adjacent plays.',
    sectors: [
      { name: 'Technology', direction: 'up', reason: 'AI chip demand validates sector thesis' },
      { name: 'Utilities', direction: 'neutral', reason: 'Data center power demand positive but indirect' },
      { name: 'Memory (MU)', direction: 'up', reason: 'Rising tide lifts chip peers' },
    ],
    tradingIdea: 'Consider NVDA, AMD, AVGO on any pullback. Avoid chasing the initial gap up.',
    riskLevel: 'medium',
    confidence: 78,
  },
  'news_002': {
    shortTerm: 'Rate-sensitive sectors to rally on dovish Fed signal. Bonds and long-duration assets benefit most.',
    sectors: [
      { name: 'Real Estate (REITs)', direction: 'up', reason: 'Lower rates = cheaper financing, higher valuations' },
      { name: 'Homebuilders', direction: 'up', reason: 'Mortgage affordability improves with rate cuts' },
      { name: 'Banks (KRE)', direction: 'down', reason: 'Net interest margin compression from rate cuts' },
    ],
    tradingIdea: 'Long TLT (bonds) and VNQ (REITs) if you believe in 2026 cut narrative.',
    riskLevel: 'medium',
    confidence: 65,
  },
  'news_003': {
    shortTerm: 'AAPL flat to slightly positive. Services growth thesis intact but China risk keeps lid on upside.',
    sectors: [
      { name: 'Services (AAPL)', direction: 'up', reason: 'Services now 25% of revenue, 38% of gross profit' },
      { name: 'China Tech ADRs', direction: 'neutral', reason: 'AAPL China weakness ≠ Chinese consumer collapse' },
      { name: 'Spotify, Netflix', direction: 'up', reason: 'Apple Services rival platforms get attention' },
    ],
    tradingIdea: 'Hold AAPL. Not a buy-the-news event but thesis intact for patient holders.',
    riskLevel: 'low',
    confidence: 72,
  },
};

function getDefaultImpact(item: NewsItem) {
  const isPositive = item.sentiment === 'positive';
  return {
    shortTerm: isPositive
      ? `${item.relatedSymbols[0] ?? 'Market'} likely to see buying pressure. Monitor volume for confirmation.`
      : `Watch for selling pressure in ${item.relatedSymbols[0] ?? 'related sectors'}. Risk-off tone possible.`,
    sectors: item.relatedSymbols.slice(0, 2).map(sym => ({
      name: sym,
      direction: isPositive ? 'up' as const : 'down' as const,
      reason: isPositive ? 'Positive catalyst drives momentum' : 'Negative catalyst creates headwinds',
    })),
    tradingIdea: isPositive
      ? 'Wait for the initial reaction to settle before entering. Gap-up opens often fade intraday.'
      : 'Consider defensive positioning or small hedge. Avoid catching the falling knife.',
    riskLevel: item.importance >= 4 ? 'high' as const : 'medium' as const,
    confidence: 40 + item.importance * 8,
  };
}

export function NewsFeedScreen({ onSymbolPress }: Props) {
  const { theme } = useTheme();
  const user = useUserStore(s => s.user);
  const tier = user?.currentTier ?? 1;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<NewsFilter>('all');
  const [showImpactFor, setShowImpactFor] = useState<string | null>(null);
  const s = styles(theme);

  let news = getTierFilteredNews(tier, 20);
  if (filter === 'positive') news = news.filter(n => n.sentiment === 'positive');
  if (filter === 'negative') news = news.filter(n => n.sentiment === 'negative');
  if (filter === 'high_impact') news = news.filter(n => n.importance >= 4);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Market News</Text>
        <Text style={s.subtitle}>
          {tier === 1 ? 'Plain language • What it means for you' : tier === 2 ? 'Analysis + Impact' : 'Pro-level framing + Trade ideas'}
        </Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        {([
          { id: 'all', label: 'All News', icon: '📰' },
          { id: 'high_impact', label: 'High Impact', icon: '⚡' },
          { id: 'positive', label: 'Bullish', icon: '🟢' },
          { id: 'negative', label: 'Bearish', icon: '🔴' },
        ] as { id: NewsFilter; label: string; icon: string }[]).map(f => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[s.filterChip, filter === f.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
          >
            <Text style={s.filterIcon}>{f.icon}</Text>
            <Text style={[s.filterText, { color: filter === f.id ? '#fff' : theme.colors.textSecondary }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Market Impact Banner */}
      <View style={[s.impactBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={s.impactBannerIcon}>🎯</Text>
        <Text style={[s.impactBannerText, { color: theme.colors.textSecondary }]}>
          Tap <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Market Impact</Text> on any story to see how it may affect your investments.
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {news.map(item => (
          <NewsCard
            key={item.id}
            item={item}
            tier={tier}
            expanded={expandedId === item.id}
            showingImpact={showImpactFor === item.id}
            onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
            onImpactPress={() => setShowImpactFor(showImpactFor === item.id ? null : item.id)}
            onSymbolPress={onSymbolPress}
            theme={theme}
          />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function NewsCard({ item, tier, expanded, showingImpact, onPress, onImpactPress, onSymbolPress, theme }: {
  item: NewsItem; tier: 1 | 2 | 3; expanded: boolean; showingImpact: boolean;
  onPress: () => void; onImpactPress: () => void; onSymbolPress?: (s: string) => void; theme: any;
}) {
  const s = styles(theme);
  const framing = getFramingForTier(item, tier);
  const impact = MARKET_IMPACT_DATA[item.id] ?? getDefaultImpact(item);

  const sentimentColor =
    item.sentiment === 'positive' ? theme.colors.success :
    item.sentiment === 'negative' ? theme.colors.danger :
    theme.colors.textSecondary;

  const importanceBar = '█'.repeat(item.importance) + '░'.repeat(5 - item.importance);

  return (
    <Card style={s.card}>
      {/* Header row */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View style={s.cardTop}>
          <View style={[s.sourceBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[s.sourceText, { color: theme.colors.textSecondary }]}>{item.source}</Text>
          </View>
          <View style={s.cardTopRight}>
            <Text style={[s.importanceBar, { color: sentimentColor }]}>{importanceBar}</Text>
            <Text style={[s.timeText, { color: theme.colors.textTertiary }]}>{getTimeAgo(item.publishedAt)}</Text>
          </View>
        </View>

        <Text style={[s.headline, { color: theme.colors.textPrimary }]}>{item.headline}</Text>

        <Text style={[s.framing, { color: theme.colors.textSecondary }]} numberOfLines={expanded ? undefined : 3}>
          {framing}
        </Text>

        {!expanded && (
          <Text style={[s.readMore, { color: theme.colors.primary }]}>Tap to read more ↓</Text>
        )}
      </TouchableOpacity>

      {/* Symbols + Sentiment */}
      <View style={s.cardFooter}>
        <View style={s.symbolsRow}>
          {item.relatedSymbols.slice(0, 4).map(sym => (
            <TouchableOpacity
              key={sym}
              onPress={() => onSymbolPress?.(sym)}
              style={[s.symbolChip, { backgroundColor: theme.colors.primaryGlow }]}
            >
              <Text style={[s.symbolText, { color: theme.colors.primary }]}>${sym}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[s.sentimentPill, { backgroundColor: sentimentColor + '20' }]}>
          <View style={[s.sentimentDot, { backgroundColor: sentimentColor }]} />
          <Text style={[s.sentimentText, { color: sentimentColor }]}>
            {item.sentiment === 'positive' ? 'Bullish' : item.sentiment === 'negative' ? 'Bearish' : 'Neutral'}
          </Text>
        </View>
      </View>

      {/* Market Impact Button */}
      <TouchableOpacity
        onPress={onImpactPress}
        style={[s.impactBtn, { backgroundColor: showingImpact ? theme.colors.primary : theme.colors.surfaceMuted, borderColor: showingImpact ? theme.colors.primary : theme.colors.border }]}
      >
        <Text style={s.impactBtnIcon}>🎯</Text>
        <Text style={[s.impactBtnText, { color: showingImpact ? '#fff' : theme.colors.textSecondary }]}>
          {showingImpact ? 'Hide Market Impact' : 'Show Market Impact'}
        </Text>
        <Text style={[s.impactBtnChevron, { color: showingImpact ? '#fff' : theme.colors.textTertiary }]}>
          {showingImpact ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Market Impact Panel */}
      {showingImpact && (
        <View style={[s.impactPanel, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
          {/* Confidence */}
          <View style={s.impactConfRow}>
            <Text style={[s.impactLabel, { color: theme.colors.textTertiary }]}>AI Confidence</Text>
            <View style={s.confBarWrap}>
              <View style={[s.confBarTrack, { backgroundColor: theme.colors.border }]}>
                <View style={[s.confBarFill, {
                  width: `${impact.confidence}%`,
                  backgroundColor: impact.confidence > 70 ? theme.colors.success : impact.confidence > 50 ? '#F59E0B' : theme.colors.danger
                }]} />
              </View>
              <Text style={[s.confPct, { color: theme.colors.textSecondary }]}>{impact.confidence}%</Text>
            </View>
          </View>

          {/* Short-term Outlook */}
          <View style={s.impactBlock}>
            <Text style={[s.impactBlockTitle, { color: theme.colors.textPrimary }]}>📊 Short-Term Outlook</Text>
            <Text style={[s.impactBlockText, { color: theme.colors.textSecondary }]}>{impact.shortTerm}</Text>
          </View>

          {/* Sector Impact */}
          <View style={s.impactBlock}>
            <Text style={[s.impactBlockTitle, { color: theme.colors.textPrimary }]}>🏗️ Sector Impact</Text>
            {impact.sectors.map((sec, i) => (
              <View key={i} style={s.sectorRow}>
                <Text style={[s.sectorDir, {
                  color: sec.direction === 'up' ? theme.colors.success : sec.direction === 'down' ? theme.colors.danger : theme.colors.textSecondary
                }]}>
                  {sec.direction === 'up' ? '▲' : sec.direction === 'down' ? '▼' : '→'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sectorName, { color: theme.colors.textPrimary }]}>{sec.name}</Text>
                  <Text style={[s.sectorReason, { color: theme.colors.textSecondary }]}>{sec.reason}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Trading Idea */}
          <View style={[s.tradeIdeaBox, {
            backgroundColor: impact.riskLevel === 'low' ? theme.colors.success + '12' : impact.riskLevel === 'medium' ? '#F59E0B12' : theme.colors.danger + '12',
            borderColor: impact.riskLevel === 'low' ? theme.colors.success + '30' : impact.riskLevel === 'medium' ? '#F59E0B30' : theme.colors.danger + '30',
          }]}>
            <View style={s.tradeIdeaHeader}>
              <Text style={[s.tradeIdeaTitle, { color: theme.colors.textPrimary }]}>💡 Trading Idea</Text>
              <View style={[s.riskBadge, {
                backgroundColor: impact.riskLevel === 'low' ? theme.colors.success + '20' : impact.riskLevel === 'medium' ? '#F59E0B20' : theme.colors.danger + '20',
              }]}>
                <Text style={[s.riskBadgeText, {
                  color: impact.riskLevel === 'low' ? theme.colors.success : impact.riskLevel === 'medium' ? '#F59E0B' : theme.colors.danger
                }]}>
                  {impact.riskLevel.toUpperCase()} RISK
                </Text>
              </View>
            </View>
            <Text style={[s.tradeIdeaText, { color: theme.colors.textSecondary }]}>{impact.tradingIdea}</Text>
          </View>

          <Text style={[s.disclaimer, { color: theme.colors.textTertiary }]}>
            ⚠️ Not financial advice. Educational simulation only.
          </Text>
        </View>
      )}
    </Card>
  );
}

function getTimeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -1, marginBottom: 4 },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary },

  filterScroll: { flexGrow: 0, marginBottom: 10 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1,
    borderColor: theme.colors.border, backgroundColor: theme.colors.surface,
  },
  filterIcon: { fontSize: 12 },
  filterText: { fontSize: 12, fontWeight: '600' },

  impactBanner: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 12,
    flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1,
  },
  impactBannerIcon: { fontSize: 16 },
  impactBannerText: { flex: 1, fontSize: 12, lineHeight: 18 },

  scroll: { paddingHorizontal: 16 },
  card: { marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  sourceText: { fontSize: 11, fontWeight: '600' },
  importanceBar: { fontSize: 9, letterSpacing: 1.5 },
  timeText: { fontSize: 11 },
  headline: { fontSize: 16, fontWeight: '800', lineHeight: 23, marginBottom: 8, letterSpacing: -0.2 },
  framing: { fontSize: 14, lineHeight: 22 },
  readMore: { fontSize: 12, fontWeight: '600', marginTop: 8 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  symbolsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  symbolChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  symbolText: { fontSize: 12, fontWeight: '700' },
  sentimentPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  sentimentDot: { width: 6, height: 6, borderRadius: 3 },
  sentimentText: { fontSize: 11, fontWeight: '700' },

  impactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, marginTop: 4,
  },
  impactBtnIcon: { fontSize: 14 },
  impactBtnText: { flex: 1, fontSize: 13, fontWeight: '600' },
  impactBtnChevron: { fontSize: 11 },

  impactPanel: { marginTop: 12, borderRadius: 16, padding: 16, borderWidth: 1, gap: 14 },
  impactConfRow: { gap: 6 },
  impactLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  confBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confBarTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  confBarFill: { height: 5, borderRadius: 3 },
  confPct: { fontSize: 12, fontWeight: '700', width: 32 },
  impactBlock: { gap: 8 },
  impactBlockTitle: { fontSize: 13, fontWeight: '700' },
  impactBlockText: { fontSize: 13, lineHeight: 20 },

  sectorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  sectorDir: { fontSize: 14, fontWeight: '900', marginTop: 1 },
  sectorName: { fontSize: 13, fontWeight: '600' },
  sectorReason: { fontSize: 12, lineHeight: 17 },

  tradeIdeaBox: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  tradeIdeaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeIdeaTitle: { fontSize: 13, fontWeight: '700' },
  riskBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  riskBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  tradeIdeaText: { fontSize: 13, lineHeight: 20 },
  disclaimer: { fontSize: 10, fontStyle: 'italic' },
});
