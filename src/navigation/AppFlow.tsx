/**
 * AppFlow
 *
 * The cross-screen behaviour that used to live in App.tsx's modal state:
 * the lesson paywall gate, the mood -> decision-journal -> trade interceptor
 * chain, the thesis that a student writes before a trade and that only becomes
 * a real journal entry once the trade executes, the skill-tree round trip, and
 * the AI "explain this term" overlay.
 *
 * It lives in one provider rather than in each screen because every one of
 * these flows crosses screens: a lesson can be opened from Home, Learn,
 * Classroom, a playbook or the skill tree, and all of them must hit the same
 * Tier 2/3 paywall check.
 */

import React, { createContext, useContext, useRef, useState } from 'react';
import { showAlert } from '../utils/alert';
import { useSubscriptionStore } from '../services/subscriptionStore';
import { useUserStore } from '../services/userStore';
import { useTradeJournalStore, TradeReason, REASON_CONFIG, Confidence } from '../services/tradeJournalStore';
import { useSkillTreeStore, SKILL_NODES } from '../services/skillTreeStore';
import { logActivity } from '../services/firestoreSync';
import { getChallengeForLesson } from '../data/lessonChallenges';
import { MoodGuardrailModal } from '../screens/MoodGuardrailModal';
import { DecisionJournalModal } from '../screens/DecisionJournalScreen';
import { AIExplainModal } from '../components/AIExplainModal';
import { navigate, replace, goBack, goTab } from './navigationRef';
import type { RootStackParamList } from './types';
import type { Trade, TradeType } from '../types';

interface AppFlowValue {
  /** Opens a lesson, enforcing the Tier 2/3 paywall first. */
  openLesson: (lessonId: string) => void;
  /** Opens a lesson and remembers to complete the matching skill-tree node. */
  openLessonFromSkillTree: (lessonId: string) => void;
  openStock: (symbol: string) => void;
  /** Entry point for a trade — runs the mood and decision-journal interceptors. */
  openTrade: (symbol: string, action: TradeType) => void;
  /** Skips the interceptors — for entry points that already collected a reason. */
  openTradeDirect: (symbol: string, action: TradeType) => void;
  openSubscription: (lockedFeature?: string) => void;
  /** Navigates only if the plan allows it, otherwise shows the paywall. */
  openGated: (route: keyof RootStackParamList, featureKey: string, label: string) => void;
  explain: (term: string) => void;
  /** The reason the student wrote pre-trade, consumed by the Trade screen. */
  pendingBuyReason: string | undefined;
  handleLessonComplete: (lessonId: string, lessonTitle: string) => void;
  /** Backing out of a lesson — forgets that it came from the skill tree. */
  cancelLesson: () => void;
  handleTradeSuccess: (trade?: Trade) => void;
  /** AI Tutor is disabled until usage limits are wired up. */
  openTutorChat: () => void;
}

const AppFlowContext = createContext<AppFlowValue | null>(null);

export function useAppFlow(): AppFlowValue {
  const value = useContext(AppFlowContext);
  if (!value) throw new Error('useAppFlow must be used inside <AppFlowProvider>');
  return value;
}

export function AppFlowProvider({ uid, children }: { uid: string | null; children: React.ReactNode }) {
  const canUseFeature = useSubscriptionStore(s => s.canUseFeature);
  const user = useUserStore(s => s.user);
  const createJournalEntry = useTradeJournalStore(s => s.createEntry);

  const [explainTerm, setExplainTerm] = useState<string | null>(null);
  const [moodModal, setMoodModal] = useState<{ visible: boolean; symbol: string; pendingTrade?: { symbol: string; action: TradeType } }>({ visible: false, symbol: '' });
  const [djModal, setDjModal] = useState<{ visible: boolean; symbol: string; action: string; pendingTrade?: { symbol: string; action: TradeType } }>({ visible: false, symbol: '', action: '' });

  // The thesis a student wrote in the Decision Journal prompt right before a
  // trade — held here until the trade actually executes, then persisted as a
  // real JournalEntry tied to that trade's real id. Cleared if they skip the
  // prompt (nothing to save) or once the trade completes, so it can't leak
  // into the next trade.
  const [pendingThesis, setPendingThesis] = useState<{ reason: TradeReason; note: string; confidence: Confidence } | null>(null);

  // Which lessonId was opened from the skill tree, so completion can
  // auto-complete that node and route back to the tree.
  const skillTreeLessonRef = useRef<string | null>(null);

  const openSubscription = (lockedFeature?: string) => navigate('Subscription', { lockedFeature });

  // Tier 1 lessons are free; Tier 2/3 (ids prefixed T2/T3) require Premium.
  // Gated here rather than at each entry point, since Home, Learn, micro
  // lessons, playbooks, the tutor, Classroom and the skill tree all open
  // lessons through this one function.
  const openLesson = (lessonId: string) => {
    const isAdvanced = lessonId.startsWith('T2') || lessonId.startsWith('T3');
    if (isAdvanced && !canUseFeature('advancedLessons')) {
      openSubscription('Tier 2 & 3 Lessons');
      return;
    }
    navigate('Lesson', { lessonId });
  };

  const openLessonFromSkillTree = (lessonId: string) => {
    skillTreeLessonRef.current = lessonId;
    openLesson(lessonId);
  };

  const openGated = (route: keyof RootStackParamList, featureKey: string, label: string) => {
    if (!canUseFeature(featureKey as any)) { openSubscription(label); return; }
    navigate(route);
  };

  const openTradeDirect = (symbol: string, action: TradeType) => navigate('Trade', { symbol, action });

  const openTrade = (symbol: string, action: TradeType) => {
    if (canUseFeature('moodGuard')) {
      setMoodModal({ visible: true, symbol, pendingTrade: { symbol, action } });
    } else {
      setDjModal({ visible: true, symbol, action, pendingTrade: { symbol, action } });
    }
  };

  const handleLessonComplete = (lessonId: string, lessonTitle: string) => {
    const fromSkillTree = skillTreeLessonRef.current === lessonId;
    skillTreeLessonRef.current = null;

    if (fromSkillTree) {
      const node = SKILL_NODES.find(n => n.lessonId === lessonId);
      if (node) useSkillTreeStore.getState().completeNode(node.id);
    }

    const challenge = getChallengeForLesson(lessonId);
    if (challenge) {
      // Replace rather than push: backing out of a challenge should not land
      // the student back in the lesson they just finished.
      replace('LessonChallenge', { lessonId, lessonTitle });
    } else {
      goBack();
    }
  };

  const handleTradeSuccess = (trade?: Trade) => {
    // Persist the thesis the student wrote in the pre-trade prompt as the one
    // journal entry for this trade, tied to its real trade id. pendingThesis
    // is null when the prompt was skipped, or when the trade was placed from
    // an entry point that doesn't run the interceptors.
    if (trade && pendingThesis) {
      createJournalEntry({
        tradeId: trade.id,
        symbol: trade.symbol,
        action: trade.type,
        buyReason: pendingThesis.note || REASON_CONFIG[pendingThesis.reason].label,
        exitPlan: '',
        reasonCategory: pendingThesis.reason,
        confidence: pendingThesis.confidence,
      });
    }
    if (trade && uid && user) {
      logActivity({
        uid,
        displayName: user.displayName,
        action: trade.type,
        symbol: trade.symbol,
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    }
    setPendingThesis(null);
    // Land on the portfolio so the student sees the position they just opened.
    goTab('Portfolio');
  };

  // AI Tutor is temporarily disabled (usage limits aren't wired up yet)
  // rather than left open with unlimited free access.
  const openTutorChat = () => showAlert('Coming Soon', 'The AI Tutor is being upgraded and will be back soon.');

  const value: AppFlowValue = {
    openLesson,
    openLessonFromSkillTree,
    openStock: (symbol: string) => navigate('StockDetail', { symbol }),
    openTrade,
    openTradeDirect,
    openSubscription,
    openGated,
    explain: setExplainTerm,
    pendingBuyReason: pendingThesis?.note,
    handleLessonComplete,
    cancelLesson: () => { skillTreeLessonRef.current = null; },
    handleTradeSuccess,
    openTutorChat,
  };

  return (
    <AppFlowContext.Provider value={value}>
      {children}

      {/* ── Interceptors: mood check, then the pre-trade thesis prompt ── */}
      <MoodGuardrailModal
        visible={moodModal.visible}
        symbol={moodModal.symbol}
        onProceed={() => {
          const t = moodModal.pendingTrade;
          setMoodModal({ visible: false, symbol: '' });
          if (t) setDjModal({ visible: true, symbol: t.symbol, action: t.action, pendingTrade: t });
        }}
        onCancel={() => setMoodModal({ visible: false, symbol: '' })}
      />
      <DecisionJournalModal
        visible={djModal.visible}
        symbol={djModal.symbol}
        action={djModal.action}
        onSubmit={(reason, note, confidence) => {
          const t = djModal.pendingTrade;
          setPendingThesis({ reason, note, confidence });
          setDjModal({ visible: false, symbol: '', action: '' });
          if (t) openTradeDirect(t.symbol, t.action);
        }}
        onSkip={() => {
          const t = djModal.pendingTrade;
          setPendingThesis(null);
          setDjModal({ visible: false, symbol: '', action: '' });
          if (t) openTradeDirect(t.symbol, t.action);
        }}
      />

      {explainTerm && <AIExplainModal term={explainTerm} onClose={() => setExplainTerm(null)} />}
    </AppFlowContext.Provider>
  );
}
