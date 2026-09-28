import React, { useState, useRef, useEffect } from 'react';
import { View, Modal, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { showAlert } from './src/utils/alert';
import { useUserStore, createNewUser } from './src/services/userStore';
import { usePortfolioStore } from './src/services/portfolioStore';
import { useSubscriptionStore } from './src/services/subscriptionStore';
import { fetchStocks, buildPositionPriceMap } from './src/services/marketDataFacade';
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
import { reconcilePortfolio, savePortfolioBackups, ReconcileResult } from './src/services/portfolioReconcile';
import type { Portfolio } from './src/types';

/**
 * Resolves once the portfolio store has loaded from device storage.
 * Reconciliation has to read the device copy, and reading it before it has
 * loaded sees nothing — worse, the copy then lands afterwards and silently
 * overwrites whatever reconciliation decided.
 */
function waitForPortfolioHydration(): Promise<void> {
  const p = usePortfolioStore.persist;
  if (p.hasHydrated()) return Promise.resolve();
  return new Promise(resolve => {
    const unsub = p.onFinishHydration(() => { unsub(); resolve(); });
    // Re-check after subscribing, in case hydration finished in between.
    if (p.hasHydrated()) { unsub(); resolve(); }
  });
}

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

  /**
   * The account whose portfolio may be saved to the cloud. Null until the
   * device and cloud copies have been reconciled for it.
   *
   * The portfolio save effect used to fire on the first render that had both
   * a uid and a portfolio — i.e. before the cloud copy had even been read. It
   * pushed the device copy up unconditionally on every launch. That happened
   * to rescue trades the cloud had missed, but when the cloud was AHEAD (the
   * student traded on another device) it overwrote the newer cloud copy with
   * the stale device one, and the Firestore SDK then layered that pending
   * write over the cloud read, so nothing downstream could even tell. Saving
   * now waits for this, which is set only once reconciliation has decided.
   */
  const [portfolioReadyFor, setPortfolioReadyFor] = useState<string | null>(null);
  const lastSyncedTradeCount = useRef<number | null>(null);

  /**
   * Reads the device copy (once loaded), reconciles it against the cloud
   * copy, and keeps any copy that loses. Throws if a backup can't be written,
   * so a copy is never discarded that couldn't be kept.
   */
  const resolvePortfolio = async (forUid: string, cloud: Portfolio | null): Promise<ReconcileResult> => {
    await waitForPortfolioHydration();
    const device = usePortfolioStore.getState().portfolio;
    const result = reconcilePortfolio(device, cloud, forUid);
    if (result.backups.length > 0) {
      await savePortfolioBackups(result.backups);
      console.warn('[portfolio] kept on this device:', result.backups.map(b => b.reason));
    }
    return result;
  };

  /** Applies a reconcile result and opens the account for saving. */
  const adoptPortfolio = (forUid: string, result: ReconcileResult) => {
    if (result.portfolio) {
      setPortfolio(result.portfolio);
    } else if (usePortfolioStore.getState().portfolio) {
      // Only reachable when the device held another user's copy and this
      // account has none. That copy is already backed up; stop showing it.
      resetPortfolio();
    }
    // pushToCloud: leave the counter unset so the save effect sends it.
    // Otherwise mark it as already in sync so nothing is re-sent.
    lastSyncedTradeCount.current = result.pushToCloud ? null : (result.portfolio?.trades.length ?? null);
    setPortfolioReadyFor(forUid);
  };
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
          // Reconcile BEFORE the other updates, so the render that follows
          // sees the settled portfolio. This replaced "cloud wins", which
          // erased every trade the cloud had missed.
          const decision = await resolvePortfolio(fbUser.uid, remotePortfolio);
          adoptPortfolio(fbUser.uid, decision);
          setUser(profile);
          setOnboarded(true);
          setJournalEntries(entries);
        } else {
          // Signed up but never finished onboarding: there's no portfolio to
          // reconcile yet, and onboarding is about to create one.
          adoptPortfolio(fbUser.uid, await resolvePortfolio(fbUser.uid, null));
        }
      } catch (e) {
        // Deliberately NOT marked ready. If the cloud copy couldn't be read,
        // pushing the device copy could overwrite something newer. It stays
        // safe on this device and reconciles on the next launch that loads.
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
  useEffect(() => {
    if (!uid || !portfolio) return;
    // Nothing is saved until this account has been reconciled (see
    // portfolioReadyFor), and never a portfolio belonging to someone else.
    if (portfolioReadyFor !== uid) return;
    if (portfolio.userId !== uid) return;
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
  }, [uid, portfolio, portfolioReadyFor]);

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
      // Only symbols that came back with a real quote. A rate-limited fetch
      // returns the January snapshot price, and writing that into a saved
      // position fabricates a loss that syncs to Firestore and the
      // leaderboard. Omitted symbols keep their previous mark.
      updatePositionPrices(buildPositionPriceMap(stocks));
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
    setPortfolioReadyFor(null);
    logout();
    resetPortfolio();
    setJournalEntries([]);
  };

  const handleRestartOnboarding = () => {
    signOutUser().catch(() => {});
    setUid(null);
    setAuthEmail('');
    setPortfolioReadyFor(null);
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
        const decision = await resolvePortfolio(loggedInUid, remotePortfolio);
        adoptPortfolio(loggedInUid, decision);
        setUser(profile);
        setOnboarded(true);
        setJournalEntries(entries);
        // Legacy accounts (created before the name field existed, or whose
        // name was auto-derived from their email) get a one-time prompt
        // instead of staying unreadable on the leaderboard forever.
        if (!profile.hasCustomDisplayName) setNeedsNamePrompt(true);
      } else {
        // Account exists in Auth but never finished onboarding.
        adoptPortfolio(loggedInUid, await resolvePortfolio(loggedInUid, null));
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
      // A new account has no cloud portfolio. Reconciling against nothing
      // still matters: if this device was left holding another student's
      // copy, it's backed up here instead of overwritten by onboarding.
      resolvePortfolio(newUid, null)
        .then(decision => adoptPortfolio(newUid, decision))
        .catch(e => console.warn('[signup] could not back up an existing device portfolio', e));
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
