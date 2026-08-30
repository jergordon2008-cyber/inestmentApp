import React, { useState, useRef, useEffect } from 'react';
import { View, Modal, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { showAlert } from './src/utils/alert';
import { useUserStore, createNewUser } from './src/services/userStore';
import { usePortfolioStore } from './src/services/portfolioStore';
import { useSubscriptionStore } from './src/services/subscriptionStore';
import { fetchStocks } from './src/services/marketDataFacade';
import { tier1Lessons } from './src/data/curriculum';
import { tier2Lessons } from './src/data/tier2curriculum';
import { tier3Lessons } from './src/data/tier3curriculum';
import { OnboardingAnswers } from './src/data/onboarding';
import { TradeType } from './src/types';


// Auth
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { subscribeToAuthChanges, signOutUser } from './src/services/authService';
import {
  saveUserProfile, loadUserProfile, savePortfolio, loadPortfolio,
  saveJournal, loadJournal, savePublicStats, isAdmin as checkIsAdmin, logActivity,
  subscribeToSubscriptionStatus,
} from './src/services/firestoreSync';
import { AdminScreen } from './src/screens/AdminScreen';
import { AnalyticsDashboardScreen } from './src/screens/AnalyticsDashboardScreen';
import { initAnalyticsLifecycle, startNewSession, logScreenView, flushScreenBuffer } from './src/services/analyticsService';
import { useTradeJournalStore } from './src/services/tradeJournalStore';
import { useDecisionJournalStore, TradeReason, REASON_CONFIG } from './src/services/decisionJournalStore';

// Tab screens
import { HomeScreen } from './src/screens/HomeScreen';
import { LessonsListScreen } from './src/screens/LessonsListScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { NewsFeedScreen } from './src/screens/NewsFeedScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { DiscoverScreen } from './src/screens/DiscoverScreen';

// Original modals
import { LessonScreen } from './src/screens/LessonScreen';
import { StockBrowserScreen } from './src/screens/StockBrowserScreen';
import { StockDetailScreen } from './src/screens/StockDetailScreen';
import { TradeScreen } from './src/screens/TradeScreen';
import { TradeJournalReviewScreen } from './src/screens/TradeJournalReviewScreen';
import { MicroLessonScreen } from './src/screens/MicroLessonScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';

// Feature modals
import { BehavioralAssessmentScreen } from './src/screens/BehavioralAssessmentScreen';
import { PlaybooksScreen } from './src/screens/PlaybooksScreen';
import { PlaybookDetailScreen } from './src/screens/PlaybookDetailScreen';
import { MacroDashboardScreen } from './src/screens/MacroDashboardScreen';
import { CommunityScreen } from './src/screens/CommunityScreen';
import { LegalScreen } from './src/screens/LegalScreen';
import { AiTutorScreen as TutorChatScreen } from './src/screens/AiTutorScreen';
import { CustomizeScreen } from './src/screens/CustomizeScreen';
import { ClassroomScreen } from './src/screens/ClassroomScreen';

// New feature screens
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { TimeMachineScreen } from './src/screens/TimeMachineScreen';
import { InvestorDNAScreen } from './src/screens/InvestorDNAScreen';
import { FutureSimulatorScreen } from './src/screens/FutureSimulatorScreen';
import { PortfolioHealthScreen } from './src/screens/PortfolioHealthScreen';
import { SkillTreeScreen } from './src/screens/SkillTreeScreen';
import { DecisionJournalScreen, DecisionJournalModal } from './src/screens/DecisionJournalScreen';
import { MarketScreen } from './src/screens/MarketScreen';
import { SocialScreen } from './src/screens/SocialScreen';
import { MoodGuardrailModal } from './src/screens/MoodGuardrailModal';

import { TabBar, TabName } from './src/components/TabBar';
import { TourGuide } from './src/components/TourGuide';
import { useSkillTreeStore, SKILL_NODES } from './src/services/skillTreeStore';
import { initializeLivePrices } from './src/services/stockDataService';
import { LessonChallengeScreen } from './src/screens/LessonChallengeScreen';
import { getChallengeForLesson } from './src/data/lessonChallenges';
import { BehaviorCoachModal } from './src/components/BehaviorCoachModal';
import { AIExplainModal } from './src/components/AIExplainModal';

type AuthScreen = 'welcome' | 'signup' | 'login' | 'onboarding';

type ModalScreen =
  | { type: 'none' }
  | { type: 'lesson'; lessonId: string }
  | { type: 'stockDetail'; symbol: string; fromBrowser?: boolean }
  | { type: 'stockBrowser' }
  | { type: 'trade'; symbol: string; action: TradeType }
  | { type: 'journalReview' }
  | { type: 'microLesson' }
  | { type: 'leaderboard' }
  | { type: 'behavioralAssessment' }
  | { type: 'playbooks' }
  | { type: 'playbookDetail'; playbookId: string }
  | { type: 'macroDashboard' }
  | { type: 'community' }
  | { type: 'legal'; kind: 'privacy' | 'terms' }
  | { type: 'tutorChat' }
  | { type: 'customize' }
  | { type: 'classroom' }
  | { type: 'subscription'; lockedFeature?: string }
  | { type: 'timeMachine' }
  | { type: 'investorDNA' }
  | { type: 'futureSim' }
  | { type: 'healthScore' }
  | { type: 'skillTree' }
  | { type: 'decisionJournal' }
  | { type: 'lessonChallenge'; lessonId: string; lessonTitle: string }
  | { type: 'admin' }
  | { type: 'analytics' };

function AppContent() {
  const { theme } = useTheme();
  const isAuthenticated = useUserStore(s => s.isAuthenticated);
  const isOnboarded = useUserStore(s => s.isOnboarded);
  const setUser = useUserStore(s => s.setUser);
  const updateUser = useUserStore(s => s.updateUser);
  const setOnboarded = useUserStore(s => s.setOnboarded);
  const logout = useUserStore(s => s.logout);
  const initializePortfolio = usePortfolioStore(s => s.initializePortfolio);
  const resetPortfolio = usePortfolioStore(s => s.resetPortfolio);
  const { isPremium, canUseFeature } = useSubscriptionStore();
  const portfolio = usePortfolioStore(s => s.portfolio);
  const updatePositionPrices = usePortfolioStore(s => s.updatePositionPrices);
  const setPortfolio = usePortfolioStore(s => s.setPortfolio);
  const journalEntries = useTradeJournalStore(s => s.entries);
  const setJournalEntries = useTradeJournalStore(s => s.setEntries);
  const user = useUserStore(s => s.user);

  const [authScreen, setAuthScreen] = useState<AuthScreen>('welcome');
  const [currentTab, setCurrentTab] = useState<TabName>('home');
  const [modal, setModal] = useState<ModalScreen>({ type: 'none' });
  const [showTour, setShowTour] = useState(false);
  // Tracks which lessonId was opened from the skill tree so we can auto-complete the node
  const skillTreeLessonRef = useRef<string | null>(null);

  // The signed-in Firebase Auth uid — the key for every Firestore read/write.
  // Set on signup/login/session-restore; cleared on sign-out.
  const [uid, setUid] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authName, setAuthName] = useState<string>('');
  const [needsNamePrompt, setNeedsNamePrompt] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const setAdminOverride = useSubscriptionStore(s => s.setAdminOverride);

  useEffect(() => {
    if (!uid) { setIsAdminUser(false); setAdminOverride(false); return; }
    checkIsAdmin(uid)
      .then(result => { setIsAdminUser(result); setAdminOverride(result); })
      .catch(() => { setIsAdminUser(false); setAdminOverride(false); });
  }, [uid]);

  // Analytics: wire the background/tab-close flush listeners once, and
  // start a fresh session (session_start) whenever a uid becomes active
  // (fresh login or session restore on relaunch).
  useEffect(() => { initAnalyticsLifecycle(); }, []);
  useEffect(() => {
    if (uid) startNewSession();
  }, [uid]);

  // Analytics: screen_view for every tab switch or modal open — buffered
  // and flushed in batches by analyticsService, not written per-call.
  useEffect(() => {
    if (!uid) return;
    logScreenView(modal.type === 'none' ? currentTab : modal.type);
  }, [uid, currentTab, modal.type]);

  // Live subscription status — without this, a student could complete
  // Stripe checkout successfully and still see every premium feature locked
  // until they logged out and back in, because nothing ever told the local
  // subscriptionStore that Stripe's webhook had updated Firestore.
  const setPlan = useSubscriptionStore(s => s.setPlan);
  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToSubscriptionStatus(uid, (snap) => {
      const plan = snap.subscription === 'premium' || snap.subscription === 'pro' ? 'premium' : 'free';
      setPlan(plan, snap.renewsAt ?? null, snap.cancelAtPeriodEnd ?? false);
    });
    return unsubscribe;
  }, [uid]);

  // Restore an existing session on load (e.g. page refresh) by hydrating
  // this student's profile, portfolio, and journal from Firestore.
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      if (!fbUser) { setRestoringSession(false); return; }
      setUid(fbUser.uid);
      setAuthEmail(fbUser.email ?? '');
      try {
        const [profile, remotePortfolio, entries] = await Promise.all([
          loadUserProfile(fbUser.uid),
          loadPortfolio(fbUser.uid),
          loadJournal(fbUser.uid),
        ]);
        if (profile) {
          setUser(profile);
          setOnboarded(true);
          if (remotePortfolio) setPortfolio(remotePortfolio);
          setJournalEntries(entries);
        }
      } catch (e) {
        console.warn('[auth] Failed to restore session from Firestore', e);
      }
      setRestoringSession(false);
    });
    return unsubscribe;
  }, []);

  // Push local changes to Firestore whenever this student's profile,
  // portfolio, or journal changes — keeps their account durable and
  // visible to the admin view / leaderboard across devices.
  useEffect(() => {
    if (!uid || !user) return;
    saveUserProfile(uid, user).catch(() => {});
    savePublicStats(uid, {
      displayName: user.displayName,
      totalValue: portfolio?.totalValue ?? 100000,
      totalReturnPercent: portfolio?.totalReturnPercent ?? 0,
      lessonsCompletedCount: user.lessonsCompleted.length,
      streak: user.streak,
      currentTier: user.currentTier,
    }).catch(() => {});
  }, [uid, user]);

  // Syncs on trade count / cash changes (a real trade happened), not on
  // every price tick. The 60s background price refresh in the effect below
  // updates `portfolio.totalValue` locally every minute for every active
  // student — syncing to Firestore on every one of those ticks would burn
  // through the free-tier write quota (20K/day) in well under an hour with
  // 60 concurrent students. Trade-driven syncing is 100-1000x less frequent
  // and still keeps the leaderboard/admin view accurate at the moments that
  // matter (right after a buy/sell).
  const lastSyncedTradeCount = useRef<number | null>(null);
  useEffect(() => {
    if (!uid || !portfolio) return;
    const tradeCount = portfolio.trades.length;
    if (lastSyncedTradeCount.current === tradeCount) return;
    lastSyncedTradeCount.current = tradeCount;

    savePortfolio(uid, portfolio).catch(() => {});
    if (user) {
      savePublicStats(uid, {
        displayName: user.displayName,
        totalValue: portfolio.totalValue,
        totalReturnPercent: portfolio.totalReturnPercent,
        lessonsCompletedCount: user.lessonsCompleted.length,
        streak: user.streak,
        currentTier: user.currentTier,
      }).catch(() => {});
    }
  }, [uid, portfolio]);

  // Even without a new trade, resync public_stats (cheap, single small doc)
  // roughly every 5 minutes so the leaderboard reflects live price moves —
  // matched to the same cadence as the Finnhub price refresh, not every tick.
  useEffect(() => {
    if (!uid || !user || !portfolio) return;
    const interval = setInterval(() => {
      savePublicStats(uid, {
        displayName: user.displayName,
        totalValue: portfolio.totalValue,
        totalReturnPercent: portfolio.totalReturnPercent,
        lessonsCompletedCount: user.lessonsCompleted.length,
        streak: user.streak,
        currentTier: user.currentTier,
      }).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [uid, user, portfolio]);

  useEffect(() => {
    if (!uid) return;
    saveJournal(uid, journalEntries).catch(() => {});
  }, [uid, journalEntries]);

  // Boot live price refresh from Finnhub (no-op if no API key set)
  useEffect(() => { initializeLivePrices(); }, []);

  // Global portfolio price refresh — keeps HomeScreen balance live even when PortfolioScreen isn't open
  useEffect(() => {
    const refresh = async () => {
      if (!portfolio?.positions.length) return;
      const syms = portfolio.positions.map(p => p.symbol);
      const stocks = await fetchStocks(syms);
      const map = stocks.reduce((a, s) => ({ ...a, [s.symbol]: s.price }), {} as Record<string, number>);
      updatePositionPrices(map);
    };
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [portfolio?.positions.length]);
  const [explainTerm, setExplainTerm] = useState<string | null>(null);

  // Decision Journal modal state
  const [djModal, setDjModal] = useState<{ visible: boolean; symbol: string; action: string; pendingTrade?: { symbol: string; action: TradeType } }>({ visible: false, symbol: '', action: '' });
  // Mood modal state
  const [moodModal, setMoodModal] = useState<{ visible: boolean; symbol: string; pendingTrade?: { symbol: string; action: TradeType } }>({ visible: false, symbol: '' });
  // The thesis/reason a student wrote in the Decision Journal prompt right
  // before a trade — held here until the trade actually executes, then
  // persisted as a real JournalEntry tied to that trade's real id. Cleared
  // if the student skips the prompt (nothing to save) or after the trade
  // completes (saved or not, it shouldn't leak into the next trade).
  const [pendingThesis, setPendingThesis] = useState<{ reason: TradeReason; note: string; confidence: 1 | 2 | 3 | 4 | 5 } | null>(null);
  const createJournalEntry = useTradeJournalStore(s => s.createEntry);
  const addDecisionEntry = useDecisionJournalStore(s => s.addEntry);

  const handleOnboardingComplete = (answers: OnboardingAnswers) => {
    if (!uid) return; // shouldn't happen — onboarding only follows a successful signup
    // authName comes from the required Name field on the signup screen — the
    // email-prefix fallback only fires if something upstream truly failed to
    // capture it, which the signup form's own validation should prevent.
    const displayName = authName.trim() || authEmail.split('@')[0] || 'Investor';
    const newUser = createNewUser({
      id: uid,
      email: authEmail,
      displayName,
      riskTolerance: answers.riskTolerance,
      experienceLevel: answers.experience,
      primaryGoal: answers.goal,
    });
    newUser.hasCustomDisplayName = !!authName.trim();
    setUser(newUser);
    setOnboarded(true);
    initializePortfolio(newUser.id);
    setCurrentTab('home');

    // Seed this student's real Firestore documents immediately so they show
    // up in the leaderboard/admin view right away, not just after the first
    // sync effect fires.
    saveUserProfile(uid, newUser).catch(() => {});
    savePublicStats(uid, {
      displayName: newUser.displayName,
      totalValue: 100000,
      totalReturnPercent: 0,
      lessonsCompletedCount: 0,
      streak: 0,
      currentTier: newUser.currentTier,
    }).catch(() => {});

    // Show the tour guide for new users
    setTimeout(() => setShowTour(true), 600);
  };

  const closeModal = () => setModal({ type: 'none' });
  // Tier 1 lessons are free; Tier 2/3 (ids prefixed T2/T3) require Premium.
  // Gated centrally here since every entry point (Home, Learn tab, micro
  // lessons, playbooks, tutor, classroom) routes lesson opens through this
  // one function.
  const openLesson = (id: string) => {
    const isAdvanced = id.startsWith('T2') || id.startsWith('T3');
    if (isAdvanced && !canUseFeature('advancedLessons')) {
      openSubscription('Tier 2 & 3 Lessons');
      return;
    }
    setModal({ type: 'lesson', lessonId: id });
  };
  const openStock = (symbol: string) => setModal({ type: 'stockDetail', symbol, fromBrowser: modal.type === 'stockBrowser' });
  const openStockBrowser = () => setModal({ type: 'stockBrowser' });
  const openJournalReview = () => setModal({ type: 'journalReview' });
  const openMicroLesson = () => setModal({ type: 'microLesson' });
  const openLeaderboard = () => setModal({ type: 'leaderboard' });
  const openBehavioralAssessment = () => setModal({ type: 'behavioralAssessment' });
  const openPlaybooks = () => setModal({ type: 'playbooks' });
  const openPlaybookDetail = (id: string) => setModal({ type: 'playbookDetail', playbookId: id });
  const openMacroDashboard = () => setModal({ type: 'macroDashboard' });
  const openCommunity = () => setModal({ type: 'community' });
  // AI Tutor is temporarily disabled (usage limits aren't wired up yet — see
  // Priority 3 audit) rather than left open with unlimited free access.
  const openTutorChat = () => showAlert('Coming Soon', 'The AI Tutor is being upgraded and will be back soon.');
  const openCustomize = () => setModal({ type: 'customize' });
  const openClassroom = () => setModal({ type: 'classroom' });
  const openSubscription = (feature?: string) => setModal({ type: 'subscription', lockedFeature: feature });
  const openDecisionJournal = () => setModal({ type: 'decisionJournal' });
  const openSkillTree = () => setModal({ type: 'skillTree' });

  const openTimeMachine = () => {
    if (!canUseFeature('timeMachine')) { openSubscription('Time Machine'); return; }
    setModal({ type: 'timeMachine' });
  };
  const openInvestorDNA = () => {
    if (!canUseFeature('investorDNA')) { openSubscription('Investor DNA'); return; }
    setModal({ type: 'investorDNA' });
  };
  const openFutureSim = () => {
    if (!canUseFeature('futureSim')) { openSubscription('Future Simulator'); return; }
    setModal({ type: 'futureSim' });
  };
  const openHealthScore = () => {
    if (!canUseFeature('healthScore')) { openSubscription('Portfolio Health Score'); return; }
    setModal({ type: 'healthScore' });
  };

  // Trade with mood + decision journal interceptors
  const openTrade = (symbol: string, action: TradeType) => {
    if (canUseFeature('moodGuard')) {
      setMoodModal({ visible: true, symbol, pendingTrade: { symbol, action } });
    } else {
      setDjModal({ visible: true, symbol, action, pendingTrade: { symbol, action } });
    }
  };

  const proceedToTrade = (symbol: string, action: TradeType) => {
    setModal({ type: 'trade', symbol, action });
  };

  const handleSignOut = () => {
    flushScreenBuffer();
    signOutUser().catch(() => {});
    setUid(null);
    setAuthEmail('');
    logout();
    resetPortfolio();
    setJournalEntries([]);
    setAuthScreen('welcome');
  };
  const handleRestartOnboarding = () => {
    signOutUser().catch(() => {});
    setUid(null);
    setAuthEmail('');
    logout();
    resetPortfolio();
    setJournalEntries([]);
    setAuthScreen('welcome');
  };
  const findLesson = (id: string) => tier1Lessons.find(l => l.id === id) || tier2Lessons.find(l => l.id === id) || tier3Lessons.find(l => l.id === id) || null;
  const currentLesson = modal.type === 'lesson' ? findLesson(modal.lessonId) : null;

  if (restoringSession) {
    return (
      <>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
      </>
    );
  }

  if (!isAuthenticated || !isOnboarded) {
    return (
      <>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        {authScreen === 'welcome' && (
          <WelcomeScreen
            onGetStarted={() => setAuthScreen('signup')}
            onSignIn={() => setAuthScreen('login')}
          />
        )}
        {authScreen === 'signup' && (
          <AuthScreen
            mode="signup"
            onBack={() => setAuthScreen('welcome')}
            onSwitchMode={() => setAuthScreen('login')}
            onAuthed={(newUid, email, name) => {
              setUid(newUid);
              setAuthEmail(email);
              setAuthName(name ?? '');
              setAuthScreen('onboarding');
            }}
          />
        )}
        {authScreen === 'login' && (
          <AuthScreen
            mode="login"
            onBack={() => setAuthScreen('welcome')}
            onSwitchMode={() => setAuthScreen('signup')}
            onAuthed={async (loggedInUid, email) => {
              setUid(loggedInUid);
              setAuthEmail(email);
              try {
                const [profile, remotePortfolio, entries] = await Promise.all([
                  loadUserProfile(loggedInUid),
                  loadPortfolio(loggedInUid),
                  loadJournal(loggedInUid),
                ]);
                if (profile) {
                  setUser(profile);
                  setOnboarded(true);
                  if (remotePortfolio) setPortfolio(remotePortfolio);
                  setJournalEntries(entries);
                  setCurrentTab('home');
                  // Legacy accounts (created before the name field existed,
                  // or whose name was auto-derived from their email) get a
                  // one-time prompt instead of staying unreadable on the
                  // leaderboard forever.
                  if (!profile.hasCustomDisplayName) setNeedsNamePrompt(true);
                } else {
                  // Account exists in Auth but never finished onboarding.
                  setAuthScreen('onboarding');
                }
              } catch (e) {
                console.warn('[auth] Failed to load account after login', e);
              }
            }}
          />
        )}
        {authScreen === 'onboarding' && <OnboardingScreen onComplete={handleOnboardingComplete} />}
      </>
    );
  }

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <NamePromptModal
        visible={needsNamePrompt}
        onSubmit={(newName) => {
          if (!uid || !user) return;
          const updatedUser = { ...user, displayName: newName, hasCustomDisplayName: true };
          updateUser({ displayName: newName, hasCustomDisplayName: true });
          saveUserProfile(uid, updatedUser).catch(() => {});
          setNeedsNamePrompt(false);
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flex: 1 }}>
          {currentTab === 'home' && <HomeScreen onLessonPress={openLesson} onPortfolioPress={() => setCurrentTab('market')} onSignalPress={openStock} onMicroLessonPress={openMicroLesson} onJournalPress={openJournalReview} onBrowseStocksPress={openStockBrowser} />}
          {currentTab === 'learn' && <LessonsListScreen onLessonPress={openLesson} onSkillTreePress={openSkillTree} onSubscribePress={() => openSubscription('Tier 2 & 3 Lessons')} />}
          {currentTab === 'discover' && (
            <DiscoverScreen
              onBehavioralAssessmentPress={openBehavioralAssessment}
              onPlaybooksPress={openPlaybooks}
              onMacroDashboardPress={openMacroDashboard}
              onTutorChatPress={openTutorChat}
              onCustomizePress={openCustomize}
              onClassroomPress={openClassroom}
              onTimeMachinePress={openTimeMachine}
              onInvestorDNAPress={openInvestorDNA}
              onFutureSimPress={openFutureSim}
              onHealthScorePress={openHealthScore}
              onSkillTreePress={openSkillTree}
              onDecisionJournalPress={openDecisionJournal}
              onSubscribePress={() => openSubscription()}
            />
          )}
          {currentTab === 'market' && (
            <MarketScreen
              onStockPress={openStock}
              onTradePress={(symbol, action) => setModal({ type: 'trade', symbol, action })}
              onBrowsePress={openStockBrowser}
            />
          )}
          {currentTab === 'social' && (
            <SocialScreen
              onClassroomPress={openClassroom}
            />
          )}
          {currentTab === 'profile' && (
            <ProfileScreen onSignOut={handleSignOut} onRestartOnboarding={handleRestartOnboarding} onJournalPress={openJournalReview}
              onPrivacyPress={() => setModal({ type: 'legal', kind: 'privacy' })} onTermsPress={() => setModal({ type: 'legal', kind: 'terms' })}
              onBehavioralAssessmentPress={openBehavioralAssessment} onPlaybooksPress={openPlaybooks} onMacroDashboardPress={openMacroDashboard} onTutorChatPress={openTutorChat}
              onCustomizePress={openCustomize} onAdminPress={() => setModal({ type: 'admin' })} isAdmin={isAdminUser} />
          )}
        </View>
        <TabBar current={currentTab} onTabPress={setCurrentTab} />
      </View>

      {/* ── Interceptor Modals ── */}
      <MoodGuardrailModal
        visible={moodModal.visible} symbol={moodModal.symbol}
        onProceed={() => {
          const t = moodModal.pendingTrade;
          setMoodModal({ visible: false, symbol: '' });
          if (t) setDjModal({ visible: true, symbol: t.symbol, action: t.action, pendingTrade: t });
        }}
        onCancel={() => setMoodModal({ visible: false, symbol: '' })}
      />
      <DecisionJournalModal
        visible={djModal.visible} symbol={djModal.symbol} action={djModal.action}
        onSubmit={(r, n, c) => {
          const t = djModal.pendingTrade;
          setPendingThesis({ reason: r, note: n, confidence: c });
          setDjModal({ visible: false, symbol: '', action: '' });
          if (t) proceedToTrade(t.symbol, t.action);
        }}
        onSkip={() => {
          const t = djModal.pendingTrade;
          setPendingThesis(null);
          setDjModal({ visible: false, symbol: '', action: '' });
          if (t) proceedToTrade(t.symbol, t.action);
        }}
      />

      {/* ── Full Screen Modals ── */}
      {modal.type === 'lesson' && currentLesson && (
        <View style={fs}>
          <LessonScreen
            lesson={currentLesson}
            onBack={() => {
              skillTreeLessonRef.current = null;
              closeModal();
            }}
            onLessonComplete={(lessonId) => {
              const fromSkillTree = skillTreeLessonRef.current === lessonId;
              skillTreeLessonRef.current = null;
              // Auto-complete matching skill tree node if opened from skill tree
              if (fromSkillTree) {
                const node = SKILL_NODES.find(n => n.lessonId === lessonId);
                if (node) useSkillTreeStore.getState().completeNode(node.id);
              }
              // Show lesson challenge if one exists for this lesson
              const challenge = getChallengeForLesson(lessonId);
              const lessonTitle = currentLesson?.title ?? '';
              if (challenge) {
                setModal({ type: 'lessonChallenge', lessonId, lessonTitle });
              } else if (fromSkillTree) {
                setModal({ type: 'skillTree' });
              } else {
                closeModal();
              }
            }}
          />
        </View>
      )}
      {modal.type === 'stockBrowser' && <View style={fs}><StockBrowserScreen onStockPress={openStock} onBack={closeModal} /></View>}
      {modal.type === 'stockDetail' && (() => {
        const fromBrowser = modal.fromBrowser;
        return (
          <View style={fs}>
            <StockDetailScreen
              symbol={modal.symbol}
              onBack={() => fromBrowser ? setModal({ type: 'stockBrowser' }) : closeModal()}
              onTrade={openTrade}
              onLessonPress={openLesson}
              onExplainPress={setExplainTerm}
            />
          </View>
        );
      })()}
      {modal.type === 'trade' && (
        <View style={fs}>
          <TradeScreen
            symbol={modal.symbol}
            action={modal.action}
            onBack={closeModal}
            buyReason={pendingThesis?.note}
            onTradeSuccess={(trade) => {
              // Persist the thesis the student wrote in the Decision Journal
              // prompt as a real journal entry tied to the real trade id —
              // previously this was captured in the UI and then discarded,
              // which is why entries never showed up anywhere (student view
              // or admin view). Only fires if they actually wrote one
              // (pendingThesis is null when the prompt was skipped, or when
              // this trade was placed directly from Market without going
              // through the Decision Journal prompt at all).
              if (trade && pendingThesis) {
                createJournalEntry({
                  tradeId: trade.id,
                  symbol: trade.symbol,
                  buyReason: pendingThesis.note || REASON_CONFIG[pendingThesis.reason].label,
                  exitPlan: '',
                });
                addDecisionEntry({
                  symbol: trade.symbol,
                  action: trade.type,
                  reason: pendingThesis.reason,
                  reasonNote: pendingThesis.note,
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
              closeModal();
              setCurrentTab('market');
            }}
          />
        </View>
      )}
      {modal.type === 'journalReview' && <View style={fs}><TradeJournalReviewScreen onBack={closeModal} onStockPress={openStock} /></View>}
      {modal.type === 'microLesson' && <View style={fs}><MicroLessonScreen onBack={closeModal} onStockPress={openStock} onComplete={closeModal} /></View>}
      {modal.type === 'leaderboard' && <View style={fs}><LeaderboardScreen onBack={closeModal} /></View>}
      {modal.type === 'behavioralAssessment' && <View style={fs}><BehavioralAssessmentScreen onBack={closeModal} onComplete={closeModal} onLessonPress={openLesson} /></View>}
      {modal.type === 'playbooks' && <View style={fs}><PlaybooksScreen onPlaybookPress={openPlaybookDetail} onSubscribePress={() => openSubscription('Advanced Playbooks')} onBack={closeModal} /></View>}
      {modal.type === 'playbookDetail' && <View style={fs}><PlaybookDetailScreen playbookId={modal.playbookId} onBack={() => setModal({ type: 'playbooks' })} onLessonPress={openLesson} /></View>}
      {modal.type === 'macroDashboard' && <View style={fs}><MacroDashboardScreen onBack={closeModal} onLessonPress={openLesson} /></View>}
      {modal.type === 'community' && <View style={fs}><CommunityScreen onBack={closeModal} /></View>}
      {modal.type === 'legal' && <View style={fs}><LegalScreen kind={modal.kind} onBack={closeModal} /></View>}
      {modal.type === 'tutorChat' && <View style={fs}><TutorChatScreen onBack={closeModal} onLessonPress={openLesson} /></View>}
      {modal.type === 'customize' && <View style={fs}><CustomizeScreen onBack={closeModal} /></View>}
      {modal.type === 'classroom' && <View style={fs}><ClassroomScreen onBack={closeModal} onLessonPress={openLesson} onBehavioralAssessmentPress={openBehavioralAssessment} /></View>}
      {modal.type === 'subscription' && <View style={fs}><SubscriptionScreen onBack={closeModal} lockedFeature={modal.lockedFeature} onSubscribed={closeModal} /></View>}
      {modal.type === 'timeMachine' && <View style={fs}><TimeMachineScreen onBack={closeModal} isPremium={isPremium()} onSubscribePress={() => openSubscription('Time Machine')} /></View>}
      {modal.type === 'investorDNA' && <View style={fs}><InvestorDNAScreen onBack={closeModal} onAssessmentPress={openBehavioralAssessment} isPremium={isPremium()} onSubscribePress={() => openSubscription('Investor DNA')} /></View>}
      {modal.type === 'futureSim' && <View style={fs}><FutureSimulatorScreen onBack={closeModal} isPremium={isPremium()} onSubscribePress={() => openSubscription('Future Simulator')} /></View>}
      {modal.type === 'healthScore' && <View style={fs}><PortfolioHealthScreen onBack={closeModal} isPremium={isPremium()} onSubscribePress={() => openSubscription('Portfolio Health Score')} /></View>}
      {modal.type === 'skillTree' && (
        <View style={fs}>
          <SkillTreeScreen
            onBack={closeModal}
            onLessonPress={(lessonId) => {
              // Remember we came from the skill tree so completion routes back here
              skillTreeLessonRef.current = lessonId;
              openLesson(lessonId);
            }}
          />
        </View>
      )}
      {modal.type === 'decisionJournal' && <View style={fs}><DecisionJournalScreen onBack={closeModal} /></View>}
      {modal.type === 'lessonChallenge' && (() => {
        const challenge = getChallengeForLesson(modal.lessonId);
        return challenge ? (
          <View style={fs}>
            <LessonChallengeScreen
              challenge={challenge}
              lessonTitle={modal.lessonTitle}
              onAccept={(_symbols) => { closeModal(); openStockBrowser(); }}
              onSkip={closeModal}
              onStockPress={(sym) => { setModal({ type: 'stockDetail', symbol: sym, fromBrowser: false }); }}
            />
          </View>
        ) : null;
      })()}
      {modal.type === 'admin' && (
        <View style={fs}>
          <AdminScreen onBack={closeModal} onAnalyticsPress={() => setModal({ type: 'analytics' })} />
        </View>
      )}
      {modal.type === 'analytics' && <View style={fs}><AnalyticsDashboardScreen onBack={closeModal} /></View>}

      {explainTerm && <AIExplainModal term={explainTerm} onClose={() => setExplainTerm(null)} />}

      <TourGuide visible={showTour} onComplete={() => setShowTour(false)} />
    </>
  );
}

const fs = { position: 'absolute' as const, top: 0, bottom: 0, left: 0, right: 0 };

// One-time blocking prompt for accounts created before the name field
// existed (or whose name was auto-derived from their email) — without this,
// a student like "jsmith2008" stays unreadable on the leaderboard forever.
function NamePromptModal({ visible, onSubmit }: { visible: boolean; onSubmit: (name: string) => void }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      showAlert('Enter your name', 'This is what other students will see on the leaderboard.');
      return;
    }
    onSubmit(trimmed);
    setName('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={promptStyles.overlay}>
        <View style={[promptStyles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[promptStyles.title, { color: theme.colors.textPrimary }]}>What should we call you?</Text>
          <Text style={[promptStyles.subtitle, { color: theme.colors.textSecondary }]}>
            This is the name other students will see on the leaderboard.
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="words"
            textContentType="name"
            autoFocus
            style={[promptStyles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
          />
          <TouchableOpacity onPress={handleSubmit} style={[promptStyles.submitBtn, { backgroundColor: theme.colors.primary }]}>
            <Text style={promptStyles.submitText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const promptStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 24 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 18 },
  input: { height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, fontSize: 15, marginBottom: 16 },
  submitBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 15, fontWeight: '800', color: '#07070D' },
});

export default function App() {
  return <ThemeProvider><AppContent /></ThemeProvider>;
}
