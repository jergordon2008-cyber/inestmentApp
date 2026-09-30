/**
 * AppFlow
 *
 * The cross-screen behaviour that used to live in App.tsx's modal state:
 * the lesson paywall gate, the mood -> decision-journal -> trade interceptor
 * chain, the thesis that a student writes before a trade and that only becomes
 * a real journal entry once the trade executes, and the skill-tree round trip.
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
import { useTradeJournalStore, Prediction, isPredictionFor, checkBackDate } from '../services/tradeJournalStore';
import { useSkillTreeStore, SKILL_NODES } from '../services/skillTreeStore';
import { logActivity } from '../services/firestoreSync';
import { getChallengeForLesson } from '../data/lessonChallenges';
import { MoodGuardrailModal } from '../screens/MoodGuardrailModal';
import type { Mood } from '../services/moodStore';
import { DecisionJournalModal } from '../screens/DecisionJournalScreen';
import { navigate, replace, goBack, goTab } from './navigationRef';
import type { RootStackParamList } from './types';
import type { Trade, TradeType } from '../types';

interface AppFlowValue {
  /** Opens a lesson, enforcing the Tier 2/3 paywall first. */
  openLesson: (lessonId: string) => void;
  /** Opens a lesson and remembers to complete the matching skill-tree node. */
  openLessonFromSkillTree: (lessonId: string) => void;
  openStock: (symbol: string) => void;
  /**
   * Entry point for a trade. Buys go through the mood check and then the
   * prediction form; sells go through the mood check only.
   */
  openTrade: (symbol: string, action: TradeType) => void;
  /**
   * Straight to the Trade screen with no interceptors. Safe for buys only
   * because the gate doesn't live here: the Trade screen won't enable Buy and
   * executeTrade won't accept one without a prediction for that symbol.
   */
  openTradeDirect: (symbol: string, action: TradeType) => void;
  openSubscription: (lockedFeature?: string) => void;
  /** Navigates only if the plan allows it, otherwise shows the paywall. */
  openGated: (route: keyof RootStackParamList, featureKey: string, label: string) => void;
  /**
   * The prediction written for the buy in progress, bound to one symbol.
   * Consumers must check the symbol (isPredictionFor) — never assume it
   * belongs to whatever screen they're on.
   */
  pendingPrediction: Prediction | null;
  /** Opens the prediction form over the Trade screen, without re-navigating. */
  requestPrediction: (symbol: string) => void;
  /** Called when the Trade screen is left, so a prediction can't outlive it. */
  clearPendingPrediction: () => void;
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

  // The mood picked in the mood check, bound to the symbol it was picked for,
  // so it can be recorded on that buy's prediction and graded with it.
  const [pendingMood, setPendingMood] = useState<{ symbol: string; mood: Mood } | null>(null);
  const [moodModal, setMoodModal] = useState<{ visible: boolean; symbol: string; pendingTrade?: { symbol: string; action: TradeType } }>({ visible: false, symbol: '' });
  // The prediction form. It's buy-only now, so it carries a symbol rather than
  // a symbol and action. `stayOnTrade` is set when it's opened from the Trade
  // screen itself (a student who arrived by URL), so submitting just attaches
  // the prediction instead of pushing a second Trade screen.
  const [djModal, setDjModal] = useState<{ visible: boolean; symbol: string; stayOnTrade?: boolean }>({ visible: false, symbol: '' });

  // The prediction written for the buy in progress. It carries its own symbol
  // and is only ever honoured for that symbol (isPredictionFor), and it's
  // cleared when the Trade screen is left — by any route, see TradeRoute's blur
  // listener — or once the trade completes.
  //
  // Previously this held { reason, note, confidence } with no symbol and was
  // only cleared on success, so writing a thesis for AAPL, backing out, and
  // reaching a TSLA trade some other way attached the AAPL thesis to TSLA.
  const [pendingPrediction, setPendingPrediction] = useState<Prediction | null>(null);

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

  // After the mood check (or instead of it, without the premium feature):
  // buys need a prediction, sells go straight to the ticket.
  const continueToTrade = (symbol: string, action: TradeType) => {
    if (action === 'buy') {
      setPendingPrediction(null);   // a fresh buy starts with a fresh prediction
      setDjModal({ visible: true, symbol });
    } else {
      openTradeDirect(symbol, action);
    }
  };

  const openTrade = (symbol: string, action: TradeType) => {
    setPendingMood(null);
    if (canUseFeature('moodGuard')) {
      setMoodModal({ visible: true, symbol, pendingTrade: { symbol, action } });
    } else {
      continueToTrade(symbol, action);
    }
  };

  const requestPrediction = (symbol: string) => setDjModal({ visible: true, symbol, stayOnTrade: true });
  const clearPendingPrediction = () => { setPendingPrediction(null); setPendingMood(null); };

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
    // One journal entry per buy, tied to the real trade id, and only from a
    // prediction written for this exact symbol. The claim and way-to-be-wrong
    // are already on the Trade record (executeTrade refuses a buy without
    // them), so if this write were ever lost the prediction still survives.
    // Sells don't create an entry: they carry no prediction. Grading open
    // predictions when you sell is a later phase.
    if (trade && trade.type === 'buy' && isPredictionFor(pendingPrediction, trade.symbol)) {
      createJournalEntry({
        tradeId: trade.id,
        symbol: trade.symbol,
        action: 'buy',
        buyReason: pendingPrediction.claim,
        exitPlan: pendingPrediction.falsifier,
        checkBackAt: checkBackDate(pendingPrediction.checkBack),
        reasonCategory: pendingPrediction.reasonCategory,
        confidence: pendingPrediction.confidence,
        mood: pendingMood?.symbol.toUpperCase() === trade.symbol.toUpperCase() ? pendingMood.mood : undefined,
      });
    }
    if (trade && uid && user) {
      logActivity({
        uid,
        displayName: user.displayName,
        action: trade.type,
        symbol: trade.symbol,
        createdAt: new Date().toISOString(),
      }).catch(e => console.error('[activity] failed to log trade activity', e)); // fire-and-forget
    }
    setPendingPrediction(null);
    setPendingMood(null);
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
    pendingPrediction,
    requestPrediction,
    clearPendingPrediction,
    handleLessonComplete,
    cancelLesson: () => { skillTreeLessonRef.current = null; },
    handleTradeSuccess,
    openTutorChat,
  };

  return (
    <AppFlowContext.Provider value={value}>
      {children}

      {/* ── Interceptors: mood check, then (buys only) the prediction form ── */}
      <MoodGuardrailModal
        visible={moodModal.visible}
        symbol={moodModal.symbol}
        onProceed={(mood) => {
          const t = moodModal.pendingTrade;
          setMoodModal({ visible: false, symbol: '' });
          if (t) setPendingMood({ symbol: t.symbol, mood });
          if (t) continueToTrade(t.symbol, t.action);
        }}
        onCancel={() => setMoodModal({ visible: false, symbol: '' })}
      />
      <DecisionJournalModal
        visible={djModal.visible}
        symbol={djModal.symbol}
        onSubmit={(prediction) => {
          const { stayOnTrade } = djModal;
          setPendingPrediction(prediction);
          setDjModal({ visible: false, symbol: '' });
          if (!stayOnTrade) openTradeDirect(prediction.symbol, 'buy');
        }}
        onCancel={() => {
          // Cancel abandons the buy. No navigation, and nothing left pending.
          setPendingPrediction(null);
          setPendingMood(null);
          setDjModal({ visible: false, symbol: '' });
        }}
      />

    </AppFlowContext.Provider>
  );
}
