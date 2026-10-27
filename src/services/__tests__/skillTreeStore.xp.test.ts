import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const XP_KEY = '@investapp:skill_xp';
const LESSONS_KEY = '@investapp:completed_lessons';

type Store = typeof import('../skillTreeStore').useSkillTreeStore;

/** A fresh copy of the store, as on a page reload: nothing in memory, only AsyncStorage. */
function startApp(): Store {
  let store!: Store;
  jest.isolateModules(() => {
    store = require('../skillTreeStore').useSkillTreeStore;
  });
  return store;
}

/** Every value ever written to the saved XP key, in order. */
function xpWrites(): number[] {
  return (AsyncStorage.setItem as jest.Mock).mock.calls
    .filter(c => c[0] === XP_KEY)
    .map(c => Number(c[1]));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('skill tree XP — reload', () => {
  it('loads the saved XP on startup without anyone calling load()', async () => {
    await AsyncStorage.setItem(XP_KEY, '1200');
    const store = startApp();
    await new Promise(r => setImmediate(r));
    expect(store.getState().xp).toBe(1200);
    expect(store.getState().level).toBe(Math.floor(Math.sqrt(1200 / 100)) + 1);
  });

  it('adds the next lesson to the saved total instead of overwriting it', async () => {
    await AsyncStorage.setItem(XP_KEY, '1200');
    const store = startApp();
    await store.getState().load();
    store.getState().awardLessonXP('T1L01', 100, false);
    expect(store.getState().xp).toBe(1300);
    expect(await AsyncStorage.getItem(XP_KEY)).toBe('1300');
  });
});

describe('skill tree XP — replay', () => {
  it('awards a lesson once, however many times it is completed', async () => {
    const store = startApp();
    await store.getState().load();
    store.getState().awardLessonXP('T1L01', 100, false);
    store.getState().awardLessonXP('T1L01', 100, false);
    expect(store.getState().xp).toBe(100);
  });

  it('reports what it paid, so the completion screen shows 0 on a replay', async () => {
    const store = startApp();
    await store.getState().load();
    expect(store.getState().awardLessonXP('T1L01', 100, false)).toBe(100);
    expect(store.getState().awardLessonXP('T1L01', 100, false)).toBe(0);
    expect(store.getState().awardLessonXP('T1L02', 100, true)).toBe(0);
  });

  it('awards nothing for a lesson already completed after a reload', async () => {
    const first = startApp();
    await first.getState().load();
    first.getState().awardLessonXP('T1L01', 100, false);
    await new Promise(r => setImmediate(r));

    const reloaded = startApp();
    await reloaded.getState().load();
    expect(reloaded.getState().xp).toBe(100);
    reloaded.getState().awardLessonXP('T1L01', 100, false);
    expect(reloaded.getState().xp).toBe(100);
  });

  it('awards nothing when the profile already lists the lesson as completed (existing users)', async () => {
    await AsyncStorage.setItem(XP_KEY, '500');
    const store = startApp();
    await store.getState().load();
    store.getState().awardLessonXP('T1L02', 100, true);
    expect(store.getState().xp).toBe(500);
  });

  it('uses the saved completed-lessons list when there is one', async () => {
    await AsyncStorage.setItem(XP_KEY, '500');
    await AsyncStorage.setItem(LESSONS_KEY, JSON.stringify(['T1L03']));
    const store = startApp();
    await store.getState().load();
    store.getState().awardLessonXP('T1L03', 100, false);
    expect(store.getState().xp).toBe(500);
  });
});

describe('skill tree XP — never wiped', () => {
  it('keeps saved XP that is higher than the completed lessons imply', async () => {
    await AsyncStorage.setItem(XP_KEY, '9000');
    await AsyncStorage.setItem(LESSONS_KEY, JSON.stringify(['T1L01']));
    const store = startApp();
    await store.getState().load();
    expect(store.getState().xp).toBe(9000);
    expect(xpWrites().every(v => v >= 9000)).toBe(true);
  });

  it('does not overwrite saved XP when XP is earned before the load finishes', async () => {
    await AsyncStorage.setItem(XP_KEY, '1000');
    jest.clearAllMocks();
    const store = startApp();
    store.getState().awardLessonXP('T1L01', 50, false); // load still in flight
    await store.getState().load();
    expect(store.getState().xp).toBe(1050);
    expect(await AsyncStorage.getItem(XP_KEY)).toBe('1050');
    expect(xpWrites().every(v => v >= 1000)).toBe(true);
  });

  it('does not overwrite saved XP when a bonus is added before the load finishes', async () => {
    await AsyncStorage.setItem(XP_KEY, '1000');
    jest.clearAllMocks();
    const store = startApp();
    store.getState().addXP(25);
    await store.getState().load();
    expect(store.getState().xp).toBe(1025);
    expect(xpWrites().every(v => v >= 1000)).toBe(true);
  });

  it('leaves saved XP untouched when the saved value cannot be read', async () => {
    await AsyncStorage.setItem(XP_KEY, 'garbage');
    const store = startApp();
    await store.getState().load();
    expect(store.getState().xp).toBe(0);
    expect(await AsyncStorage.getItem(XP_KEY)).toBe('garbage');
  });
});
