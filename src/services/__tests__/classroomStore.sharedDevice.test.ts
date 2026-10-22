/**
 * One browser, two accounts (a school computer): the classroom store is
 * saved on the device, so after a teacher signs out it still holds their
 * class and isTeacher = true. A student signing in next must never get that
 * class or its teacher controls, and joining with the code must really join.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Classroom } from '../classroomStore';
import { classroomViewFor, useClassroomStore } from '../classroomStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const mockLookup = jest.fn<(code: string) => Promise<string | null>>();
const mockAddMember = jest.fn<(classId: string, m: unknown) => Promise<void>>();
const mockLoad = jest.fn<(classId: string) => Promise<Classroom | null>>();
jest.mock('../firestoreSync', () => ({
  lookupClassroomIdByCode: (code: string) => mockLookup(code),
  addClassroomMember: (id: string, m: unknown) => mockAddMember(id, m),
  loadClassroom: (id: string) => mockLoad(id),
  ClassroomCodeTakenError: class extends Error {},
}));

const teachersClass: Classroom = {
  id: 'class-a', name: 'Period 3', description: '', code: 'ABCDE', teacherIds: ['teacher-1'], memberIds: ['teacher-1'],
  createdAt: '2026-10-01T00:00:00Z', subject: '', gradeLevel: '', members: [], assignments: [], announcements: [],
};
const state = () => useClassroomStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  // What the teacher's session left on this device.
  useClassroomStore.setState({ classrooms: [teachersClass], pendingOps: [], activeClassroomId: 'class-a', myRole: 'teacher', isTeacher: true });
});

describe('shared device: a student after a teacher', () => {
  it('the student does not see the teacher\'s class or teacher controls (before or without a cloud load)', () => {
    expect(classroomViewFor(state(), 'student-1')).toEqual({ classroom: undefined, isTeacher: false });
  });

  it('the teacher still gets their class and controls', () => {
    expect(classroomViewFor(state(), 'teacher-1')).toMatchObject({ classroom: { id: 'class-a' }, isTeacher: true });
  });

  it('signed out: nothing', () => {
    expect(classroomViewFor(state(), null).classroom).toBeUndefined();
  });

  it('joining with the code really joins (no shortcut through the teacher\'s cached copy), as a student', async () => {
    mockLookup.mockResolvedValue('class-a');
    mockAddMember.mockResolvedValue();
    mockLoad.mockResolvedValue({ ...teachersClass, memberIds: ['teacher-1', 'student-1'] });
    const joined = await state().joinClassroom('abcde', { uid: 'student-1', name: 'Malik', email: 'm@example.com' });
    expect(mockAddMember).toHaveBeenCalledWith('class-a', expect.objectContaining({ id: 'student-1', role: 'student' }));
    expect(joined?.id).toBe('class-a');
    expect(classroomViewFor(state(), 'student-1')).toMatchObject({ classroom: { id: 'class-a' }, isTeacher: false });
    expect(state().isTeacher).toBe(false);
  });

  it('a member re-entering their own code still takes the local shortcut (no network)', async () => {
    useClassroomStore.setState({ classrooms: [{ ...teachersClass, memberIds: ['teacher-1', 'student-1'] }] });
    await state().joinClassroom('ABCDE', { uid: 'student-1', name: 'Malik', email: 'm@example.com' });
    expect(mockLookup).not.toHaveBeenCalled();
    expect(classroomViewFor(state(), 'student-1').isTeacher).toBe(false);
  });
});
