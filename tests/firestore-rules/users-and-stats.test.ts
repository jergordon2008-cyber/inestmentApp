import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore/lite';
import { dbAs, cleanup, clearFirestore, seedDoc, expectAllowed, expectDenied } from './helpers';

const ALICE = 'alice';
const BOB = 'bob';

// Shape written by createNewUser() / saveUserProfile() in the app.
function profile(uid: string) {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: uid, email: `${uid}@example.com`, displayName: uid, currentTier: 1,
    lessonsCompleted: [], badgesEarned: [], riskTolerance: 'moderate',
    experienceLevel: 'beginner', primaryGoal: 'education', streak: 0,
    lastActiveDate: '', totalLessonsWatched: 0, totalTradesExecuted: 0,
    subscription: 'free', notificationsEnabled: true, themeMode: 'dark',
    createdAt: now, updatedAt: now,
  };
}

// Shape written by savePublicStats() in the app.
function stats(uid: string) {
  return {
    uid, displayName: uid, totalValue: 10000, totalReturnPercent: 0,
    lessonsCompletedCount: 0, streak: 0, currentTier: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

beforeEach(clearFirestore);
afterAll(cleanup);

describe('users/{uid}', () => {
  it('owner can create, read and merge-save their own profile', async () => {
    const db = dbAs(ALICE);
    await expectAllowed(setDoc(doc(db, 'users', ALICE), profile(ALICE)));
    await expectAllowed(getDoc(doc(db, 'users', ALICE)));
    await expectAllowed(setDoc(doc(db, 'users', ALICE), { ...profile(ALICE), streak: 3 }, { merge: true }));
  });

  it('another student cannot read or write it', async () => {
    await seedDoc(`users/${ALICE}`, profile(ALICE));
    const db = dbAs(BOB);
    await expectDenied(getDoc(doc(db, 'users', ALICE)));
    await expectDenied(setDoc(doc(db, 'users', ALICE), { displayName: 'hacked' }, { merge: true }));
  });

  it('signed-out clients cannot read or write it', async () => {
    await seedDoc(`users/${ALICE}`, profile(ALICE));
    const db = dbAs(null);
    await expectDenied(getDoc(doc(db, 'users', ALICE)));
    await expectDenied(setDoc(doc(db, 'users', ALICE), profile(ALICE)));
  });

  it('an admin can read any profile', async () => {
    await seedDoc(`users/${ALICE}`, profile(ALICE));
    await seedDoc(`admins/${BOB}`, { createdAt: '2026-01-01T00:00:00.000Z' });
    await expectAllowed(getDoc(doc(dbAs(BOB), 'users', ALICE)));
  });

  // ── S1: billing fields (subscription*, stripeCustomerId) are written only
  // by the Stripe functions (Admin SDK, bypasses rules). The owner can't set
  // or change them, but the app's normal merge save — which resends the
  // whole profile, billing fields included — must keep working.
  describe('S1: billing fields are server-only', () => {
    // What a premium profile looks like after the Stripe webhook ran.
    const premiumProfile = () => ({
      ...profile(ALICE), subscription: 'premium', subscriptionStatus: 'active',
      subscriptionPlan: 'price_123', subscriptionRenewsAt: '2026-02-01T00:00:00.000Z',
      subscriptionCancelAtPeriodEnd: false, subscriptionUpdatedAt: '2026-01-01T00:00:00.000Z',
      stripeCustomerId: 'cus_alice',
    });

    it('owner cannot set subscription to premium', async () => {
      await seedDoc(`users/${ALICE}`, profile(ALICE));
      const ref = doc(dbAs(ALICE), 'users', ALICE);
      await expectDenied(updateDoc(ref, { subscription: 'premium' }));
      await expectDenied(updateDoc(ref, { subscriptionStatus: 'active', subscriptionPlan: 'premium_monthly' }));
      expect((await getDoc(ref)).get('subscription')).toBe('free');
    });

    it('owner cannot set premium through a merge save (the app\'s saveUserProfile path)', async () => {
      await seedDoc(`users/${ALICE}`, profile(ALICE));
      await expectDenied(setDoc(doc(dbAs(ALICE), 'users', ALICE), { ...profile(ALICE), subscription: 'premium' }, { merge: true }));
    });

    it('owner cannot set or change stripeCustomerId', async () => {
      await seedDoc(`users/${ALICE}`, profile(ALICE));
      const ref = doc(dbAs(ALICE), 'users', ALICE);
      await expectDenied(updateDoc(ref, { stripeCustomerId: 'cus_someone_else' }));
      await seedDoc(`users/${ALICE}`, premiumProfile());
      await expectDenied(updateDoc(ref, { stripeCustomerId: 'cus_someone_else' }));
    });

    it('owner cannot remove billing fields or downgrade themselves', async () => {
      await seedDoc(`users/${ALICE}`, premiumProfile());
      const ref = doc(dbAs(ALICE), 'users', ALICE);
      await expectDenied(updateDoc(ref, { stripeCustomerId: deleteField() }));
      await expectDenied(updateDoc(ref, { subscriptionCancelAtPeriodEnd: true }));
      await expectDenied(updateDoc(ref, { subscription: 'free' }));
    });

    it('owner cannot create a profile that is already premium or has billing fields', async () => {
      const db = dbAs(ALICE);
      await expectDenied(setDoc(doc(db, 'users', ALICE), { ...profile(ALICE), subscription: 'premium' }));
      await expectDenied(setDoc(doc(db, 'users', ALICE), { ...profile(ALICE), stripeCustomerId: 'cus_fake' }));
      await expectDenied(setDoc(doc(db, 'users', ALICE), { ...profile(ALICE), subscriptionStatus: 'active' }));
      await expectDenied(setDoc(doc(db, 'users', ALICE), { ...profile(ALICE), subscription: 'premium' }, { merge: true }));
    });

    it('a new profile may have subscription free, or no subscription field', async () => {
      await expectAllowed(setDoc(doc(dbAs(ALICE), 'users', ALICE), profile(ALICE)));
      const { subscription: _omit, ...noSub } = profile(BOB);
      await expectAllowed(setDoc(doc(dbAs(BOB), 'users', BOB), noSub));
    });

    it('a normal profile save that resends unchanged billing fields still succeeds', async () => {
      await seedDoc(`users/${ALICE}`, premiumProfile());
      const ref = doc(dbAs(ALICE), 'users', ALICE);
      // The app's saveUserProfile: whole profile, merge, other fields changed.
      await expectAllowed(setDoc(ref, { ...premiumProfile(), streak: 4, lessonsCompleted: ['l1'], displayName: 'Alice B' }, { merge: true }));
      const snap = await getDoc(ref);
      expect(snap.get('streak')).toBe(4);
      expect(snap.get('subscription')).toBe('premium');
      expect(snap.get('stripeCustomerId')).toBe('cus_alice');
    });

    it('a save onto a profile with no subscription field (emptied or legacy) may add subscription free', async () => {
      await seedDoc(`users/${ALICE}`, { id: ALICE }); // an emptied profile
      const ref = doc(dbAs(ALICE), 'users', ALICE);
      await expectDenied(setDoc(ref, { ...profile(ALICE), subscription: 'premium' }, { merge: true }));
      await expectAllowed(setDoc(ref, profile(ALICE), { merge: true })); // onboarding rebuild
      expect((await getDoc(ref)).get('subscription')).toBe('free');
    });

    it('owner can delete a free profile but not one with billing state', async () => {
      await seedDoc(`users/${ALICE}`, profile(ALICE));
      await expectAllowed(deleteDoc(doc(dbAs(ALICE), 'users', ALICE)));
      await seedDoc(`users/${BOB}`, { ...profile(BOB), stripeCustomerId: 'cus_bob' });
      await expectDenied(deleteDoc(doc(dbAs(BOB), 'users', BOB)));
    });

    // Known limitation, not a bypass: the app's local User keeps the
    // subscription loaded at sign-in. If the webhook upgrades a student
    // mid-session, their next full-profile save still says 'free' and is now
    // refused (before this rule it silently reverted them to free).
    it('a stale client save that would revert premium to free is refused', async () => {
      await seedDoc(`users/${ALICE}`, { ...profile(ALICE), subscription: 'premium' });
      await expectDenied(setDoc(doc(dbAs(ALICE), 'users', ALICE), { ...profile(ALICE), streak: 1 }, { merge: true }));
    });

    it('a profile save without billing fields leaves the stored ones alone', async () => {
      await seedDoc(`users/${ALICE}`, premiumProfile());
      const ref = doc(dbAs(ALICE), 'users', ALICE);
      const { subscription: _s, ...withoutBilling } = profile(ALICE);
      await expectAllowed(setDoc(ref, { ...withoutBilling, streak: 2 }, { merge: true }));
      await expectAllowed(updateDoc(ref, { themeMode: 'light' }));
      expect((await getDoc(ref)).get('subscription')).toBe('premium');
    });
  });
});

describe('admins/{uid}', () => {
  it('nobody can make themselves admin from the client', async () => {
    await expectDenied(setDoc(doc(dbAs(ALICE), 'admins', ALICE), { createdAt: 'now' }));
  });
});

describe('portfolios/{uid}', () => {
  it('owner can write; others cannot read', async () => {
    await expectAllowed(setDoc(doc(dbAs(ALICE), 'portfolios', ALICE), { cashBalance: 10000 }));
    await expectDenied(getDoc(doc(dbAs(BOB), 'portfolios', ALICE)));
  });
});

describe('public_stats/{uid}', () => {
  it('any signed-in student can read; signed-out cannot', async () => {
    await seedDoc(`public_stats/${ALICE}`, stats(ALICE));
    await expectAllowed(getDoc(doc(dbAs(BOB), 'public_stats', ALICE)));
    await expectDenied(getDoc(doc(dbAs(null), 'public_stats', ALICE)));
  });

  it('owner can write their own stats; others cannot', async () => {
    await expectAllowed(setDoc(doc(dbAs(ALICE), 'public_stats', ALICE), stats(ALICE)));
    await expectDenied(setDoc(doc(dbAs(BOB), 'public_stats', ALICE), stats(ALICE), { merge: true }));
  });

  it('a save cannot drop prediction counts once present', async () => {
    await seedDoc(`public_stats/${ALICE}`, { ...stats(ALICE), predictionsWritten: 2, predictionsReviewed: 1, reviewedOnTime: 1, earliestCheckBackAt: null });
    await expectDenied(setDoc(doc(dbAs(ALICE), 'public_stats', ALICE), stats(ALICE)));
    await expectAllowed(setDoc(doc(dbAs(ALICE), 'public_stats', ALICE), stats(ALICE), { merge: true }));
  });

  // ── S2: public_stats backs the leaderboard and class board, so the owner
  // may only publish the known fields, with the right types and realistic
  // values. Short-term limits; server-calculated stats are the follow-up.
  describe('S2: leaderboard values are limited', () => {
    const full = (uid: string) => ({
      ...stats(uid), predictionsWritten: 3, predictionsReviewed: 2, reviewedOnTime: 1,
      earliestCheckBackAt: '2026-02-01T00:00:00.000Z',
    });

    it('the app\'s normal publish works: create, merge save, prediction counts', async () => {
      const ref = doc(dbAs(ALICE), 'public_stats', ALICE);
      await expectAllowed(setDoc(ref, stats(ALICE), { merge: true }));
      await expectAllowed(setDoc(ref, { ...full(ALICE), totalValue: 104_250.5, totalReturnPercent: 4.2505, streak: 12, lessonsCompletedCount: 7 }, { merge: true }));
      await expectAllowed(setDoc(ref, { ...full(ALICE), totalValue: 61_000, totalReturnPercent: -39 }, { merge: true }));
    });

    it('a student with no portfolio publishes nulls', async () => {
      await expectAllowed(setDoc(doc(dbAs(ALICE), 'public_stats', ALICE),
        { ...stats(ALICE), totalValue: null, totalReturnPercent: null, earliestCheckBackAt: null }, { merge: true }));
    });

    it('impossible return or portfolio value is refused', async () => {
      await seedDoc(`public_stats/${ALICE}`, stats(ALICE));
      const ref = doc(dbAs(ALICE), 'public_stats', ALICE);
      await expectDenied(updateDoc(ref, { totalReturnPercent: 99999 }));
      await expectDenied(updateDoc(ref, { totalValue: 1e12 }));
      await expectDenied(updateDoc(ref, { totalReturnPercent: -101 }));
      await expectDenied(updateDoc(ref, { totalValue: -1 }));
      await expectDenied(setDoc(ref, { ...stats(ALICE), totalReturnPercent: 99999 }, { merge: true }));
      expect((await getDoc(ref)).get('totalReturnPercent')).toBe(0);
    });

    it('out-of-range counters are refused', async () => {
      await seedDoc(`public_stats/${ALICE}`, stats(ALICE));
      const ref = doc(dbAs(ALICE), 'public_stats', ALICE);
      await expectDenied(updateDoc(ref, { lessonsCompletedCount: 9999 }));
      await expectDenied(updateDoc(ref, { streak: 9999 }));
      await expectDenied(updateDoc(ref, { streak: -1 }));
      await expectDenied(updateDoc(ref, { currentTier: 4 }));
      await expectDenied(updateDoc(ref, { currentTier: 0 }));
      await expectDenied(updateDoc(ref, { predictionsWritten: 1, predictionsReviewed: 5, reviewedOnTime: 0 }));
      await expectDenied(updateDoc(ref, { predictionsWritten: 5, predictionsReviewed: 2, reviewedOnTime: 3 }));
    });

    it('wrong types are refused', async () => {
      await seedDoc(`public_stats/${ALICE}`, stats(ALICE));
      const ref = doc(dbAs(ALICE), 'public_stats', ALICE);
      await expectDenied(updateDoc(ref, { totalReturnPercent: '99999' }));
      await expectDenied(updateDoc(ref, { streak: 1.5 }));
      await expectDenied(updateDoc(ref, { displayName: 42 }));
      await expectDenied(updateDoc(ref, { displayName: 'x'.repeat(61) }));
      await expectDenied(updateDoc(ref, { displayName: '' }));
      await expectDenied(updateDoc(ref, { earliestCheckBackAt: 5 }));
    });

    it('unknown fields are refused', async () => {
      await expectDenied(setDoc(doc(dbAs(ALICE), 'public_stats', ALICE), { ...stats(ALICE), accuracy: 100 }));
      await seedDoc(`public_stats/${ALICE}`, stats(ALICE));
      await expectDenied(updateDoc(doc(dbAs(ALICE), 'public_stats', ALICE), { isTeacher: true }));
    });

    it('the doc must carry the owner\'s own uid', async () => {
      await expectDenied(setDoc(doc(dbAs(ALICE), 'public_stats', ALICE), stats(BOB)));
    });

    it('owner cannot delete the doc (closes the delete + re-create bypass)', async () => {
      await seedDoc(`public_stats/${ALICE}`, full(ALICE));
      await expectDenied(deleteDoc(doc(dbAs(ALICE), 'public_stats', ALICE)));
    });

    // Residual until stats are server-calculated: values inside the limits
    // are still self-reported.
    it('known residual: a plausible but untrue value inside the limits is accepted', async () => {
      await seedDoc(`public_stats/${ALICE}`, stats(ALICE));
      await expectAllowed(updateDoc(doc(dbAs(ALICE), 'public_stats', ALICE), { totalReturnPercent: 250, totalValue: 350_000 }));
    });
  });
});
