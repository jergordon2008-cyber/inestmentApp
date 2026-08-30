/**
 * Subscription Store
 *
 * `plan` is no longer a local fake flag — it's kept in sync with the real
 * value in Firestore (users/{uid}.subscription), which only Stripe's
 * webhook (via the stripeWebhook Cloud Function) is allowed to write.
 * App.tsx listens for changes with onSnapshot and calls setPlan() here.
 *
 * subscribe() / manageSubscription() call real Cloud Functions
 * (createCheckoutSession / createPortalSession) that talk to Stripe and
 * redirect the browser to Stripe-hosted pages — this app never touches
 * card details directly.
 */
import { create } from 'zustand';
import { Platform, Linking } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from './firebase';

export type Plan = 'free' | 'premium';

// Pre-cohort safety: Stripe billing is flagged off rather than removed.
// Every premium gate opens for everyone while this is true. Cloud Functions,
// webhook, and subscribe()/manageSubscription() are untouched — flip this
// back to false (and remove it) when billing is ready to turn back on.
export const PREMIUM_DISABLED = true;

export const PREMIUM_FEATURES = {
  timeMachine: { name: 'Time Machine', description: 'Trade through real historical crashes & bull runs', icon: '⏳' },
  futureSim: { name: 'Future Simulator', description: 'See your wealth 5, 10, 30 years from now', icon: '🔮' },
  investorDNA: { name: 'Investor DNA', description: 'Your full personality archetype & sharing card', icon: '🧬' },
  healthScore: { name: 'Portfolio Health Score', description: 'Full breakdown + improvement tips', icon: '📊' },
  moodGuard: { name: 'Mood Guardrails', description: 'Emotional protection before every trade', icon: '🎭' },
  aiTutorUnlimited: { name: 'AI Tutor', description: 'Coming soon', icon: '🤖' },
  advancedPlaybooks: { name: 'Advanced Playbooks', description: 'All 6 strategies unlocked', icon: '📖' },
  community: { name: 'Community', description: 'Leaderboards, challenges, forum', icon: '🏆' },
  advancedLessons: { name: 'Tier 2 & 3 Lessons', description: 'Active investing & mastery curriculum', icon: '🎓' },
} as const;

export type PremiumFeatureKey = keyof typeof PREMIUM_FEATURES;

interface SubscriptionState {
  plan: Plan;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  aiMessagesUsedToday: number;
  lastAiMessageDate: string | null;
  // Set from App.tsx once the signed-in uid is confirmed to be in the
  // admins/ Firestore collection. Lets the admin account use every premium
  // feature regardless of subscription state, without touching the paywall
  // logic itself.
  isAdminOverride: boolean;
  setAdminOverride: (isAdmin: boolean) => void;
  // Called by App.tsx's Firestore listener whenever users/{uid}.subscription
  // changes (i.e. whenever Stripe's webhook fires).
  setPlan: (plan: Plan, renewsAt?: string | null, cancelAtPeriodEnd?: boolean) => void;
  subscribe: () => Promise<{ error?: string }>;
  manageSubscription: () => Promise<{ error?: string }>;
  isPremium: () => boolean;
  canUseFeature: (feature: PremiumFeatureKey) => boolean;
  useAiMessage: () => boolean;
}

const FREE_AI_LIMIT = 3;

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plan: 'free',
  renewsAt: null,
  cancelAtPeriodEnd: false,
  aiMessagesUsedToday: 0,
  lastAiMessageDate: null,
  isAdminOverride: false,

  setAdminOverride: (isAdmin) => set({ isAdminOverride: isAdmin }),
  setPlan: (plan, renewsAt = null, cancelAtPeriodEnd = false) => set({ plan, renewsAt, cancelAtPeriodEnd }),

  isPremium: () => PREMIUM_DISABLED || get().isAdminOverride || get().plan === 'premium',

  canUseFeature: (feature) => {
    if (PREMIUM_DISABLED) return true;
    if (get().isAdminOverride) return true;
    if (get().plan === 'premium') return true;
    // Free users get a preview of DNA (basic only)
    if (feature === 'investorDNA') return false;
    if (feature === 'healthScore') return false;
    if (feature === 'timeMachine') return false;
    if (feature === 'futureSim') return false;
    if (feature === 'moodGuard') return true; // free - safety feature
    if (feature === 'aiTutorUnlimited') return false;
    if (feature === 'advancedPlaybooks') return false;
    if (feature === 'community') return true; // basic community free
    if (feature === 'advancedLessons') return false;
    return false;
  },

  useAiMessage: () => {
    const s = get();
    if (s.isAdminOverride || s.plan === 'premium') return true;
    const today = new Date().toDateString();
    const usedToday = s.lastAiMessageDate === today ? s.aiMessagesUsedToday : 0;
    if (usedToday >= FREE_AI_LIMIT) return false;
    set({ aiMessagesUsedToday: usedToday + 1, lastAiMessageDate: today });
    return true;
  },

  // Redirects to a real Stripe Checkout page. Subscription status only
  // updates once Stripe's webhook confirms payment — never optimistically
  // here, so a closed/abandoned checkout can't grant free access.
  subscribe: async () => {
    const functions = getFirebaseFunctions();
    if (!functions) return { error: 'Subscriptions are not configured yet.' };
    try {
      const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'investapp://';
      const createCheckout = httpsCallable(functions, 'createCheckoutSession');
      const result: any = await createCheckout({ successUrl: origin, cancelUrl: origin });
      const url = result.data?.url;
      if (!url) return { error: 'Could not start checkout.' };
      if (Platform.OS === 'web') window.location.href = url;
      else await Linking.openURL(url);
      return {};
    } catch (e: any) {
      return { error: e?.message ?? 'Could not start checkout.' };
    }
  },

  // Opens Stripe's hosted billing portal, where a student can cancel or
  // update payment method. We don't build custom cancel UI — Stripe's is
  // already correct and PCI-safe.
  manageSubscription: async () => {
    const functions = getFirebaseFunctions();
    if (!functions) return { error: 'Subscriptions are not configured yet.' };
    try {
      const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'investapp://';
      const createPortal = httpsCallable(functions, 'createPortalSession');
      const result: any = await createPortal({ returnUrl: origin });
      const url = result.data?.url;
      if (!url) return { error: 'Could not open subscription management.' };
      if (Platform.OS === 'web') window.location.href = url;
      else await Linking.openURL(url);
      return {};
    } catch (e: any) {
      return { error: e?.message ?? 'Could not open subscription management.' };
    }
  },
}));
