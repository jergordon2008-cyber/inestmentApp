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

interface ClassroomState {
  classrooms: Classroom[];
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

export const useClassroomStore = create<ClassroomState>()(
  persist(
    (set, get) => ({
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
            set(s => ({ classrooms: [...s.classrooms, classroom], activeClassroomId: classroom.id, isTeacher: true }));
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
        if (local) { set({ activeClassroomId: local.id }); return local; }

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
        set(s => ({
          activeClassroomId: hydrated.id,
          classrooms: [...s.classrooms.filter(c => c.id !== hydrated.id), hydrated],
        }));
        return hydrated;
      },

      loadMyClassrooms: async (uid) => {
        const mine = await listClassroomsForUser(uid);
        set({ classrooms: mine.map(normalize) });
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
            portfolioValue: stats.totalValue,
            portfolioReturn: stats.totalReturnPercent,
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

      addAssignment: async (classId, a) => {
        const classroom = get().classrooms.find(c => c.id === classId);
        if (!classroom) return;
        const assignment: Assignment = { ...a, id: genId(), completedBy: [] };
        set(s => ({ classrooms: s.classrooms.map(c => c.id === classId ? { ...c, assignments: [...c.assignments, assignment] } : c) }));
        await appendAssignment(classId, assignment);
      },

      completeAssignment: async (classId, assignmentId, userId) => {
        const local = get().classrooms.find(c => c.id === classId);
        if (!local) return;
        // Completion edits an element in place, so this has to rewrite the
        // array. Re-read first to shrink the window in which a stale copy
        // could drop an assignment the teacher just added.
        const fresh = (await loadClassroom(classId)) ?? local;
        const assignments = fresh.assignments.map(a => a.id !== assignmentId ? a : {
          ...a, completedBy: [...new Set([...a.completedBy, userId])],
        });
        set(s => ({ classrooms: s.classrooms.map(c => c.id === classId ? { ...c, assignments } : c) }));
        await replaceAssignments(classId, assignments);
      },

      postAnnouncement: async (classId, a) => {
        const classroom = get().classrooms.find(c => c.id === classId);
        if (!classroom) return;
        const announcement: Announcement = { ...a, id: genId(), postedAt: new Date().toISOString() };
        set(s => ({ classrooms: s.classrooms.map(c => c.id === classId ? { ...c, announcements: [announcement, ...c.announcements] } : c) }));
        await appendAnnouncement(classId, announcement);
      },
    }),
    {
      name: 'investapp-classroom-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
