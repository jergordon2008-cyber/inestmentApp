import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore/lite';
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

  // ── S1 exploit: these document CURRENT behaviour (a security gap). ──────
  // subscription* and stripeCustomerId are meant to be written only by the
  // Stripe webhook (Admin SDK). The fix (fix/s1-subscription-fields) flips
  // these to expectDenied.
  describe('KNOWN GAP S1: student can grant themselves premium', () => {
    it('owner can set subscription to premium on an existing profile', async () => {
      await seedDoc(`users/${ALICE}`, profile(ALICE));
      const ref = doc(dbAs(ALICE), 'users', ALICE);
      await expectAllowed(updateDoc(ref, {
        subscription: 'premium', subscriptionStatus: 'active', subscriptionPlan: 'premium_monthly',
      }));
      expect((await getDoc(ref)).get('subscription')).toBe('premium');
    });

    it('owner can set premium through a merge save (the app\'s saveUserProfile path)', async () => {
      await seedDoc(`users/${ALICE}`, profile(ALICE));
      const ref = doc(dbAs(ALICE), 'users', ALICE);
      await expectAllowed(setDoc(ref, { ...profile(ALICE), subscription: 'premium' }, { merge: true }));
      expect((await getDoc(ref)).get('subscription')).toBe('premium');
    });

    it('owner can set stripeCustomerId', async () => {
      await seedDoc(`users/${ALICE}`, profile(ALICE));
      const ref = doc(dbAs(ALICE), 'users', ALICE);
      await expectAllowed(updateDoc(ref, { stripeCustomerId: 'cus_someone_else' }));
      expect((await getDoc(ref)).get('stripeCustomerId')).toBe('cus_someone_else');
    });

    it('owner can create a new profile that is already premium', async () => {
      await expectAllowed(setDoc(doc(dbAs(ALICE), 'users', ALICE), {
        ...profile(ALICE), subscription: 'premium', stripeCustomerId: 'cus_fake',
      }));
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

  // ── S2 exploit: NOT fixed in this batch (follow-up). Documents current
  // behaviour: the leaderboard (listLeaderboard, ordered by
  // totalReturnPercent) trusts whatever the owner writes.
  describe('KNOWN GAP S2: student can post fake leaderboard values', () => {
    it('owner can set an impossible return and portfolio value', async () => {
      await seedDoc(`public_stats/${ALICE}`, stats(ALICE));
      const ref = doc(dbAs(ALICE), 'public_stats', ALICE);
      await expectAllowed(updateDoc(ref, {
        totalReturnPercent: 99999, totalValue: 1e12, lessonsCompletedCount: 9999, streak: 9999,
      }));
      expect((await getDoc(ref)).get('totalReturnPercent')).toBe(99999);
    });

    it('owner can do the same through a merge save (the app\'s savePublicStats path)', async () => {
      const ref = doc(dbAs(ALICE), 'public_stats', ALICE);
      await expectAllowed(setDoc(ref, { ...stats(ALICE), totalReturnPercent: 99999 }, { merge: true }));
      expect((await getDoc(ref)).get('totalReturnPercent')).toBe(99999);
    });

    it('owner can delete and re-create the doc, dropping prediction counts', async () => {
      await seedDoc(`public_stats/${ALICE}`, { ...stats(ALICE), predictionsWritten: 2, predictionsReviewed: 1, reviewedOnTime: 1, earliestCheckBackAt: null });
      const ref = doc(dbAs(ALICE), 'public_stats', ALICE);
      await expectAllowed(deleteDoc(ref));
      await expectAllowed(setDoc(ref, stats(ALICE)));
      expect((await getDoc(ref)).get('predictionsWritten')).toBeUndefined();
    });
  });
});
