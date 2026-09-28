/**
 * Journal reconciliation — combining the device and cloud journals.
 *
 * WHY THIS EXISTS
 * ---------------
 * The journal had both halves of the bug portfolioReconcile fixed. On launch
 * the save effect pushed the device journal over the cloud copy before the
 * cloud had even been read, and the load then did `setEntries(cloud)`, so the
 * cloud won wholesale. A prediction written on another device, or one written
 * here whose save hadn't landed, could be erased by either step.
 *
 * Unlike trades, journal entries are edited after they're written (a
 * reflection is added, a field filled in), so neither copy is simply "ahead".
 * Entries are therefore merged one by one, keyed on entry id.
 *
 * THE RULES
 *   an entry on only one side    → kept
 *   the same entry on both, equal → kept once
 *   the same entry, edited differently
 *                                → the newer `updatedAt` wins; on a tie, the
 *                                  version with more fields filled in (the
 *                                  legacy migration fills fields without
 *                                  touching updatedAt, so this keeps two
 *                                  devices from undoing each other's
 *                                  migration forever); tie → device. The
 *                                  losing version is returned as a backup.
 *   the device journal belongs to a different user, or records no owner
 *                                → not merged, but returned as a backup.
 *
 * Nothing is ever silently dropped: every entry from either side is in the
 * result or a backup. `reconcileJournal` is pure — no I/O, no clock, inputs
 * never mutated. The backup writer is the only I/O here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { JournalEntry } from './tradeJournalStore';

export type JournalReconcileOutcome =
  | 'none'          // empty on both sides
  | 'device-only'   // nothing in the cloud
  | 'cloud-only'    // nothing usable on the device
  | 'same'
  | 'device-ahead'  // the cloud lacks something the device has
  | 'cloud-ahead'   // the device lacks something the cloud has
  | 'merged';       // each lacked something the other had

export interface DeviceJournal {
  /** Whose journal the device copy is. Null when it predates owner tracking and couldn't be inferred. */
  ownerUid: string | null;
  entries: JournalEntry[];
}

export interface JournalReconcileResult {
  entries: JournalEntry[];
  outcome: JournalReconcileOutcome;
  /** True when the cloud is missing entries, or edits, that the result has. */
  pushToCloud: boolean;
  backups: { reason: string; entries: JournalEntry[] }[];
}

function entryKey(e: JournalEntry): string {
  return e.id || `${e.tradeId}|${e.symbol}|${e.createdAt}`;
}

/**
 * Key-order-independent, ignoring undefined — the cloud copy comes back with
 * keys reordered and undefined fields gone, and that alone isn't an edit.
 */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter(k => o[k] !== undefined).sort()
      .map(k => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

function filledFields(e: JournalEntry): number {
  return Object.values(e).filter(v => v !== undefined && v !== null && v !== '').length;
}

function time(iso: string | undefined): number {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : -Infinity;
}

/** Of two versions of one entry, the one to keep. `a` wins a full tie. */
function pick(a: JournalEntry, b: JournalEntry): JournalEntry {
  const ta = time(a.updatedAt), tb = time(b.updatedAt);
  if (ta !== tb) return ta > tb ? a : b;
  const fa = filledFields(a), fb = filledFields(b);
  if (fa !== fb) return fa > fb ? a : b;
  return a;
}

/** Indexes one side, folding any duplicate ids with the same rule. */
function index(entries: JournalEntry[], losers: JournalEntry[]): Map<string, JournalEntry> {
  const m = new Map<string, JournalEntry>();
  for (const e of entries) {
    const k = entryKey(e);
    const prev = m.get(k);
    if (!prev) { m.set(k, e); continue; }
    if (canonical(prev) === canonical(e)) continue;
    const keep = pick(prev, e);
    losers.push(keep === prev ? e : prev);
    m.set(k, keep);
  }
  return m;
}

function sortEntries(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) =>
    (time(a.createdAt) - time(b.createdAt)) || (entryKey(a) < entryKey(b) ? -1 : entryKey(a) > entryKey(b) ? 1 : 0));
}

export function reconcileJournal(
  device: DeviceJournal,
  cloud: JournalEntry[] | null,
  uid: string,
): JournalReconcileResult {
  const backups: JournalReconcileResult['backups'] = [];

  let mine = device.entries;
  if (device.ownerUid !== uid) {
    if (mine.length > 0) {
      backups.push({
        reason: device.ownerUid
          ? `device journal belonged to user ${device.ownerUid}, not ${uid}`
          : `device journal had no recorded owner; not merged into ${uid}`,
        entries: mine,
      });
    }
    mine = [];
  }
  const theirs = cloud ?? [];

  if (mine.length === 0 && theirs.length === 0) {
    return { entries: [], outcome: 'none', pushToCloud: false, backups };
  }

  const losers: JournalEntry[] = [];
  const dMap = index(mine, losers);
  const cMap = index(theirs, losers);
  const dupLosers = losers.length;

  if (theirs.length === 0) {
    return withLosers({ entries: sortEntries([...dMap.values()]), outcome: 'device-only', pushToCloud: true, backups }, losers, dupLosers);
  }
  if (mine.length === 0) {
    return withLosers({ entries: sortEntries([...cMap.values()]), outcome: 'cloud-only', pushToCloud: dupLosers > 0, backups }, losers, dupLosers);
  }

  const merged: JournalEntry[] = [];
  let cloudLacks = 0;   // device-only entries, or edits where the device version won
  let deviceLacks = 0;  // the reverse
  for (const [k, d] of dMap) {
    const c = cMap.get(k);
    if (!c) { cloudLacks++; merged.push(d); continue; }
    if (canonical(d) === canonical(c)) { merged.push(d); continue; }
    const keep = pick(d, c);
    if (keep === d) { cloudLacks++; losers.push(c); } else { deviceLacks++; losers.push(d); }
    merged.push(keep);
  }
  for (const [k, c] of cMap) {
    if (!dMap.has(k)) { deviceLacks++; merged.push(c); }
  }

  // A side that carried duplicate ids differs from the result too.
  const pushToCloud = cloudLacks > 0 || cMap.size !== theirs.length;
  const deviceChanged = deviceLacks > 0 || dMap.size !== mine.length;

  if (!pushToCloud && !deviceChanged) {
    // Identical content. Keep the device array itself so nothing re-renders
    // or re-saves.
    return { entries: device.entries, outcome: 'same', pushToCloud: false, backups };
  }
  const outcome: JournalReconcileOutcome =
    pushToCloud && deviceChanged ? 'merged' : pushToCloud ? 'device-ahead' : 'cloud-ahead';
  return withLosers({ entries: sortEntries(merged), outcome, pushToCloud, backups }, losers, dupLosers);
}

function withLosers(r: JournalReconcileResult, losers: JournalEntry[], dupLosers: number): JournalReconcileResult {
  if (losers.length === 0) return r;
  const edits = losers.length - dupLosers;
  const parts = [
    edits > 0 ? `${edits} entr${edits === 1 ? 'y was' : 'ies were'} edited differently on this device and in the cloud; the newer edit was kept` : '',
    dupLosers > 0 ? `${dupLosers} duplicate cop${dupLosers === 1 ? 'y' : 'ies'} of an entry id; one was kept` : '',
  ].filter(Boolean);
  r.backups.push({ reason: `${parts.join('; ')}. These are the versions not kept.`, entries: losers });
  return r;
}

// ============================================================================
// BACKUPS (the only I/O in this file)
// ============================================================================

export const JOURNAL_BACKUP_KEY = 'investapp-journal-backups';

export interface StoredJournalBackup {
  savedAt: string;
  reason: string;
  entries: JournalEntry[];
}

/**
 * Appends to a list on this device; never overwrites or caps (see
 * savePortfolioBackups). Throws if the write fails, so the caller can refuse
 * to proceed rather than discard entries it failed to keep.
 */
export async function saveJournalBackups(
  backups: JournalReconcileResult['backups'],
  now: Date = new Date(),
): Promise<void> {
  if (backups.length === 0) return;
  const raw = await AsyncStorage.getItem(JOURNAL_BACKUP_KEY);
  let existing: StoredJournalBackup[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    await AsyncStorage.setItem(`${JOURNAL_BACKUP_KEY}-unreadable-${now.getTime()}`, raw ?? '');
  }
  const added = backups.map(b => ({ savedAt: now.toISOString(), reason: b.reason, entries: b.entries }));
  await AsyncStorage.setItem(JOURNAL_BACKUP_KEY, JSON.stringify([...existing, ...added]));
}
