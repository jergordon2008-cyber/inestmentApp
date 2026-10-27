#!/usr/bin/env node
/**
 * READ-ONLY. Lists every stored field that other students can read and that
 * still holds a full name or an email address, with the value it should
 * become — a checklist to apply by hand in the Firebase console.
 *
 * Since the privacy change the app writes "First name + last initial"
 * ("Jeremiah G.") and no email wherever other students can read; docs saved
 * before it still hold the old values. This script finds them. It never
 * writes: it only sends GET requests to Firestore.
 *
 *   FIREBASE_PROJECT_ID=<project-id> FIREBASE_API_KEY=<web-api-key> \
 *     npm run privacy:checklist -- --out ~/privacy-checklist.txt
 *
 * Signs in as an existing ADMIN account (a uid with a doc in admins/) via
 * the Identity Toolkit REST API and reads with that account's ID token, so
 * firestore.rules apply as they do in the app. The email and password come
 * from ADMIN_EMAIL / ADMIN_PASSWORD, or are asked for (the password is not
 * echoed); neither is ever printed.
 *
 * Emulators: set FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST
 * (both, on this machine) and a "demo-" project id:
 *
 *   FIREBASE_PROJECT_ID=demo-investiq FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 ADMIN_EMAIL=admin@example.com \
 *   ADMIN_PASSWORD=password123 npm run privacy:checklist
 *
 * What it reads (everything firestore.rules lets other students read):
 *   public_stats/{uid}   displayName                   — leaderboard, class board
 *   activity/{id}        displayName                   — trade activity feed
 *   classrooms/{id}      members[].name, members[].email,
 *                        assignments[].assignedBy, announcements[].postedBy
 *                                                      — readable by every class member
 *   forum_posts/{id}     authorName                    — community forum
 *   challenge_joins/{id} (no name fields; checked for stray emails only)
 * and in all of them, any other string that looks like an email address.
 * Not read: classroom_codes (holds only classId/teacherId, and the rules deny
 * listing it to everyone, admins included), users/portfolios/journals and
 * analytics_events (private: owner/admin only, other students can't read them).
 *
 * The output contains real names and email addresses: personal data. Keep it
 * out of the repo and out of chats, and delete it once the edits are done.
 */

const fs = require('fs');
const path = require('path');
const { fromFields } = require('./firestore-rest-values');
const { publicDisplayName } = require('./public-name');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const API_KEY = process.env.FIREBASE_API_KEY;
const AUTH_EMULATOR = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const FIRESTORE_EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;
const USE_EMULATORS = !!(AUTH_EMULATOR || FIRESTORE_EMULATOR);

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PII_WARNING = 'WARNING: this checklist contains real names and email addresses (personal data). '
  + 'Do not commit it, paste it into chats or share it; delete it once the edits are done.';

const USAGE = `Usage: npm run privacy:checklist -- [--out <file>]

Env: FIREBASE_PROJECT_ID, FIREBASE_API_KEY (the app's public web API key),
     ADMIN_EMAIL / ADMIN_PASSWORD (else asked for; the password is hidden).
     For the emulators: FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST.
--out <file>  write the checklist to <file> (created private, mode 600)
              instead of printing it; the totals are still printed.`;

function parseArgs(argv) {
  const args = { out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) args.out = argv[++i];
    else if (argv[i].startsWith('--out=')) args.out = argv[i].slice('--out='.length);
    else if (argv[i] === '--help' || argv[i] === '-h') { console.log(USAGE); process.exit(0); }
    else throw new Error(`Unknown argument "${argv[i]}".\n\n${USAGE}`);
  }
  return args;
}

function checkConfig() {
  if (!PROJECT_ID) throw new Error(`FIREBASE_PROJECT_ID is not set.\n\n${USAGE}`);
  if (USE_EMULATORS) {
    // Both or neither: signing in to the real Auth and reading an emulator
    // (or the reverse) would be confusing at best.
    if (!AUTH_EMULATOR || !FIRESTORE_EMULATOR) {
      throw new Error('Set both FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST, or neither.');
    }
    for (const host of [AUTH_EMULATOR, FIRESTORE_EMULATOR]) {
      const hostname = new URL(`http://${host}`).hostname;
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(hostname)) {
        throw new Error(`Emulator host "${host}" is not on this machine.`);
      }
    }
    if (!PROJECT_ID.startsWith('demo-')) throw new Error('With the emulators, use a "demo-" project id.');
  } else {
    if (PROJECT_ID.startsWith('demo-')) throw new Error(`"${PROJECT_ID}" is an emulator project: set the emulator hosts.`);
    if (!API_KEY) throw new Error(`FIREBASE_API_KEY is not set.\n\n${USAGE}`);
  }
}

// ── Credentials ─────────────────────────────────────────────────────────────

/** Reads one line from the terminal; with hidden, typed characters aren't shown. */
function ask(question, { hidden = false } = {}) {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    return Promise.reject(new Error('No terminal to ask on: set ADMIN_EMAIL and ADMIN_PASSWORD.'));
  }
  return new Promise(resolve => {
    process.stderr.write(question);
    let value = '';
    const finish = () => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stderr.write('\n');
      resolve(value);
    };
    const onData = chunk => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') return finish();
        if (ch === '\u0003') { stdin.setRawMode(false); process.stderr.write('\n'); process.exit(130); }
        if (ch === '\u007f' || ch === '\b') {
          if (value) { value = value.slice(0, -1); if (!hidden) process.stderr.write('\b \b'); }
          continue;
        }
        value += ch;
        if (!hidden) process.stderr.write(ch);
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
    stdin.resume();
  });
}

async function credentials() {
  const email = process.env.ADMIN_EMAIL || (await ask('Admin email: '));
  const password = process.env.ADMIN_PASSWORD || (await ask('Admin password (hidden): ', { hidden: true }));
  if (!email || !password) throw new Error('An admin email and password are needed.');
  return { email: email.trim(), password };
}

async function signIn({ email, password }) {
  const base = USE_EMULATORS
    ? `http://${AUTH_EMULATOR}/identitytoolkit.googleapis.com`
    : 'https://identitytoolkit.googleapis.com';
  const res = await fetch(`${base}/v1/accounts:signInWithPassword?key=${encodeURIComponent(API_KEY || 'demo-api-key')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await res.json().catch(() => ({}));
  // Only the API's error code (e.g. INVALID_LOGIN_CREDENTIALS), never the request.
  if (!res.ok) throw new Error(`Sign-in failed: ${body.error?.message ?? res.status}`);
  return { uid: body.localId, idToken: body.idToken };
}

// ── Firestore reads (GET only) ──────────────────────────────────────────────

function docsUrl() {
  const host = USE_EMULATORS ? `http://${FIRESTORE_EMULATOR}` : 'https://firestore.googleapis.com';
  return `${host}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
}

async function get(url, idToken) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
}

async function assertAdmin(uid, idToken) {
  const { status } = await get(`${docsUrl()}/admins/${uid}`, idToken);
  if (status === 200) return;
  if (status === 404) throw new Error('This account is not an admin (no admins/{uid} doc): it could not read the classrooms.');
  throw new Error(`Checking admin rights failed (${status}).`);
}

/** Every doc in a collection, or null when the rules don't let this account list it. */
async function listCollection(name, idToken) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${docsUrl()}/${name}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const { status, body } = await get(url, idToken);
    if (status === 403) return null;
    if (status !== 200) throw new Error(`Reading ${name} failed (${status}): ${body.error?.message ?? ''}`);
    for (const d of body.documents ?? []) docs.push({ id: d.name.split('/').pop(), data: fromFields(d.fields) });
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return docs;
}

// ── What needs to change ────────────────────────────────────────────────────

/** The public form of a stored name, or null when it is already right. */
function fixName(value) {
  if (typeof value !== 'string') return null;
  // An email stored as a name: use the part before "@" (as the app's
  // email-prefix fallback does), never the domain.
  const fixed = publicDisplayName(value.includes('@') ? value.split('@')[0] : value);
  return fixed === value ? null : fixed;
}

/** Strings anywhere under `value` that look like an email, as [fieldPath, value]. */
function findEmails(value, at) {
  if (typeof value === 'string') return EMAIL_RE.test(value) ? [[at, value]] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => findEmails(v, `${at}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => findEmails(v, at ? `${at}.${k}` : k));
  }
  return [];
}

// Each entry: { field, note, from, to } where to is a string or DELETE / REVIEW.
const DELETE = Symbol('DELETE');
const REVIEW = Symbol('REVIEW');

function nameChange(field, value, note) {
  const to = fixName(value);
  return to === null ? [] : [{ field, note, from: value, to }];
}

function changesFor(collection, data) {
  const out = [];
  if (collection === 'public_stats' || collection === 'activity') {
    out.push(...nameChange('displayName', data.displayName));
  } else if (collection === 'forum_posts') {
    out.push(...nameChange('authorName', data.authorName));
  } else if (collection === 'classrooms') {
    (Array.isArray(data.members) ? data.members : []).forEach((m, i) => {
      const note = `member id: ${m?.id ?? '?'}`;
      out.push(...nameChange(`members[${i}].name`, m?.name, note));
      if (m && 'email' in m) out.push({ field: `members[${i}].email`, note, from: m.email, to: DELETE });
    });
    (Array.isArray(data.assignments) ? data.assignments : []).forEach((a, i) => {
      out.push(...nameChange(`assignments[${i}].assignedBy`, a?.assignedBy, `assignment id: ${a?.id ?? '?'}`));
    });
    (Array.isArray(data.announcements) ? data.announcements : []).forEach((a, i) => {
      out.push(...nameChange(`announcements[${i}].postedBy`, a?.postedBy, `announcement id: ${a?.id ?? '?'}`));
    });
  }
  // Any other email-looking value (older app versions, hand edits).
  const handled = new Set(out.map(c => c.field));
  for (const [field, value] of findEmails(data, '')) {
    if (!handled.has(field)) out.push({ field, note: 'looks like an email address', from: value, to: REVIEW });
  }
  return out;
}

const COLLECTIONS = ['public_stats', 'activity', 'classrooms', 'forum_posts', 'challenge_joins'];

function formatLine(collection, id, c) {
  const to = c.to === DELETE ? 'DELETE field'
    : c.to === REVIEW ? 'REVIEW (remove the email, or delete the field)'
      : JSON.stringify(c.to);
  const note = c.note ? `   [${c.note}]` : '';
  return `${collection} / ${id} / ${c.field} : ${JSON.stringify(c.from)} → ${to}${note}`;
}

const HOW_TO = [
  'How to apply (Firebase console → Firestore Database → Data):',
  '  - Open the collection, then the document id shown.',
  '  - Plain field: click its value, type the new value, Update.',
  '  - members[2].name and the like: expand the array, then element 2. Check its id',
  '    matches the [member id] shown (if not, use the element that has that id),',
  '    then edit the field inside it, or use the bin icon for "DELETE field".',
  '  - Only edit or delete the field named: never delete a whole array element,',
  '    or the indexes of the elements after it change.',
  '  - public_stats is also rewritten by each student\'s app on its next save.',
  '  - Re-run this script afterwards: it should report nothing to change.',
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  checkConfig();
  const target = USE_EMULATORS ? `the emulators, project ${PROJECT_ID}` : `project ${PROJECT_ID}`;

  const { uid, idToken } = await signIn(await credentials());
  await assertAdmin(uid, idToken);
  console.error(`Signed in as an admin. Reading ${target} (read-only)…`);

  const lines = [];
  const totals = [];
  const unreadable = [];
  for (const collection of COLLECTIONS) {
    const docs = await listCollection(collection, idToken);
    if (docs === null) { unreadable.push(collection); continue; }
    let docsToFix = 0;
    let fields = 0;
    for (const { id, data } of docs.sort((a, b) => a.id.localeCompare(b.id))) {
      const changes = changesFor(collection, data);
      if (changes.length === 0) continue;
      docsToFix++;
      fields += changes.length;
      for (const c of changes) lines.push(formatLine(collection, id, c));
    }
    totals.push(`  ${collection.padEnd(16)} ${String(docs.length).padStart(5)} docs read, `
      + `${String(docsToFix).padStart(4)} to change, ${String(fields).padStart(4)} field(s)`);
  }

  const summary = [
    `Totals (${target}):`,
    ...totals,
    ...(unreadable.length ? [`  NOT readable by this admin (rules): ${unreadable.join(', ')}`] : []),
  ];
  const report = [
    PII_WARNING,
    `Generated ${new Date().toISOString()} from ${target}.`,
    '',
    ...(lines.length ? [...HOW_TO, '', `Changes (${lines.length}), one per field:`, ...lines] : ['Nothing to change.']),
    '',
    ...summary,
    '',
  ].join('\n');

  if (args.out) {
    const file = path.resolve(args.out.replace(/^~(?=$|\/)/, process.env.HOME ?? '~'));
    fs.writeFileSync(file, report, { mode: 0o600 });
    console.log(`Wrote ${lines.length} line(s) to ${file}\n`);
    console.log(summary.join('\n'));
    console.error(`\n${PII_WARNING}`);
  } else {
    process.stdout.write(report);
  }
}

main().catch(e => {
  console.error(e.message);
  if (e.cause?.code === 'ECONNREFUSED') console.error('Nothing answered: are the emulators running (npm run emulators)?');
  process.exit(1);
});
