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

export interface JournalEntry {
  id: string;
  tradeId: string;
  symbol: string;
  
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

export const useTradeJournalStore = create<TradeJournalState>()(
  persist(
    (set, get) => ({
      entries: [],

      // Hydrates from Firestore-loaded entries (e.g. on login from a new device).
      setEntries: (entries) => set({ entries }),

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
    { value: 'yes', label: 'Yes, exactly as I expected', emoji: '🎯' },
    { value: 'partially', label: 'Partially — some things were right, some weren\'t', emoji: '🤔' },
    { value: 'no', label: 'No, I was wrong', emoji: '😅' },
  ],
  learningsQuestion: 'What did you learn from this trade?',
  learningsPlaceholder: 'I learned that... / Next time I\'ll...',
  wouldRepeatQuestion: 'Would you make this trade again?',
  wouldRepeatOptions: [
    { value: 'yes', label: 'Yes, same approach', emoji: '✅' },
    { value: 'with_changes', label: 'Yes, but I\'d do X differently', emoji: '🔄' },
    { value: 'no', label: 'No, I\'d skip it', emoji: '❌' },
  ],
};
