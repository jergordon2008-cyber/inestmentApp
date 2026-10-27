import { describe, it, beforeEach, afterAll } from '@jest/globals';
import { doc, getDoc, getDocs, collection, writeBatch, updateDoc, arrayUnion } from 'firebase/firestore/lite';
import { dbAs, cleanup, clearFirestore, seedDoc, expectAllowed, expectDenied } from './helpers';

const TEACHER = 'teacher';
const STUDENT = 'student';
const OUTSIDER = 'outsider';
const ADMIN = 'admin';
const CODE = 'ABCDE';

// Roster entries as the app writes them now: first name + last initial, no email.
const member = (id: string, name: string, role: 'teacher' | 'student') =>
  ({ id, name, role, joinedAt: '2026-01-01T00:00:00.000Z' });

// Shape written by createClassroom() in src/services/classroomStore.ts.
function classroom() {
  return {
    id: 'class-1', name: 'Period 3', description: '', code: CODE,
    teacherIds: [TEACHER], memberIds: [TEACHER], createdAt: '2026-01-01T00:00:00.000Z',
    subject: '', gradeLevel: '', members: [member(TEACHER, 'Jeremiah G.', 'teacher')],
    assignments: [], announcements: [],
  };
}

beforeEach(async () => {
  await clearFirestore();
  await seedDoc(`admins/${ADMIN}`, { createdAt: '2026-01-01T00:00:00.000Z' });
});
afterAll(cleanup);

describe('classrooms roster without email', () => {
  it('a teacher can create a class whose roster entry has no email', async () => {
    const db = dbAs(TEACHER);
    const batch = writeBatch(db);
    batch.set(doc(db, 'classrooms', 'class-1'), classroom());
    batch.set(doc(db, 'classroom_codes', CODE), { classId: 'class-1', teacherId: TEACHER });
    await expectAllowed(batch.commit());
  });

  it('a student can join with a roster entry that has no email', async () => {
    await seedDoc('classrooms/class-1', classroom());
    const db = dbAs(STUDENT);
    await expectAllowed(updateDoc(doc(db, 'classrooms', 'class-1'), {
      memberIds: arrayUnion(STUDENT),
      members: arrayUnion(member(STUDENT, 'Malik R.', 'student')),
    }));
    await expectAllowed(getDoc(doc(db, 'classrooms', 'class-1')));
  });
});

// What scripts/privacy-cleanup-checklist.js reads with an admin's token.
describe('what an admin can read (privacy checklist)', () => {
  beforeEach(async () => {
    await seedDoc('classrooms/class-1', classroom());
    await seedDoc(`classroom_codes/${CODE}`, { classId: 'class-1', teacherId: TEACHER });
  });

  it('an admin can list every classroom, public_stats, activity, forum_posts and challenge_joins', async () => {
    const db = dbAs(ADMIN);
    for (const name of ['classrooms', 'public_stats', 'activity', 'forum_posts', 'challenge_joins']) {
      await expectAllowed(getDocs(collection(db, name)));
    }
  });

  it('nobody can list classroom_codes, admins included (it holds no names)', async () => {
    await expectDenied(getDocs(collection(dbAs(ADMIN), 'classroom_codes')));
  });

  it('a non-member who is not an admin cannot list classrooms', async () => {
    await expectDenied(getDocs(collection(dbAs(OUTSIDER), 'classrooms')));
  });
});
