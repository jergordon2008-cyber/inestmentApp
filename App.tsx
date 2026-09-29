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
import { useTradeJournalStore, JournalEntry } from './src/services/tradeJournalStore';
import { initializeLivePrices } from './src/services/stockDataService';
import { TourGuide } from './src/components/TourGuide';
import { reconcilePortfolio, savePortfolioBackups, ReconcileResult } from './src/services/portfolioReconcile';
import { reconcileJournal, saveJournalBackups, JournalReconcileResult } from './src/services/journalReconcile';
import { requestSave, resetSync, setSyncAccount, loadUnsavedFlags, useSyncStatusStore, selectHasUnsaved } from './src/services/syncStatus';
import type { Portfolio } from './src/types';

/**
 * Resolves once a persisted store has loaded from device storage.
 * Reconciliation has to read the device copy, and reading it before it has
 * loaded sees nothing — worse, the copy then lands afterwards and silently
 * overwrites whatever reconciliation decided.
 */
function waitForHydration(p: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void }): Promise<void> {
  if (p.hasHydrated()) return Promise.resolve();
  return new Promise(resolve => {
    const unsub = p.onFinishHydration(() => { unsub(); resolve(); });
    // Re-check after subscribing, in case hydration finished in between.
    if (p.hasHydrated()) { unsub(); resolve(); }
  });
}

// Cloud writes, handed to syncStatus.requestSave. Each reads the store when
// it runs rather than taking a value, because syncStatus calls it again for
// every retry and a retry must send the latest state, not the one that failed.
function writeProfile(forUid: string): Promise<void> {
  const user = useUserStore.getState().user;
  return user ? saveUserProfile(forUid, user) : Promise.resolve();
}
function writePortfolio(forUid: string): Promise<void> {
  const portfolio = usePortfolioStore.getState().portfolio;
  return portfolio && portfolio.userId === forUid ? savePortfolio(forUid, portfolio) : Promise.resolve();
}
function writeJournal(forUid: string): Promise<void> {
  const { entries, ownerUid } = useTradeJournalStore.getState();
  return ownerUid === forUid ? saveJournal(forUid, entries) : Promise.resolve();
}
function writePublicStats(forUid: string): Promise<void> {
  const user = useUserStore.getState().user;
  const portfolio = usePortfolioStore.getState().portfolio;
  if (!user || (portfolio && portfolio.userId !== forUid)) return Promise.resolve();
  return savePublicStats(forUid, {
    displayName: user.displayName,
    totalValue: portfolio?.totalValue ?? 100000,
    totalReturnPercent: portfolio?.totalReturnPercent ?? 0,
    lessonsCompletedCount: user.lessonsCompleted.length,
    streak: user.streak,
    currentTier: user.currentTier,
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
  const journalOwner = useTradeJournalStore(s => s.ownerUid);
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
    await Promise.all([waitForHydration(usePortfolioStore.persist), loadUnsavedFlags()]);
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
    // pushToCloud, or a save the last session never saw acknowledged: leave
    // the counter unset so the save effect sends it. Otherwise mark it as
    // already in sync so nothing is re-sent.
    const unsavedLastSession = useSyncStatusStore.getState().unsaved.portfolio === forUid;
    lastSyncedTradeCount.current = result.pushToCloud || unsavedLastSession
      ? null
      : (result.portfolio?.trades.length ?? null);
    setPortfolioReadyFor(forUid);
  };

  /**
   * The journal's equivalent of portfolioReadyFor. The journal save effect
   * used to fire on launch before the cloud journal was read, overwriting it
   * with the device copy; then the load replaced the device copy with the
   * cloud one. Either could erase entries. Now nothing is saved until the two
   * have been merged (journalReconcile).
   */
  const [journalReadyFor, setJournalReadyFor] = useState<string | null>(null);
  const lastSyncedJournal = useRef<JournalEntry[] | null>(null);

  /**
   * Merges the device journal (once loaded) with the cloud one and keeps any
   * version that isn't used. Must run BEFORE adoptPortfolio: a journal saved
   * before owners were recorded is attributed to the device portfolio's owner
   * — the two are always written and cleared together — and adoptPortfolio
   * replaces that portfolio.
   */
  const resolveJournal = async (forUid: string, cloud: JournalEntry[] | null): Promise<JournalReconcileResult> => {
    await Promise.all([waitForHydration(useTradeJournalStore.persist), waitForHydration(usePortfolioStore.persist), loadUnsavedFlags()]);
    const { entries, ownerUid } = useTradeJournalStore.getState();
    const owner = ownerUid ?? usePortfolioStore.getState().portfolio?.userId ?? null;
    const result = reconcileJournal({ ownerUid: owner, entries }, cloud, forUid);
    if (result.backups.length > 0) {
      await saveJournalBackups(result.backups);
      console.warn('[journal] kept on this device:', result.backups.map(b => b.reason));
    }
    return result;
  };

  const adoptJournal = (forUid: string, result: JournalReconcileResult) => {
    setJournalEntries(result.entries, forUid);
    const unsavedLastSession = useSyncStatusStore.getState().unsaved.journal === forUid;
    // Same idea as lastSyncedTradeCount: the array now in the store is what
    // the cloud holds, unless it needs pushing. The legacy migration that
    // setEntries kicks off makes a new array if it fills anything in, and
    // that change is then saved like any other.
    lastSyncedJournal.current = result.pushToCloud || unsavedLastSession
      ? null
      : useTradeJournalStore.getState().entries;
    setJournalReadyFor(forUid);
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
          const journalDecision = await resolveJournal(fbUser.uid, entries);
          adoptPortfolio(fbUser.uid, decision);
          setUser(profile);
          setOnboarded(true);
          adoptJournal(fbUser.uid, journalDecision);
        } else {
          // Signed up but never finished onboarding: there's no portfolio to
          // reconcile yet, and onboarding is about to create one.
          const decision = await resolvePortfolio(fbUser.uid, null);
          const journalDecision = await resolveJournal(fbUser.uid, entries);
          adoptPortfolio(fbUser.uid, decision);
          adoptJournal(fbUser.uid, journalDecision);
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
  //
  // Every save goes through syncStatus, which tracks it, retries network
  // failures, logs every failure, and is what the sync banner reads.
  useEffect(() => { setSyncAccount(uid); }, [uid]);

  useEffect(() => {
    if (!uid || !user) return;
    requestSave('profile', uid, () => writeProfile(uid));
    requestSave('publicStats', uid, () => writePublicStats(uid));
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

    requestSave('portfolio', uid, () => writePortfolio(uid));
    if (user) requestSave('publicStats', uid, () => writePublicStats(uid));
  }, [uid, portfolio, portfolioReadyFor]);

  // Even without a new trade, resync public_stats (cheap, single small doc)
  // roughly every 5 minutes so the leaderboard reflects live price moves —
  // matched to the same cadence as the Finnhub price refresh, not every tick.
  useEffect(() => {
    if (!uid || !user || !portfolio) return;
    const interval = setInterval(() => {
      requestSave('publicStats', uid, () => writePublicStats(uid));
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [uid, user, portfolio]);

  // Journal: same gating as the portfolio — nothing until this account's
  // device and cloud journals have been merged, never another user's.
  useEffect(() => {
    if (!uid || journalReadyFor !== uid || journalOwner !== uid) return;
    if (lastSyncedJournal.current === journalEntries) return;
    lastSyncedJournal.current = journalEntries;
    requestSave('journal', uid, () => writeJournal(uid));
  }, [uid, journalEntries, journalReadyFor, journalOwner]);

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
    // (Both read the store, which setUser/initializePortfolio just filled.)
    requestSave('profile', uid, () => writeProfile(uid));
    requestSave('publicStats', uid, () => writePublicStats(uid));

    // Show the tour guide for new users
    setTimeout(() => setShowTour(true), 600);
  };

  // Sign-out clears this account's data from the device. ProfileScreen warns
  // when something hasn't reached the cloud; if the student signs out anyway,
  // the device copies are backed up first (same lists reconciliation uses),
  // and sign-out is refused if that backup can't be written. The flags go
  // too: there's nothing left on the device for them to retry.
  const handleSignOut = async () => {
    const forUid = uid;
    if (forUid && selectHasUnsaved(useSyncStatusStore.getState())) {
      const reason = `signed out of ${forUid} with changes not yet saved to the cloud`;
      const portfolioNow = usePortfolioStore.getState().portfolio;
      const journalNow = useTradeJournalStore.getState();
      try {
        if (portfolioNow && portfolioNow.userId === forUid) {
          await savePortfolioBackups([{ reason, portfolio: portfolioNow }]);
        }
        if (journalNow.entries.length > 0 && journalNow.ownerUid === forUid) {
          await saveJournalBackups([{ reason, entries: journalNow.entries }]);
        }
        console.warn('[auth] unsaved changes backed up on this device before sign-out');
      } catch (e) {
        console.error('[auth] could not back up unsaved changes; not signing out', e);
        showAlert('Couldn\'t sign out', 'Your unsaved changes couldn\'t be backed up on this device, so you\'re still signed in. Try again, or reconnect so they can save.');
        return;
      }
    }
    flushScreenBuffer();
    signOutUser().catch(e => console.error('[auth] sign-out failed', e));
    resetSync({ clearFlagsFor: uid ?? undefined });
    setUid(null);
    setAuthEmail('');
    setPortfolioReadyFor(null);
    setJournalReadyFor(null);
    logout();
    resetPortfolio();
    setJournalEntries([], null);
  };

  const handleRestartOnboarding = () => {
    signOutUser().catch(e => console.error('[auth] sign-out failed', e));
    resetSync({ clearFlagsFor: uid ?? undefined });
    setUid(null);
    setAuthEmail('');
    setPortfolioReadyFor(null);
    setJournalReadyFor(null);
    logout();
    resetPortfolio();
    setJournalEntries([], null);
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
        const journalDecision = await resolveJournal(loggedInUid, entries);
        adoptPortfolio(loggedInUid, decision);
        setUser(profile);
        setOnboarded(true);
        adoptJournal(loggedInUid, journalDecision);
        // Legacy accounts (created before the name field existed, or whose
        // name was auto-derived from their email) get a one-time prompt
        // instead of staying unreadable on the leaderboard forever.
        if (!profile.hasCustomDisplayName) setNeedsNamePrompt(true);
      } else {
        // Account exists in Auth but never finished onboarding.
        const decision = await resolvePortfolio(loggedInUid, null);
        const journalDecision = await resolveJournal(loggedInUid, entries);
        adoptPortfolio(loggedInUid, decision);
        adoptJournal(loggedInUid, journalDecision);
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
      Promise.all([resolvePortfolio(newUid, null), resolveJournal(newUid, null)])
        .then(([decision, journalDecision]) => {
          adoptPortfolio(newUid, decision);
          adoptJournal(newUid, journalDecision);
        })
        .catch(e => console.error('[signup] could not back up this device\'s existing portfolio/journal', e));
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
          updateUser({ displayName: newName, hasCustomDisplayName: true });
          requestSave('profile', uid, () => writeProfile(uid));
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
