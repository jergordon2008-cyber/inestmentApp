/**
 * Classroom Store
 *
 * Real classrooms persisted to Firestore (classrooms/{id}). Only enrolled
 * members can read a classroom; joining goes through the classroom_codes
 * index and an atomic arrayUnion append, so a non-member never reads a
 * roster and two students joining at once never erase each other (see
 * firestore.rules for the exact shapes each write must take). Member
 * roster stats (portfolioValue, portfolioReturn, lessonsCompleted, streak)
 * are pulled from each member's real public_stats/{uid} doc via
 * refreshMembers(), not fabricated, and are never written back.
 *
 * Previously this store shipped an entirely fake DEMO_CLASSROOM (fictional
 * students "Alex Rivera", "Jordan Lee" etc. with made-up portfolio returns)
 * that any user could load via loadDemo(). Removed — no fabricated data.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClassroomWithCode, ClassroomCodeTakenError, loadClassroom, lookupClassroomIdByCode,
  addClassroomMember, appendAssignment, appendAnnouncement, replaceAssignments,
  listClassroomsForUser, listLeaderboard,
} from './firestoreSync';
import { requestSave, useSyncStatusStore } from './syncStatus';

export type UserRole = 'student' | 'teacher';

export interface ClassMember {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  joinedAt: string;
  portfolioValue?: number;
  portfolioReturn?: number;
  lessonsCompleted?: number;
  streak?: number;
  lastActive?: string;
  biasScore?: string;
  assignmentsCompleted?: number;
  // From public_stats (see PublicStats). Undefined until the student's app publishes them.
  predictionsWritten?: number;
  predictionsReviewed?: number;
  reviewedOnTime?: number;
  earliestCheckBackAt?: string | null;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  type: 'lesson' | 'quiz' | 'trade' | 'research';
  lessonId?: string;
  dueDate: string;
  assignedAt: string;
  assignedBy: string;
  completedBy: string[];
  points: number;
  status: 'active' | 'past';
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  postedBy: string;
  postedAt: string;
  pinned: boolean;
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  code: string;
  teacherIds: string[];
  memberIds: string[];
  createdAt: string;
  subject: string;
  gradeLevel: string;
  members: ClassMember[];
  assignments: Assignment[];
  announcements: Announcement[];
}

/**
 * A class post made on this device that Firestore hasn't acknowledged yet.
 * Each is a separate operation — sending only "the latest state" would drop
 * earlier ones — and each is safe to send again: arrayUnion of an identical
 * item adds nothing, and completion re-reads and adds the student to a set.
 * Tagged with the account that made it, and only that account sends it.
 */
export type PendingClassroomOp =
  | { id: string; uid: string; classId: string; kind: 'assignment'; assignment: Assignment }
  | { id: string; uid: string; classId: string; kind: 'announcement'; announcement: Announcement }
  | { id: string; uid: string; classId: string; kind: 'complete'; assignmentId: string; userId: string };

/**
 * The classroom as it stands with this device's unsent posts laid over it:
 * after a reload from the cloud, still-pending items are shown (and marked
 * pending on screen) rather than silently vanishing. Pure; idempotent.
 */
export function withPendingOps(c: Classroom, ops: PendingClassroomOp[]): Classroom {
  let assignments = c.assignments;
  let announcements = c.announcements;
  for (const op of ops) {
    if (op.classId !== c.id) continue;
    if (op.kind === 'assignment' && !assignments.some(a => a.id === op.assignment.id)) {
      assignments = [...assignments, op.assignment];
    } else if (op.kind === 'announcement' && !announcements.some(a => a.id === op.announcement.id)) {
      announcements = [op.announcement, ...announcements];
    } else if (op.kind === 'complete') {
      // Only a new array when a student is actually added, so "nothing to
      // write" is detectable (an already-complete assignment isn't rewritten).
      const i = assignments.findIndex(a => a.id === op.assignmentId && !(a.completedBy ?? []).includes(op.userId));
      if (i >= 0) {
        const a = assignments[i];
        assignments = [...assignments.slice(0, i), { ...a, completedBy: [...(a.completedBy ?? []), op.userId] }, ...assignments.slice(i + 1)];
      }
    }
  }
  return assignments === c.assignments && announcements === c.announcements ? c : { ...c, assignments, announcements };
}

interface ClassroomState {
  classrooms: Classroom[];
  /** Class posts not yet acknowledged by Firestore (see PendingClassroomOp). Persisted. */
  pendingOps: PendingClassroomOp[];
  activeClassroomId: string | null;
  myRole: UserRole;
  isTeacher: boolean;

  setRole: (role: UserRole) => void;
  setActiveClassroom: (id: string) => void;
  createClassroom: (data: Partial<Classroom>, creator: { uid: string; name: string; email: string }) => Promise<Classroom>;
  joinClassroom: (code: string, joiner: { uid: string; name: string; email: string }) => Promise<Classroom | null>;
  loadMyClassrooms: (uid: string) => Promise<void>;
  refreshMembers: (classId: string) => Promise<void>;
  addAssignment: (classId: string, a: Omit<Assignment, 'id' | 'completedBy'>) => Promise<void>;
  completeAssignment: (classId: string, assignmentId: string, userId: string) => Promise<void>;
  postAnnouncement: (classId: string, a: Omit<Announcement, 'id' | 'postedAt'>) => Promise<void>;
  /** Asks the sync layer to send `uid`'s pending class posts (after sign-in, or a reload). */
  resumePendingOps: (uid: string) => void;
}

function genId() { return Math.random().toString(36).slice(2, 10); }

// Join codes: 5 chars from an alphabet with no I / O / 0 / 1, so a code read
// aloud in class is unambiguous. Must stay in sync with isValidClassCode()
// in firestore.rules, which rejects any code outside this set.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CLASS_CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
function genCode() {
  let code = '';
  for (let i = 0; i < 5; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}
const CREATE_CODE_ATTEMPTS = 5;

function isPermissionDenied(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'permission-denied';
}

// Firestore stores announcements in append order; the feed shows newest
// first. Normalise on every hydrate so local and remote order agree.
function normalize(c: Classroom): Classroom {
  return { ...c, announcements: [...c.announcements].sort((a, b) => b.postedAt.localeCompare(a.postedAt)) };
}

// Bumped whenever a create or join adds a class here, so a load that was
// already in flight (and whose list may predate it) can't drop that class.
let classAddedSeq = 0;

// Which class is open, and whether this account teaches it (rules allow
// teacher edits only for uids in teacherIds, so the controls follow that).
function selection(c: Classroom | undefined, uid: string) {
  const teaches = !!c && (c.teacherIds ?? []).includes(uid);
  return { activeClassroomId: c?.id ?? null, isTeacher: teaches, myRole: (teaches ? 'teacher' : 'student') as UserRole };
}

export const useClassroomStore = create<ClassroomState>()(
  persist(
    (set, get) => ({
      pendingOps: [],
      classrooms: [],
      activeClassroomId: null,
      myRole: 'student',
      isTeacher: false,

      setRole: (role) => set({ myRole: role, isTeacher: role === 'teacher' }),

      setActiveClassroom: (id) => set({ activeClassroomId: id }),

      createClassroom: async (data, creator) => {
        const now = new Date().toISOString();
        const base: Omit<Classroom, 'id' | 'code'> = {
          name: data.name ?? 'My Classroom',
          description: data.description ?? '',
          teacherIds: [creator.uid],
          memberIds: [creator.uid],
          createdAt: now,
          subject: data.subject ?? '',
          gradeLevel: data.gradeLevel ?? '',
          members: [{ id: creator.uid, name: creator.name, role: 'teacher', email: creator.email, joinedAt: now }],
          assignments: [],
          announcements: [],
        };
        // The code is the classroom_codes document id, so a collision fails
        // the create; draw a fresh code and try again (bounded).
        for (let attempt = 0; ; attempt++) {
          const classroom: Classroom = { ...base, id: genId(), code: genCode() };
          try {
            await createClassroomWithCode(classroom, creator.uid);
            classAddedSeq++;
            set(s => ({ classrooms: [...s.classrooms, classroom], ...selection(classroom, creator.uid) }));
            return classroom;
          } catch (e) {
            if (e instanceof ClassroomCodeTakenError && attempt < CREATE_CODE_ATTEMPTS - 1) continue;
            throw e;
          }
        }
      },

      joinClassroom: async (code, joiner) => {
        const normalized = code.trim().toUpperCase();
        if (!CLASS_CODE_RE.test(normalized)) return null;

        const local = get().classrooms.find(c => c.code === normalized);
        if (local) { set(selection(local, joiner.uid)); return local; }

        const classId = await lookupClassroomIdByCode(normalized);
        if (!classId) return null;

        // Append exactly ourselves. Rule (a) admits only a non-member adding
        // their own uid with role 'student'; a permission error therefore
        // means either "already a member" (handled by the read below) or a
        // genuine denial (surfaces as "Code not found").
        try {
          await addClassroomMember(classId, {
            id: joiner.uid, name: joiner.name, role: 'student', email: joiner.email, joinedAt: new Date().toISOString(),
          });
        } catch (e) {
          if (!isPermissionDenied(e)) throw e;
        }

        let joined: Classroom | null = null;
        try { joined = await loadClassroom(classId); } catch (e) { if (!isPermissionDenied(e)) throw e; }
        if (!joined) return null;

        const hydrated = normalize(joined);
        classAddedSeq++;
        set(s => ({
          ...selection(hydrated, joiner.uid),
          classrooms: [...s.classrooms.filter(c => c.id !== hydrated.id), hydrated],
        }));
        return hydrated;
      },

      // The cloud list is the truth: membership lives in the classroom doc
      // (memberIds), so a student sees their class on any device without the
      // code. The selection survives if it is still one of theirs; otherwise
      // (new device, or a class left by another account on this device) it
      // moves to their newest class, and teacher controls follow teacherIds.
      // With no class at all the role flags are left alone: the landing
      // buttons set them for the create/join form that may already be open.
      loadMyClassrooms: async (uid) => {
        const seqAtStart = classAddedSeq;
        const mine = await listClassroomsForUser(uid);
        const pending = get().pendingOps.filter(op => op.uid === uid);
        let classrooms = mine.map(normalize).map(c => withPendingOps(c, pending));
        if (classAddedSeq !== seqAtStart) {
          // A create/join finished meanwhile: keep the classes it added.
          classrooms = [...classrooms, ...get().classrooms.filter(c => !classrooms.some(m => m.id === c.id))];
        }
        const active = classrooms.find(c => c.id === get().activeClassroomId)
          ?? [...classrooms].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0];
        set(active ? { classrooms, ...selection(active, uid) } : { classrooms, activeClassroomId: null });
        get().resumePendingOps(uid);
      },

      resumePendingOps: (uid) => {
        if (get().pendingOps.some(op => op.uid === uid)) {
          requestSave('classroom', uid, () => flushPendingClassroomOps(uid));
        }
      },

      // Pulls real portfolioValue/return/lessons/streak for every member
      // from their public_stats doc — replaces any stale/fabricated numbers.
      refreshMembers: async (classId) => {
        if (!get().classrooms.some(c => c.id === classId)) return;
        const board = await listLeaderboard(500);
        const statsByUid = new Map(board.map(s => [s.uid, s]));
        const withStats = (m: ClassMember): ClassMember => {
          const stats = statsByUid.get(m.id);
          return stats ? {
            ...m,
            // null (nothing real published) → undefined, which the board
            // shows as "Not synced yet" / "—".
            portfolioValue: stats.totalValue ?? undefined,
            portfolioReturn: stats.totalReturnPercent ?? undefined,
            lessonsCompleted: stats.lessonsCompletedCount,
            streak: stats.streak,
            predictionsWritten: stats.predictionsWritten,
            predictionsReviewed: stats.predictionsReviewed,
            reviewedOnTime: stats.reviewedOnTime,
            earliestCheckBackAt: stats.earliestCheckBackAt,
          } : m;
        };
        // Local only. These numbers are re-derived from public_stats on every
        // refresh, so persisting them into the classroom doc bought nothing
        // and was a whole-document write that could erase a concurrent join.
        // Apply the stats to whatever roster is in the store *now*: this runs
        // concurrently with loadMyClassrooms on mount, and snapshotting the
        // roster before the await would let a stale copy overwrite the fresh one.
        set(s => ({
          classrooms: s.classrooms.map(c => c.id === classId ? { ...c, members: c.members.map(withStats) } : c),
        }));
      },

      // Class posts: shown at once, queued, and sent through the sync layer
      // (saving / saved / failed, retry with backoff, the sync banner). They
      // used to await the write directly, so a failure was an unhandled
      // promise and the screen looked saved when it wasn't.
      addAssignment: async (classId, a) => {
        const classroom = get().classrooms.find(c => c.id === classId);
        const uid = useSyncStatusStore.getState().uid;
        if (!classroom || !uid) return;
        const assignment: Assignment = { ...a, id: genId(), completedBy: [] };
        set(s => ({
          classrooms: s.classrooms.map(c => c.id === classId ? { ...c, assignments: [...c.assignments, assignment] } : c),
          pendingOps: [...s.pendingOps, { id: assignment.id, uid, classId, kind: 'assignment', assignment }],
        }));
        get().resumePendingOps(uid);
      },
      completeAssignment: async (classId, assignmentId, userId) => {
        const local = get().classrooms.find(c => c.id === classId);
        const uid = useSyncStatusStore.getState().uid;
        if (!local || !uid) return;
        const op: PendingClassroomOp = { id: `complete-${assignmentId}-${userId}`, uid, classId, kind: 'complete', assignmentId, userId };
        set(s => ({
          classrooms: s.classrooms.map(c => c.id === classId ? withPendingOps(c, [op]) : c),
          pendingOps: s.pendingOps.some(p => p.id === op.id) ? s.pendingOps : [...s.pendingOps, op],
        }));
        get().resumePendingOps(uid);
      },
      postAnnouncement: async (classId, a) => {
        const classroom = get().classrooms.find(c => c.id === classId);
        const uid = useSyncStatusStore.getState().uid;
        if (!classroom || !uid) return;
        const announcement: Announcement = { ...a, id: genId(), postedAt: new Date().toISOString() };
        set(s => ({
          classrooms: s.classrooms.map(c => c.id === classId ? { ...c, announcements: [announcement, ...c.announcements] } : c),
          pendingOps: [...s.pendingOps, { id: announcement.id, uid, classId, kind: 'announcement', announcement }],
        }));
        get().resumePendingOps(uid);
      },
    }),
    {
      name: 'investapp-classroom-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/**
 * The sync layer's write function for 'classroom': sends every pending post
 * of `uid`, oldest first, removing each once Firestore acknowledges it.
 * Reads the queue when called, so a retry sends whatever is still pending
 * (including posts made since). Throws on the first failure, leaving it and
 * everything after it queued — the sync layer retries or shows the failure.
 */
export async function flushPendingClassroomOps(uid: string): Promise<void> {
  for (const op of useClassroomStore.getState().pendingOps.filter(o => o.uid === uid)) {
    if (op.kind === 'assignment') {
      await appendAssignment(op.classId, op.assignment);
    } else if (op.kind === 'announcement') {
      await appendAnnouncement(op.classId, op.announcement);
    } else {
      // Completion edits an element in place, so it rewrites the array.
      // Re-read first to shrink the window in which a stale copy could drop
      // an assignment the teacher just added.
      const fresh = await loadClassroom(op.classId);
      if (!fresh) throw new Error(`classroom ${op.classId} not found`);
      // The raw document may lack the id field or an array; the op's own
      // classId is authoritative.
      const base: Classroom = { ...fresh, id: op.classId, assignments: fresh.assignments ?? [], announcements: fresh.announcements ?? [] };
      const assignments = withPendingOps(base, [op]).assignments;
      if (assignments !== base.assignments) await replaceAssignments(op.classId, assignments);
    }
    useClassroomStore.setState(s => ({ pendingOps: s.pendingOps.filter(o => o.id !== op.id) }));
  }
}

/** Ids of this account's class posts still waiting to reach the cloud (for "not saved" markers). */
export function usePendingClassroomIds(uid: string | undefined): Set<string> {
  const ops = useClassroomStore(s => s.pendingOps);
  return new Set(ops.filter(o => o.uid === uid).map(o => o.kind === 'complete' ? o.assignmentId : o.id));
}
