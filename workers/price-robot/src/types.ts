import type { Phase, Session } from './calendar';

/** A price as one source reported it. t = time of the trade, never the fetch. */
export interface SourceQuote {
  p: number;            // last trade price
  pc: number | null;    // previous close
  t: string;            // ISO time of the trade
  hi?: number;          // day high
  lo?: number;          // day low
}

export type Source = 'alpaca' | 'finnhub';

/** The price the robot chose for one ticker. */
export interface Quote extends SourceQuote {
  src: Source;
  /** Last Alpaca-vs-Finnhub difference, in percent (absent until checked). */
  chk?: number;
  /** When Finnhub last answered for this ticker. */
  chkAt?: string;
  /** No fresh trade from either source: this is the last known price. */
  stale?: true;
}

/** KV key `prices:v1`: everything the app reads, plus the robot's own bookkeeping. */
export interface PriceBlob {
  v: 1;
  asOf: string;               // ISO time of the run that wrote this
  session: Session | null;
  market: Phase;
  final: boolean;             // closing snapshot taken for session.date
  alpacaOk: boolean;
  alpacaFails: number;        // consecutive failed runs
  authError: { source: Source; status: number; at: string } | null;
  retry: string[];            // tickers Finnhub should check first next run
  quotes: Record<string, Quote>;
}

export interface Env {
  PRICES: KVNamespace;
  ALPACA_KEY_ID: string;
  ALPACA_SECRET_KEY: string;
  FINNHUB_KEY: string;
  /** ntfy.sh topic URL or Discord webhook URL. Optional: without it alerts only go to the log. */
  ALERT_URL?: string;
  /** Comma-separated web origins allowed to read prices from a browser. */
  ALLOWED_ORIGINS?: string;
  /** Local testing only ("1"): treat the market as open at any hour. Never set in production. */
  DEV_FORCE_OPEN?: string;
}

/** Everything that touches the outside world, so tests can replace it. */
export interface Deps {
  fetch: typeof fetch;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
}
