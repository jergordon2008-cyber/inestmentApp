/**
 * Trade Journal Store
 * 
 * After every paper trade, users answer reflection questions:
 * - Why did you buy? (thesis)
 * - What's your exit plan?
 * - What signal/lesson motivated this?
 * 
 * Then later, when they sell or hit milestones, the app prompts:
 * - Did the thesis play out?
 * - What did you learn?
 * - Would you do this again?
 * 
 * This is the habit that separates successful investors from gamblers.
 * It's literally what professional traders do.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readLegacyDecisionEntries, LegacyDecisionEntry } from './decisionJournalStore';

// ============================================================================
// REASON TAXONOMY
// ============================================================================
// Moved here from decisionJournalStore when the two journals were merged.
// This store is now the only journal: it's keyed to the real trade id, it's
// the one that syncs to Firestore, and it's the one that holds the review.

export type TradeReason = 'fundamental' | 'technical' | 'news' | 'tip' | 'gut' | 'plan' | 'fomo';

/** `icon` is an Ionicons name — the app's icon set. */
export const REASON_CONFIG: Record<TradeReason, { label: string; icon: string; color: string }> = {
  fundamental: { label: 'Fundamentals',  icon: 'bar-chart-outline',      color: '#10B981' },
  technical:   { label: 'Chart Signal',  icon: 'trending-up-outline',    color: '#5B5FEF' },
  news:        { label: 'News Event',    icon: 'newspaper-outline',      color: '#F59E0B' },
  plan:        { label: 'My Playbook',   icon: 'book-outline',           color: '#06B6D4' },
  gut:         { label: 'Gut Feeling',   icon: 'help-circle-outline',    color: '#8B5CF6' },
  tip:         { label: 'Tip/Social',    icon: 'chatbubble-outline',     color: '#F87171' },
  fomo:        { label: 'FOMO',          icon: 'trending-up',            color: '#EF4444' },
};

export type Confidence = 1 | 2 | 3 | 4 | 5;

export interface JournalEntry {
  id: string;
  tradeId: string;
  symbol: string;
  /** Optional because entries written before the merge didn't record it. */
  action?: 'buy' | 'sell';

  // From the retired decision journal. Optional for the same reason: an
  // entry is only filled in if migration can recover it honestly (see
  // migrateLegacyDecisionJournal) — never guessed.
  reasonCategory?: TradeReason;
  confidence?: Confidence;

  // Pre-trade reflection
  buyReason: string;                  // "Why am I buying this?"
  exitPlan: string;                   // "When/why will I sell?"
  expectedReturn?: number;            // Predicted % return
  expectedTimeframeDays?: number;     // How long to hold
  
  // Trade context
  triggeredByLessonId?: string;
  triggeredBySignalId?: string;
  triggeredByNewsItemId?: string;
  
  // Post-trade reflection (filled in after sell or periodically)
  postTradeReflection?: {
    actualReturn: number;
    actualHoldDays: number;
    thesisPlayedOut: 'yes' | 'partially' | 'no';
    keyLearnings: string;
    wouldRepeat: 'yes' | 'no' | 'with_changes';
    reflectionDate: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

interface TradeJournalState {
  entries: JournalEntry[];

  // Actions
  setEntries: (entries: JournalEntry[]) => void;
  /** Idempotent. Folds the retired decision journal's category/confidence in. */
  migrateLegacyDecisionJournal: () => Promise<void>;
  createEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => JournalEntry;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  addPostTradeReflection: (
    id: string,
    reflection: JournalEntry['postTradeReflection']
  ) => void;
  getEntryByTradeId: (tradeId: string) => JournalEntry | undefined;
  getEntriesBySymbol: (symbol: string) => JournalEntry[];
  
  // Stats
  getReflectedTradeStats: () => {
    totalReflected: number;
    thesisCorrectRate: number;
    avgReturn: number;
    bestLearning: string | null;
  };
}

// ============================================================================
// LEGACY DECISION-JOURNAL MIGRATION
// ============================================================================

/**
 * Both journals were written in the same instant by AppFlow's trade-success
 * handler, from one pending thesis, so every legacy decision entry has a twin
 * here with the same symbol, created milliseconds apart. Five seconds is far
 * wider than that gap and far narrower than any two real trades of the same
 * stock, which need a trip through the order ticket each.
 */
const TWIN_MATCH_WINDOW_MS = 5_000;

/**
 * The trade-success handler wrote `buyReason = note || REASON_CONFIG[r].label`,
 * so when a student skipped the note, buyReason IS the category label,
 * verbatim. Matching that exactly recovers the category the app itself wrote
 * — which matters on a new device, where the local decision journal isn't
 * there to match against. A buyReason with a real note in it matches no label
 * and is left alone rather than guessed at.
 */
function reasonFromExactLabel(buyReason: string): TradeReason | undefined {
  const text = buyReason.trim();
  return (Object.keys(REASON_CONFIG) as TradeReason[]).find(r => REASON_CONFIG[r].label === text);
}

/**
 * Fills reasonCategory/confidence/action from the legacy twin, or the category
 * alone from an exact label. Pure — returns the same array reference when
 * nothing changed, so the caller can skip a store update.
 */
function mergeLegacy(entries: JournalEntry[], legacy: LegacyDecisionEntry[]): JournalEntry[] {
  // Index-based rather than id-based: the legacy genId() was
  // Date.now().toString(36), so two entries in the same millisecond collide.
  const used = new Set<number>();
  let changed = false;

  const next = entries.map(e => {
    if (e.reasonCategory !== undefined) return e;

    const created = Date.parse(e.createdAt);
    let best = -1;
    let bestDt = Infinity;
    legacy.forEach((d, i) => {
      if (used.has(i) || d.symbol !== e.symbol) return;
      const dt = Math.abs(Date.parse(d.timestamp) - created);
      if (dt < TWIN_MATCH_WINDOW_MS && dt < bestDt) { best = i; bestDt = dt; }
    });

    if (best >= 0) {
      used.add(best);
      changed = true;
      const d = legacy[best];
      return { ...e, reasonCategory: d.reason, confidence: d.confidence, action: e.action ?? d.action };
    }

    const inferred = reasonFromExactLabel(e.buyReason);
    if (inferred) {
      changed = true;
      return { ...e, reasonCategory: inferred };
    }
    return e;
  });

  return changed ? next : entries;
}

export const useTradeJournalStore = create<TradeJournalState>()(
  persist(
    (set, get) => ({
      entries: [],

      // Hydrates from Firestore-loaded entries (e.g. on login from a new device).
      // That load replaces local state wholesale, so it would wipe any fields
      // the migration had filled in locally but not yet synced — re-running
      // the migration afterwards puts them back.
      setEntries: (entries) => {
        set({ entries });
        void get().migrateLegacyDecisionJournal();
      },

      migrateLegacyDecisionJournal: async () => {
        let legacy: LegacyDecisionEntry[] = [];
        try { legacy = await readLegacyDecisionEntries(); } catch { legacy = []; }
        // Functional update against the state as it is *now*, after the
        // await — not a snapshot from before it. A trade placed while the
        // read was in flight would otherwise be silently dropped.
        set(state => {
          const merged = mergeLegacy(state.entries, legacy);
          return merged === state.entries ? state : { entries: merged };
        });
      },

      createEntry: (entry) => {
        const now = new Date().toISOString();
        const newEntry: JournalEntry = {
          ...entry,
          id: `journal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ entries: [...state.entries, newEntry] }));
        return newEntry;
      },
      
      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
          ),
        }));
      },
      
      addPostTradeReflection: (id, reflection) => {
        if (!reflection) return;
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id 
              ? { ...e, postTradeReflection: reflection, updatedAt: new Date().toISOString() } 
              : e
          ),
        }));
      },
      
      getEntryByTradeId: (tradeId) => {
        return get().entries.find((e) => e.tradeId === tradeId);
      },
      
      getEntriesBySymbol: (symbol) => {
        return get().entries.filter((e) => e.symbol === symbol);
      },
      
      getReflectedTradeStats: () => {
        const entries = get().entries.filter((e) => e.postTradeReflection);
        const total = entries.length;
        
        if (total === 0) {
          return {
            totalReflected: 0,
            thesisCorrectRate: 0,
            avgReturn: 0,
            bestLearning: null,
          };
        }
        
        const correctTheses = entries.filter(
          (e) => e.postTradeReflection!.thesisPlayedOut === 'yes'
        ).length;
        
        const avgReturn = entries.reduce(
          (sum, e) => sum + e.postTradeReflection!.actualReturn,
          0
        ) / total;
        
        // Find the most "valuable" learning (longest reflection)
        const bestEntry = entries.reduce<JournalEntry | null>((best, current) => {
          const len = current.postTradeReflection!.keyLearnings.length;
          if (!best || len > best.postTradeReflection!.keyLearnings.length) return current;
          return best;
        }, null);
        
        return {
          totalReflected: total,
          thesisCorrectRate: (correctTheses / total) * 100,
          avgReturn,
          bestLearning: bestEntry?.postTradeReflection?.keyLearnings || null,
        };
      },
    }),
    {
      name: 'investapp-journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // A device that never loads from Firestore (offline, or signed-in before
      // the cloud load finished) only ever gets here, never setEntries.
      onRehydrateStorage: () => (state) => { void state?.migrateLegacyDecisionJournal(); },
    }
  )
);

// ============================================================================
// REFLECTION PROMPTS
// ============================================================================

/**
 * Pre-trade prompts shown when user is about to buy.
 */
export const preTradePrompts = {
  buyReason: {
    label: 'Why are you buying this?',
    placeholder: 'I think this stock will go up because...',
    minLength: 20,
    tip: 'Be specific. "Strong earnings growth" is better than "looks good".',
  },
  exitPlan: {
    label: 'What\'s your exit plan?',
    placeholder: 'I\'ll sell if the price hits $X, or if...',
    minLength: 15,
    tip: 'Pros decide when to sell BEFORE they buy. This prevents emotional decisions.',
  },
  expectedReturn: {
    label: 'Expected return %',
    placeholder: '15',
    tip: 'Setting an expected return helps you measure success against intention.',
  },
  expectedTimeframe: {
    label: 'Expected hold time (days)',
    placeholder: '180',
    tip: 'How long will you wait for your thesis to play out?',
  },
};

/**
 * Post-trade prompts shown periodically or when user closes a position.
 */
export const postTradePrompts = {
  thesisQuestion: 'Did your original thesis play out?',
  thesisOptions: [
    { value: 'yes', label: 'Yes, exactly as I expected', icon: 'checkmark-circle-outline' },
    { value: 'partially', label: 'Partially — some things were right, some weren\'t', icon: 'help-circle-outline' },
    { value: 'no', label: 'No, I was wrong', icon: 'close-circle-outline' },
  ],
  learningsQuestion: 'What did you learn from this trade?',
  learningsPlaceholder: 'I learned that... / Next time I\'ll...',
  wouldRepeatQuestion: 'Would you make this trade again?',
  wouldRepeatOptions: [
    { value: 'yes', label: 'Yes, same approach', emoji: '✅' },
    { value: 'with_changes', label: 'Yes, but I\'d do X differently', icon: 'refresh-outline' },
    { value: 'no', label: 'No, I\'d skip it', emoji: '❌' },
  ],
};
