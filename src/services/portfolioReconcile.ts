/**
 * Portfolio reconciliation — which copy wins when the device and the cloud
 * disagree.
 *
 * WHY THIS EXISTS
 * ---------------
 * Sign-in and relaunch used to do `if (remotePortfolio) setPortfolio(remote)`:
 * the cloud copy won, always. That was only safe if the cloud copy was never
 * behind — and it routinely was. Every trade record carried `undefined`
 * fields, Firestore refused the write, and the save's empty catch hid it, so
 * the cloud lagged the device by every trade since the last app launch. Any
 * student who then signed out, reinstalled or switched device got the stale
 * cloud copy and lost those trades.
 *
 * The trade log only ever grows (a trade is appended, never edited or
 * removed), so the set of trade ids tells you which copy is ahead. That's
 * what this decides on. Cash, positions and totals are all consequences of
 * the trades, so they come along with whichever copy is chosen — nothing is
 * merged field by field.
 *
 * THE RULES
 *   device ⊇ cloud, and more  → device is ahead: keep it, push it up
 *   cloud  ⊇ device, and more → cloud is ahead (another device traded): take it
 *   same trades               → keep the device copy (it has the latest prices
 *                               and is what the student is looking at); no push
 *   each has trades the other lacks (two devices traded independently)
 *                             → keep the copy with more trades; tie → the one
 *                               whose newest trade is more recent; tie → device.
 *                               The other copy is returned as a backup to be
 *                               saved on the device. Never silently dropped.
 *   the device copy belongs to a different user
 *                             → not considered for the decision at all, but
 *                               still returned as a backup: nothing here can
 *                               tell whether it held that student's unsynced
 *                               trades.
 *
 * `reconcilePortfolio` is pure: no I/O, no clock, inputs never mutated. The
 * backup writer below is the only thing in this file that touches storage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Portfolio, Trade } from '../types';

export type ReconcileOutcome =
  | 'none'            // nothing on either side
  | 'device-only'     // no cloud copy
  | 'cloud-only'      // no usable device copy
  | 'device-ahead'
  | 'cloud-ahead'
  | 'same'
  | 'diverged-kept-device'
  | 'diverged-kept-cloud';

export interface ReconcileResult {
  /** The portfolio the app should use. Null only when neither side had one. */
  portfolio: Portfolio | null;
  outcome: ReconcileOutcome;
  /** True when the cloud is missing trades the chosen copy has. */
  pushToCloud: boolean;
  /** Copies not chosen that may hold trades found nowhere else. Save them. */
  backups: { reason: string; portfolio: Portfolio }[];
}

/**
 * A trade's identity. Every trade executeTrade creates has a unique id; the
 * fallback only guards against a malformed record, so a missing id can't make
 * two different trades look like one.
 */
function tradeKey(t: Trade): string {
  return t.id || `${t.symbol}|${t.type}|${t.createdAt}|${t.shares}|${t.pricePerShare}`;
}

function newestTradeTime(p: Portfolio): number {
  let newest = -Infinity;
  for (const t of p.trades) {
    const at = Date.parse(t.createdAt);
    if (Number.isFinite(at) && at > newest) newest = at;
  }
  return newest;
}

export function reconcilePortfolio(
  device: Portfolio | null,
  cloud: Portfolio | null,
  uid: string,
): ReconcileResult {
  const backups: ReconcileResult['backups'] = [];

  // A device copy that belongs to someone else never decides anything — but
  // it is kept.
  let mine = device;
  if (device && device.userId !== uid) {
    backups.push({ reason: `device copy belonged to user ${device.userId}, not ${uid}`, portfolio: device });
    mine = null;
  }

  if (!mine && !cloud) return { portfolio: null, outcome: 'none', pushToCloud: false, backups };
  if (mine && !cloud)  return { portfolio: mine, outcome: 'device-only', pushToCloud: true, backups };
  if (!mine && cloud)  return { portfolio: cloud, outcome: 'cloud-only', pushToCloud: false, backups };

  const d = mine!;
  const c = cloud!;
  const dKeys = new Set(d.trades.map(tradeKey));
  const cKeys = new Set(c.trades.map(tradeKey));
  const deviceOnly = [...dKeys].filter(k => !cKeys.has(k)).length;
  const cloudOnly  = [...cKeys].filter(k => !dKeys.has(k)).length;

  if (deviceOnly === 0 && cloudOnly === 0) {
    return { portfolio: d, outcome: 'same', pushToCloud: false, backups };
  }
  if (cloudOnly === 0) {
    return { portfolio: d, outcome: 'device-ahead', pushToCloud: true, backups };
  }
  if (deviceOnly === 0) {
    return { portfolio: c, outcome: 'cloud-ahead', pushToCloud: false, backups };
  }

  // Diverged: each side has trades the other doesn't.
  let keepDevice: boolean;
  if (d.trades.length !== c.trades.length) {
    keepDevice = d.trades.length > c.trades.length;
  } else {
    const dt = newestTradeTime(d);
    const ct = newestTradeTime(c);
    keepDevice = dt === ct ? true : dt > ct;
  }
  const detail = `diverged: device had ${deviceOnly} trade(s) the cloud lacked, cloud had ${cloudOnly} the device lacked`;
  if (keepDevice) {
    backups.push({ reason: `${detail}; kept device copy, this is the cloud copy`, portfolio: c });
    return { portfolio: d, outcome: 'diverged-kept-device', pushToCloud: true, backups };
  }
  backups.push({ reason: `${detail}; kept cloud copy, this is the device copy`, portfolio: d });
  return { portfolio: c, outcome: 'diverged-kept-cloud', pushToCloud: false, backups };
}

// ============================================================================
// BACKUPS (the only I/O in this file)
// ============================================================================

export const PORTFOLIO_BACKUP_KEY = 'investapp-portfolio-backups';

export interface StoredPortfolioBackup {
  savedAt: string;
  reason: string;
  portfolio: Portfolio;
}

/**
 * Appends to a list on this device. Never overwrites, never caps: a backup
 * exists because it may hold trades found nowhere else, so dropping old ones
 * would defeat it. Divergence needs two devices trading independently, or a
 * session ending without sign-out, so this list stays short in practice.
 *
 * Throws if the write fails, so the caller can refuse to proceed rather than
 * discard a copy it failed to keep.
 */
export async function savePortfolioBackups(
  backups: ReconcileResult['backups'],
  now: Date = new Date(),
): Promise<void> {
  if (backups.length === 0) return;
  const raw = await AsyncStorage.getItem(PORTFOLIO_BACKUP_KEY);
  let existing: StoredPortfolioBackup[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    // An unreadable list is itself kept, under a timestamped key, rather than
    // replaced — it may contain earlier backups.
    await AsyncStorage.setItem(`${PORTFOLIO_BACKUP_KEY}-unreadable-${now.getTime()}`, raw ?? '');
  }
  const added = backups.map(b => ({ savedAt: now.toISOString(), reason: b.reason, portfolio: b.portfolio }));
  await AsyncStorage.setItem(PORTFOLIO_BACKUP_KEY, JSON.stringify([...existing, ...added]));
}
