/**
 * Firestore Sync Layer
 *
 * Data model:
 *   users/{uid}          — full profile (private: owner + admin only)
 *   portfolios/{uid}     — full portfolio incl. trades (private: owner + admin only)
 *   journals/{uid}        — { entries: JournalEntry[] } (private: owner + admin only)
 *   public_stats/{uid}   — small denormalized doc for the leaderboard/classroom
 *                          (readable by any signed-in student, written by owner only)
 *   admins/{uid}         — presence-only doc; if it exists, that uid is an admin
 *   activity/{eventId}   — real trade events for the social activity feed
 *
 * Every store mutation that matters (profile, portfolio, journal) calls the
 * matching save*() here. Reads happen once at login to hydrate local state;
 * after that the local Zustand stores (still AsyncStorage-persisted) are the
 * fast path, with Firestore as the durable, cross-device source of truth.
 */
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, writeBatch,
  collection, getDocs, query, orderBy, limit as fsLimit, where, onSnapshot,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { User, Portfolio } from '../types';
import { JournalEntry } from './tradeJournalStore';
import type { Classroom, ClassMember, Assignment, Announcement } from './classroomStore';

function db() {
  const d = getFirebaseDb();
  if (!d) throw new Error('Firestore not configured');
  return d;
}

// ── Profile ──────────────────────────────────────────────────────────────────

export async function saveUserProfile(uid: string, user: User): Promise<void> {
  const d = getFirebaseDb();
  if (!d) return;
  await setDoc(doc(d, 'users', uid), user, { merge: true });
}

export async function loadUserProfile(uid: string): Promise<User | null> {
  const d = getFirebaseDb();
  if (!d) return null;
  const snap = await getDoc(doc(d, 'users', uid));
  return snap.exists() ? (snap.data() as User) : null;
}

/**
 * Live-watches users/{uid}.subscription so the app unlocks premium features
 * within seconds of Stripe's webhook confirming payment — without this, a
 * student could pay successfully and still see everything locked until they
 * logged out and back in (the local subscriptionStore never got told
 * anything changed). Also picks up cancellations made via the billing portal.
 */
export interface SubscriptionSnapshot {
  subscription: User['subscription'];
  status?: User['subscriptionStatus'];
  renewsAt?: string;
  cancelAtPeriodEnd?: boolean;
}

export function subscribeToSubscriptionStatus(
  uid: string,
  cb: (subscription: SubscriptionSnapshot) => void
): () => void {
  const d = getFirebaseDb();
  if (!d) return () => {};
  return onSnapshot(doc(d, 'users', uid), snap => {
    const data = snap.data() as User | undefined;
    if (data) {
      cb({
        subscription: data.subscription,
        status: data.subscriptionStatus,
        renewsAt: data.subscriptionRenewsAt,
        cancelAtPeriodEnd: data.subscriptionCancelAtPeriodEnd,
      });
    }
  });
}

// ── Portfolio ────────────────────────────────────────────────────────────────

export async function savePortfolio(uid: string, portfolio: Portfolio): Promise<void> {
  const d = getFirebaseDb();
  if (!d) return;
  await setDoc(doc(d, 'portfolios', uid), portfolio, { merge: false });
}

export async function loadPortfolio(uid: string): Promise<Portfolio | null> {
  const d = getFirebaseDb();
  if (!d) return null;
  const snap = await getDoc(doc(d, 'portfolios', uid));
  return snap.exists() ? (snap.data() as Portfolio) : null;
}

// ── Journal ──────────────────────────────────────────────────────────────────

export async function saveJournal(uid: string, entries: JournalEntry[]): Promise<void> {
  const d = getFirebaseDb();
  if (!d) return;
  await setDoc(doc(d, 'journals', uid), { entries }, { merge: false });
}

export async function loadJournal(uid: string): Promise<JournalEntry[]> {
  const d = getFirebaseDb();
  if (!d) return [];
  const snap = await getDoc(doc(d, 'journals', uid));
  return snap.exists() ? ((snap.data().entries as JournalEntry[]) ?? []) : [];
}

// ── Public stats (leaderboard) ──────────────────────────────────────────────

export interface PublicStats {
  uid: string;
  displayName: string;
  totalValue: number;
  totalReturnPercent: number;
  lessonsCompletedCount: number;
  streak: number;
  currentTier: number;
  // Classroom board (Phase D): counts from the student's own journal, via
  // predictionActivity. Optional — absent until the student's app publishes
  // them. Accuracy is never published.
  predictionsWritten?: number;
  predictionsReviewed?: number;
  reviewedOnTime?: number;
  earliestCheckBackAt?: string | null;
  updatedAt: string;
}

export async function savePublicStats(uid: string, stats: Omit<PublicStats, 'uid' | 'updatedAt'>): Promise<void> {
  const d = getFirebaseDb();
  if (!d) return;
  await setDoc(doc(d, 'public_stats', uid), {
    uid,
    ...stats,
    updatedAt: new Date().toISOString(),
  });
}

export async function listLeaderboard(max = 100): Promise<PublicStats[]> {
  const d = getFirebaseDb();
  if (!d) return [];
  const q = query(collection(d, 'public_stats'), orderBy('totalReturnPercent', 'desc'), fsLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as PublicStats);
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function isAdmin(uid: string): Promise<boolean> {
  const d = getFirebaseDb();
  if (!d) return false;
  const snap = await getDoc(doc(d, 'admins', uid));
  return snap.exists();
}

/** Admin-only: list every student's profile. Security rules enforce the admin check server-side too. */
export async function listAllUserProfiles(): Promise<User[]> {
  const d = getFirebaseDb();
  if (!d) return [];
  const snap = await getDocs(collection(d, 'users'));
  return snap.docs.map(doc => doc.data() as User);
}

export async function adminLoadPortfolio(uid: string): Promise<Portfolio | null> {
  return loadPortfolio(uid);
}

export async function adminLoadJournal(uid: string): Promise<JournalEntry[]> {
  return loadJournal(uid);
}

// ── Classrooms ───────────────────────────────────────────────────────────────
// Every write here is field-scoped (updateDoc / arrayUnion) rather than a
// whole-document setDoc, for two reasons:
//   1. Concurrent writers never overwrite each other's fields — two students
//      joining during a live session both land on the roster.
//   2. firestore.rules checks exactly which keys a write touches, so a
//      stale local copy can't silently rewrite the roster or teacher list.
// The only whole-document write is the create, batched with its join-code
// index entry so both land or neither does.

export class ClassroomCodeTakenError extends Error {
  constructor(code: string) { super(`Classroom code ${code} is already in use`); this.name = 'ClassroomCodeTakenError'; }
}

/** Creates classrooms/{id} and classroom_codes/{code} atomically. */
export async function createClassroomWithCode(classroom: Classroom, teacherId: string): Promise<void> {
  const d = db();
  const codeRef = doc(d, 'classroom_codes', classroom.code);
  // Friendly fast path. The real guard is the rule: classroom_codes denies
  // update, so a racing create on the same code fails at commit instead.
  if ((await getDoc(codeRef)).exists()) throw new ClassroomCodeTakenError(classroom.code);
  const batch = writeBatch(d);
  batch.set(doc(d, 'classrooms', classroom.id), classroom);
  batch.set(codeRef, { classId: classroom.id, teacherId });
  await batch.commit();
}

export async function loadClassroom(id: string): Promise<Classroom | null> {
  const d = getFirebaseDb();
  if (!d) return null;
  const snap = await getDoc(doc(d, 'classrooms', id));
  return snap.exists() ? (snap.data() as Classroom) : null;
}

/** Resolves a join code to a classroom id via the classroom_codes index.
 *  Readable by any signed-in user; reveals nothing about the roster. */
export async function lookupClassroomIdByCode(code: string): Promise<string | null> {
  const d = getFirebaseDb();
  if (!d) return null;
  const snap = await getDoc(doc(d, 'classroom_codes', code));
  if (!snap.exists()) return null;
  const classId = snap.data().classId;
  return typeof classId === 'string' ? classId : null;
}

/** Appends one member. Touches no other field, so it can never clobber a
 *  concurrent join. Rule (a) in firestore.rules requires member.id === the
 *  caller's uid and role 'student'. */
export async function addClassroomMember(classId: string, member: ClassMember): Promise<void> {
  await updateDoc(doc(db(), 'classrooms', classId), {
    memberIds: arrayUnion(member.id),
    members: arrayUnion(member),
  });
}

export async function appendAssignment(classId: string, assignment: Assignment): Promise<void> {
  await updateDoc(doc(db(), 'classrooms', classId), { assignments: arrayUnion(assignment) });
}

export async function appendAnnouncement(classId: string, announcement: Announcement): Promise<void> {
  await updateDoc(doc(db(), 'classrooms', classId), { announcements: arrayUnion(announcement) });
}

/** Replaces the assignments array (used for Mark Complete, which edits an
 *  element in place — arrayUnion can't express that). */
export async function replaceAssignments(classId: string, assignments: Assignment[]): Promise<void> {
  await updateDoc(doc(db(), 'classrooms', classId), { assignments });
}

export async function listClassroomsForUser(uid: string): Promise<Classroom[]> {
  const d = getFirebaseDb();
  if (!d) return [];
  const q = query(collection(d, 'classrooms'), where('memberIds', 'array-contains', uid));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as Classroom);
}

// ── Activity feed (real trades only) ────────────────────────────────────────
// Replaces a previously fully-fabricated "Alex C. bought NVDA" feed with
// real trade events. Only symbol/action/displayName are exposed — no
// dollar amounts or share counts — the same privacy level as the
// leaderboard's public_stats doc.

export interface ActivityEvent {
  id: string;
  uid: string;
  displayName: string;
  action: 'buy' | 'sell';
  symbol: string;
  createdAt: string;
}

export async function logActivity(event: Omit<ActivityEvent, 'id'>): Promise<void> {
  const d = getFirebaseDb();
  if (!d) return;
  const id = `${event.uid}_${Date.now()}`;
  await setDoc(doc(d, 'activity', id), { ...event, id });
}

export async function listRecentActivity(max = 20): Promise<ActivityEvent[]> {
  const d = getFirebaseDb();
  if (!d) return [];
  const q = query(collection(d, 'activity'), orderBy('createdAt', 'desc'), fsLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as ActivityEvent);
}

// ── Weekly challenges (real join tracking) ──────────────────────────────────
// Replaces fabricated participant counts ("1,247 joined") with a real count
// backed by who has actually tapped Join, stored per challenge id.

export async function joinChallenge(challengeId: string, uid: string): Promise<void> {
  const d = getFirebaseDb();
  if (!d) return;
  await setDoc(doc(d, 'challenge_joins', `${challengeId}_${uid}`), {
    challengeId, uid, joinedAt: new Date().toISOString(),
  });
}

export async function getChallengeParticipantCounts(challengeIds: string[]): Promise<Record<string, number>> {
  const d = getFirebaseDb();
  if (!d) return {};
  const counts: Record<string, number> = {};
  await Promise.all(challengeIds.map(async id => {
    const q = query(collection(d, 'challenge_joins'), where('challengeId', '==', id));
    const snap = await getDocs(q);
    counts[id] = snap.size;
  }));
  return counts;
}

export async function hasJoinedChallenge(challengeId: string, uid: string): Promise<boolean> {
  const d = getFirebaseDb();
  if (!d) return false;
  const snap = await getDoc(doc(d, 'challenge_joins', `${challengeId}_${uid}`));
  return snap.exists();
}

// ── Forum (real posts, replacing 4 hardcoded fictional ones) ────────────────
// Previously the Community screen showed four fake posts ("Sarah K.", "Marcus
// T.", ...) with a "Post" button that only closed a modal and never saved
// anything — implying it worked when it silently did nothing. This is the
// real backing store: posts/{postId}, readable by any signed-in student,
// written by their author only.

export interface ForumPost {
  id: string;
  authorUid: string;
  authorName: string;
  title: string;
  body: string;
  createdAt: string;
}

export async function createForumPost(post: Omit<ForumPost, 'id' | 'createdAt'>): Promise<void> {
  const d = getFirebaseDb();
  if (!d) throw new Error('Not signed in — post was not saved.');
  const id = `${post.authorUid}_${Date.now()}`;
  await setDoc(doc(d, 'forum_posts', id), { ...post, id, createdAt: new Date().toISOString() });
}

export async function listForumPosts(max = 30): Promise<ForumPost[]> {
  const d = getFirebaseDb();
  if (!d) return [];
  const q = query(collection(d, 'forum_posts'), orderBy('createdAt', 'desc'), fsLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as ForumPost);
}
