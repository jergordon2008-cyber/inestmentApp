import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { changeCaret, changeColor, changeSign, changeTone } from '../utils/change';
import { useTheme } from '../context/ThemeContext';
import { usePortfolioStore } from '../services/portfolioStore';
import { fetchStock, getDataSourceLabel } from '../services/marketDataFacade';
import { getSignalsForStock } from '../services/signalEngine';
import { CompanyLogo } from '../components/CompanyLogo';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { Stock, Signal } from '../types';

const BLUE_CHIP_SYMBOLS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'BRK.B', 'JNJ', 'V',
  'WMT', 'JPM', 'PG', 'MA', 'HD', 'CVX', 'KO', 'PEP', 'MRK', 'ABBV',
  'TMO', 'COST', 'AVGO', 'NKE', 'MCD', 'CSCO', 'DIS', 'ADBE', 'XOM', 'BAC', 'UNH',
]);

interface Props {
  symbol: string;
  onBack: () => void;
  onTrade: (symbol: string, action: 'buy' | 'sell') => void;
  onLessonPress: (lessonId: string) => void;
}

export function StockDetailScreen({ symbol, onBack, onTrade, onLessonPress }: Props) {
  const { theme } = useTheme();
  const portfolio = usePortfolioStore(s => s.portfolio);
  const [stock, setStock] = useState<Stock | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  // The earnings signal needs a network call, so the Signals tab has a real
  // loading state rather than flashing "No signals" before the answer lands.
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'stats' | 'signals'>('overview');
  const s = styles(theme);

  useEffect(() => {
    let cancelled = false;
    fetchStock(symbol).then(setStock);
    setSignalsLoading(true);
    getSignalsForStock(symbol)
      .then(result => { if (!cancelled) setSignals(result); })
      .catch(() => { if (!cancelled) setSignals([]); })
      .finally(() => { if (!cancelled) setSignalsLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  if (!stock) return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backRow}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
          <Text style={[s.back, { color: theme.colors.primary }]}>Back</Text>
        </TouchableOpacity>
      </View>
      <Text style={[{ padding: 20, color: theme.colors.textSecondary }]}>Loading...</Text>
    </SafeAreaView>
  );

  const position = portfolio?.positions.find(p => p.symbol === symbol);
  const changeCaretName = changeCaret(stock.changePercent);
  const color = changeTone(stock.changePercent) === 'up'
    ? theme.colors.primary
    : changeColor(stock.changePercent, theme);
  const isBlueChip = BLUE_CHIP_SYMBOLS.has(symbol);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={{ width: 44 }}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerSym, { color: theme.colors.textPrimary }]}>{symbol}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Identity */}
        <View style={s.identity}>
          <CompanyLogo symbol={symbol} size={52} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[s.compName, { color: theme.colors.textPrimary }]}>{stock.name}</Text>
              {isBlueChip && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1D4ED820', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 }}>
                  <Ionicons name="diamond" size={10} color="#60A5FA" />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#60A5FA', letterSpacing: 0.5 }}>BLUE CHIP</Text>
                </View>
              )}
            </View>
            <View style={s.identityMeta}>
              <View style={[s.sectorPill, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[s.sectorText, { color: theme.colors.textTertiary }]}>{stock.sector}</Text>
              </View>
              <View style={[s.exchangePill, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[s.exchangeText, { color: theme.colors.textTertiary }]}>{stock.exchange}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Price */}
        <View style={[s.priceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong }]}>
          <View style={s.priceRow}>
            <View>
              <Text style={[s.price, { color: theme.colors.textPrimary }]}>${stock.price.toFixed(2)}</Text>
              <View style={[s.changePill, s.changePillRow, { backgroundColor: color + '18' }]}>
                {changeCaretName && <Ionicons name={changeCaretName} size={11} color={color} />}
                <Text style={[s.change, { color }]}>
                  ${Math.abs(stock.change).toFixed(2)}  ({changeSign(stock.changePercent)}{stock.changePercent.toFixed(2)}%)
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.mcapLabel, { color: theme.colors.textTertiary }]}>Market Cap</Text>
              <Text style={[s.mcap, { color: theme.colors.textSecondary }]}>
                ${(stock.marketCap / 1e12).toFixed(2)}T
              </Text>
            </View>
          </View>

          <Text style={[s.mcapLabel, { color: theme.colors.textTertiary, marginTop: -8 }]}>
            {getDataSourceLabel(stock)}
          </Text>
        </View>

        {/* Position Banner */}
        {position && (
          <View style={[s.positionBanner, s.positionBannerRow, { backgroundColor: theme.colors.primaryGlow, borderColor: theme.colors.primary + '30' }]}>
            <Ionicons name="checkmark" size={13} color={theme.colors.primary} style={{ marginTop: 1 }} />
            <Text style={[s.positionText, { flex: 1, color: theme.colors.primary }]}>
              You own {position.shares.toFixed(4)} shares · Avg ${position.averageCost.toFixed(2)} ·{' '}
              <Text style={{ color: changeColor(position.unrealizedGain, theme) }}>
                {changeSign(position.unrealizedGain)}{position.unrealizedGain.toFixed(2)} ({position.unrealizedGainPercent.toFixed(2)}%)
              </Text>
            </Text>
          </View>
        )}

        {/* Buy / Sell Buttons */}
        <View style={s.tradeRow}>
          <AnimatedPressable onPress={() => onTrade(symbol, 'buy')} style={[s.buyBtn, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}>
            <Ionicons name="arrow-up" size={14} color="#fff" />
            <Text style={s.buyBtnText} numberOfLines={1}>Buy {symbol}</Text>
          </AnimatedPressable>
          {position && (
            <AnimatedPressable onPress={() => onTrade(symbol, 'sell')} style={[s.sellBtn, { backgroundColor: theme.colors.danger + '15', borderColor: theme.colors.danger + '40' }]}>
              <Ionicons name="arrow-down" size={14} color={theme.colors.danger} />
              <Text style={[s.sellBtnText, { color: theme.colors.danger }]}>Sell</Text>
            </AnimatedPressable>
          )}
        </View>

        {/* Tabs */}
        <View style={[s.tabRow, { borderBottomColor: theme.colors.border }]}>
          {(['overview', 'stats', 'signals'] as const).map(t => (
            <TouchableOpacity key={t} onPress={() => setTab(t)}
              style={[s.tabBtn, tab === t && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}>
              <Text style={[s.tabText, { color: tab === t ? theme.colors.primary : theme.colors.textTertiary }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {tab === 'overview' && (
          <View style={s.statsGrid}>
            {/* Only fields the live quote actually supplies. P/E, EPS, Dividend,
                Beta, 52W High/Low and Volume used to sit here rendering '—' on
                every stock — Finnhub's free tier doesn't return them (see
                finnhubAdapter), so the cards are gone rather than empty. */}
            {[
              { label: 'Day Range',      val: `$${stock.dayLow?.toFixed(2)} – $${stock.dayHigh?.toFixed(2)}` },
              { label: 'Previous Close', val: `$${stock.previousClose?.toFixed(2)}` },
            ].map(row => (
              <View key={row.label} style={[s.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>{row.label}</Text>
                <Text style={[s.statVal, { color: theme.colors.textPrimary }]}>{row.val}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'stats' && (
          <View style={[s.fundamentalsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Same rule as Overview: P/E, PEG, EPS, Dividend Yield and Beta
                aren't in the free tier's payload, so they aren't rendered. */}
            {[
              { label: 'Market Cap',     val: `$${(stock.marketCap / 1e9).toFixed(1)}B` },
              { label: 'Exchange',       val: stock.exchange ?? '—' },
              { label: 'Industry',       val: stock.industry ?? '—' },
            ].map((row, i, rows) => (
              <View key={row.label} style={[s.fundamentalRow, { borderBottomColor: theme.colors.border, borderBottomWidth: i < rows.length - 1 ? 0.5 : 0 }]}>
                <Text style={[s.fundamentalLabel, { color: theme.colors.textSecondary }]}>{row.label}</Text>
                <Text style={[s.fundamentalVal, { color: theme.colors.textPrimary }]}>{row.val}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'signals' && (
          <View>
            {signalsLoading ? (
              <Text style={[{ padding: 20, color: theme.colors.textTertiary, textAlign: 'center' }]}>Checking recent earnings for {symbol}…</Text>
            ) : signals.length === 0 ? (
              <Text style={[{ padding: 20, color: theme.colors.textTertiary, textAlign: 'center' }]}>No signals for {symbol} yet.</Text>
            ) : signals.map(sig => (
              <View key={sig.id} style={[s.signalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[s.signalTitle, { color: theme.colors.textPrimary }]}>{sig.title}</Text>
                <Text style={[s.signalBody, { color: theme.colors.textSecondary }]}>{sig.description}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container:  { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  back:       { fontSize: 22, fontWeight: '400' },
  headerSym:  { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800' },
  scroll:     { paddingHorizontal: 16 },
  identity:   { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  compName:   { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  identityMeta:{ flexDirection: 'row', gap: 8 },
  sectorPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sectorText: { fontSize: 11, fontWeight: '600' },
  exchangePill:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  exchangeText:{ fontSize: 11, fontWeight: '600' },
  priceCard:  { borderRadius: 22, borderWidth: 1, padding: 18, marginBottom: 14 },
  priceRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  price:      { fontSize: 38, fontWeight: '900', letterSpacing: -1.5 },
  changePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginTop: 6, alignSelf: 'flex-start' },
  changePillRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  change:     { fontSize: 13, fontWeight: '700' },
  mcapLabel:  { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 3 },
  mcap:       { fontSize: 16, fontWeight: '700' },
  positionBanner:{ borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 14 },
  positionBannerRow:{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  backRow:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  positionText:  { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  tradeRow:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  buyBtn:     { flex: 1, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center',
                shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 5 },
  buyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  sellBtn:    { flex: 1, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  sellBtnText:{ fontSize: 15, fontWeight: '700', textAlign: 'center' },
  tabRow:     { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 14 },
  tabBtn:     { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText:    { fontSize: 13, fontWeight: '700' },
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard:   { width: '47.5%', borderRadius: 14, borderWidth: 1, padding: 14 },
  statLabel:  { fontSize: 11, marginBottom: 4 },
  statVal:    { fontSize: 16, fontWeight: '800' },
  fundamentalsCard:{ borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  fundamentalRow:  { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  fundamentalLabel:{ fontSize: 14 },
  fundamentalVal:  { fontSize: 14, fontWeight: '700' },
  signalCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  signalTitle:{ fontSize: 14, fontWeight: '700', marginBottom: 4 },
  signalBody: { fontSize: 13, lineHeight: 19 },
});
