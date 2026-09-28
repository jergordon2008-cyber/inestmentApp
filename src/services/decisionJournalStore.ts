/**
 * RETIRED — merged into tradeJournalStore.
 *
 * This used to be a second journal, written from the same pending thesis as
 * the trade journal on every trade. It lost the merge on every axis that
 * matters for the thesis gate:
 *   - it wasn't keyed to the trade (symbol + timestamp only), so an entry
 *     couldn't be tied back to the trade it described;
 *   - it lived in device storage only, never Firestore, so it vanished on a
 *     new device and was invisible to the admin view;
 *   - it had no review. Its `outcome` field drove a "win rate" and "which
 *     reasons win for you" screen, but nothing ever wrote `outcome`, so that
 *     screen was empty for every student. It was also P&L grading, which the
 *     thesis gate deliberately doesn't do.
 * Its only unique data — the reason category and 1-5 confidence — now lives
 * on the trade journal entry.
 *
 * What remains here is a read-only view of the old storage key, so the
 * migration can recover those two fields. The key itself is left on disk,
 * untouched and no longer written: reading it is reversible, deleting it
 * isn't. There is intentionally no store here any more, so nothing can
 * write to it again by accident.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TradeReason, Confidence } from './tradeJournalStore';

/** The zustand-persist key the retired store used. */
export const LEGACY_DECISION_JOURNAL_KEY = 'investapp-decision-journal-storage';

/** Shape of an entry as the retired store persisted it. */
export interface LegacyDecisionEntry {
  id: string;
  symbol: string;
  action: 'buy' | 'sell';
  reason: TradeReason;
  reasonNote: string;
  confidence: Confidence;
  mood?: string;      // declared but never actually written
  timestamp: string;
  outcome?: number;   // declared but never actually written
}

/**
 * Reads whatever the retired store left on this device. zustand-persist
 * writes `{ state: { entries }, version }` as JSON. Anything missing or
 * malformed reads as "no legacy data", never as an error — there being
 * nothing to migrate is the normal case on most devices.
 *
 * Note the key is per-device, not per-user: it holds every account that
 * ever traded here. That's safe for the migration, which only pairs a legacy
 * entry with a trade-journal entry for the same symbol created within
 * seconds of it — two different accounts can't trade in the same few
 * seconds on one device.
 */
export async function readLegacyDecisionEntries(): Promise<LegacyDecisionEntry[]> {
  const raw = await AsyncStorage.getItem(LEGACY_DECISION_JOURNAL_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const entries = parsed?.state?.entries;
    if (!Array.isArray(entries)) return [];
    return entries.filter((e: any) =>
      e && typeof e.symbol === 'string' && typeof e.timestamp === 'string' &&
      typeof e.reason === 'string' && typeof e.confidence === 'number'
    );
  } catch {
    return [];
  }
}
