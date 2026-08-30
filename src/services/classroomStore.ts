/**
 * Classroom Store
 *
 * Real classrooms persisted to Firestore (classrooms/{id}) — any signed-in
 * student/teacher can create or join by code (see firestore.rules). Member
 * roster stats (portfolioValue, portfolioReturn, lessonsCompleted, streak)
 * are pulled from each member's real public_stats/{uid} doc via
 * refreshMembers(), not fabricated.
 *
 * Previously this store shipped an entirely fake DEMO_CLASSROOM (fictional
 * students "Alex Rivera", "Jordan Lee" etc. with made-up portfolio returns)
 * that any user could load via loadDemo(). Removed — no fabricated data.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveClassroom, loadClassroom, findClassroomByCode, listClassroomsForUser, listLeaderboard,
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
function genCode() { return Math.random().toString(36).slice(2, 7).toUpperCase(); }

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
        const classroom: Classroom = {
          id: genId(),
          name: data.name ?? 'My Classroom',
          description: data.description ?? '',
          code: genCode(),
          teacherIds: [creator.uid],
          memberIds: [creator.uid],
          createdAt: now,
          subject: data.subject ?? '',
          gradeLevel: data.gradeLevel ?? '',
          members: [{ id: creator.uid, name: creator.name, role: 'teacher', email: creator.email, joinedAt: now }],
          assignments: [],
          announcements: [],
        };
        await saveClassroom(classroom);
        set(s => ({ classrooms: [...s.classrooms, classroom], activeClassroomId: classroom.id, isTeacher: true }));
        return classroom;
      },

      joinClassroom: async (code, joiner) => {
        const local = get().classrooms.find(c => c.code === code.toUpperCase());
        const found = local ?? await findClassroomByCode(code);
        if (!found) return null;

        if (found.memberIds.includes(joiner.uid)) {
          set(s => ({ activeClassroomId: found.id, classrooms: s.classrooms.some(c => c.id === found.id) ? s.classrooms : [...s.classrooms, found] }));
          return found;
        }

        const updated: Classroom = {
          ...found,
          memberIds: [...found.memberIds, joiner.uid],
          members: [...found.members, { id: joiner.uid, name: joiner.name, role: 'student', email: joiner.email, joinedAt: new Date().toISOString() }],
        };
        await saveClassroom(updated);
        set(s => ({
          activeClassroomId: updated.id,
          classrooms: [...s.classrooms.filter(c => c.id !== updated.id), updated],
        }));
        return updated;
      },

      loadMyClassrooms: async (uid) => {
        const mine = await listClassroomsForUser(uid);
        set({ classrooms: mine });
      },

      // Pulls real portfolioValue/return/lessons/streak for every member
      // from their public_stats doc — replaces any stale/fabricated numbers.
      refreshMembers: async (classId) => {
        const classroom = get().classrooms.find(c => c.id === classId);
        if (!classroom) return;
        const board = await listLeaderboard(500);
        const statsByUid = new Map(board.map(s => [s.uid, s]));
        const refreshedMembers: ClassMember[] = classroom.members.map(m => {
          const stats = statsByUid.get(m.id);
          return stats ? {
            ...m,
            portfolioValue: stats.totalValue,
            portfolioReturn: stats.totalReturnPercent,
            lessonsCompleted: stats.lessonsCompletedCount,
            streak: stats.streak,
          } : m;
        });
        const updated = { ...classroom, members: refreshedMembers };
        set(s => ({ classrooms: s.classrooms.map(c => c.id === classId ? updated : c) }));
        saveClassroom(updated).catch(() => {});
      },

      addAssignment: async (classId, a) => {
        const classroom = get().classrooms.find(c => c.id === classId);
        if (!classroom) return;
        const updated = { ...classroom, assignments: [...classroom.assignments, { ...a, id: genId(), completedBy: [] }] };
        set(s => ({ classrooms: s.classrooms.map(c => c.id === classId ? updated : c) }));
        await saveClassroom(updated);
      },

      completeAssignment: async (classId, assignmentId, userId) => {
        const classroom = get().classrooms.find(c => c.id === classId);
        if (!classroom) return;
        const updated = {
          ...classroom,
          assignments: classroom.assignments.map(a => a.id !== assignmentId ? a : {
            ...a, completedBy: [...new Set([...a.completedBy, userId])],
          }),
        };
        set(s => ({ classrooms: s.classrooms.map(c => c.id === classId ? updated : c) }));
        await saveClassroom(updated);
      },

      postAnnouncement: async (classId, a) => {
        const classroom = get().classrooms.find(c => c.id === classId);
        if (!classroom) return;
        const updated = {
          ...classroom,
          announcements: [{ ...a, id: genId(), postedAt: new Date().toISOString() }, ...classroom.announcements],
        };
        set(s => ({ classrooms: s.classrooms.map(c => c.id === classId ? updated : c) }));
        await saveClassroom(updated);
      },
    }),
    {
      name: 'investapp-classroom-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
