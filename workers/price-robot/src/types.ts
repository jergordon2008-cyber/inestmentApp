import type { Phase, Session } from './calendar';

/** A price as one source reported it. t = time of the trade, never the fetch. */
export interface SourceQuote {
  p: number;            // last trade price
  pc: number | null;    // previous close
  t: string;            // ISO time of the trade
  hi?: number;          // day high
  lo?: number;          // day low
}

/** Finnhub is the only live source; 'alpaca' only appears in blobs from before the switch. */
export type Source = 'finnhub' | 'alpaca';

/** The price the robot holds for one ticker. */
export interface Quote extends SourceQuote {
  src: Source;
  /** When Finnhub last returned this ticker ("confirmed at"). '' = never. */
  at: string;
}

/** KV key `prices:v1`: everything the app reads, plus the robot's own bookkeeping. */
export interface PriceBlob {
  v: 1;
  asOf: string;               // ISO time of the run that wrote this
  session: Session | null;
  market: Phase;
  final: boolean;             // closing snapshot complete for session.date
  /** asOf of today's first run after the close; quotes confirmed since then are closing prices. */
  closeFrom: string | null;
  finnhubOk: boolean;         // the last run got at least one quote
  finnhubFails: number;       // consecutive runs without a single quote
  authError: { source: Source; status: number; at: string } | null;
  quotes: Record<string, Quote>;
}

export interface Env {
  PRICES: KVNamespace;
  /** Server-only Finnhub key, used by nothing else (never the app's key). */
  FINNHUB_KEY: string;
  /** ntfy.sh topic URL or Discord webhook URL. Optional: without it alerts only go to the log. */
  ALERT_URL?: string;
  /**
   * Comma-separated web origins allowed to read prices. /v1/prices and
   * /v1/quote/* answer 403 to any other Origin, and to requests with none.
   */
  ALLOWED_ORIGINS?: string;
  /**
   * Local development only ("1"): also accept http://localhost and
   * http://127.0.0.1 origins. Set only in the git-ignored .dev.vars by
   * `npm run dev`; never in wrangler.toml or on the deployed Worker. It also
   * takes effect only when the Worker itself is reached at localhost.
   */
  DEV_ALLOW_LOCALHOST?: string;
  /** Local testing only ("1"): treat the market as open at any hour. Never set in production. */
  DEV_FORCE_OPEN?: string;
}

/** Everything that touches the outside world, so tests can replace it. */
export interface Deps {
  fetch: typeof fetch;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
}
