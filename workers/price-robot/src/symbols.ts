/**
 * The tickers the robot refreshes: exactly the app's stock list
 * (`stockDatabase` in src/services/stockDataService.ts). Students can't open
 * or trade anything else, so one Alpaca batch covers every holding.
 * test/symbols.test.ts fails if this list and the app's drift apart.
 *
 * Plain TypeScript with no Worker types, so the app's tests can import it too.
 */
export const SYMBOLS: readonly string[] = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'AMD', 'INTC',
  'CRM', 'ADBE', 'ORCL', 'UBER', 'PLTR', 'SHOP', 'SNOW', 'DIS', 'CMCSA', 'T',
  'VZ', 'V', 'MA', 'JPM', 'BAC', 'WFC', 'GS', 'MS', 'AXP', 'PYPL',
  'BLK', 'JNJ', 'PFE', 'UNH', 'ABT', 'LLY', 'MRK', 'TMO', 'KO', 'PEP',
  'WMT', 'COST', 'MDLZ', 'MCD', 'SBUX', 'NKE', 'TGT', 'HD', 'XOM', 'CVX',
  'COP', 'SLB', 'CAT', 'BA', 'HON', 'GE', 'UPS', 'LMT', 'SPY', 'VOO',
  'QQQ', 'VTI', 'IWM', 'GLD', 'BND', 'VNQ', 'ARKK', 'AMT', 'EQIX', 'PLD',
  'O', 'ENPH', 'FSLR', 'NEE', 'RKLB', 'ASTS', 'RTX', 'NOC', 'CRWD', 'PANW',
  'ZS', 'COIN', 'XYZ', 'HOOD', 'SOFI', 'AFRM', 'RBLX', 'EA', 'TTWO', 'SPOT',
  'PINS', 'SNAP', 'ROKU', 'TTD', 'ABNB', 'DASH', 'LYFT', 'NOW', 'DDOG', 'ZM',
  'DOCU', 'BABA', 'MELI', 'NVO', 'MSTR', 'IBIT', 'RIVN', 'LCID', 'HIMS', 'DKNG',
];

/**
 * Old tickers still found in saved portfolios, mapped to the ticker that
 * trades today. Block Inc. changed SQ → XYZ in January 2025; SQ has had no
 * trades since, so its quote is always stale.
 */
export const ALIASES: Readonly<Record<string, string>> = { SQ: 'XYZ' };

/**
 * Tier 1's approved list (TIER_1_APPROVED_SYMBOLS in portfolioStore.ts).
 * When Alpaca is down these get Finnhub quotes first.
 */
export const TIER1: readonly string[] = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  'JNJ', 'V', 'WMT', 'JPM', 'MA', 'HD', 'CVX',
  'KO', 'PEP', 'MRK', 'PFE', 'TMO', 'COST',
  'NKE', 'MCD', 'DIS', 'ADBE', 'NFLX', 'INTC', 'CMCSA',
  'XOM', 'BAC', 'UNH', 'VZ', 'T', 'GE',
  'SPY', 'VOO', 'VTI', 'QQQ',
];

const KNOWN = new Set(SYMBOLS);

/** Upper-cases, applies ALIASES, and returns null for anything not on the list. */
export function resolveSymbol(raw: string): string | null {
  const upper = raw.trim().toUpperCase();
  const sym = ALIASES[upper] ?? upper;
  return KNOWN.has(sym) ? sym : null;
}
