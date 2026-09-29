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

// ============================================================================
// PREDICTIONS (the thesis gate)
// ============================================================================
// A buy can't execute without one. It's written before the order ticket, tied
// to one exact symbol, and later self-graded against what the student said
// would happen — never against whether the trade made money.

export type CheckBackPeriod = '2w' | '1m' | '3m' | '6m';

export const CHECK_BACK_OPTIONS: { value: CheckBackPeriod; label: string; days: number }[] = [
  { value: '2w', label: '2 weeks',  days: 14 },
  { value: '1m', label: '1 month',  days: 30 },
  { value: '3m', label: '3 months', days: 91 },
  { value: '6m', label: '6 months', days: 182 },
];

/**
 * Minimum trimmed lengths. One definition, used by the form, the Trade screen
 * and executeTrade, so no layer can drift into accepting something another
 * would have refused. Deliberately low bars: the goal is a real sentence, not
 * an essay — "up" or "idk" should fail, "Services revenue beats iPhone growth
 * next quarter" should pass.
 */
export const PREDICTION_MIN_CLAIM = 30;
export const PREDICTION_MIN_FALSIFIER = 15;

export interface Prediction {
  /** The one symbol this prediction may be attached to. */
  symbol: string;
  /** "What will happen." Graded later — so it should be about the company. */
  claim: string;
  /** "How I'll know I'm wrong." */
  falsifier: string;
  checkBack: CheckBackPeriod;
  reasonCategory: TradeReason;
  confidence: Confidence;
}

/** Claim and falsifier long enough to be a real statement. */
export function isPredictionTextValid(claim: string | undefined, falsifier: string | undefined): boolean {
  return (claim ?? '').trim().length >= PREDICTION_MIN_CLAIM
      && (falsifier ?? '').trim().length >= PREDICTION_MIN_FALSIFIER;
}

/** A prediction that is complete and belongs to exactly this symbol. */
export function isPredictionFor(p: Prediction | null | undefined, symbol: string): p is Prediction {
  return !!p
    && p.symbol.toUpperCase() === symbol.toUpperCase()
    && isPredictionTextValid(p.claim, p.falsifier);
}

export function checkBackDate(period: CheckBackPeriod, from: Date = new Date()): string {
  const days = CHECK_BACK_OPTIONS.find(o => o.value === period)?.days ?? 30;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Soft check for a claim that's really a call on the price. Graded against
 * itself, "AAPL will go up" is just "did I make money" — the thing the gate
 * exists not to grade. This only ever drives a hint; it never blocks, because
 * keyword matching is far too blunt to refuse someone's reasoning on.
 *
 * Tuned to avoid false positives over catching everything. A missed price
 * call just means no hint; a false positive tells a student to stop making
 * exactly the kind of prediction we want — "Revenue grows 15% next year" is
 * specific, measurable and about the business. So a bare number or dollar
 * figure only counts when nothing in the sentence is about the business.
 */
const STOCK_MOVES = /\b(price|stock|shares?)\b.*\b(go(es|ing)? (up|down)|rise|rises|rising|climb|climbs|fall|falls|drop|drops|double|doubles|triple|moon)\b/i;
const BARE_DIRECTION = /\b(go(es|ing)? (up|down)|to the moon)\b/i;
const NUMBER = /\$\s?\d|\d+(\.\d+)?\s?%/;
const BUSINESS = /\b(revenue|revenues|sales|earnings|eps|margin|margins|profit|profits|income|guidance|users|subscribers|customers|market share|deliveries|units|growth)\b/i;

export function looksLikePriceCall(claim: string): boolean {
  if (STOCK_MOVES.test(claim) || BARE_DIRECTION.test(claim)) return true;
  return NUMBER.test(claim) && !BUSINESS.test(claim);
}

// ============================================================================
// GRADES (Phase C)
// ============================================================================
// A prediction is graded against its own words — "did what you said would
// happen, happen?" — at its check-back date. The price change is revealed
// only after a final grade is saved, and is recorded beside the grade, never
// inside it.

/** 'too_early' is an answer, not a grade: it never counts, and asks again later. */
export type GradeResult = 'yes' | 'partly' | 'no' | 'too_early';
export type FinalGrade = Exclude<GradeResult, 'too_early'>;
export type MovedBecause = 'yes' | 'partly' | 'no' | 'not_sure';

export function isFinalGrade(r: GradeResult | undefined): r is FinalGrade {
  return r === 'yes' || r === 'partly' || r === 'no';
}

export interface PredictionGrade {
  result: GradeResult;
  gradedAt: string;
  /** Captured after a final grade was saved, from a live quote. Not part of the grade. */
  priceCheck?: { entryPrice: number; price: number; checkedAt: string };
  /** Optional follow-up, asked after the price is revealed. */
  movedBecause?: MovedBecause;
}

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

  // Pre-trade reflection. For a gated prediction, buyReason holds the claim
  // ("what will happen") and exitPlan the falsifier ("how I'll know I'm
  // wrong") — the same fields the Trade record carries them in.
  buyReason: string;                  // "Why am I buying this?"
  exitPlan: string;                   // "When/why will I sell?"
  /**
   * When to self-grade the prediction. Present only on entries written through
   * the thesis gate, so it also marks them: an entry without it predates the
   * gate and has no real prediction to grade against.
   */
  checkBackAt?: string;
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
  
  /** Present once the student has answered the grade prompt. */
  grade?: PredictionGrade;

  createdAt: string;
  updatedAt: string;
}

interface TradeJournalState {
  entries: JournalEntry[];
  /**
   * The account these entries belong to. Null on a device that predates owner
   * tracking, until the first sign-in reconciles it (see journalReconcile).
   */
  ownerUid: string | null;

  // Actions
  /** Replaces the entries and records whose they are. */
  setEntries: (entries: JournalEntry[], ownerUid: string | null) => void;
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

  /**
   * Saves the student's answer. A final grade (yes/partly/no) is locked: it
   * can't be replaced, because the price is revealed right after it and a
   * changeable grade could then be re-graded by P&L. Returns false if refused.
   */
  gradePrediction: (id: string, result: GradeResult) => boolean;
  /** Only after a final grade, and only once. */
  recordPriceCheck: (id: string, check: NonNullable<PredictionGrade['priceCheck']>) => void;
  /** Only after a final grade. */
  answerMovedBecause: (id: string, answer: MovedBecause) => void;
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
      ownerUid: null,

      // Applies the reconciled journal on sign-in. Re-running the migration
      // afterwards fills in anything a cloud-only entry is missing that this
      // device's legacy journal can supply.
      setEntries: (entries, ownerUid) => {
        set({ entries, ownerUid });
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
      
      gradePrediction: (id, result) => {
        const entry = get().entries.find(e => e.id === id);
        if (!entry || isFinalGrade(entry.grade?.result)) return false;
        const now = new Date().toISOString();
        set(state => ({
          entries: state.entries.map(e =>
            e.id === id ? { ...e, grade: { result, gradedAt: now }, updatedAt: now } : e),
        }));
        return true;
      },

      recordPriceCheck: (id, check) => {
        const now = new Date().toISOString();
        set(state => ({
          entries: state.entries.map(e =>
            e.id === id && e.grade && isFinalGrade(e.grade.result) && !e.grade.priceCheck
              ? { ...e, grade: { ...e.grade, priceCheck: check }, updatedAt: now }
              : e),
        }));
      },

      answerMovedBecause: (id, answer) => {
        const now = new Date().toISOString();
        set(state => ({
          entries: state.entries.map(e =>
            e.id === id && e.grade && isFinalGrade(e.grade.result)
              ? { ...e, grade: { ...e.grade, movedBecause: answer }, updatedAt: now }
              : e),
        }));
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
