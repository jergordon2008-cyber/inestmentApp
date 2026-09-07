import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Branch = 'value' | 'growth' | 'macro' | 'technical' | 'portfolio';

// ── XP Level Milestones ───────────────────────────────────────────────────────
export interface XPMilestone {
  level: number;
  xpRequired: number;
  title: string;
  perkTitle: string;
  perkDescription: string;
  /** Ionicons name — the app's icon set. Was an emoji until Phase 3. */
  icon: string;
}

export const XP_MILESTONES: XPMilestone[] = [
  { level: 1,  xpRequired: 0,      title: 'Starter',         perkTitle: 'Paper Portfolio',      perkDescription: '$100,000 paper money to practice trading — no real risk.',            icon: 'leaf-outline' },
  { level: 2,  xpRequired: 400,    title: 'Learner',         perkTitle: 'Streak Shield',         perkDescription: 'One free streak protection per week — miss a day without losing it.',  icon: 'library-outline' },
  { level: 3,  xpRequired: 900,    title: 'Apprentice',      perkTitle: 'Custom Profile Badge',  perkDescription: 'Unique badge shown on your profile and leaderboard card.',               icon: 'ribbon-outline' },
  { level: 4,  xpRequired: 1600,   title: 'Investor',        perkTitle: 'Extra Accent Colors',   perkDescription: 'Unlock 5 premium accent color options for the app.',                    icon: 'color-palette-outline' },
  { level: 5,  xpRequired: 2500,   title: 'Analyst',         perkTitle: 'XP Multiplier ×1.25',  perkDescription: 'Earn 25% more XP from all lessons and challenges.',                     icon: 'flash-outline' },
  { level: 6,  xpRequired: 3600,   title: 'Strategist',      perkTitle: 'Leaderboard Profile',   perkDescription: 'Your name and rank appear on the global leaderboard.',                  icon: 'trophy-outline' },
  { level: 7,  xpRequired: 4900,   title: 'Portfolio Pro',   perkTitle: 'Dark Gold Theme',       perkDescription: 'Unlock the exclusive dark gold accent theme for the app.',              icon: 'sparkles-outline' },
  { level: 8,  xpRequired: 6400,   title: 'Expert',          perkTitle: 'Tier 2 Fast-Track',     perkDescription: 'Unlock all Tier 2 lessons immediately on completion of Tier 1.',        icon: 'rocket-outline' },
  { level: 9,  xpRequired: 8100,   title: 'Master',          perkTitle: 'Signal Priority',       perkDescription: 'Get buy/sell signals 24 hours before other users.',                     icon: 'notifications-outline' },
  { level: 10, xpRequired: 10000,  title: 'Elite Investor',  perkTitle: 'Elite Badge + Theme',   perkDescription: 'Permanent Elite badge, exclusive neon-blue theme, and Hall of Fame entry.', icon: 'diamond-outline' },
];

export function getXPMilestoneForLevel(level: number): XPMilestone {
  return XP_MILESTONES.find(m => m.level === level) ?? XP_MILESTONES[XP_MILESTONES.length - 1];
}

export function getXPToNextLevel(currentXP: number): { current: number; required: number; pct: number; nextMilestone: XPMilestone | null } {
  const currentLevel = Math.floor(Math.sqrt(currentXP / 100)) + 1;
  const nextMilestone = XP_MILESTONES.find(m => m.level === currentLevel + 1) ?? null;
  if (!nextMilestone) return { current: currentXP, required: currentXP, pct: 1, nextMilestone: null };
  const currentMilestone = XP_MILESTONES.find(m => m.level === currentLevel);
  const base = currentMilestone?.xpRequired ?? 0;
  const required = nextMilestone.xpRequired;
  const pct = Math.min(1, (currentXP - base) / (required - base));
  return { current: currentXP - base, required: required - base, pct, nextMilestone };
}

export interface SkillNode {
  id: string;
  branch: Branch;
  title: string;
  description: string;
  lessonId: string;
  xpReward: number;
  level: number; // 1-5 within branch
  requires: string[]; // node ids that must be unlocked first
}

interface SkillTreeState {
  xp: number;
  level: number;
  unlockedNodes: string[];
  completedNodes: string[];
  selectedBranch: Branch | null;
  gamificationEnabled: boolean;
  addXP: (amount: number) => void;
  completeNode: (nodeId: string) => void;
  setSelectedBranch: (branch: Branch | null) => void;
  setGamificationEnabled: (enabled: boolean) => void;
  load: () => Promise<void>;
}

export const SKILL_NODES: SkillNode[] = [
  // ── VALUE branch ──────────────────────────────────────────────────────────
  // v1 → T1L06: Blue-chip stocks (what makes a company great, moat intro)
  { id: 'v1', branch: 'value', title: 'What Makes a Company Valuable?', description: 'Earnings, assets, moat', lessonId: 'T1L06', xpReward: 100, level: 1, requires: [] },
  // v2 → T2L10: Reading financial statements (income, balance sheet, cash flow)
  { id: 'v2', branch: 'value', title: 'Reading Financial Statements', description: 'Income statement, balance sheet, cash flow', lessonId: 'T2L10', xpReward: 150, level: 2, requires: ['v1'] },
  // v3 → T1L03: How to read a stock quote (P/E, market cap, valuation ratios)
  { id: 'v3', branch: 'value', title: 'Price-to-Earnings & Valuation Ratios', description: 'P/E, P/B, EV/EBITDA', lessonId: 'T1L03', xpReward: 200, level: 3, requires: ['v2'] },
  // v4 → T2L05: Value investing — buying the dollar for 50 cents (moat, Buffett)
  { id: 'v4', branch: 'value', title: 'Competitive Moats', description: 'Network effects, switching costs, brands', lessonId: 'T2L05', xpReward: 200, level: 4, requires: ['v3'] },
  // v5 → T2L13: Deep fundamental analysis (intrinsic value, DCF, margin of safety)
  { id: 'v5', branch: 'value', title: 'Intrinsic Value & Margin of Safety', description: 'DCF models, Buffett principles', lessonId: 'T2L13', xpReward: 300, level: 5, requires: ['v4'] },

  // ── GROWTH branch ──────────────────────────────────────────────────────────
  // g1 → T2L06: Growth investing — TAM, revenue growth, future bets
  { id: 'g1', branch: 'growth', title: 'What Drives Growth Stocks?', description: 'TAM, revenue growth, NRR', lessonId: 'T2L06', xpReward: 100, level: 1, requires: [] },
  // g2 → T2L21: Small, mid, large cap — where growth stocks live, why size matters
  { id: 'g2', branch: 'growth', title: 'Rule of 40 & SaaS Metrics', description: 'ARR, churn, LTV/CAC', lessonId: 'T2L21', xpReward: 150, level: 2, requires: ['g1'] },
  // g3 → T1L02: Stocks vs bonds vs ETFs — understanding the growth vs value spectrum
  { id: 'g3', branch: 'growth', title: 'Growth at a Reasonable Price (GARP)', description: 'PEG ratio, growth + value blend', lessonId: 'T1L02', xpReward: 200, level: 3, requires: ['g2'] },
  // g4 → T2L16: Market indexes — how indexes capture sector-level disruptors
  { id: 'g4', branch: 'growth', title: 'Disruptive Technologies', description: 'S-curves, winner-takes-all dynamics', lessonId: 'T2L16', xpReward: 200, level: 4, requires: ['g3'] },
  // g5 → T2L14: Portfolio construction at scale — position sizing, drawdown management
  { id: 'g5', branch: 'growth', title: 'Position Sizing for Volatility', description: 'Kelly criterion, drawdown management', lessonId: 'T2L14', xpReward: 300, level: 5, requires: ['g4'] },

  // ── MACRO branch ──────────────────────────────────────────────────────────
  // m1 → T1L08: Market cycles (expansion, peak, contraction, trough — exact match)
  { id: 'm1', branch: 'macro', title: 'Economic Cycles 101', description: 'Expansion, peak, contraction, trough', lessonId: 'T1L08', xpReward: 100, level: 1, requires: [] },
  // m2 → T2L08: Reading the economy like a pro (FOMC, Fed funds rate, yield curve)
  { id: 'm2', branch: 'macro', title: 'The Fed & Interest Rates', description: 'FOMC, Fed funds rate, yield curve', lessonId: 'T2L08', xpReward: 150, level: 2, requires: ['m1'] },
  // m3 → T2L01: What are bonds? (bond yields as the real-return barometer; CPI, rate risk)
  { id: 'm3', branch: 'macro', title: 'Inflation & Real Returns', description: 'CPI, PCE, real vs nominal', lessonId: 'T2L01', xpReward: 200, level: 3, requires: ['m2'] },
  // m4 → T2L09: Sector rotation — which sectors win in each cycle phase (perfect match)
  { id: 'm4', branch: 'macro', title: 'Sector Rotation Strategy', description: 'Which sectors win in each cycle phase', lessonId: 'T2L09', xpReward: 200, level: 4, requires: ['m3'] },
  // m5 → T2L12: Real estate investing (global real assets, alternative macro plays)
  { id: 'm5', branch: 'macro', title: 'Global Macro Playbook', description: 'FX, commodities, geopolitical risk', lessonId: 'T2L12', xpReward: 300, level: 5, requires: ['m4'] },

  // ── TECHNICAL branch ──────────────────────────────────────────────────────
  // t1 → T2L07: Technical analysis basics (candlesticks, volume, support/resistance — exact)
  { id: 't1', branch: 'technical', title: 'Reading a Price Chart', description: 'Candlesticks, volume, support/resistance', lessonId: 'T2L07', xpReward: 100, level: 1, requires: [] },
  // t2 → T1L08: Market cycles (price patterns over time underlie moving averages)
  { id: 't2', branch: 'technical', title: 'Moving Averages', description: 'SMA, EMA, golden cross, death cross', lessonId: 'T1L08', xpReward: 150, level: 2, requires: ['t1'] },
  // t3 → T1L11: Reading financial news (news drives momentum; RSI/MACD react to it)
  { id: 't3', branch: 'technical', title: 'Momentum Indicators', description: 'RSI, MACD, Bollinger Bands', lessonId: 'T1L11', xpReward: 200, level: 3, requires: ['t2'] },
  // t4 → T2L18: Choosing a broker and order types (executing chart patterns via orders)
  { id: 't4', branch: 'technical', title: 'Chart Patterns', description: 'Cup & handle, head & shoulders, flags', lessonId: 'T2L18', xpReward: 200, level: 4, requires: ['t3'] },
  // t5 → T2L20: Tier 2 graduation — complete framework includes entry/exit discipline
  { id: 't5', branch: 'technical', title: 'Entry & Exit Strategies', description: 'Stop losses, trailing stops, scaling in', lessonId: 'T2L20', xpReward: 300, level: 5, requires: ['t4'] },

  // ── PORTFOLIO branch ──────────────────────────────────────────────────────
  // p1 → T1L04: Understanding risk (diversification, company vs market risk — exact match)
  { id: 'p1', branch: 'portfolio', title: 'Diversification Fundamentals', description: 'Correlation, asset classes, sectors', lessonId: 'T1L04', xpReward: 100, level: 1, requires: [] },
  // p2 → T1L05: Your first investment decision (risk tolerance, time horizon, allocation)
  { id: 'p2', branch: 'portfolio', title: 'Asset Allocation Models', description: '60/40, all-weather, risk parity', lessonId: 'T1L05', xpReward: 150, level: 2, requires: ['p1'] },
  // p3 → T1L10: Building a simple portfolio (rebalancing is a central topic — exact match)
  { id: 'p3', branch: 'portfolio', title: 'Rebalancing & Tax Efficiency', description: 'When and how to rebalance', lessonId: 'T1L10', xpReward: 200, level: 3, requires: ['p2'] },
  // p4 → T2L17: Taxes and investing (keep more: tax-efficient portfolio management)
  { id: 'p4', branch: 'portfolio', title: 'Risk-Adjusted Returns', description: 'Sharpe ratio, max drawdown, Sortino', lessonId: 'T2L17', xpReward: 200, level: 4, requires: ['p3'] },
  // p5 → T2L15: Why investors fail — behavioral finance (the meta-lesson of portfolio mastery)
  { id: 'p5', branch: 'portfolio', title: 'Portfolio Construction Masterclass', description: 'Building a conviction-weighted portfolio', lessonId: 'T2L15', xpReward: 300, level: 5, requires: ['p4'] },
];

function calcLevel(xp: number) { return Math.floor(Math.sqrt(xp / 100)) + 1; }

export const useSkillTreeStore = create<SkillTreeState>((set, get) => ({
  xp: 0,
  level: 1,
  unlockedNodes: ['v1', 'g1', 'm1', 't1', 'p1'],
  completedNodes: [],
  selectedBranch: null,
  gamificationEnabled: true,

  addXP: (amount) => {
    const newXP = get().xp + amount;
    set({ xp: newXP, level: calcLevel(newXP) });
    AsyncStorage.setItem('@investapp:skill_xp', String(newXP)).catch(() => {});
  },

  completeNode: (nodeId) => {
    const s = get();
    if (s.completedNodes.includes(nodeId)) return;
    const node = SKILL_NODES.find(n => n.id === nodeId);
    if (!node) return;
    // Unlock next nodes in same branch
    const newUnlocked = SKILL_NODES
      .filter(n => n.requires.includes(nodeId) && !s.unlockedNodes.includes(n.id))
      .map(n => n.id);
    set({
      completedNodes: [...s.completedNodes, nodeId],
      unlockedNodes: [...s.unlockedNodes, ...newUnlocked],
    });
    get().addXP(node.xpReward);
    AsyncStorage.setItem('@investapp:completed_nodes', JSON.stringify([...s.completedNodes, nodeId])).catch(() => {});
  },

  setSelectedBranch: (branch) => set({ selectedBranch: branch }),

  setGamificationEnabled: (enabled) => {
    set({ gamificationEnabled: enabled });
    AsyncStorage.setItem('@investapp:gamification', String(enabled)).catch(() => {});
  },

  load: async () => {
    try {
      const [xpRaw, nodesRaw, gamRaw] = await Promise.all([
        AsyncStorage.getItem('@investapp:skill_xp'),
        AsyncStorage.getItem('@investapp:completed_nodes'),
        AsyncStorage.getItem('@investapp:gamification'),
      ]);
      const xp = xpRaw ? parseInt(xpRaw) : 0;
      const completed = nodesRaw ? JSON.parse(nodesRaw) : [];
      const gamification = gamRaw !== 'false';
      // recompute unlocked
      const unlocked = new Set(['v1', 'g1', 'm1', 't1', 'p1']);
      completed.forEach((id: string) => {
        SKILL_NODES.filter(n => n.requires.includes(id)).forEach(n => unlocked.add(n.id));
      });
      set({ xp, level: calcLevel(xp), completedNodes: completed, unlockedNodes: Array.from(unlocked), gamificationEnabled: gamification });
    } catch {}
  },
}));
