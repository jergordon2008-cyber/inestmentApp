import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../services/userStore';
import { usePortfolioStore } from '../services/portfolioStore';
import { getStockSync, fetchStock, isLiveQuote, LIVE_DATA_ENABLED } from '../services/marketDataFacade';
import { isRetiredSymbol, retiredPriceLabel, retiredSellPrice } from '../services/stockDataService';
import { PriceCredit } from '../components/PriceCredit';
import { CompanyLogo } from '../components/CompanyLogo';
import { TradeType, Trade } from '../types';
import { BehaviorCoachModal, BehaviorBias } from '../components/BehaviorCoachModal';
import { Ionicons } from '@expo/vector-icons';
import { logEvent } from '../services/analyticsService';
import { fillMessage, FillMessage } from '../utils/tradeMessage';
import { changeCaret, changeColor, changeTone } from '../utils/change';
import { Prediction, isPredictionFor } from '../services/tradeJournalStore';

/**
 * How far the live price may drift from the price the student was shown and
 * still fill without asking again. Beyond this we re-quote and require a
 * second tap, so nobody is filled at a number they never saw.
 */
const PRICE_TOLERANCE = 0.005; // 0.5%

interface Props {
  symbol: string;
  action: TradeType;
  onBack: () => void;
  onTradeSuccess: (trade?: Trade) => void;
  /** The pending prediction, if any. Only honoured when it's for this symbol. */
  prediction?: Prediction | null;
  /** Opens the prediction form over this screen. */
  onRequestPrediction?: () => void;
}

export function TradeScreen({ symbol, action: initAction, onBack, onTradeSuccess, prediction, onRequestPrediction }: Props) {
  const { theme } = useTheme();
  const user = useUserStore(s => s.user);
  const portfolio = usePortfolioStore(s => s.portfolio);
  const executeTrade = usePortfolioStore(s => s.executeTrade);
  // Seeded synchronously so the screen renders immediately, then replaced by
  // the freshly fetched quote at confirm time. Holding it in state (rather
  // than a useMemo over getStockSync) is what lets a re-quote update the
  // displayed price and recompute shares before the student confirms.
  const [stock, setStock] = useState(() => getStockSync(symbol));
  useEffect(() => { setStock(getStockSync(symbol)); }, [symbol]);
  const position = portfolio?.positions.find(p => p.symbol === symbol);

  // A retired ticker (RETIRED_SYMBOLS) is sell-only, and only for a student
  // who holds it: the ticket fills at the position's last mark, since there
  // is no live quote to confirm. Every other ticker still needs one.
  const retired = isRetiredSymbol(symbol);
  const retiredPrice = retired ? retiredSellPrice(symbol, position) : null;

  const [action, setAction]         = useState<TradeType>(retired ? 'sell' : initAction);
  const [mode, setMode]             = useState<'shares' | 'dollars'>('shares');
  const [inputVal, setInputVal]     = useState('');

  /**
   * idle → checking (fetching a fresh quote) → submitting (order going in).
   * Replaces the old isSubmitting boolean, which only covered the second half.
   */
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'checking' | 'submitting'>('idle');

  /**
   * Why the last confirm attempt did NOT fill.
   *  - unavailable: no live quote came back. The trade blocks; we never fill
   *    at the static snapshot price, because that number is written into
   *    trades[] and cost basis permanently (AAPL's snapshot is ~37% off).
   *  - moved: the live price differs from what the student was shown by more
   *    than PRICE_TOLERANCE. We re-quote and make them confirm the new number
   *    rather than filling at a price they never agreed to.
   */
  const [quoteIssue, setQuoteIssue] = useState<
    null | { kind: 'unavailable' } | { kind: 'moved'; from: number; to: number }
  >(null);

  // Synchronous re-entrancy lock. submitPhase is React state, so it isn't
  // visible until the next render — with an await now between the tap and
  // executeTrade, two fast taps could otherwise both get through and place
  // two orders. A ref flips immediately.
  const submitLock = useRef(false);

  // Result of the last order, shown on the ticket. On web, showAlert is a
  // browser pop-up, which looked like an error from the site rather than a
  // message from the app. A fill leaves the student on the ticket (the order
  // button is locked, so it can't be placed twice) until they tap Done, which
  // runs the same onTradeSuccess the alert's button used to.
  const [filled, setFilled] = useState<{ message: FillMessage; trade: Trade | undefined } | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);

  // Any change to what's being traded invalidates a pending price warning.
  useEffect(() => { setQuoteIssue(null); setTradeError(null); }, [inputVal, action, mode]);

  // Leaving after a fill must still run onTradeSuccess (journal entry,
  // activity feed, landing on Portfolio), whether via Done or the close button.
  const finish = () => {
    if (filled) onTradeSuccess(filled.trade);
    else onBack();
  };

  // Behavioral coaching
  const [coachBias, setCoachBias]   = useState<BehaviorBias | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const s = styles(theme);

  // (With no last mark the snapshot is shown, but retiredBlocked stops any fill.)
  const price = retired ? (retiredPrice ?? stock?.price ?? 0) : (stock?.price ?? 0);
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
  // Thesis gate. A buy needs a prediction written for THIS symbol — checked
  // against `action` state, not the route's initial action, since the
  // Buy/Sell toggle below can turn a sell ticket into a buy. The same check
  // runs again in executeTrade, so this is the visible lock, not the only one.
  const predictionForThis = isPredictionFor(prediction, symbol) ? prediction : null;
  const needsPrediction = action === 'buy' && !predictionForThis;
  const retiredBlocked = retired && (action !== 'sell' || retiredPrice === null);
  const canSubmit = validShares && hasEnoughCash && hasEnoughShares && submitPhase === 'idle' && !filled && !needsPrediction && !retiredBlocked;

  const quickAmounts = action === 'buy'
    ? [250, 500, 1000, 2500].map(d => ({ label: `$${d}`, val: String((d / price).toFixed(4)) }))
    : position
      ? [0.25, 0.5, 0.75, 1].map(f => ({ label: `${f * 100}%`, val: String((position.shares * f).toFixed(4)) }))
      : [];

  /**
   * Places the order at an explicitly confirmed price.
   *
   * fillStock/fillPrice are the freshly fetched quote, not whatever the
   * screen was showing when it mounted. Shares are recomputed from that same
   * price so a dollar-mode order still spends the amount the student typed.
   */
  const placeOrder = async (fillStock: typeof stock, fillPrice: number, fillShares: number) => {
    if (!fillStock || !user || !portfolio) return;
    setSubmitPhase('submitting');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // For a buy, the claim rides in buyReason and the way-to-be-wrong in
    // exitPlan, which executeTrade validates and stores on the Trade record.
    // Sells carry neither.
    setTradeError(null);
    let result: ReturnType<typeof executeTrade>;
    try {
      result = executeTrade({
        symbol, type: action, shares: fillShares, pricePerShare: fillPrice,
        stock: fillStock, userTier: user.currentTier,
        buyReason: action === 'buy' ? predictionForThis?.claim : undefined,
        exitPlan: action === 'buy' ? predictionForThis?.falsifier : undefined,
      });
    } catch (e) {
      console.warn('[trade] executeTrade failed', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTradeError("Couldn't place the order right now. Your portfolio is unchanged. Try again.");
      return;
    }
    if (result.success) {
      logEvent('trade_submitted', { symbol, side: action, has_thesis: action === 'buy' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFilled({ message: fillMessage(action, symbol, fillShares, fillPrice), trade: result.trade });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTradeError(result.error ?? 'Something went wrong.');
    }
  };

  /**
   * Confirm handler. Re-quotes before filling.
   *
   * The price on screen was captured when the screen opened and can be
   * minutes old by the time the student taps — and if the price robot
   * couldn't be reached it may be a saved price or the January snapshot,
   * which would be written into cost basis permanently. So: fetch fresh,
   * then decide.
   *
   * Failure blocks rather than retrying or falling back. A wrong mark heals on
   * the next refresh; a wrong execution price never does. Blocking a paper
   * trade for a few seconds costs nothing real.
   */
  const attemptSubmit = async () => {
    if (submitLock.current) return;           // synchronous double-tap guard
    if (!canSubmit || !stock || !user || !portfolio) return;
    submitLock.current = true;

    try {
      // Retired ticker: sell at the position's last mark, no re-quote (there
      // is nothing to quote). executeTrade fills at that same mark whatever
      // is passed, and refuses a buy.
      if (retired) {
        if (action === 'sell' && retiredPrice !== null) await placeOrder(stock, retiredPrice, shares);
        return;
      }

      // No price robot configured: the app is a deliberate simulation and
      // snapshot prices are the intended marks. Nothing to re-quote against.
      if (!LIVE_DATA_ENABLED) {
        await placeOrder(stock, price, shares);
        return;
      }

      setSubmitPhase('checking');
      setQuoteIssue(null);
      const fresh = await fetchStock(symbol);

      // fetchStock never throws and never reports failure — if the robot
      // can't be reached it hands back the saved or snapshot price.
      // isLiveQuote accepts only a price confirmed by the robot within the
      // last few minutes (CONFIRMED_FOR_MS).
      if (!fresh || !(fresh.price > 0) || !isLiveQuote(fresh)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setQuoteIssue({ kind: 'unavailable' });
        return;
      }

      const movedBy = Math.abs(fresh.price - price) / price;
      if (movedBy > PRICE_TOLERANCE) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setQuoteIssue({ kind: 'moved', from: price, to: fresh.price });
        setStock(fresh);   // re-quote: price and shares update, student re-confirms
        return;
      }

      // Within tolerance — fill at the fresh price, with shares recomputed
      // from it so the dollar amount the student entered still holds.
      const typed = parseFloat(inputVal) || 0;
      const fillShares = mode === 'shares' ? typed : typed / fresh.price;
      setStock(fresh);
      await placeOrder(fresh, fresh.price, fillShares);
    } finally {
      setSubmitPhase('idle');
      submitLock.current = false;
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

    attemptSubmit();
  };

  if (!stock || !user || !portfolio) return null;

  const changeTint = changeTone(stock.changePercent) === 'up'
    ? theme.colors.primary
    : changeColor(stock.changePercent, theme);
  const priceCaret = changeCaret(stock.changePercent);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Behavioral coach interceptor */}
      <BehaviorCoachModal
        visible={!!coachBias}
        bias={coachBias ?? 'panic_sell'}
        lossPercent={position?.unrealizedGainPercent}
        gainPercent={position?.unrealizedGainPercent}
        onHold={() => { setCoachBias(null); setPendingSubmit(false); }}
        onOverride={() => { setCoachBias(null); setPendingSubmit(false); attemptSubmit(); }}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={finish} style={s.backBtn}>
          <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <View style={s.stockHeader}>
          <CompanyLogo symbol={symbol} size={28} />
          <View>
            <Text style={[s.symbolText, { color: theme.colors.textPrimary }]}>{symbol}</Text>
            <View style={s.priceRow}>
              <Text style={[s.priceText, { color: theme.colors.textSecondary }]}>${price.toFixed(2)}</Text>
              {priceCaret && <Ionicons name={priceCaret} size={11} color={changeTint} />}
              <Text style={[s.priceText, { color: changeTint }]}>
                {Math.abs(stock.changePercent ?? 0).toFixed(2)}%
              </Text>
            </View>
            {retired ? <PriceCredit label={retiredPriceLabel(symbol)} /> : <PriceCredit />}
          </View>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Buy/Sell toggle */}
        <View style={[s.toggleRow, { backgroundColor: theme.colors.surfaceElevated }]}>
          {(retired ? ['sell'] as TradeType[] : ['buy', 'sell'] as TradeType[]).map(a => (
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
          {['1','2','3','4','5','6','7','8','9','.','0','backspace'].map(k => (
            <TouchableOpacity key={k} onPress={() => {
              Haptics.selectionAsync();
              if (k === 'backspace') setInputVal(v => v.slice(0, -1));
              else if (k === '.' && inputVal.includes('.')) return;
              else setInputVal(v => (v + k).replace(/^0+(?=\d)/, ''));
            }} style={s.key}>
              {k === 'backspace'
                ? <Ionicons name="backspace-outline" size={20} color={theme.colors.textPrimary} />
                : <Text style={[s.keyText, { color: theme.colors.textPrimary }]}>{k}</Text>}
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
        {retired && (
          <View style={[s.noticeRow, { backgroundColor: theme.colors.gold + '14', borderColor: theme.colors.gold + '40' }]}>
            <Ionicons name="information-circle-outline" size={15} color={theme.colors.gold} />
            <Text style={[s.noticeText, { color: theme.colors.gold }]}>
              {!position
                ? `${symbol} is no longer traded here, so it can't be bought.`
                : retiredPrice === null
                  ? `${symbol} is no longer traded here, and there's no saved price for your shares, so they can't be sold right now.`
                  : `${symbol} is no longer traded here. You can still sell your shares at their last known price, $${retiredPrice.toFixed(2)}.`}
            </Text>
          </View>
        )}
        {needsPrediction && !retired && (
          // Reached when a student lands here without writing one — most
          // often by URL (stocks/:symbol/buy), or by switching a sell ticket
          // to Buy. Buy stays disabled; this is the way forward.
          <View style={[s.noticeRow, { backgroundColor: theme.colors.primary + '14', borderColor: theme.colors.primary + '40' }]}>
            <Ionicons name="create-outline" size={15} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.noticeText, { color: theme.colors.primary }]}>
                Write your prediction first. You need one before you can buy {symbol}.
              </Text>
              {onRequestPrediction && (
                <TouchableOpacity onPress={onRequestPrediction} style={s.predictBtn} accessibilityRole="button">
                  <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>Write prediction ›</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        {action === 'buy' && predictionForThis && (
          <View style={[s.noticeRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="checkmark-circle-outline" size={15} color={theme.colors.success} />
            <Text style={[s.noticeText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              Your prediction: {predictionForThis.claim}
            </Text>
          </View>
        )}
        {quoteIssue?.kind === 'unavailable' && (
          <View style={[s.noticeRow, { backgroundColor: theme.colors.danger + '14', borderColor: theme.colors.danger + '40' }]}>
            <Ionicons name="cloud-offline-outline" size={15} color={theme.colors.danger} />
            <Text style={[s.noticeText, { color: theme.colors.danger }]}>
              Couldn't confirm a live price for {symbol}, so this order wasn't placed. Your portfolio is unchanged.
            </Text>
          </View>
        )}
        {quoteIssue?.kind === 'moved' && (
          <View style={[s.noticeRow, { backgroundColor: theme.colors.gold + '14', borderColor: theme.colors.gold + '40' }]}>
            <Ionicons name="trending-up-outline" size={15} color={theme.colors.gold} />
            <Text style={[s.noticeText, { color: theme.colors.gold }]}>
              Price moved from ${quoteIssue.from.toFixed(2)} to ${quoteIssue.to.toFixed(2)} before your order went in. Confirm to trade at the new price.
            </Text>
          </View>
        )}
        {tradeError ? (
          <Text accessibilityLiveRegion="polite" style={[s.tradeError, { color: theme.colors.danger }]}>{tradeError}</Text>
        ) : null}
        {filled ? (
          <View accessibilityLiveRegion="polite" style={[s.noticeRow, { backgroundColor: theme.colors.success + '14', borderColor: theme.colors.success + '40' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.fillTitle, { color: theme.colors.success }]}>{filled.message.title}</Text>
              <Text style={[s.noticeText, { color: theme.colors.textSecondary }]}>{filled.message.detail}</Text>
            </View>
          </View>
        ) : null}
        <TouchableOpacity
          onPress={filled ? finish : handleSubmit}
          disabled={!filled && !canSubmit}
          style={[s.submitBtn, {
            backgroundColor: action === 'buy' ? theme.colors.success : theme.colors.danger,
            opacity: filled || canSubmit ? 1 : 0.4,
          }]}
        >
          <Text style={s.submitText}>
            {filled ? 'Done'
             : submitPhase === 'checking'   ? 'Confirming price…'
             : submitPhase === 'submitting' ? 'Processing…'
             : quoteIssue?.kind === 'unavailable' ? 'Try again'
             : quoteIssue?.kind === 'moved' ? `Confirm at $${quoteIssue.to.toFixed(2)}`
             : `${action === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
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
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },

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
  noticeRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  tradeError: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  fillTitle:  { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  predictBtn: { marginTop: 6, alignSelf: 'flex-start', paddingVertical: 2 },
  submitBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '800', color: '#07070D' },
});
