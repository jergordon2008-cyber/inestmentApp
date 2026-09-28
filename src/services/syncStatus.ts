/**
 * Cloud save status for the signed-in account's documents.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every save in App.tsx used to end in `.catch(() => {})`. A write Firestore
 * refused, or one that never left an offline device, looked exactly like one
 * that landed — which is how trades went missing from the cloud for weeks
 * without anyone knowing. This module is the one place those saves go through.
 *
 * WHAT IT DOES
 *   • Tracks each document as saving, saved or failed.
 *   • Retries network failures after 2s, 8s, then 30s. Each retry calls the
 *     caller's write function again, and that function reads the store when
 *     it runs — so a retry sends the latest state, never the snapshot that
 *     failed.
 *   • Never retries a permanent failure (invalid data, permission denied):
 *     sending the same thing again can't succeed, so it surfaces at once.
 *   • Persists an "unsaved changes" flag for the portfolio and journal from
 *     the moment a save is requested until Firestore acknowledges it, so a
 *     failure (or the app closing mid-write) survives a restart and is
 *     retried then.
 *   • Logs every failure with console.error.
 *
 * OFFLINE WRITES
 * Firestore doesn't reject a write while offline — it holds it and the promise
 * stays pending until the connection returns. So a write that hasn't been
 * acknowledged within WRITE_TIMEOUT_MS counts as a network failure (banner,
 * retries), and if the held write is acknowledged later it still marks the
 * document saved.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type SyncDoc = 'profile' | 'portfolio' | 'journal' | 'publicStats';
export type SyncState = 'idle' | 'saving' | 'saved' | 'failed';

/**
 * Documents holding the student's own work. public_stats is derived from
 * these and rewritten every five minutes, so its failures are logged and
 * retried but don't tell the student their work is unsaved.
 */
export const USER_DATA_DOCS: SyncDoc[] = ['profile', 'portfolio', 'journal'];

/** The documents whose unsaved state is persisted across restarts. */
export type FlaggedDoc = 'portfolio' | 'journal';
const FLAGGED_DOCS: readonly SyncDoc[] = ['portfolio', 'journal'];

export const RETRY_DELAYS_MS = [2_000, 8_000, 30_000] as const;
export const WRITE_TIMEOUT_MS = 15_000;
export const UNSAVED_FLAGS_KEY = 'investapp-unsaved-sync';

export interface DocSyncStatus {
  /** 'failed' holds through retries; only an acknowledged write clears it. */
  state: SyncState;
  /** A write is on its way right now (first attempt or a retry). */
  inFlight: boolean;
  /** The last failure can't be fixed by retrying. */
  permanent: boolean;
  lastError: string | null;
}

export interface SyncStatusState {
  /** The account these statuses belong to. */
  uid: string | null;
  docs: Record<SyncDoc, DocSyncStatus>;
  /** Mirror of the persisted flags: document → the uid it has unsaved changes for. */
  unsaved: Partial<Record<FlaggedDoc, string>>;
}

const IDLE: DocSyncStatus = { state: 'idle', inFlight: false, permanent: false, lastError: null };
const idleDocs = (): Record<SyncDoc, DocSyncStatus> =>
  ({ profile: { ...IDLE }, portfolio: { ...IDLE }, journal: { ...IDLE }, publicStats: { ...IDLE } });

export const useSyncStatusStore = create<SyncStatusState>(() => ({
  uid: null,
  docs: idleDocs(),
  unsaved: {},
}));

function patchDoc(doc: SyncDoc, patch: Partial<DocSyncStatus>) {
  useSyncStatusStore.setState(s => ({ docs: { ...s.docs, [doc]: { ...s.docs[doc], ...patch } } }));
}

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

/**
 * Firestore codes a retry can fix. Everything else — invalid-argument,
 * permission-denied, unauthenticated, failed-precondition, and errors with no
 * code at all (a bug in the write itself) — is treated as permanent.
 */
const TRANSIENT_CODES = new Set([
  'unavailable', 'deadline-exceeded', 'resource-exhausted', 'aborted', 'internal', 'cancelled', 'unknown',
]);

export class SyncTimeoutError extends Error {
  code = 'deadline-exceeded';
  constructor() { super(`not acknowledged within ${WRITE_TIMEOUT_MS / 1000}s — likely offline`); }
}

export function isTransientError(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' && TRANSIENT_CODES.has(code.replace(/^firestore\//, ''));
}

function describe(e: unknown): string {
  const code = (e as { code?: unknown } | null)?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return typeof code === 'string' ? `${code}: ${msg}` : msg;
}

// ============================================================================
// PERSISTED "UNSAVED CHANGES" FLAGS
// ============================================================================

let flagsLoad: Promise<void> | null = null;
/** Keys changed this session; a late load mustn't resurrect or overwrite them. */
const touchedFlags = new Set<FlaggedDoc>();
let flagWrites: Promise<void> = Promise.resolve();

/** Loads the flags left by the previous session. Safe to call repeatedly. */
export function loadUnsavedFlags(): Promise<void> {
  if (!flagsLoad) {
    flagsLoad = AsyncStorage.getItem(UNSAVED_FLAGS_KEY)
      .then(raw => {
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== 'object') return;
        const loaded: Partial<Record<FlaggedDoc, string>> = {};
        for (const d of FLAGGED_DOCS as FlaggedDoc[]) {
          if (typeof parsed[d] === 'string' && !touchedFlags.has(d)) loaded[d] = parsed[d];
        }
        useSyncStatusStore.setState(s => ({ unsaved: { ...loaded, ...s.unsaved } }));
      })
      .catch(e => console.error('[sync] could not read the unsaved-changes flags', e));
  }
  return flagsLoad;
}

function setFlag(doc: SyncDoc, uid: string | null) {
  if (!FLAGGED_DOCS.includes(doc)) return;
  const d = doc as FlaggedDoc;
  const current = useSyncStatusStore.getState().unsaved[d];
  if ((uid ?? undefined) === current) return;
  touchedFlags.add(d);
  useSyncStatusStore.setState(s => {
    const next = { ...s.unsaved };
    if (uid) next[d] = uid; else delete next[d];
    return { unsaved: next };
  });
  persistFlags();
}

/** Serialised, and after the initial load, so a write never clobbers flags it hasn't seen. */
function persistFlags() {
  flagWrites = flagWrites
    .then(() => loadUnsavedFlags())
    .then(() => AsyncStorage.setItem(UNSAVED_FLAGS_KEY, JSON.stringify(useSyncStatusStore.getState().unsaved)))
    .catch(e => console.error('[sync] could not persist the unsaved-changes flags', e));
}

/** Resolves once every flag change so far has reached storage. */
export function flushUnsavedFlags(): Promise<void> {
  return flagWrites;
}

// ============================================================================
// SAVING
// ============================================================================

interface Job {
  doc: SyncDoc;
  uid: string;
  /** Reads the store when called — so every attempt sends the latest state. */
  write: () => Promise<void>;
  /** Bumped per request; only an attempt covering the latest one may mark it saved. */
  version: number;
  running: boolean;
  rerun: boolean;
  retriesUsed: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const jobs: Partial<Record<SyncDoc, Job>> = {};

/** Sets the account statuses belong to. Resets them if it's a different one. */
export function setSyncAccount(uid: string | null) {
  if (useSyncStatusStore.getState().uid === uid) return;
  cancelJobs();
  useSyncStatusStore.setState({ uid, docs: idleDocs() });
}

/**
 * Saves `doc` for `uid`. `write` must read current state when called (not
 * close over a snapshot) — it is called again for every retry.
 */
export function requestSave(doc: SyncDoc, uid: string, write: () => Promise<void>): void {
  let job = jobs[doc];
  if (job && job.uid !== uid) { if (job.timer) clearTimeout(job.timer); job = undefined; }
  if (!job) {
    job = { doc, uid, write, version: 0, running: false, rerun: false, retriesUsed: 0, timer: null };
    jobs[doc] = job;
  }
  job.write = write;
  job.version += 1;
  job.retriesUsed = 0;
  if (job.timer) { clearTimeout(job.timer); job.timer = null; }
  setFlag(doc, uid);
  attempt(job);
}

/** Retries every failed document now, restarting the backoff. Returns how many. */
export function retryNow(): number {
  let n = 0;
  for (const job of Object.values(jobs)) {
    if (!job || useSyncStatusStore.getState().docs[job.doc].state !== 'failed') continue;
    if (job.timer) { clearTimeout(job.timer); job.timer = null; }
    job.retriesUsed = 0;
    attempt(job);
    n++;
  }
  return n;
}

function attempt(job: Job) {
  if (job.running) { job.rerun = true; return; }
  job.running = true;
  const version = job.version;
  const failedBefore = useSyncStatusStore.getState().docs[job.doc].state === 'failed';
  patchDoc(job.doc, { state: failedBefore ? 'failed' : 'saving', inFlight: true });

  let settled = false;
  const settle = (err: unknown | null) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    job.running = false;
    if (jobs[job.doc] !== job) return; // signed out / switched account meanwhile
    if (err === null) succeed(job, version);
    else fail(job, err);
    if (job.rerun) { job.rerun = false; attempt(job); }
  };

  const timeout = setTimeout(() => settle(new SyncTimeoutError()), WRITE_TIMEOUT_MS);

  let p: Promise<void>;
  try { p = Promise.resolve(job.write()); } catch (e) { p = Promise.reject(e); }
  p.then(
    () => {
      if (!settled) { settle(null); return; }
      // Acknowledged after we'd given up on it — typically a write Firestore
      // held while offline and sent on reconnect. Still the latest? Then saved.
      if (jobs[job.doc] === job && !job.running) succeed(job, version);
    },
    e => {
      if (!settled) { settle(e); return; }
      console.error(`[sync] ${job.doc} save failed after timing out (${describe(e)})`, e);
    },
  );
}

function succeed(job: Job, version: number) {
  // A newer change is still to be written; that attempt decides.
  if (version !== job.version) return;
  if (job.timer) { clearTimeout(job.timer); job.timer = null; }
  job.retriesUsed = 0;
  patchDoc(job.doc, { state: 'saved', inFlight: false, permanent: false, lastError: null });
  setFlag(job.doc, null);
}

function fail(job: Job, e: unknown) {
  const transient = isTransientError(e);
  console.error(`[sync] ${job.doc} save failed (${transient ? 'network' : 'permanent'}; ${describe(e)})`, e);
  patchDoc(job.doc, { state: 'failed', inFlight: false, permanent: !transient, lastError: describe(e) });
  if (!transient || job.rerun) return; // a pending rerun writes newer state right away
  if (job.retriesUsed >= RETRY_DELAYS_MS.length) return; // waits for Retry, the next change, or a restart
  const delay = RETRY_DELAYS_MS[job.retriesUsed];
  job.retriesUsed += 1;
  job.timer = setTimeout(() => { job.timer = null; attempt(job); }, delay);
}

function cancelJobs() {
  for (const d of Object.keys(jobs) as SyncDoc[]) {
    const job = jobs[d];
    if (job?.timer) clearTimeout(job.timer);
    delete jobs[d];
  }
}

/**
 * Stops all saving (sign-out). With `clearFlags`, also drops the persisted
 * flags for `uid` — used when that account's data has just been cleared from
 * the device, so there's nothing left for them to retry.
 */
export function resetSync(opts: { clearFlagsFor?: string } = {}) {
  cancelJobs();
  useSyncStatusStore.setState({ uid: null, docs: idleDocs() });
  const { clearFlagsFor } = opts;
  if (clearFlagsFor) {
    for (const d of FLAGGED_DOCS) {
      if (useSyncStatusStore.getState().unsaved[d as FlaggedDoc] === clearFlagsFor) setFlag(d, null);
    }
  }
}

// ============================================================================
// SELECTORS
// ============================================================================

/** Something of the student's hasn't reached the cloud: failed, in flight, or flagged from a previous session. */
export function selectHasUnsaved(s: SyncStatusState): boolean {
  if (!s.uid) return false;
  if (USER_DATA_DOCS.some(d => s.docs[d].state === 'saving' || s.docs[d].state === 'failed')) return true;
  return Object.values(s.unsaved).includes(s.uid);
}

/** A save attempted this session has failed — what the banner shows for. */
export function selectHasFailed(s: SyncStatusState): boolean {
  return USER_DATA_DOCS.some(d => s.docs[d].state === 'failed');
}

/** A failed document is being retried right now. */
export function selectIsRetrying(s: SyncStatusState): boolean {
  return USER_DATA_DOCS.some(d => s.docs[d].state === 'failed' && s.docs[d].inFlight);
}

/** Something unsaved is on its way (first attempt or retry). */
export function selectIsSaving(s: SyncStatusState): boolean {
  return USER_DATA_DOCS.some(d => s.docs[d].inFlight);
}
