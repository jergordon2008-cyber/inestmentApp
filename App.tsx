import React, { useState, useRef, useEffect } from 'react';
import { View, Modal, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { showAlert } from './src/utils/alert';
import { useUserStore, createNewUser } from './src/services/userStore';
import { usePortfolioStore } from './src/services/portfolioStore';
import { useSubscriptionStore } from './src/services/subscriptionStore';
import { fetchStocks } from './src/services/marketDataFacade';
import { OnboardingAnswers } from './src/data/onboarding';

import { subscribeToAuthChanges, signOutUser } from './src/services/authService';
import {
  saveUserProfile, loadUserProfile, savePortfolio, loadPortfolio,
  saveJournal, loadJournal, savePublicStats, isAdmin as checkIsAdmin,
  subscribeToSubscriptionStatus,
} from './src/services/firestoreSync';
import { initAnalyticsLifecycle, startNewSession, logScreenView, flushScreenBuffer } from './src/services/analyticsService';
import { useTradeJournalStore } from './src/services/tradeJournalStore';
import { initializeLivePrices } from './src/services/stockDataService';
import { TourGuide } from './src/components/TourGuide';

import { RootNavigator } from './src/navigation/RootNavigator';
import { AppFlowProvider } from './src/navigation/AppFlow';
import { AuthActionsProvider, AuthActions } from './src/navigation/AuthFlow';
import { navigationRef, navigate } from './src/navigation/navigationRef';
import { linking } from './src/navigation/linking';

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
  const portfolio = usePortfolioStore(s => s.portfolio);
  const updatePositionPrices = usePortfolioStore(s => s.updatePositionPrices);
  const setPortfolio = usePortfolioStore(s => s.setPortfolio);
  const journalEntries = useTradeJournalStore(s => s.entries);
  const setJournalEntries = useTradeJournalStore(s => s.setEntries);
  const user = useUserStore(s => s.user);

  const [showTour, setShowTour] = useState(false);

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

  // Analytics: screen_view on every navigation — buffered and flushed in
  // batches by analyticsService, not written per-call. Reads the resolved
  // route (the active tab, or the detail screen on top of it), which is the
  // same granularity the old tab/modal pair reported.
  const logCurrentScreen = () => {
    if (!uid) return;
    const route = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
    if (route) logScreenView(route);
  };

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

  const handleSignOut = () => {
    flushScreenBuffer();
    signOutUser().catch(() => {});
    setUid(null);
    setAuthEmail('');
    logout();
    resetPortfolio();
    setJournalEntries([]);
  };

  const handleRestartOnboarding = () => {
    signOutUser().catch(() => {});
    setUid(null);
    setAuthEmail('');
    logout();
    resetPortfolio();
    setJournalEntries([]);
  };

  // Hydrate an existing account after login. Mirrors the session-restore
  // effect above, but runs on an explicit sign-in rather than on relaunch.
  const handleLoginAuthed = async (loggedInUid: string, email: string) => {
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
        // Legacy accounts (created before the name field existed, or whose
        // name was auto-derived from their email) get a one-time prompt
        // instead of staying unreadable on the leaderboard forever.
        if (!profile.hasCustomDisplayName) setNeedsNamePrompt(true);
      } else {
        // Account exists in Auth but never finished onboarding.
        navigate('Onboarding');
      }
    } catch (e) {
      console.warn('[auth] Failed to load account after login', e);
    }
  };

  const authActions: AuthActions = {
    onSignupAuthed: (newUid, email, name) => {
      setUid(newUid);
      setAuthEmail(email);
      setAuthName(name ?? '');
    },
    onLoginAuthed: handleLoginAuthed,
    onOnboardingComplete: handleOnboardingComplete,
    onSignOut: handleSignOut,
    onRestartOnboarding: handleRestartOnboarding,
    isAdmin: isAdminUser,
  };


  if (restoringSession) {
    return (
      <>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <AuthActionsProvider value={authActions}>
        <NavigationContainer
          ref={navigationRef}
          linking={linking}
          onReady={logCurrentScreen}
          onStateChange={logCurrentScreen}
          fallback={<View style={{ flex: 1, backgroundColor: theme.colors.background }} />}
        >
          <AppFlowProvider uid={uid}>
            <RootNavigator />
          </AppFlowProvider>
        </NavigationContainer>
      </AuthActionsProvider>

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
      <TourGuide visible={showTour} onComplete={() => setShowTour(false)} />
    </>
  );
}


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
