#!/usr/bin/env node
/**
 * Lists every stored field that other students can read and that still holds
 * a full name or an email address, with the value it should become. By
 * default it is READ-ONLY: a checklist to apply by hand in the Firebase
 * console. With --apply it makes exactly those changes itself.
 *
 * Since the privacy change the app writes "First name + last initial"
 * ("Jeremiah G.") and no email wherever other students can read; docs saved
 * before it still hold the old values. This script finds them.
 *
 *   FIREBASE_PROJECT_ID=<project-id> FIREBASE_API_KEY=<web-api-key> \
 *     npm run privacy:checklist -- --out ~/privacy-checklist.txt
 *
 * Read-only mode signs in as an existing ADMIN account (a uid with a doc in
 * admins/) via the Identity Toolkit REST API and reads with that account's
 * ID token, so firestore.rules apply as they do in the app. The email and
 * password come from ADMIN_EMAIL / ADMIN_PASSWORD, or are asked for (the
 * password is not echoed); neither is ever printed. It only sends GET requests.
 *
 * --apply (production cleanup):
 *
 *   FIREBASE_PROJECT_ID=<project-id> GOOGLE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
 *     npm run privacy:checklist -- --apply
 *
 *   The rules don't let any app account (admins included) edit other
 *   students' leaderboard rows, rosters, feed or forum posts, so --apply uses
 *   a Google OAuth token of someone with access to the project in the
 *   Firebase console, the same access the console's own editor uses. It:
 *   1. reads everything and prints a dry run: counts only, no names or emails;
 *   2. asks you to type the project id to go ahead;
 *   3. saves a backup of every field it will change (original values, file
 *      mode 600) to --backup <file> (default ~/privacy-backup-<project>-<time>.json);
 *   4. writes exactly the checklist changes: names shortened to "First L."
 *      (displayName, members[n].name, assignments[n].assignedBy,
 *      announcements[n].postedBy, authorName) and members[n].email deleted.
 *      Nothing else changes: before each write it checks that the new doc
 *      differs from the old one in exactly those fields, and each write only
 *      goes through if the doc hasn't changed since it was read;
 *   5. re-runs the read-only check, which must say "Nothing to change."
 *   "REVIEW" items (an email-looking value somewhere else) are never changed
 *   automatically; they stay in the checklist to fix by hand.
 *
 *   --revert <backup-file> puts the backed-up values back (only on docs that
 *   haven't changed since the cleanup).
 *
 * Emulators: set FIRESTORE_EMULATOR_HOST (and, for read-only mode,
 * FIREBASE_AUTH_EMULATOR_HOST too), both on this machine, and a "demo-"
 * project id:
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
 * The checklist and the backup contain real names and email addresses:
 * personal data. Keep them out of the repo and out of chats, and delete them
 * once the cleanup is done and checked.
 */

const fs = require('fs');
const os = require('os');
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
const BACKUP_WARNING = 'The backup holds the original names and emails (personal data): keep it private '
  + 'and delete it once the cleanup is checked.';

const USAGE = `Usage: npm run privacy:checklist -- [--out <file>]
       npm run privacy:checklist -- --apply [--backup <file>]
       npm run privacy:checklist -- --revert <backup-file>

Env: FIREBASE_PROJECT_ID.
     Read-only: FIREBASE_API_KEY (the app's public web API key),
       ADMIN_EMAIL / ADMIN_PASSWORD (else asked for; the password is hidden).
     --apply / --revert: GOOGLE_ACCESS_TOKEN, e.g. "$(gcloud auth print-access-token)"
       of an account with access to the project in the Firebase console.
     Emulators: FIRESTORE_EMULATOR_HOST (+ FIREBASE_AUTH_EMULATOR_HOST for read-only).
--out <file>     read-only: write the checklist to <file> (created private, mode 600)
                 instead of printing it; the totals are still printed.
--apply          make the checklist's changes (dry run and confirmation first).
--backup <file>  where --apply saves the original values (mode 600).
--revert <file>  put the values from a backup back.
--yes            skip the confirmation: emulators only (for tests).`;

function parseArgs(argv) {
  const args = { out: null, apply: false, backup: null, revert: null, yes: false };
  const takesValue = { '--out': 'out', '--backup': 'backup', '--revert': 'revert' };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s);
    if (takesValue[flag]) {
      const value = inline ?? argv[++i];
      if (!value) throw new Error(`${flag} needs a file.\n\n${USAGE}`);
      args[takesValue[flag]] = value;
    } else if (argv[i] === '--apply') args.apply = true;
    else if (argv[i] === '--yes') args.yes = true;
    else if (argv[i] === '--help' || argv[i] === '-h') { console.log(USAGE); process.exit(0); }
    else throw new Error(`Unknown argument "${argv[i]}".\n\n${USAGE}`);
  }
  if (args.apply && args.revert) throw new Error('Use --apply or --revert, not both.');
  if (args.out && (args.apply || args.revert)) throw new Error('--out is for the read-only checklist only.');
  if (args.backup && !args.apply) throw new Error('--backup goes with --apply.');
  if (args.yes && !USE_EMULATORS) throw new Error('--yes only works with the emulators; against a real project you confirm by typing its id.');
  return args;
}

function checkLocalHost(host) {
  const hostname = new URL(`http://${host}`).hostname;
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(hostname)) {
    throw new Error(`Emulator host "${host}" is not on this machine.`);
  }
}

function checkConfig({ writes }) {
  if (!PROJECT_ID) throw new Error(`FIREBASE_PROJECT_ID is not set.\n\n${USAGE}`);
  if (USE_EMULATORS) {
    // Writes go to Firestore only; reading as an admin also needs Auth. Both
    // or neither for that: signing in to the real Auth and reading an
    // emulator (or the reverse) would be confusing at best.
    if (!FIRESTORE_EMULATOR) throw new Error('Set FIRESTORE_EMULATOR_HOST too, or neither emulator host.');
    if (!writes && !AUTH_EMULATOR) {
      throw new Error('Set both FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST, or neither.');
    }
    for (const host of [AUTH_EMULATOR, FIRESTORE_EMULATOR].filter(Boolean)) checkLocalHost(host);
    if (!PROJECT_ID.startsWith('demo-')) throw new Error('With the emulators, use a "demo-" project id.');
  } else {
    if (PROJECT_ID.startsWith('demo-')) throw new Error(`"${PROJECT_ID}" is an emulator project: set the emulator hosts.`);
    if (writes && !process.env.GOOGLE_ACCESS_TOKEN) {
      throw new Error(`GOOGLE_ACCESS_TOKEN is not set (e.g. GOOGLE_ACCESS_TOKEN="$(gcloud auth print-access-token)").\n\n${USAGE}`);
    }
    if (!writes && !API_KEY) throw new Error(`FIREBASE_API_KEY is not set.\n\n${USAGE}`);
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

/** Request headers for --apply / --revert: a console-level OAuth token ("owner" on the emulator). */
function ownerHeaders() {
  if (USE_EMULATORS) return { Authorization: 'Bearer owner' };
  // x-goog-user-project bills the quota to this project (needed with user
  // credentials from gcloud).
  return { Authorization: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`, 'x-goog-user-project': PROJECT_ID };
}

// ── Firestore REST ──────────────────────────────────────────────────────────

function docsUrl() {
  const host = USE_EMULATORS ? `http://${FIRESTORE_EMULATOR}` : 'https://firestore.googleapis.com';
  return `${host}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
}

async function request(url, headers, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...headers, ...init.headers } });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : {} };
}

async function assertAdmin(uid, headers) {
  const { status } = await request(`${docsUrl()}/admins/${uid}`, headers);
  if (status === 200) return;
  if (status === 404) throw new Error('This account is not an admin (no admins/{uid} doc): it could not read the classrooms.');
  throw new Error(`Checking admin rights failed (${status}).`);
}

/**
 * Every doc in a collection, or null when the rules don't let this account
 * list it. Each doc keeps its raw REST fields and updateTime (for --apply).
 */
async function listCollection(name, headers) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${docsUrl()}/${name}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const { status, body } = await request(url, headers);
    if (status === 403) return null;
    if (status === 401) throw new Error(`Reading ${name} was refused (401): the token is missing or expired.`);
    if (status !== 200) throw new Error(`Reading ${name} failed (${status}): ${body.error?.message ?? ''}`);
    for (const d of body.documents ?? []) {
      const fields = d.fields ?? {};
      docs.push({ id: d.name.split('/').pop(), fields, updateTime: d.updateTime, data: fromFields(fields) });
    }
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return docs.sort((a, b) => a.id.localeCompare(b.id));
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

/** Reads every collection and works out its changes (no output). */
async function scan(headers) {
  const results = [];
  const unreadable = [];
  for (const collection of COLLECTIONS) {
    const docs = await listCollection(collection, headers);
    if (docs === null) { unreadable.push(collection); continue; }
    results.push({
      collection,
      docs: docs.map(doc => ({ ...doc, changes: changesFor(collection, doc.data) })),
    });
  }
  return { results, unreadable };
}

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
  '  - Or let the script make these changes: npm run privacy:checklist -- --apply',
];

/** Per-collection totals; never names or emails. */
function summarize({ results, unreadable }, target) {
  const totals = results.map(({ collection, docs }) => {
    const toFix = docs.filter(d => d.changes.length);
    const fields = toFix.reduce((n, d) => n + d.changes.length, 0);
    return `  ${collection.padEnd(16)} ${String(docs.length).padStart(5)} docs read, `
      + `${String(toFix.length).padStart(4)} to change, ${String(fields).padStart(4)} field(s)`;
  });
  return [
    `Totals (${target}):`,
    ...totals,
    ...(unreadable.length ? [`  NOT readable by this account (rules): ${unreadable.join(', ')}`] : []),
  ];
}

function countChanges(found) {
  return found.results.reduce((n, r) => n + r.docs.reduce((m, d) => m + d.changes.length, 0), 0);
}

async function checklist(args, target) {
  const { uid, idToken } = await signIn(await credentials());
  const headers = { Authorization: `Bearer ${idToken}` };
  await assertAdmin(uid, headers);
  console.error(`Signed in as an admin. Reading ${target} (read-only)…`);

  const found = await scan(headers);
  const lines = found.results.flatMap(({ collection, docs }) =>
    docs.flatMap(d => d.changes.map(c => formatLine(collection, d.id, c))));
  const summary = summarize(found, target);
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

// ── --apply: the same changes, written ──────────────────────────────────────

// The only fields --apply may write: [array, field inside each element], or
// [top-level field]. Anything else is a REVIEW item, left for a person.
const WRITABLE = new Set(['displayName', 'authorName', 'members.name', 'members.email',
  'assignments.assignedBy', 'announcements.postedBy']);
const FIELD_RE = /^([A-Za-z]\w*)(?:\[(\d+)\]\.([A-Za-z]\w*))?$/;

/**
 * The write for one doc: the changed top-level fields with their new raw
 * values (each array is rewritten whole, as the REST API can't address one
 * element, with every other element and field kept byte for byte).
 */
function planDoc(fields, changes) {
  const updated = structuredClone(fields);
  const top = new Set();
  for (const c of changes) {
    if (c.to === REVIEW) continue;
    const m = FIELD_RE.exec(c.field);
    if (!m) throw new Error(`Unexpected field path ${c.field}`);
    const [, key, index, sub] = m;
    if (!WRITABLE.has(sub ? `${key}.${sub}` : key)) throw new Error(`Refusing to write ${c.field}: not a checklist field`);
    top.add(key);
    if (!sub) {
      updated[key] = { stringValue: c.to };
      continue;
    }
    const element = updated[key]?.arrayValue?.values?.[Number(index)]?.mapValue?.fields;
    if (!element || !(sub in element)) throw new Error(`Field ${c.field} not found`);
    if (c.to === DELETE) delete element[sub];
    else element[sub] = { stringValue: c.to };
  }
  const expected = changes.filter(c => c.to !== REVIEW).map(c => c.field).sort();
  const actual = rawDiff(fields, updated).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Self-check failed: the write would change ${actual.join(', ')} instead of ${expected.join(', ')}`);
  }
  const keys = [...top].sort();
  return { keys, before: Object.fromEntries(keys.map(k => [k, fields[k]])), after: Object.fromEntries(keys.map(k => [k, updated[k]])) };
}

/** Paths (in checklist notation) where two raw REST field maps differ. */
function rawDiff(a, b, at = '') {
  const paths = [];
  for (const key of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
    paths.push(...valueDiff(a?.[key], b?.[key], at ? `${at}.${key}` : key));
  }
  return paths;
}

function valueDiff(x, y, at) {
  if (x?.mapValue && y?.mapValue) return rawDiff(x.mapValue.fields, y.mapValue.fields, at);
  if (x?.arrayValue && y?.arrayValue) {
    const xs = x.arrayValue.values ?? [];
    const ys = y.arrayValue.values ?? [];
    if (xs.length !== ys.length) return [at];
    return xs.flatMap((v, i) => valueDiff(v, ys[i], `${at}[${i}]`));
  }
  return JSON.stringify(x) === JSON.stringify(y) ? [] : [at];
}

/**
 * Writes only `fields`' keys, and only if the doc is still at `updateTime`.
 * Through documents:commit: the emulator ignores a currentDocument
 * precondition given as a PATCH query parameter.
 */
async function patchDoc(docPath, fields, updateTime) {
  const name = `projects/${PROJECT_ID}/databases/(default)/documents/${docPath}`;
  const write = { update: { name, fields }, updateMask: { fieldPaths: Object.keys(fields) }, currentDocument: { updateTime } };
  const { status, body } = await request(`${docsUrl()}:commit`, { ...ownerHeaders(), 'Content-Type': 'application/json' }, {
    method: 'POST',
    body: JSON.stringify({ writes: [write] }),
  });
  if (status === 200) return { ok: true, updateTime: body.writeResults[0].updateTime };
  // FAILED_PRECONDITION: someone saved the doc after it was read.
  if (status === 400 && body.error?.status === 'FAILED_PRECONDITION') return { ok: false, changed: true };
  throw new Error(`Writing ${docPath.split('/')[0]} failed (${status}): ${body.error?.status ?? ''}`);
}

function expandHome(file) {
  return path.resolve(file.replace(/^~(?=$|\/)/, os.homedir()));
}

function writePrivate(file, data, { create }) {
  // wx: never overwrite an earlier backup. 600: owner read/write only.
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600, flag: create ? 'wx' : 'w' });
  fs.chmodSync(file, 0o600);
}

async function confirm(args, question) {
  if (args.yes) return true; // emulators only (parseArgs)
  if (!process.stdin.isTTY) throw new Error('No terminal to confirm on. Run it in a terminal.');
  const answer = await ask(`${question}\nType the project id (${PROJECT_ID}) to go ahead, anything else to stop: `);
  return answer.trim() === PROJECT_ID;
}

async function applyChanges(args, target) {
  const headers = ownerHeaders();
  console.error(`Reading ${target}…`);
  const found = await scan(headers);
  if (found.unreadable.length) throw new Error(`Could not read ${found.unreadable.join(', ')} with this token.`);

  // Plan every write first; one failed self-check stops everything before
  // anything is written.
  const plans = [];
  const dry = [];
  let review = 0;
  for (const { collection, docs } of found.results) {
    let names = 0;
    let emails = 0;
    let docCount = 0;
    for (const doc of docs) {
      review += doc.changes.filter(c => c.to === REVIEW).length;
      const writes = doc.changes.filter(c => c.to !== REVIEW);
      if (!writes.length) continue;
      docCount++;
      emails += writes.filter(c => c.to === DELETE).length;
      names += writes.filter(c => c.to !== DELETE).length;
      plans.push({ collection, id: doc.id, updateTime: doc.updateTime, ...planDoc(doc.fields, doc.changes) });
    }
    dry.push(`  ${collection.padEnd(16)} ${String(docs.length).padStart(5)} docs read, `
      + `${String(docCount).padStart(4)} to change: ${names} name(s) shortened, ${emails} email(s) deleted`);
  }

  console.log(`Dry run (${target}), counts only:`);
  console.log(dry.join('\n'));
  if (review) console.log(`  ${review} other email-looking value(s) are NOT changed: fix them by hand (see the read-only checklist).`);
  if (!plans.length) {
    console.log(review ? '\nNothing for --apply to change.' : '\nNothing to change.');
    return review ? 1 : 0;
  }
  if (!(await confirm(args, `\nThis writes ${plans.length} document(s) in ${target}.`))) {
    console.log('Stopped. Nothing was written.');
    return 1;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = expandHome(args.backup ?? `~/privacy-backup-${PROJECT_ID}-${stamp}.json`);
  const backup = {
    project: PROJECT_ID,
    createdAt: new Date().toISOString(),
    note: BACKUP_WARNING,
    docs: plans.map(p => ({ path: `${p.collection}/${p.id}`, before: p.before, readAt: p.updateTime, writtenAt: null })),
  };
  writePrivate(backupFile, backup, { create: true });
  console.log(`\nBackup of the original values: ${backupFile} (mode 600)`);

  let written = 0;
  let skipped = 0;
  for (const [i, p] of plans.entries()) {
    const result = await patchDoc(`${p.collection}/${p.id}`, p.after, p.updateTime);
    if (result.ok) {
      written++;
      backup.docs[i].writtenAt = result.updateTime;
      writePrivate(backupFile, backup, { create: false });
    } else {
      skipped++;
    }
  }
  console.log(`Wrote ${written} document(s).`);
  if (skipped) console.log(`${skipped} document(s) changed since they were read and were left alone: run --apply again.`);

  console.log('\nChecking again (read-only)…');
  const after = await scan(headers);
  const remaining = countChanges(after);
  console.log(summarize(after, target).join('\n'));
  console.log(remaining ? `\n${remaining} field(s) still to change: run the read-only checklist to see them.` : '\nNothing to change.');
  console.error(`\n${BACKUP_WARNING}`);
  return remaining ? 1 : 0;
}

async function revertChanges(args, target) {
  const backupFile = expandHome(args.revert);
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  if (backup.project !== PROJECT_ID) throw new Error(`This backup is for project ${backup.project}, not ${PROJECT_ID}.`);
  const docs = backup.docs.filter(d => d.writtenAt);
  console.log(`Backup from ${backup.createdAt}: ${docs.length} document(s) to put back in ${target}.`);
  if (!docs.length) return 0;
  if (!(await confirm(args, `\nThis writes ${docs.length} document(s) back to their values before the cleanup.`))) {
    console.log('Stopped. Nothing was written.');
    return 1;
  }
  let restored = 0;
  const changed = [];
  for (const d of docs) {
    // Only where nobody saved the doc after the cleanup wrote it.
    const result = await patchDoc(d.path, d.before, d.writtenAt);
    if (result.ok) restored++;
    else changed.push(d.path);
  }
  console.log(`Restored ${restored} document(s).`);
  if (changed.length) {
    console.log(`${changed.length} document(s) changed after the cleanup and were left alone:\n  ${changed.join('\n  ')}`);
  }
  return changed.length ? 1 : 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const writes = args.apply || !!args.revert;
  checkConfig({ writes });
  const target = USE_EMULATORS ? `the emulators, project ${PROJECT_ID}` : `project ${PROJECT_ID}`;
  if (args.apply) return applyChanges(args, target);
  if (args.revert) return revertChanges(args, target);
  await checklist(args, target);
  return 0;
}

if (require.main === module) {
  // exitCode, not exit(): exit() can cut off output still going to a pipe.
  main().then(code => { process.exitCode = code; }).catch(e => {
    console.error(e.message);
    if (e.cause?.code === 'ECONNREFUSED') console.error('Nothing answered: are the emulators running (npm run emulators)?');
    process.exitCode = 1;
  });
}

module.exports = { changesFor, planDoc, rawDiff, DELETE, REVIEW };
