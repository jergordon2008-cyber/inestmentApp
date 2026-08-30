import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props { onBack: () => void; onSubscribePress: () => void; isPremium: boolean; }

interface Period {
  id: string; name: string; dates: string;
  emoji: string; difficulty: string; startingCash: number; color: string;
  lesson: string;
  weeks: {
    week: number; headline: string; date: string;
    prices: Record<string, number>; // % of starting price
  }[];
}

const PERIODS: Period[] = [
  {
    id: '2008', name: '2008 Financial Crisis', dates: 'Sep 2008 – Mar 2009', difficulty: 'Expert',
    emoji: '💥', color: '#F87171', startingCash: 10000,
    lesson: 'The hardest investing environment ever. Lehman collapses. Banks freeze. S&P drops 50%.',
    weeks: [
      { week: 1, headline: 'Lehman Brothers files for bankruptcy. Markets open in freefall.', date: 'Sep 15, 2008', prices: { SPY: 100, AAPL: 100, GS: 100, XLF: 100, GLD: 100 } },
      { week: 2, headline: 'AIG bailed out by Fed for $85B. Markets volatile.', date: 'Sep 22, 2008', prices: { SPY: 92, AAPL: 96, GS: 78, XLF: 82, GLD: 106 } },
      { week: 3, headline: 'Congress rejects $700B bailout. Dow drops 778 points in one day.', date: 'Sep 29, 2008', prices: { SPY: 82, AAPL: 90, GS: 68, XLF: 72, GLD: 112 } },
      { week: 4, headline: 'TARP signed. Banks stabilize briefly. Bear market rally begins.', date: 'Oct 6, 2008', prices: { SPY: 76, AAPL: 84, GS: 58, XLF: 63, GLD: 118 } },
      { week: 5, headline: 'Global markets crash. Iceland goes bankrupt. Volatility peaks.', date: 'Oct 13, 2008', prices: { SPY: 80, AAPL: 88, GS: 62, XLF: 66, GLD: 115 } },
      { week: 6, headline: 'Obama wins presidency. Markets rally on certainty, then resume decline.', date: 'Nov 4, 2008', prices: { SPY: 74, AAPL: 82, GS: 57, XLF: 58, GLD: 121 } },
      { week: 7, headline: 'Auto industry bailout debated. GM, Ford, Chrysler near collapse.', date: 'Nov 17, 2008', prices: { SPY: 68, AAPL: 77, GS: 52, XLF: 50, GLD: 125 } },
      { week: 8, headline: 'Markets near bottom. Warren Buffett publishes "Buy America" op-ed.', date: 'Mar 5, 2009', prices: { SPY: 55, AAPL: 65, GS: 48, XLF: 38, GLD: 130 } },
    ],
  },
  {
    id: '2020', name: 'COVID-19 Crash & Recovery', dates: 'Feb – Jul 2020', difficulty: 'Hard',
    emoji: '🦠', color: '#F59E0B', startingCash: 10000,
    lesson: 'Fastest bear market in history (-34% in 23 days). Then the fastest recovery ever.',
    weeks: [
      { week: 1, headline: 'Coronavirus spreads to Italy. Markets notice for first time.', date: 'Feb 24, 2020', prices: { SPY: 100, AAPL: 100, AMZN: 100, ZM: 100, GLD: 100 } },
      { week: 2, headline: 'WHO declares pandemic risk. Markets accelerate downward.', date: 'Mar 2, 2020', prices: { SPY: 90, AAPL: 88, AMZN: 92, ZM: 130, GLD: 103 } },
      { week: 3, headline: 'Trump declares national emergency. NYSE circuit breakers triggered 3 times.', date: 'Mar 13, 2020', prices: { SPY: 75, AAPL: 72, AMZN: 80, ZM: 155, GLD: 98 } },
      { week: 4, headline: 'Market bottom: S&P hits 2,237. Congress passes $2.2T CARES Act.', date: 'Mar 23, 2020', prices: { SPY: 66, AAPL: 64, AMZN: 76, ZM: 162, GLD: 101 } },
      { week: 5, headline: 'Fed announces unlimited QE. Markets begin sharp recovery.', date: 'Mar 30, 2020', prices: { SPY: 74, AAPL: 74, AMZN: 86, ZM: 158, GLD: 104 } },
      { week: 6, headline: 'Reopening hopes. Tech leads recovery. Stay-at-home stocks surge.', date: 'Apr 20, 2020', prices: { SPY: 83, AAPL: 85, AMZN: 110, ZM: 175, GLD: 107 } },
      { week: 7, headline: 'Second wave fears. Airlines, hotels still 60% below highs.', date: 'May 18, 2020', prices: { SPY: 90, AAPL: 94, AMZN: 118, ZM: 168, GLD: 110 } },
      { week: 8, headline: 'Tech at all-time highs. S&P recovers all losses. Fastest recovery ever.', date: 'Jul 6, 2020', prices: { SPY: 100, AAPL: 118, AMZN: 138, ZM: 220, GLD: 118 } },
    ],
  },
  {
    id: '2022', name: '2022 Bear Market', dates: 'Jan – Dec 2022', difficulty: 'Hard',
    emoji: '🐻', color: '#8B5CF6', startingCash: 10000,
    lesson: 'Rising rates crush growth stocks. ARKK drops 75%. Crypto collapses. Bonds lose money.',
    weeks: [
      { week: 1, headline: 'Fed signals rate hikes coming. Growth stocks begin massive selloff.', date: 'Jan 5, 2022', prices: { SPY: 100, AAPL: 100, ARKK: 100, BND: 100, GLD: 100 } },
      { week: 2, headline: 'Inflation hits 7.5% — highest since 1982. Markets price in 6+ hikes.', date: 'Feb 10, 2022', prices: { SPY: 91, AAPL: 92, ARKK: 74, BND: 97, GLD: 105 } },
      { week: 3, headline: 'Russia invades Ukraine. Energy prices spike. Sanctions imposed.', date: 'Feb 24, 2022', prices: { SPY: 88, AAPL: 90, ARKK: 66, BND: 95, GLD: 110 } },
      { week: 4, headline: 'Fed hikes rates 0.75% — largest since 1994. More to come.', date: 'Jun 15, 2022', prices: { SPY: 78, AAPL: 82, ARKK: 48, BND: 90, GLD: 102 } },
      { week: 5, headline: 'Crypto winter. Luna/Terra collapses. Celsius freezes withdrawals.', date: 'Jun 22, 2022', prices: { SPY: 74, AAPL: 78, ARKK: 42, BND: 88, GLD: 99 } },
      { week: 6, headline: 'Bear market rally. Investors hope for Fed pivot. Markets up 17%.', date: 'Aug 15, 2022', prices: { SPY: 88, AAPL: 92, ARKK: 55, BND: 89, GLD: 97 } },
      { week: 7, headline: 'Jackson Hole speech: Powell says pain required. Markets dump again.', date: 'Aug 26, 2022', prices: { SPY: 79, AAPL: 84, ARKK: 46, BND: 86, GLD: 93 } },
      { week: 8, headline: 'Year ends. S&P -19%, NASDAQ -33%, ARK funds -75%. Bonds -15%.', date: 'Dec 30, 2022', prices: { SPY: 81, AAPL: 83, ARKK: 30, BND: 85, GLD: 98 } },
    ],
  },
  {
    id: '2017', name: '2017 Bull Run', dates: 'Jan – Dec 2017', difficulty: 'Easy',
    emoji: '🚀', color: '#10B981', startingCash: 10000,
    lesson: 'Everything goes up. Crypto explodes. The easiest year to make money — and feel like a genius.',
    weeks: [
      { week: 1, headline: 'Trump inauguration. Markets optimistic on tax cuts & deregulation.', date: 'Jan 20, 2017', prices: { SPY: 100, AAPL: 100, AMZN: 100, BTC: 100, NVDA: 100 } },
      { week: 2, headline: 'S&P hits 2,400 for first time. Volatility at historic lows.', date: 'Mar 1, 2017', prices: { SPY: 106, AAPL: 110, AMZN: 108, BTC: 130, NVDA: 115 } },
      { week: 3, headline: 'Tech earnings season beats expectations. FAANG stocks surge.', date: 'May 15, 2017', prices: { SPY: 112, AAPL: 123, AMZN: 120, BTC: 190, NVDA: 145 } },
      { week: 4, headline: 'Bitcoin hits $5,000. Crypto mania begins. ICO boom.', date: 'Jul 20, 2017', prices: { SPY: 117, AAPL: 132, AMZN: 130, BTC: 500, NVDA: 168 } },
      { week: 5, headline: 'Tax reform passes Senate. Markets price in corporate tax cut.', date: 'Sep 28, 2017', prices: { SPY: 122, AAPL: 140, AMZN: 138, BTC: 700, NVDA: 190 } },
      { week: 6, headline: 'Bitcoin hits $10,000. Everyone wants in. FOMO at historic highs.', date: 'Nov 28, 2017', prices: { SPY: 126, AAPL: 145, AMZN: 148, BTC: 1000, NVDA: 210 } },
      { week: 7, headline: 'Bitcoin $19,891. NVDA up 200% on AI/crypto mining. Everything green.', date: 'Dec 18, 2017', prices: { SPY: 128, AAPL: 147, AMZN: 155, BTC: 1989, NVDA: 230 } },
      { week: 8, headline: 'Year end: S&P +22%, NASDAQ +29%, BTC +1,400%, NVDA +240%.', date: 'Dec 29, 2017', prices: { SPY: 129, AAPL: 148, AMZN: 157, BTC: 1400, NVDA: 235 } },
    ],
  },
  {
    id: 'dotcom', name: 'Dot-com Bubble Burst', dates: 'Mar 2000 – Sep 2001', difficulty: 'Expert',
    emoji: '💻', color: '#A78BFA', startingCash: 10000,
    lesson: 'NASDAQ drops 78% peak to trough. The most overvalued market in history meets reality. Valuation matters.',
    weeks: [
      { week: 1, headline: 'NASDAQ hits 5,048 — peak. PE ratios of 100+. "Dot-com" = instant money.', date: 'Mar 10, 2000', prices: { SPY: 100, QQQ: 100, MSFT: 100, CSCO: 100, GLD: 100 } },
      { week: 2, headline: 'Fed raises rates. Margin calls start. Tech stocks slide 10% in a week.', date: 'Mar 20, 2000', prices: { SPY: 95, QQQ: 87, MSFT: 88, CSCO: 82, GLD: 102 } },
      { week: 3, headline: 'Microsoft antitrust ruling. Judge orders breakup. Tech rout accelerates.', date: 'Apr 3, 2000', prices: { SPY: 91, QQQ: 76, MSFT: 72, CSCO: 74, GLD: 104 } },
      { week: 4, headline: 'Pets.com IPO flops. Investors realize most dot-coms have no path to profit.', date: 'May 1, 2000', prices: { SPY: 93, QQQ: 74, MSFT: 78, CSCO: 70, GLD: 103 } },
      { week: 5, headline: 'Brief summer rally. "Buy the dip" mentality. Many pile back in too early.', date: 'Jul 10, 2000', prices: { SPY: 98, QQQ: 83, MSFT: 84, CSCO: 77, GLD: 101 } },
      { week: 6, headline: 'Q3 earnings disappoint. Revenue misses everywhere. Analyst downgrades flood in.', date: 'Sep 5, 2000', prices: { SPY: 90, QQQ: 68, MSFT: 74, CSCO: 60, GLD: 105 } },
      { week: 7, headline: 'September 11, 2001. Markets closed for 4 days. Reopen to massive selling.', date: 'Sep 17, 2001', prices: { SPY: 78, QQQ: 42, MSFT: 58, CSCO: 28, GLD: 114 } },
      { week: 8, headline: 'NASDAQ has lost 78% from peak. Companies worth billions now worth zero.', date: 'Sep 28, 2001', prices: { SPY: 76, QQQ: 38, MSFT: 52, CSCO: 22, GLD: 116 } },
    ],
  },
  {
    id: 'ai_bull', name: '2023–24 AI Bull Market', dates: 'Jan 2023 – Dec 2024', difficulty: 'Intermediate',
    emoji: '🤖', color: '#34D399', startingCash: 10000,
    lesson: 'ChatGPT launches the AI age. NVIDIA becomes most valuable company on earth. Knowing the trend early = life-changing returns.',
    weeks: [
      { week: 1, headline: 'ChatGPT hits 100M users in 2 months. AI suddenly real. Markets cautiously hopeful.', date: 'Jan 10, 2023', prices: { SPY: 100, NVDA: 100, MSFT: 100, META: 100, GLD: 100 } },
      { week: 2, headline: 'Microsoft invests $10B in OpenAI. Bing gets ChatGPT. MSFT surges. Google panics.', date: 'Feb 7, 2023', prices: { SPY: 105, NVDA: 132, MSFT: 112, META: 90, GLD: 98 } },
      { week: 3, headline: 'NVIDIA earnings shock: data center revenue triples. AI chip demand explodes.', date: 'May 25, 2023', prices: { SPY: 114, NVDA: 280, MSFT: 118, META: 140, GLD: 96 } },
      { week: 4, headline: 'Fed signals rate cuts coming. S&P touches new highs. Magnificent 7 lead rally.', date: 'Jul 14, 2023', prices: { SPY: 122, NVDA: 340, MSFT: 128, META: 195, GLD: 99 } },
      { week: 5, headline: 'META "year of efficiency" — 20K layoffs, AI pivot, stock +180% from lows.', date: 'Oct 2, 2023', prices: { SPY: 118, NVDA: 420, MSFT: 132, META: 285, GLD: 104 } },
      { week: 6, headline: 'Inflation at 3.1%. First rate cut since 2020. Markets hit all-time highs again.', date: 'Mar 20, 2024', prices: { SPY: 138, NVDA: 680, MSFT: 148, META: 490, GLD: 114 } },
      { week: 7, headline: 'NVIDIA briefly world\'s most valuable company at $3.3 trillion market cap.', date: 'Jun 18, 2024', prices: { SPY: 146, NVDA: 840, MSFT: 144, META: 520, GLD: 118 } },
      { week: 8, headline: 'S&P +26%, NASDAQ +29%. AI revolution fully priced in — or is it just beginning?', date: 'Dec 31, 2024', prices: { SPY: 158, NVDA: 900, MSFT: 152, META: 590, GLD: 122 } },
    ],
  },
];

export function TimeMachineScreen({ onBack, onSubscribePress, isPremium }: Props) {
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [portfolio, setPortfolio] = useState<Record<string, number>>({});
  const [cash, setCash] = useState(10000);
  const [phase, setPhase] = useState<'select' | 'trade' | 'results'>('select');
  const [trades, setTrades] = useState<{ week: number; symbol: string; shares: number; price: number; action: 'buy' | 'sell' }[]>([]);
  const s = styles(theme);

  if (!isPremium) return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity></View>
      <View style={s.centered}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>⏳</Text>
        <Text style={[s.bigTitle, { color: theme.colors.textPrimary }]}>Time Machine</Text>
        <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>Trade through real historical crashes. Premium only.</Text>
        <TouchableOpacity onPress={onSubscribePress} style={[s.primaryBtn, { backgroundColor: theme.colors.primary }]}>
          <Text style={s.primaryBtnText}>💎 Unlock with Premium</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const startPeriod = (p: Period) => {
    setSelectedPeriod(p);
    setCurrentWeek(0);
    setPortfolio({});
    setCash(p.startingCash);
    setTrades([]);
    setPhase('trade');
  };

  const getPortfolioValue = () => {
    if (!selectedPeriod) return cash;
    const week = selectedPeriod.weeks[currentWeek];
    const holdingsVal = Object.entries(portfolio).reduce((sum, [sym, shares]) => {
      const currentPct = week.prices[sym] ?? 100;
      const buyWeek = trades.filter(t => t.action === 'buy' && t.symbol === sym).slice(-1)[0];
      if (!buyWeek) return sum;
      const buyPct = buyWeek.price;
      const currentPrice = (currentPct / buyPct) * (buyWeek.shares > 0 ? cash / buyWeek.shares : 100);
      return sum + shares * (currentPct / 100) * 100;
    }, 0);
    return cash + holdingsVal;
  };

  const buyStock = (symbol: string) => {
    if (!selectedPeriod) return;
    const weekData = selectedPeriod.weeks[currentWeek];
    const pricePct = weekData.prices[symbol];
    const price = pricePct; // simplified: price = percentage
    const shares = 1;
    const cost = price * 10; // $10 per % point
    if (cash < cost) { return; }
    setCash(c => c - cost);
    setPortfolio(p => ({ ...p, [symbol]: (p[symbol] ?? 0) + shares }));
    setTrades(t => [...t, { week: currentWeek, symbol, shares, price, action: 'buy' }]);
  };

  const nextWeek = () => {
    if (!selectedPeriod) return;
    if (currentWeek >= selectedPeriod.weeks.length - 1) {
      setPhase('results');
    } else {
      setCurrentWeek(w => w + 1);
    }
  };

  const finalReturn = selectedPeriod ? ((getPortfolioValue() / selectedPeriod.startingCash - 1) * 100) : 0;

  if (phase === 'results' && selectedPeriod) return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><TouchableOpacity onPress={() => setPhase('select')}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Results</Text><View style={{ width: 60 }} /></View>
      <ScrollView contentContainerStyle={s.pad}>
        <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 12 }}>{finalReturn >= 0 ? '🏆' : '📉'}</Text>
        <Text style={[s.bigTitle, { color: theme.colors.textPrimary }]}>{selectedPeriod.name}</Text>
        <View style={[s.resultCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[s.resultLabel, { color: theme.colors.textSecondary }]}>Your Final Return</Text>
          <Text style={[s.resultReturn, { color: finalReturn >= 0 ? theme.colors.success : theme.colors.danger }]}>
            {finalReturn >= 0 ? '+' : ''}{finalReturn.toFixed(1)}%
          </Text>
          <Text style={[s.resultValue, { color: theme.colors.textPrimary }]}>
            ${(getPortfolioValue()).toFixed(0)} from ${selectedPeriod.startingCash.toLocaleString()}
          </Text>
        </View>
        <View style={[s.lessonBox, { backgroundColor: theme.colors.primaryGlow, borderColor: theme.colors.primary + '40' }]}>
          <Text style={[{ fontSize: 14, fontWeight: '700', marginBottom: 4 }, { color: theme.colors.primary }]}>💡 Key Lesson</Text>
          <Text style={[{ fontSize: 14, lineHeight: 21 }, { color: theme.colors.textPrimary }]}>{selectedPeriod.lesson}</Text>
        </View>
        <TouchableOpacity onPress={() => startPeriod(selectedPeriod)} style={[s.primaryBtn, { backgroundColor: theme.colors.primary }]}>
          <Text style={s.primaryBtnText}>Try Again →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPhase('select')} style={[s.secondaryBtn, { borderColor: theme.colors.border }]}>
          <Text style={[s.secondaryBtnText, { color: theme.colors.textPrimary }]}>Choose Another Period</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  if (phase === 'trade' && selectedPeriod) {
    const week = selectedPeriod.weeks[currentWeek];
    const symbols = Object.keys(week.prices);
    const pctDone = ((currentWeek + 1) / selectedPeriod.weeks.length) * 100;
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setPhase('select')}><Text style={s.back}>✕</Text></TouchableOpacity>
          <Text style={s.headerTitle}>{selectedPeriod.name}</Text>
          <Text style={[s.weekBadge, { color: theme.colors.primary }]}>Wk {currentWeek + 1}/{selectedPeriod.weeks.length}</Text>
        </View>
        <View style={[s.progressBar, { backgroundColor: theme.colors.border }]}>
          <View style={[s.progressFill, { backgroundColor: theme.colors.primary, width: `${pctDone}%` }]} />
        </View>

        <ScrollView contentContainerStyle={s.pad}>
          {/* News */}
          <View style={[s.newsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[s.newsDate, { color: theme.colors.textTertiary }]}>📰 {week.date}</Text>
            <Text style={[s.newsHeadline, { color: theme.colors.textPrimary }]}>{week.headline}</Text>
          </View>

          {/* Portfolio */}
          <View style={s.portfolioRow}>
            <View style={[s.cashChip, { backgroundColor: theme.colors.successGlow ?? theme.colors.primaryGlow }]}>
              <Text style={[s.cashLabel, { color: theme.colors.success }]}>Cash: ${cash.toFixed(0)}</Text>
            </View>
            <View style={[s.cashChip, { backgroundColor: theme.colors.primaryGlow }]}>
              <Text style={[s.cashLabel, { color: theme.colors.primary }]}>Value: ${getPortfolioValue().toFixed(0)}</Text>
            </View>
          </View>

          {/* Stocks */}
          <Text style={s.sectionTitle}>Market — Week {currentWeek + 1} Prices</Text>
          {symbols.map(sym => {
            const pct = week.prices[sym];
            const prev = currentWeek > 0 ? selectedPeriod.weeks[currentWeek - 1].prices[sym] : pct;
            const weekChange = ((pct - prev) / prev) * 100;
            const held = portfolio[sym] ?? 0;
            return (
              <View key={sym} style={[s.stockRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.stockSym, { color: theme.colors.textPrimary }]}>{sym}</Text>
                  <Text style={[s.stockPct, { color: weekChange >= 0 ? theme.colors.success : theme.colors.danger }]}>
                    {weekChange >= 0 ? '▲' : '▼'} {Math.abs(weekChange).toFixed(1)}% this week
                  </Text>
                </View>
                {held > 0 && <Text style={[s.heldBadge, { color: theme.colors.primary }]}>{held} held</Text>}
                <TouchableOpacity onPress={() => buyStock(sym)} style={[s.buyBtn, { backgroundColor: theme.colors.primary }]}>
                  <Text style={s.buyBtnText}>Buy</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity onPress={nextWeek} style={[s.nextBtn, { backgroundColor: theme.colors.primary }]}>
            <Text style={s.nextBtnText}>{currentWeek >= selectedPeriod.weeks.length - 1 ? 'See Results →' : 'Next Week →'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>⏳ Time Machine</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={s.pad}>
        <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
          Paper trade through real historical events with actual price movements. Learn without losing real money.
        </Text>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.id} onPress={() => startPeriod(p)} activeOpacity={0.8} style={[s.periodCard, {
            backgroundColor: theme.colors.surface, borderColor: p.color + '40',
            shadowColor: p.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 3,
          }]}>
            <View style={s.periodTop}>
              <Text style={{ fontSize: 32 }}>{p.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.periodName, { color: theme.colors.textPrimary }]}>{p.name}</Text>
                <Text style={[s.periodDates, { color: theme.colors.textTertiary }]}>{p.dates}</Text>
              </View>
              <View style={[s.diffBadge, { backgroundColor: p.color + '20' }]}>
                <Text style={[s.diffText, { color: p.color }]}>{p.difficulty}</Text>
              </View>
            </View>
            <Text style={[s.periodLesson, { color: theme.colors.textSecondary }]}>{p.lesson}</Text>
            <Text style={[s.startBtn, { color: p.color }]}>Start simulation →</Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  back: { color: theme.colors.primary, fontSize: 16, fontWeight: '500', width: 60 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  weekBadge: { fontSize: 13, fontWeight: '700', width: 60, textAlign: 'right' },
  progressBar: { height: 3 },
  progressFill: { height: 3 },
  pad: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', padding: 32 },
  bigTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textTertiary, marginBottom: 8, marginTop: 12 },
  primaryBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { borderRadius: 14, padding: 15, alignItems: 'center', borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
  periodCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  periodTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  periodName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  periodDates: { fontSize: 12 },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  diffText: { fontSize: 11, fontWeight: '700' },
  periodLesson: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  startBtn: { fontSize: 13, fontWeight: '700' },
  newsCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12 },
  newsDate: { fontSize: 11, marginBottom: 4 },
  newsHeadline: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  portfolioRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  cashChip: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  cashLabel: { fontSize: 13, fontWeight: '700' },
  stockRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 8 },
  stockSym: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  stockPct: { fontSize: 12, fontWeight: '600' },
  heldBadge: { fontSize: 11, fontWeight: '700' },
  buyBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  buyBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  nextBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultCard: { borderRadius: 16, padding: 24, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  resultLabel: { fontSize: 13, marginBottom: 6 },
  resultReturn: { fontSize: 52, fontWeight: '900', letterSpacing: -1 },
  resultValue: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  lessonBox: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 16 },
});
