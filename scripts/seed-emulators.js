#!/usr/bin/env node
/**
 * Seeds the LOCAL Firebase emulators with a demo student, a demo admin
 * (who teaches the test classroom) and a test classroom.
 *
 *   npm run emulators        # terminal 1
 *   npm run emulators:seed   # terminal 2, once "All emulators ready"
 *
 * Talks only to the emulators: it refuses to run unless the project id starts
 * with "demo-" and both emulator hosts are on this machine. Uses the
 * emulators' REST APIs with the "Bearer owner" token, which the emulators
 * accept as an admin credential (it bypasses security rules) — no service
 * account, no extra dependencies. Safe to re-run: documents are overwritten
 * and accounts that already exist are left as they are.
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'demo-investiq';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

const PASSWORD = 'password123';
const STUDENT = { uid: 'demo-student', email: 'student@example.com', name: 'Demo Student' };
const ADMIN = { uid: 'demo-admin', email: 'admin@example.com', name: 'Demo Admin' };
const CLASSROOM = { id: 'demo-classroom', code: 'TEST9', name: 'Demo Classroom' };

function assertLocal() {
  if (!PROJECT_ID.startsWith('demo-')) {
    throw new Error(`Refusing to seed: project id "${PROJECT_ID}" must start with "demo-".`);
  }
  for (const host of [AUTH_HOST, FIRESTORE_HOST]) {
    const hostname = new URL(`http://${host}`).hostname;
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(hostname)) {
      throw new Error(`Refusing to seed: emulator host "${host}" is not on this machine.`);
    }
  }
}

async function request(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function createAccount({ uid, email, name }) {
  const url = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`;
  const res = await request(url, 'POST', {
    localId: uid, email, password: PASSWORD, displayName: name, emailVerified: true,
  });
  if (res.ok) return 'created';
  if (/DUPLICATE_LOCAL_ID|EMAIL_EXISTS/.test(res.text)) return 'already exists';
  throw new Error(`Auth emulator: creating ${email} failed (${res.status}): ${res.text}`);
}

// Plain JS value -> Firestore REST "Value".
function toValue(v) {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  switch (typeof v) {
    case 'string': return { stringValue: v };
    case 'boolean': return { booleanValue: v };
    case 'number': return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    case 'object': return { mapValue: { fields: toFields(v) } };
    default: throw new Error(`Unsupported value: ${v}`);
  }
}
function toFields(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
}

async function setDoc(path, data) {
  const url = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await request(url, 'PATCH', { fields: toFields(data) });
  if (!res.ok) throw new Error(`Firestore emulator: writing ${path} failed (${res.status}): ${res.text}`);
}

// Mirrors createNewUser() in src/services/userStore.ts.
function profile({ uid, email, name }, now) {
  return {
    id: uid,
    email,
    displayName: name,
    hasCustomDisplayName: true,
    currentTier: 1,
    lessonsCompleted: [],
    badgesEarned: [],
    riskTolerance: 'moderate',
    experienceLevel: 'beginner',
    primaryGoal: 'education',
    streak: 0,
    lastActiveDate: '',
    longestStreak: 0,
    freezesAvailable: 0,
    totalDaysActive: 0,
    totalLessonsWatched: 0,
    totalTradesExecuted: 0,
    subscription: 'free',
    notificationsEnabled: true,
    themeMode: 'dark',
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  assertLocal();
  const now = new Date().toISOString();

  for (const account of [STUDENT, ADMIN]) {
    console.log(`auth  ${account.email}: ${await createAccount(account)}`);
    await setDoc(`users/${account.uid}`, profile(account, now));
  }

  await setDoc(`admins/${ADMIN.uid}`, { createdAt: now });

  const member = (a, role) => ({ id: a.uid, name: a.name, role, email: a.email, joinedAt: now });
  await setDoc(`classrooms/${CLASSROOM.id}`, {
    id: CLASSROOM.id,
    name: CLASSROOM.name,
    description: 'Seeded by scripts/seed-emulators.js',
    code: CLASSROOM.code,
    teacherIds: [ADMIN.uid],
    memberIds: [ADMIN.uid, STUDENT.uid],
    createdAt: now,
    subject: 'Investing',
    gradeLevel: '10',
    members: [member(ADMIN, 'teacher'), member(STUDENT, 'student')],
    assignments: [],
    announcements: [],
  });
  await setDoc(`classroom_codes/${CLASSROOM.code}`, { classId: CLASSROOM.id, teacherId: ADMIN.uid });

  console.log(`\nSeeded project ${PROJECT_ID}. Sign in with password "${PASSWORD}":`);
  console.log(`  student: ${STUDENT.email}`);
  console.log(`  admin:   ${ADMIN.email} (teacher of "${CLASSROOM.name}", join code ${CLASSROOM.code})`);
}

main().catch(e => {
  console.error(e.message);
  if (e.cause?.code === 'ECONNREFUSED') console.error('Are the emulators running? Start them with: npm run emulators');
  process.exit(1);
});
