import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Classroom } from '../classroomStore';
import { useClassroomStore } from '../classroomStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const mockListClassroomsForUser = jest.fn<(uid: string) => Promise<Classroom[]>>();
const mockCreateClassroomWithCode = jest.fn<(c: Classroom, uid: string) => Promise<void>>();
jest.mock('../firestoreSync', () => ({
  listClassroomsForUser: (uid: string) => mockListClassroomsForUser(uid),
  createClassroomWithCode: (c: Classroom, uid: string) => mockCreateClassroomWithCode(c, uid),
  ClassroomCodeTakenError: class extends Error {},
}));

const classroom = (id: string, createdAt: string, teacherIds = ['teacher-1']): Classroom => ({
  id, name: id, description: '', code: 'ABCDE', teacherIds, memberIds: [...teacherIds, 'student-1'],
  createdAt, subject: '', gradeLevel: '', members: [], assignments: [], announcements: [],
});
const state = () => useClassroomStore.getState();

beforeEach(() => {
  mockListClassroomsForUser.mockReset();
  mockCreateClassroomWithCode.mockReset();
  useClassroomStore.setState({ classrooms: [], pendingOps: [], activeClassroomId: null, myRole: 'student', isTeacher: false });
});

describe('loadMyClassrooms — new device (nothing stored locally)', () => {
  it('opens the class the student is a member of, without the join code', async () => {
    mockListClassroomsForUser.mockResolvedValue([classroom('class-a', '2026-09-01T00:00:00Z')]);
    await state().loadMyClassrooms('student-1');
    expect(state().activeClassroomId).toBe('class-a');
    expect(state().isTeacher).toBe(false);
    expect(state().myRole).toBe('student');
  });

  it('opens the newest class when the student is in several', async () => {
    mockListClassroomsForUser.mockResolvedValue([
      classroom('older', '2026-01-01T00:00:00Z'),
      classroom('newest', '2026-09-01T00:00:00Z'),
      classroom('middle', '2026-05-01T00:00:00Z'),
    ]);
    await state().loadMyClassrooms('student-1');
    expect(state().activeClassroomId).toBe('newest');
  });

  it('gives a teacher their teacher controls back', async () => {
    mockListClassroomsForUser.mockResolvedValue([classroom('class-a', '2026-09-01T00:00:00Z', ['teacher-1'])]);
    await state().loadMyClassrooms('teacher-1');
    expect(state().activeClassroomId).toBe('class-a');
    expect(state().isTeacher).toBe(true);
    expect(state().myRole).toBe('teacher');
  });

  it('leaves nothing selected when the account is in no class', async () => {
    mockListClassroomsForUser.mockResolvedValue([]);
    await state().loadMyClassrooms('student-1');
    expect(state().activeClassroomId).toBeNull();
    expect(state().isTeacher).toBe(false);
  });

  it('keeps the role picked on the landing screen when the account is in no class', async () => {
    state().setRole('teacher'); // tapped "Create a Classroom" before the load came back
    mockListClassroomsForUser.mockResolvedValue([]);
    await state().loadMyClassrooms('teacher-1');
    expect(state().isTeacher).toBe(true);
    expect(state().myRole).toBe('teacher');
  });
});

describe('loadMyClassrooms — something stored locally', () => {
  it('keeps the selected class when it is still one of theirs', async () => {
    useClassroomStore.setState({ activeClassroomId: 'older' });
    mockListClassroomsForUser.mockResolvedValue([
      classroom('older', '2026-01-01T00:00:00Z'),
      classroom('newest', '2026-09-01T00:00:00Z'),
    ]);
    await state().loadMyClassrooms('student-1');
    expect(state().activeClassroomId).toBe('older');
  });

  it('replaces a class left over from another account on this device', async () => {
    // A teacher signed out; a student signs in on the same device.
    useClassroomStore.setState({
      classrooms: [classroom('teachers-class', '2026-01-01T00:00:00Z', ['teacher-9'])],
      activeClassroomId: 'teachers-class', myRole: 'teacher', isTeacher: true,
    });
    mockListClassroomsForUser.mockResolvedValue([classroom('class-a', '2026-09-01T00:00:00Z')]);
    await state().loadMyClassrooms('student-1');
    expect(state().activeClassroomId).toBe('class-a');
    expect(state().isTeacher).toBe(false);
    expect(state().classrooms.map(c => c.id)).toEqual(['class-a']);
  });

  it('clears the selection when the account is no longer in any class', async () => {
    useClassroomStore.setState({ classrooms: [classroom('gone', '2026-01-01T00:00:00Z')], activeClassroomId: 'gone' });
    mockListClassroomsForUser.mockResolvedValue([]);
    await state().loadMyClassrooms('student-1');
    expect(state().activeClassroomId).toBeNull();
    expect(state().classrooms).toEqual([]);
  });

  it('does not drop a class created while the load was in flight', async () => {
    let finishLoad!: (list: Classroom[]) => void;
    mockListClassroomsForUser.mockReturnValue(new Promise(r => { finishLoad = r; }));
    mockCreateClassroomWithCode.mockResolvedValue(undefined);
    const load = state().loadMyClassrooms('teacher-1');
    const created = await state().createClassroom({ name: 'New class' }, { uid: 'teacher-1', name: 'T', email: 't@example.com' });
    finishLoad([]); // the list was read before the create
    await load;
    expect(state().activeClassroomId).toBe(created.id);
    expect(state().classrooms.map(c => c.id)).toEqual([created.id]);
    expect(state().isTeacher).toBe(true);
  });

  it('leaves the selection alone when loading fails', async () => {
    useClassroomStore.setState({ classrooms: [classroom('class-a', '2026-09-01T00:00:00Z')], activeClassroomId: 'class-a' });
    mockListClassroomsForUser.mockRejectedValue(Object.assign(new Error('offline'), { code: 'unavailable' }));
    await expect(state().loadMyClassrooms('student-1')).rejects.toThrow('offline');
    expect(state().activeClassroomId).toBe('class-a');
  });
});

describe('joinClassroom — class already loaded on this device', () => {
  it('opens it with the role this account has in it', async () => {
    useClassroomStore.setState({ classrooms: [classroom('class-a', '2026-09-01T00:00:00Z', ['teacher-1'])] });
    const joined = await state().joinClassroom('abcde', { uid: 'teacher-1', name: 'T', email: 't@example.com' });
    expect(joined?.id).toBe('class-a');
    expect(state().activeClassroomId).toBe('class-a');
    expect(state().isTeacher).toBe(true);
  });
});
