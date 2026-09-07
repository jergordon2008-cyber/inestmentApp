/**
 * Stock Browser Screen
 * 
 * Users search and discover stocks here. Filters by:
 * - Sector
 * - Search query (symbol or name)
 * - Currently has active signals
 * 
 * Tier 1 users see only the curated blue-chip list (no penny stocks, no meme stocks).
 * This prevents new investors from making risky picks before they're ready.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/Card';
import { searchStocks, fetchAllTier1, getAllSectors, getStocksBySector } from '../services/marketDataFacade';
import { Stock } from '../types';

const BLUE_CHIP_SYMBOLS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'BRK.B', 'JNJ', 'V',
  'WMT', 'JPM', 'PG', 'MA', 'HD', 'CVX', 'KO', 'PEP', 'MRK', 'ABBV',
  'TMO', 'COST', 'AVGO', 'NKE', 'MCD', 'CSCO', 'DIS', 'ADBE', 'XOM', 'BAC', 'UNH',
]);

// ── Filter types ──────────────────────────────────────────────────────────────
type MarketCapFilter = 'all' | 'large' | 'mid' | 'small' | 'micro';
type DividendFilter  = 'all' | 'has' | 'high';
type PERatioFilter   = 'all' | 'value' | 'blend' | 'growth' | 'negative';
type BetaFilter      = 'all' | 'low' | 'medium' | 'high';

interface Filters {
  marketCap: MarketCapFilter;
  dividend: DividendFilter;
  peRatio: PERatioFilter;
  beta: BetaFilter;
}

const DEFAULT_FILTERS: Filters = { marketCap: 'all', dividend: 'all', peRatio: 'all', beta: 'all' };

function applyFilters(stocks: Stock[], f: Filters): Stock[] {
  return stocks.filter(s => {
    if (f.marketCap !== 'all') {
      const cap = s.marketCap ?? 0;
      if (f.marketCap === 'large'  && cap < 10e9)  return false;
      if (f.marketCap === 'mid'    && (cap < 2e9 || cap >= 10e9)) return false;
      if (f.marketCap === 'small'  && (cap < 300e6 || cap >= 2e9)) return false;
      if (f.marketCap === 'micro'  && cap >= 300e6) return false;
    }
    // Fundamentals (dividend/P-E/beta) aren't available for every stock —
    // e.g. live-fetched stocks from Finnhub's free tier don't carry them.
    // Rather than defaulting an unknown value to 0 or 1 (which would
    // silently misclassify the stock), a stock with no data for a filter
    // just doesn't match that filter, same as if it failed the criterion.
    if (f.dividend !== 'all') {
      if (s.dividendYield == null) return false;
      const dy = s.dividendYield;
      if (f.dividend === 'has'  && dy <= 0) return false;
      if (f.dividend === 'high' && dy < 3)  return false;
    }
    if (f.peRatio !== 'all') {
      if (s.peRatio == null) return false;
      const pe = s.peRatio;
      if (f.peRatio === 'value'    && (pe <= 0 || pe >= 15)) return false;
      if (f.peRatio === 'blend'    && (pe <= 0 || pe < 15 || pe > 40)) return false;
      if (f.peRatio === 'growth'   && pe <= 40) return false;
      if (f.peRatio === 'negative' && pe >= 0) return false;
    }
    if (f.beta !== 'all') {
      if (s.beta == null) return false;
      const b = s.beta;
      if (f.beta === 'low'    && b >= 0.8)  return false;
      if (f.beta === 'medium' && (b < 0.8 || b > 1.2)) return false;
      if (f.beta === 'high'   && b <= 1.2)  return false;
    }
    return true;
  });
}

function countActiveFilters(f: Filters): number {
  return Object.values(f).filter(v => v !== 'all').length;
}

interface StockBrowserScreenProps {
  onStockPress: (symbol: string) => void;
  onBack?: () => void;
}

export function StockBrowserScreen({ onStockPress, onBack }: StockBrowserScreenProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const sectors = useMemo(() => ['All', ...getAllSectors()], []);

  // Load stocks on mount
  useEffect(() => {
    fetchAllTier1()
      .then(stocks => setAllStocks(stocks))
      .catch(() => setAllStocks([]))
      .finally(() => setLoading(false));
  }, []);

  const stocks = useMemo(() => {
    let results = query
      ? allStocks.filter(s =>
          s.symbol.toLowerCase().includes(query.toLowerCase()) ||
          s.name.toLowerCase().includes(query.toLowerCase())
        )
      : allStocks;
    if (selectedSector && selectedSector !== 'All') {
      results = results.filter(s => s.sector === selectedSector);
    }
    results = applyFilters(results, filters);
    return results.sort((a, b) => b.marketCap - a.marketCap);
  }, [query, selectedSector, allStocks, filters]);

  const activeFiltersCount = countActiveFilters(filters);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Filter Modal */}
      <FilterModal
        visible={showFilters}
        filters={filters}
        onApply={(f) => { setFilters(f); setShowFilters(false); }}
        onClose={() => setShowFilters(false)}
        theme={theme}
      />

      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.colors.primary }]}>‹ Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Browse stocks
          </Text>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={[styles.filterBtn, { backgroundColor: activeFiltersCount > 0 ? theme.colors.primary + '20' : theme.colors.surface, borderColor: activeFiltersCount > 0 ? theme.colors.primary + '60' : theme.colors.border }]}
          >
            <Ionicons name="options-outline" size={16} color={activeFiltersCount > 0 ? theme.colors.primary : theme.colors.textSecondary} />
            <Text style={[styles.filterBtnText, { color: activeFiltersCount > 0 ? theme.colors.primary : theme.colors.textSecondary }]}>
              Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Search */}
      <View style={styles.searchSection}>
        <View style={[
          styles.searchBox,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}>
          <Ionicons name="search-outline" size={16} color={theme.colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by symbol or name..."
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            autoCapitalize="characters"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={[styles.clearText, { color: theme.colors.textTertiary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Sector Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sectorFiltersOuter}
        contentContainerStyle={styles.sectorFilters}
      >
        {sectors.map(sector => {
          const isActive = (sector === 'All' && !selectedSector) || sector === selectedSector;
          return (
            <TouchableOpacity
              key={sector}
              onPress={() => setSelectedSector(sector === 'All' ? null : sector)}
              style={[
                styles.sectorChip,
                { 
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                  borderColor: isActive ? theme.colors.primary : theme.colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.sectorChipText,
                { color: isActive ? '#FFFFFF' : theme.colors.textSecondary },
              ]}>
                {sector}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {/* Results */}
      <FlatList
        data={stocks}
        keyExtractor={item => item.symbol}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {loading ? 'Loading stocks...' : 'No stocks found. Try a different search.'}
          </Text>
        }
        ListHeaderComponent={
          stocks.length > 0 ? (
            <Text style={[styles.resultsCount, { color: theme.colors.textTertiary }]}>
              {stocks.length} stock{stocks.length === 1 ? '' : 's'}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <StockListItem stock={item} onPress={() => onStockPress(item.symbol)} theme={theme} />
        )}
      />
    </SafeAreaView>
  );
}

// ============================================================================

function StockListItem({ stock, onPress, theme }: {
  stock: Stock;
  onPress: () => void;
  theme: any
}) {
  const isPositive = stock.change >= 0;
  const isBlueChip = BLUE_CHIP_SYMBOLS.has(stock.symbol);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card variant="default" padding="md" style={styles.stockCard}>
        <View style={styles.stockRow}>
          <View style={styles.stockLeft}>
            <View style={styles.symbolRow}>
              <Text style={[styles.stockSymbol, { color: theme.colors.textPrimary }]}>
                {stock.symbol}
              </Text>
              {isBlueChip && (
                <View style={[styles.blueChipBadge, { backgroundColor: '#1D4ED820' }]}>
                  <Ionicons name="diamond" size={9} color="#60A5FA" />
                  <Text style={styles.blueChipText}>BLUE CHIP</Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.stockName, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {stock.name}
            </Text>
            <View style={[styles.sectorTag, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.sectorTagText, { color: theme.colors.textTertiary }]}>
                {stock.sector}
              </Text>
            </View>
          </View>
          
          <View style={styles.stockRight}>
            <Text style={[styles.stockPrice, { color: theme.colors.textPrimary }]}>
              ${stock.price.toFixed(2)}
            </Text>
            <Text style={[
              styles.stockChange,
              { color: isPositive ? theme.colors.success : theme.colors.danger },
            ]}>
              {isPositive ? '↑' : '↓'} {Math.abs(stock.changePercent).toFixed(2)}%
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ── Filter Modal ──────────────────────────────────────────────────────────────

function FilterModal({ visible, filters, onApply, onClose, theme }: {
  visible: boolean; filters: Filters;
  onApply: (f: Filters) => void; onClose: () => void; theme: any;
}) {
  const [local, setLocal] = useState<Filters>(filters);

  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setLocal(prev => ({ ...prev, [key]: val }));

  const FilterRow = ({ label, field, options }: { label: string; field: keyof Filters; options: { id: string; label: string }[] }) => (
    <View style={fm.section}>
      <Text style={[fm.sectionLabel, { color: theme.colors.textTertiary }]}>{label}</Text>
      <View style={fm.chips}>
        {options.map(o => {
          const active = local[field] === o.id;
          return (
            <TouchableOpacity
              key={o.id}
              onPress={() => set(field, o.id as any)}
              style={[fm.chip, { borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? theme.colors.primary + '20' : theme.colors.surface }]}
            >
              <Text style={[fm.chipText, { color: active ? theme.colors.primary : theme.colors.textSecondary }]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={fm.overlay}>
        <View style={[fm.sheet, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <View style={fm.handle} />
          <View style={fm.header}>
            <Text style={[fm.title, { color: theme.colors.textPrimary }]}>Filter Stocks</Text>
            <TouchableOpacity onPress={() => setLocal(DEFAULT_FILTERS)} style={[fm.resetBtn, { borderColor: theme.colors.border }]}>
              <Text style={[fm.resetText, { color: theme.colors.textTertiary }]}>Reset</Text>
            </TouchableOpacity>
          </View>
          <FilterRow label="MARKET CAP" field="marketCap" options={[
            { id: 'all', label: 'All' }, { id: 'large', label: 'Large >$10B' },
            { id: 'mid', label: 'Mid $2–10B' }, { id: 'small', label: 'Small <$2B' }, { id: 'micro', label: 'Micro <$300M' },
          ]} />
          <FilterRow label="DIVIDENDS" field="dividend" options={[
            { id: 'all', label: 'All' }, { id: 'has', label: 'Has Dividend' }, { id: 'high', label: 'High Yield >3%' },
          ]} />
          <FilterRow label="P/E RATIO" field="peRatio" options={[
            { id: 'all', label: 'All' }, { id: 'value', label: 'Value <15' },
            { id: 'blend', label: 'Blend 15–40' }, { id: 'growth', label: 'Growth >40' }, { id: 'negative', label: 'No P/E' },
          ]} />
          <FilterRow label="VOLATILITY (BETA)" field="beta" options={[
            { id: 'all', label: 'All' }, { id: 'low', label: 'Low <0.8' },
            { id: 'medium', label: 'Medium 0.8–1.2' }, { id: 'high', label: 'High >1.2' },
          ]} />
          <View style={fm.footer}>
            <TouchableOpacity onPress={onClose} style={[fm.cancelBtn, { borderColor: theme.colors.border }]}>
              <Text style={[fm.cancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onApply(local)} style={[fm.applyBtn, { backgroundColor: theme.colors.primary }]}>
              <Text style={fm.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 20, paddingBottom: 40 },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title:   { fontSize: 18, fontWeight: '800' },
  resetBtn:{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  resetText:{ fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  chips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipText:{ fontSize: 12, fontWeight: '600' },
  footer:  { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  cancelText:{ fontSize: 14, fontWeight: '600' },
  applyBtn:{ flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  applyText:{ fontSize: 14, fontWeight: '800', color: '#07070D' },
});

// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { marginBottom: 8 },
  backText: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  filterBtnText: { fontSize: 13, fontWeight: '600' },
  
  searchSection: { paddingHorizontal: 20, paddingVertical: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  clearText: { fontSize: 16, paddingHorizontal: 4 },
  
  // Fixes a React Native Web quirk where a horizontal ScrollView with no
  // explicit flexGrow/flexShrink stretches to fill the remaining vertical
  // space of its flex:1 parent, visually ballooning over the results list
  // below it and blocking taps on anything under it.
  sectorFiltersOuter: {
    flexGrow: 0,
    flexShrink: 0,
  },
  sectorFilters: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  sectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  sectorChipText: { fontSize: 13, fontWeight: '500' },
  
  list: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  resultsCount: { fontSize: 12, fontWeight: '500', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { textAlign: 'center', fontSize: 14, marginTop: 40 },
  
  stockCard: { marginBottom: 8 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockLeft: { flex: 1, marginRight: 12 },
  symbolRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  stockSymbol: { fontSize: 16, fontWeight: '700' },
  blueChipBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  blueChipText: { fontSize: 9, fontWeight: '800', color: '#60A5FA', letterSpacing: 0.5 },
  stockName: { fontSize: 13, marginBottom: 6 },
  sectorTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  sectorTagText: { fontSize: 10, fontWeight: '500' },
  stockRight: { alignItems: 'flex-end' },
  stockPrice: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  stockChange: { fontSize: 13, fontWeight: '600' },
});
