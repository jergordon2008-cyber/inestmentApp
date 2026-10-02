/**
 * Helpers for Firestore security-rules tests. They run against the Firestore
 * emulator only (npm run test:rules starts one) and use the app's own
 * `firebase` dependency — Firestore Lite with mock auth tokens — so no extra
 * packages are needed.
 */
import { expect } from '@jest/globals';
import { initializeApp, deleteApp, setLogLevel, FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore/lite';

export const PROJECT_ID = 'demo-investiq';
const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const { hostname, port, username, pathname } = new URL(`http://${HOST}`);

if (!['127.0.0.1', 'localhost'].includes(hostname) || !port || username || pathname !== '/') {
  throw new Error(`Rules tests only run against a local emulator, not ${HOST}`);
}

// Denied writes are expected here; don't let the SDK log each one.
setLogLevel('silent');

const DOCS_URL = `http://${HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const apps: FirebaseApp[] = [];

/** A Firestore client signed in as `uid` (or signed out when null). */
export function dbAs(uid: string | null): Firestore {
  const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'demo-api-key' }, `rules-${apps.length}`);
  apps.push(app);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, hostname, Number(port), uid ? { mockUserToken: { sub: uid } } : undefined);
  return db;
}

export async function cleanup(): Promise<void> {
  await Promise.all(apps.splice(0).map(a => deleteApp(a)));
}

/** Wipes every document in the emulator. */
export async function clearFirestore(): Promise<void> {
  const res = await fetch(`http://${HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`clearFirestore failed: ${res.status}`);
}

// Plain value -> Firestore REST Value (for seeding with rules bypassed).
function toValue(v: unknown): object {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, toValue(x)])) } };
  }
  throw new Error(`Unsupported value: ${String(v)}`);
}

/** Writes a document bypassing security rules ("Bearer owner"). */
export async function seedDoc(path: string, data: Record<string, unknown>): Promise<void> {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)]));
  const res = await fetch(`${DOCS_URL}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`seedDoc ${path} failed: ${res.status} ${await res.text()}`);
}

export async function expectAllowed(p: Promise<unknown>): Promise<void> {
  await p; // a rejection fails the test with the real error
}

export async function expectDenied(p: Promise<unknown>): Promise<void> {
  await expect(p).rejects.toMatchObject({ code: 'permission-denied' });
}
