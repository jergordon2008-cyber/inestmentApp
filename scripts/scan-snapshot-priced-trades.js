#!/usr/bin/env node
/**
 * READ-ONLY scan for trades that appear to have executed at a static snapshot
 * price rather than a real quote.
 *
 * WHY THIS EXISTS
 * ---------------
 * Until the re-quote fix, TradeScreen captured its price once from
 * getStockSync() when the screen opened. If the app had booted into a Finnhub
 * rate limit, that price was the hand-authored January snapshot from
 * stockDataService.ts — XOM at $114.80, AAPL at $211.45 — and it was passed
 * straight into executeTrade() as pricePerShare.
 *
 * A bad POSITION MARK self-heals on the next successful refresh. A bad
 * EXECUTION PRICE does not: it is written into trades[] and into the position's
 * cost basis permanently, so the student's whole return is computed against a
 * number that never existed in the market.
 *
 * DETECTION HEURISTIC — AND ITS LIMITS
 * ------------------------------------
 * A trade is flagged when pricePerShare matches that symbol's snapshot price
 * EXACTLY (to the cent). That is a strong signal, because the snapshot prices
 * are arbitrary hand-authored values, but it is only a heuristic:
 *
 *   - FALSE POSITIVES are possible. A real trade can legitimately execute at
 *     the snapshot price by coincidence. That is likelier for low-priced
 *     symbols, where there are fewer plausible cent values (LCID's snapshot is
 *     $2.84). Treat every hit as "worth looking at", never as proven.
 *   - FALSE NEGATIVES are possible too. A symbol's snapshot price could have
 *     been edited since the trade, and this scan would no longer match it.
 *
 * There is no way to settle a given trade from stored data alone: nothing
 * records whether the quote behind it was live, which is the underlying defect.
 * So this reports COUNTS ONLY and changes nothing.
 *
 * THIS SCRIPT NEVER WRITES. It issues only .get() reads. There is deliberately
 * no repair mode — deciding what a corrupted trade should become is a judgement
 * call about someone's portfolio, not something a script should take on.
 *
 * USAGE
 * -----
 *   # Full scan across all users (needs admin credentials):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     node scripts/scan-snapshot-priced-trades.js
 *
 *   # Single user, no admin rights needed (spot check):
 *   node scripts/scan-snapshot-priced-trades.js --email you@example.com --password '...'
 *
 *   # See which symbols are being matched against:
 *   node scripts/scan-snapshot-priced-trades.js --show-prices
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ─── Snapshot price table ───────────────────────────────────────────────────
// Parsed from the real source file rather than copied, so this scan cannot
// drift away from the table the app actually shipped.
function loadSnapshotPrices() {
  const src = fs.readFileSync(path.join(ROOT, 'src/services/stockDataService.ts'), 'utf8');
  const prices = {};
  const re = /symbol:\s*'([A-Z.]+)'[\s\S]{0,400}?price:\s*([0-9_.]+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    prices[m[1]] = parseFloat(m[2].replace(/_/g, ''));
  }
  return prices;
}

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

// Exact-to-the-cent comparison, tolerant of float representation only.
function isSnapshotPrice(tradePrice, snapshotPrice) {
  if (typeof tradePrice !== 'number' || typeof snapshotPrice !== 'number') return false;
  return Math.abs(tradePrice - snapshotPrice) < 0.005;
}

// ─── Report ─────────────────────────────────────────────────────────────────
function report(portfolios, snapshot) {
  let totalTrades = 0;
  let scannedSymbols = 0;
  let unknownSymbolTrades = 0;
  const bySymbol = {};
  const affectedUsers = new Set();
  let usersWithTrades = 0;

  for (const { uid, data } of portfolios) {
    const trades = Array.isArray(data.trades) ? data.trades : [];
    if (trades.length) usersWithTrades++;
    for (const t of trades) {
      totalTrades++;
      const snap = snapshot[t.symbol];
      if (snap === undefined) { unknownSymbolTrades++; continue; }
      scannedSymbols++;
      if (isSnapshotPrice(t.pricePerShare, snap)) {
        bySymbol[t.symbol] = bySymbol[t.symbol] || { count: 0, snapshotPrice: snap, users: new Set() };
        bySymbol[t.symbol].count++;
        bySymbol[t.symbol].users.add(uid);
        affectedUsers.add(uid);
      }
    }
  }

  const suspected = Object.values(bySymbol).reduce((n, s) => n + s.count, 0);

  console.log('');
  console.log('  Snapshot-priced trade scan (READ-ONLY — nothing was modified)');
  console.log('  ' + '─'.repeat(62));
  console.log(`  portfolios read................. ${portfolios.length}`);
  console.log(`  portfolios holding trades....... ${usersWithTrades}`);
  console.log(`  trades examined................. ${totalTrades}`);
  console.log(`  trades checkable against table.. ${scannedSymbols}`);
  if (unknownSymbolTrades) {
    console.log(`  trades on unknown symbols....... ${unknownSymbolTrades}  (no snapshot price to compare)`);
  }
  console.log('');
  console.log(`  SUSPECTED snapshot-priced trades ${suspected}`);
  console.log(`  portfolios affected............. ${affectedUsers.size}`);

  if (suspected > 0) {
    console.log('');
    console.log('  By symbol:');
    const rows = Object.entries(bySymbol).sort((a, b) => b[1].count - a[1].count);
    for (const [sym, s] of rows) {
      console.log(
        `    ${sym.padEnd(7)} ${String(s.count).padStart(4)} trade(s)` +
        ` at exactly $${s.snapshotPrice.toFixed(2)}` +
        `   across ${s.users.size} portfolio(s)`
      );
    }
    console.log('');
    console.log('  These are SUSPECTS, not confirmed. A real trade can land on the');
    console.log('  snapshot price by coincidence. Nothing stored records whether the');
    console.log('  quote behind a trade was live, so these cannot be settled from');
    console.log('  data alone. No changes were made.');
  } else {
    console.log('');
    console.log('  No trade matched a snapshot price exactly.');
  }
  console.log('');
}

// ─── Data sources ───────────────────────────────────────────────────────────
async function readAllPortfoliosAsAdmin() {
  const admin = require(path.join(ROOT, 'functions/node_modules/firebase-admin'));
  const env = loadEnv();
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!admin.apps.length) admin.initializeApp({ projectId });
  const snap = await admin.firestore().collection('portfolios').get();  // read only
  return snap.docs.map(d => ({ uid: d.id, data: d.data() }));
}

async function readOnePortfolio(email, password) {
  const env = loadEnv();
  const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

  const authRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const auth = await authRes.json();
  if (!auth.idToken) throw new Error('sign-in failed: ' + JSON.stringify(auth));

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/portfolios/${auth.localId}`,
    { headers: { Authorization: `Bearer ${auth.idToken}` } }
  );
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`read failed: HTTP ${res.status}`);
  const doc = await res.json();
  return [{ uid: auth.localId, data: decodeFirestoreDoc(doc) }];
}

// Minimal Firestore REST value decoder — enough for trades[].
function decodeFirestoreDoc(doc) {
  const dec = (v) => {
    if (v == null) return undefined;
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('integerValue' in v) return Number(v.integerValue);
    if ('stringValue' in v) return v.stringValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
    if ('mapValue' in v) {
      const o = {};
      for (const [k, mv] of Object.entries(v.mapValue.fields || {})) o[k] = dec(mv);
      return o;
    }
    return undefined;
  };
  const out = {};
  for (const [k, v] of Object.entries(doc.fields || {})) out[k] = dec(v);
  return out;
}

// ─── Entry ──────────────────────────────────────────────────────────────────
(async () => {
  const argv = process.argv.slice(2);
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const snapshot = loadSnapshotPrices();

  // A scan that silently always reports zero looks exactly like a clean
  // result. This runs the real detector over a synthetic fixture so a zero
  // from the live scan can be trusted.
  if (argv.includes('--self-test')) {
    const fixture = [
      { uid: 'u1', data: { trades: [
        { symbol: 'AAPL', pricePerShare: 211.45 },   // exact snapshot  -> flag
        { symbol: 'AAPL', pricePerShare: 336.13 },   // real live price -> ignore
        { symbol: 'XOM',  pricePerShare: 114.80 },   // exact snapshot  -> flag
        { symbol: 'XOM',  pricePerShare: 114.81 },   // one cent off    -> ignore
      ] } },
      { uid: 'u2', data: { trades: [
        { symbol: 'AAPL',  pricePerShare: 211.45 },  // exact snapshot  -> flag
        { symbol: 'NOTREAL', pricePerShare: 1.23 },  // unknown symbol  -> uncheckable
      ] } },
      { uid: 'u3', data: { trades: [] } },
    ];
    console.log('\n  SELF-TEST — expect 3 suspects across 2 portfolios (AAPL x2, XOM x1)');
    report(fixture, snapshot);
    return;
  }

  if (argv.includes('--show-prices')) {
    console.log(`\n  ${Object.keys(snapshot).length} snapshot prices parsed from stockDataService.ts:\n`);
    for (const [s, p] of Object.entries(snapshot)) console.log(`    ${s.padEnd(7)} $${p.toFixed(2)}`);
    console.log('');
    return;
  }

  const email = arg('--email');
  const password = arg('--password');

  let portfolios;
  if (email && password) {
    console.log(`\n  Mode: single portfolio (${email})`);
    portfolios = await readOnePortfolio(email, password);
  } else {
    console.log('\n  Mode: full scan (admin credentials)');
    portfolios = await readAllPortfoliosAsAdmin();
  }

  console.log(`  Snapshot table: ${Object.keys(snapshot).length} symbols`);
  report(portfolios, snapshot);
})().catch(err => {
  console.error('\n  Scan failed:', err.message);
  console.error('  For a full scan set GOOGLE_APPLICATION_CREDENTIALS to a service');
  console.error('  account key with Firestore read access, or use --email/--password');
  console.error('  to check a single portfolio.\n');
  process.exit(1);
});
