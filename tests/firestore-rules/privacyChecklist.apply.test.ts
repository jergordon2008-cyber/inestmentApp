/**
 * `npm run privacy:checklist -- --apply` / `--revert` against the Firestore
 * emulator: writes exactly the checklist changes and nothing else, keeps a
 * private backup that puts every value back, prints counts only, and checks
 * again afterwards. Seeded with made-up names and @example.com addresses.
 */
import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { clearFirestore, PROJECT_ID } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { planDoc, changesFor, REVIEW } = require('../../scripts/privacy-cleanup-checklist.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fromFields } = require('../../scripts/firestore-rest-values.js');

const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const DOCS_URL = `http://${HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const SCRIPT = path.join(__dirname, '../../scripts/privacy-cleanup-checklist.js');

type Raw = Record<string, any>;
const s = (v: string) => ({ stringValue: v });
const n = (v: number) => ({ integerValue: String(v) });
const ts = (v: string) => ({ timestampValue: v });
const map = (fields: Raw) => ({ mapValue: { fields } });
const arr = (...values: Raw[]) => ({ arrayValue: { values } });

// Every value type the app stores next to a name, so a write that re-encoded
// anything (a timestamp as a string, an integer as a double) would show.
const SEED: Record<string, Raw> = {
  'public_stats/u1': {
    uid: s('u1'), displayName: s('jeremiah   gordon'), totalValue: { doubleValue: 100523.45 },
    tradeCount: n(7), updatedAt: ts('2026-10-01T12:00:00.123456Z'),
  },
  'public_stats/u2': { uid: s('u2'), displayName: s('Malik'), tradeCount: n(0) },
  'activity/a1': { uid: s('u1'), displayName: s('Jeremiah Gordon'), symbol: s('AAPL'), createdAt: ts('2026-10-02T09:30:00Z') },
  'forum_posts/f1': { authorUid: s('u1'), authorName: s('student.one@example.com'), body: s('Hello'), likes: n(3), pinned: { booleanValue: false } },
  'classrooms/c1': {
    name: s('Period 3'), code: s('K7MPQ'), teacherIds: arr(s('t1')), memberIds: arr(s('t1'), s('u1'), s('u2')),
    members: arr(
      map({ id: s('t1'), name: s('Mr. Gordon'), email: s('teacher@example.com'), role: s('teacher'), joinedAt: ts('2026-09-01T08:00:00Z') }),
      map({ id: s('u1'), name: s('Jeremiah Gordon'), email: s('j.gordon@example.com'), role: s('student'), joinedAt: ts('2026-09-02T08:00:00Z') }),
      map({ id: s('u2'), name: s('Malik'), role: s('student'), joinedAt: ts('2026-09-03T08:00:00Z') }),
    ),
    assignments: arr(map({ id: s('as1'), title: s('Read'), assignedBy: s('Mr. Gordon'), points: n(10), completedBy: arr(s('u1')), dueDate: s('2026-10-09') })),
    announcements: arr(map({ id: s('an1'), text: s('Welcome'), postedBy: s('Mr. Gordon'), createdAt: ts('2026-09-01T09:00:00Z') })),
    createdAt: ts('2026-09-01T07:00:00Z'),
  },
};

// What each doc must hold afterwards: the seed with only the checklist fields changed.
function expectedAfter(): Record<string, Raw> {
  const e = structuredClone(SEED);
  e['public_stats/u1'].displayName = s('Jeremiah G.');
  e['activity/a1'].displayName = s('Jeremiah G.');
  e['forum_posts/f1'].authorName = s('Student O.');
  const c = e['classrooms/c1'];
  const [teacher, student] = c.members.arrayValue.values;
  teacher.mapValue.fields.name = s('Mr. G.');
  delete teacher.mapValue.fields.email;
  student.mapValue.fields.name = s('Jeremiah G.');
  delete student.mapValue.fields.email;
  c.assignments.arrayValue.values[0].mapValue.fields.assignedBy = s('Mr. G.');
  c.announcements.arrayValue.values[0].mapValue.fields.postedBy = s('Mr. G.');
  return e;
}

// Strings from the seed that must never appear in the script's output.
const PERSONAL = ['jeremiah', 'Jeremiah', 'Gordon', 'gordon', 'example.com', 'student.one', 'Malik'];

async function rest(docPath: string, init: RequestInit = {}) {
  const res = await fetch(`${DOCS_URL}/${docPath}`, { ...init, headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' } });
  return { status: res.status, body: await res.json() };
}

async function seed(docs: Record<string, Raw>) {
  for (const [docPath, fields] of Object.entries(docs)) {
    const { status } = await rest(docPath, { method: 'PATCH', body: JSON.stringify({ fields }) });
    if (status !== 200) throw new Error(`seed ${docPath}: ${status}`);
  }
}

async function readFields(docPath: string): Promise<Raw> {
  const { status, body } = await rest(docPath);
  if (status !== 200) throw new Error(`read ${docPath}: ${status}`);
  return body.fields;
}

function run(...args: string[]) {
  const res = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: 30_000,
    // Firestore only: --apply doesn't sign in, so no Auth emulator.
    env: { PATH: process.env.PATH, HOME: process.env.HOME, FIREBASE_PROJECT_ID: PROJECT_ID, FIRESTORE_EMULATOR_HOST: HOST },
  });
  return { code: res.status, out: `${res.stdout}${res.stderr}` };
}

let tmp: string;
beforeEach(async () => {
  await clearFirestore();
  await seed(SEED);
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'privacy-apply-'));
});
afterAll(clearFirestore);

describe('privacy checklist --apply (emulator)', () => {
  it('changes exactly the checklist fields, keeps every other value as it was, and ends with "Nothing to change."', async () => {
    const backup = path.join(tmp, 'backup.json');
    const { code, out } = run('--apply', '--yes', '--backup', backup);

    expect(code).toBe(0);
    expect(out).toContain('Dry run');
    expect(out).toMatch(/classrooms\s+1 docs read,\s+1 to change: 4 name\(s\) shortened, 2 email\(s\) deleted/);
    expect(out).toContain('Wrote 4 document(s).');
    expect(out.trim().split('\n')).toContain('Nothing to change.');
    for (const p of PERSONAL) expect(out).not.toContain(p);

    const expected = expectedAfter();
    for (const docPath of Object.keys(SEED)) {
      expect(await readFields(docPath)).toEqual(expected[docPath]);
    }
  }, 60_000);

  it('saves the original values in an owner-only backup before writing, and --revert puts them back exactly', async () => {
    const backup = path.join(tmp, 'backup.json');
    expect(run('--apply', '--yes', '--backup', backup).code).toBe(0);

    expect(fs.statSync(backup).mode & 0o777).toBe(0o600);
    const saved = JSON.parse(fs.readFileSync(backup, 'utf8'));
    expect(saved.project).toBe(PROJECT_ID);
    expect(saved.docs.map((d: Raw) => d.path).sort()).toEqual(['activity/a1', 'classrooms/c1', 'forum_posts/f1', 'public_stats/u1']);
    const classroom = saved.docs.find((d: Raw) => d.path === 'classrooms/c1');
    // Only the top-level fields that change; whole arrays, as they were.
    expect(Object.keys(classroom.before).sort()).toEqual(['announcements', 'assignments', 'members']);
    expect(classroom.before.members).toEqual(SEED['classrooms/c1'].members);
    expect(saved.docs.every((d: Raw) => typeof d.writtenAt === 'string')).toBe(true);

    const { code, out } = run('--revert', backup, '--yes');
    expect(code).toBe(0);
    expect(out).toContain('Restored 4 document(s).');
    for (const docPath of Object.keys(SEED)) {
      expect(await readFields(docPath)).toEqual(SEED[docPath]);
    }
  }, 60_000);

  it('--revert leaves alone a doc that changed after the cleanup', async () => {
    const backup = path.join(tmp, 'backup.json');
    expect(run('--apply', '--yes', '--backup', backup).code).toBe(0);
    // The student's app saves its leaderboard row again.
    await rest('public_stats/u1?updateMask.fieldPaths=tradeCount', { method: 'PATCH', body: JSON.stringify({ fields: { tradeCount: n(8) } }) });

    const { code, out } = run('--revert', backup, '--yes');
    expect(code).toBe(1);
    expect(out).toContain('Restored 3 document(s).');
    expect(out).toContain('public_stats/u1');
    expect((await readFields('public_stats/u1')).displayName).toEqual(s('Jeremiah G.'));
    expect(await readFields('activity/a1')).toEqual(SEED['activity/a1']);
  }, 60_000);

  it('never changes an email found elsewhere: it stays to review by hand, and the final check says so', async () => {
    await seed({ 'challenge_joins/j1': { uid: s('u1'), challengeId: s('w44'), note: s('stray@example.com') } });
    const { code, out } = run('--apply', '--yes', '--backup', path.join(tmp, 'backup.json'));

    expect(code).toBe(1);
    expect(out).toContain('1 other email-looking value(s) are NOT changed');
    expect(out).toContain('1 field(s) still to change');
    expect(out).not.toContain('stray@');
    expect((await readFields('challenge_joins/j1')).note).toEqual(s('stray@example.com'));
    expect((await readFields('public_stats/u1')).displayName).toEqual(s('Jeremiah G.'));
  }, 60_000);

  it('without --yes and no terminal to confirm on, writes nothing and saves no backup', async () => {
    const backup = path.join(tmp, 'backup.json');
    const { code, out } = run('--apply', '--backup', backup);
    expect(code).toBe(1);
    expect(out).toContain('No terminal to confirm on');
    expect(fs.existsSync(backup)).toBe(false);
    for (const docPath of Object.keys(SEED)) {
      expect(await readFields(docPath)).toEqual(SEED[docPath]);
    }
  }, 60_000);

  it('never overwrites an existing backup file', async () => {
    const backup = path.join(tmp, 'backup.json');
    fs.writeFileSync(backup, 'earlier backup');
    const { code } = run('--apply', '--yes', '--backup', backup);
    expect(code).toBe(1);
    expect(fs.readFileSync(backup, 'utf8')).toBe('earlier backup');
    expect(await readFields('public_stats/u1')).toEqual(SEED['public_stats/u1']);
  }, 60_000);
});

describe('planDoc', () => {
  it('rewrites a roster array with only the named fields changed', () => {
    const fields = SEED['classrooms/c1'];
    const plan = planDoc(fields, changesFor('classrooms', fromFields(fields)));
    expect(plan.keys).toEqual(['announcements', 'assignments', 'members']);
    expect(plan.after.members).toEqual(expectedAfter()['classrooms/c1'].members);
  });

  it('leaves REVIEW items out of the write', () => {
    const plan = planDoc({ note: s('x@example.com') }, [{ field: 'note', to: REVIEW }]);
    expect(plan.keys).toEqual([]);
  });

  it('refuses any field that is not a checklist field', () => {
    expect(() => planDoc({ title: s('A') }, [{ field: 'title', to: 'B' }])).toThrow('not a checklist field');
  });
});
