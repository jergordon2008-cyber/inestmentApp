import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Pressable,
} from 'react-native';
import { showAlert } from '../utils/alert';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../services/userStore';
import { usePortfolioStore } from '../services/portfolioStore';
import { getStockSync } from '../services/marketDataFacade';
import { CompanyLogo } from '../components/CompanyLogo';
import { TradeType, Trade } from '../types';
import { BehaviorCoachModal, BehaviorBias } from '../components/BehaviorCoachModal';
import { Ionicons } from '@expo/vector-icons';
import { logEvent } from '../services/analyticsService';

interface Props {
  symbol: string;
  action: TradeType;
  onBack: () => void;
  onTradeSuccess: (trade?: Trade) => void;
  buyReason?: string;
  exitPlan?: string;
}

export function TradeScreen({ symbol, action: initAction, onBack, onTradeSuccess, buyReason, exitPlan }: Props) {
  const { theme } = useTheme();
  const user = useUserStore(s => s.user);
  const portfolio = usePortfolioStore(s => s.portfolio);
  const executeTrade = usePortfolioStore(s => s.executeTrade);
  const stock = useMemo(() => getStockSync(symbol), [symbol]);
  const position = portfolio?.positions.find(p => p.symbol === symbol);

  const [action, setAction]         = useState<TradeType>(initAction);
  const [mode, setMode]             = useState<'shares' | 'dollars'>('shares');
  const [inputVal, setInputVal]     = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Behavioral coaching
  const [coachBias, setCoachBias]   = useState<BehaviorBias | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const s = styles(theme);

  const price = stock?.price ?? 0;
  const shares = useMemo(() => {
    const n = parseFloat(inputVal) || 0;
    return mode === 'shares' ? n : n / price;
  }, [inputVal, mode, price]);

  const totalCost = shares * price;
  const cash = portfolio?.currentCash ?? 0;
  const cashAfter = action === 'buy' ? cash - totalCost : cash + totalCost;

  const hasEnoughCash = action === 'buy' ? cash >= totalCost : true;
  const hasEnoughShares = action === 'sell' ? (position?.shares ?? 0) >= shares : true;
  const validShares = shares > 0;
  const canSubmit = validShares && hasEnoughCash && hasEnoughShares && !isSubmitting;

  const quickAmounts = action === 'buy'
    ? [250, 500, 1000, 2500].map(d => ({ label: `$${d}`, val: String((d / price).toFixed(4)) }))
    : position
      ? [0.25, 0.5, 0.75, 1].map(f => ({ label: `${f * 100}%`, val: String((position.shares * f).toFixed(4)) }))
      : [];

  const executeSubmit = async () => {
    if (!canSubmit || !stock || !user || !portfolio) return;
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise(r => setTimeout(r, 400));
    const result = executeTrade({ symbol, type: action, shares, pricePerShare: price, stock, userTier: user.currentTier, buyReason, exitPlan });
    setIsSubmitting(false);
    if (result.success) {
      logEvent('trade_submitted', { symbol, side: action, has_thesis: !!buyReason });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert(
        action === 'buy' ? '✅ Order Filled' : '✅ Sold',
        `${action === 'buy' ? 'Bought' : 'Sold'} ${shares.toFixed(4)} shares of ${symbol} at $${price.toFixed(2)}`,
        [{ text: 'Done', onPress: () => onTradeSuccess(result.trade) }]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert('Trade Failed', result.error ?? 'Something went wrong.');
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    // ── Behavioral bias detection ─────────────────────────────────────────
    if (action === 'sell' && position) {
      const unrealizedPct = position.unrealizedGainPercent;

      // Panic selling: selling at a loss > 8%
      if (unrealizedPct < -8) {
        setPendingSubmit(true);
        setCoachBias('panic_sell');
        return;
      }

      // Premature selling: selling a winner < 20% gain
      if (unrealizedPct > 5 && unrealizedPct < 20) {
        setPendingSubmit(true);
        setCoachBias('premature_sell');
        return;
      }
    }

    executeSubmit();
  };

  if (!stock || !user || !portfolio) return null;

  const isUp = (stock.changePercent ?? 0) >= 0;
  const color = isUp ? theme.colors.primary : theme.colors.danger;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Behavioral coach interceptor */}
      <BehaviorCoachModal
        visible={!!coachBias}
        bias={coachBias ?? 'panic_sell'}
        lossPercent={position?.unrealizedGainPercent}
        gainPercent={position?.unrealizedGainPercent}
        onHold={() => { setCoachBias(null); setPendingSubmit(false); }}
        onOverride={() => { setCoachBias(null); setPendingSubmit(false); executeSubmit(); }}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <View style={s.stockHeader}>
          <CompanyLogo symbol={symbol} size={28} />
          <View>
            <Text style={[s.symbolText, { color: theme.colors.textPrimary }]}>{symbol}</Text>
            <Text style={[s.priceText, { color: theme.colors.textSecondary }]}>
              ${price.toFixed(2)} <Text style={{ color }}>{isUp ? '▲' : '▼'} {Math.abs(stock.changePercent ?? 0).toFixed(2)}%</Text>
            </Text>
          </View>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Buy/Sell toggle */}
        <View style={[s.toggleRow, { backgroundColor: theme.colors.surfaceElevated }]}>
          {(['buy', 'sell'] as TradeType[]).map(a => (
            <TouchableOpacity key={a} onPress={() => { setAction(a); setInputVal(''); }}
              style={[s.toggleBtn, action === a && { backgroundColor: a === 'buy' ? theme.colors.success : theme.colors.danger }]}>
              <Text style={[s.toggleText, { color: action === a ? '#07070D' : theme.colors.textSecondary }]}>
                {a === 'buy' ? 'Buy' : 'Sell'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Shares/Dollars mode toggle */}
        <View style={[s.modeRow, { backgroundColor: theme.colors.surfaceElevated }]}>
          {(['shares', 'dollars'] as const).map(m => (
            <TouchableOpacity key={m} onPress={() => { setMode(m); setInputVal(''); }}
              style={[s.modeBtn, mode === m && { backgroundColor: theme.colors.primary + '25' }]}>
              <Text style={[s.modeText, { color: mode === m ? theme.colors.primary : theme.colors.textTertiary }]}>
                {m === 'shares' ? 'Shares' : 'Dollars'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount input */}
        <View style={s.amountWrap}>
          <Text style={[s.amountPrefix, { color: theme.colors.textTertiary }]}>{mode === 'dollars' ? '$' : ''}</Text>
          <Text style={[s.amountValue, { color: theme.colors.textPrimary }]}>{inputVal || '0'}</Text>
        </View>
        {mode === 'shares' && shares > 0 && (
          <Text style={[s.equivText, { color: theme.colors.textTertiary }]}>≈ ${totalCost.toFixed(2)}</Text>
        )}
        {mode === 'dollars' && shares > 0 && (
          <Text style={[s.equivText, { color: theme.colors.textTertiary }]}>≈ {shares.toFixed(4)} shares</Text>
        )}

        {/* Numeric keypad */}
        <View style={s.keypad}>
          {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => (
            <TouchableOpacity key={k} onPress={() => {
              Haptics.selectionAsync();
              if (k === '⌫') setInputVal(v => v.slice(0, -1));
              else if (k === '.' && inputVal.includes('.')) return;
              else setInputVal(v => (v + k).replace(/^0+(?=\d)/, ''));
            }} style={s.key}>
              <Text style={[s.keyText, { color: theme.colors.textPrimary }]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick amounts */}
        <View style={s.quickRow}>
          {quickAmounts.map(q => (
            <TouchableOpacity key={q.label} onPress={() => { setMode('shares'); setInputVal(q.val); }}
              style={[s.quickBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <Text style={[s.quickText, { color: theme.colors.textSecondary }]}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary */}
        <View style={[s.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: theme.colors.textTertiary }]}>Cash available</Text>
            <Text style={[s.summaryValue, { color: theme.colors.textPrimary }]}>${cash.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: theme.colors.textTertiary }]}>Cash after</Text>
            <Text style={[s.summaryValue, { color: hasEnoughCash ? theme.colors.textPrimary : theme.colors.danger }]}>
              ${cashAfter.toFixed(2)}
            </Text>
          </View>
          {position && (
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: theme.colors.textTertiary }]}>You own</Text>
              <Text style={[s.summaryValue, { color: theme.colors.textPrimary }]}>{position.shares.toFixed(4)} shares</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit */}
      <View style={[s.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[s.submitBtn, {
            backgroundColor: action === 'buy' ? theme.colors.success : theme.colors.danger,
            opacity: canSubmit ? 1 : 0.4,
          }]}
        >
          <Text style={s.submitText}>
            {isSubmitting ? 'Processing…' : `${action === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 20 },
  stockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  symbolText: { fontSize: 16, fontWeight: '800' },
  priceText: { fontSize: 12, fontWeight: '600' },

  scroll: { paddingHorizontal: 20 },
  toggleRow: { flexDirection: 'row', borderRadius: 14, padding: 4, marginTop: 8, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center' },
  toggleText: { fontSize: 15, fontWeight: '800' },

  modeRow: { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 24, alignSelf: 'center' },
  modeBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9 },
  modeText: { fontSize: 13, fontWeight: '700' },

  amountWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  amountPrefix: { fontSize: 32, fontWeight: '700', marginRight: 4 },
  amountValue: { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  equivText: { fontSize: 13, textAlign: 'center', marginBottom: 20 },

  keypad: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  key: { width: '33.33%', paddingVertical: 14, alignItems: 'center' },
  keyText: { fontSize: 24, fontWeight: '600' },

  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  quickText: { fontSize: 13, fontWeight: '700' },

  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '700' },

  footer: { paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 28, borderTopWidth: 1 },
  submitBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '800', color: '#07070D' },
});
