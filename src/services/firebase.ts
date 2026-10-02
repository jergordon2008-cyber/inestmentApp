/**
 * Firebase Configuration — LIVE
 *
 * Project: investiq-club-74cfc
 * Services used: Authentication (email/password), Firestore (data storage),
 * Cloud Functions (Stripe subscription backend).
 *
 * Config values come from EXPO_PUBLIC_FIREBASE_* env vars (see .env).
 * Local development: EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true points Auth,
 * Firestore and Functions at the local emulators (see .env.local.example).
 * It is refused unless the project id starts with "demo-".
 * These are safe to ship in the client bundle — they identify the project,
 * not a secret; real access control is enforced by Firestore security rules
 * (firestore.rules), not by hiding this config.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
import { resolveEmulatorConfig } from './firebaseEmulator';

export const FIREBASE_CONFIG = {
  apiKey:        process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain:    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId:     process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:         process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const FIREBASE_ENABLED = !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.projectId;

// Throws at startup if emulator mode is on with a non-demo project id.
// EXPO_PUBLIC_* vars must be read as literal process.env.X so Expo inlines them.
const EMULATOR = resolveEmulatorConfig({
  useEmulators: process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS,
  projectId: FIREBASE_CONFIG.projectId,
  host: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST,
});

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!FIREBASE_ENABLED) return null;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    if (EMULATOR) {
      // Create and connect every service now, so nothing that later calls
      // getFirestore(app) etc. directly can get an unconnected instance.
      getFirebaseAuth();
      getFirebaseDb();
      getFirebaseFunctions();
    }
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  if (!FIREBASE_ENABLED) return null;
  const a = getFirebaseApp();
  if (!a) return null;
  if (!authInstance) {
    authInstance = getAuth(a);
    if (EMULATOR) {
      connectAuthEmulator(authInstance, `http://${EMULATOR.host}:${EMULATOR.authPort}`, { disableWarnings: true });
    }
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore | null {
  if (!FIREBASE_ENABLED) return null;
  const a = getFirebaseApp();
  if (!a) return null;
  if (!dbInstance) {
    // ignoreUndefinedProperties: drop `undefined` fields instead of refusing
    // the whole write. Without it, one optional field left undefined anywhere
    // in a document — trades set triggeredBySignal/triggeredByLesson that way
    // on every single trade — made setDoc throw "Unsupported field value:
    // undefined", and the save's empty catch swallowed it. Trades only reached
    // the cloud on the NEXT app launch, when the copy reloaded from device
    // storage (JSON, which strips undefined) happened to save. Set on the
    // instance rather than stripped per save so it covers every write in the
    // app, including ones not written yet. Dropping the field is also the
    // right meaning: undefined here means "not set".
    let created = false;
    try {
      dbInstance = initializeFirestore(a, { ignoreUndefinedProperties: true });
      created = true;
    } catch {
      // initializeFirestore throws if this app's Firestore already exists —
      // only reachable when a dev hot-reload re-evaluates this module. The
      // existing instance was created by the call above, so it already has
      // the setting (and the emulator connection).
      dbInstance = getFirestore(a);
    }
    // Outside the try: a failure here must surface, not fall back to an
    // instance that talks to the real backend.
    if (created && EMULATOR) connectFirestoreEmulator(dbInstance, EMULATOR.host, EMULATOR.firestorePort);
  }
  return dbInstance;
}

export function getFirebaseFunctions(): Functions | null {
  if (!FIREBASE_ENABLED) return null;
  const a = getFirebaseApp();
  if (!a) return null;
  if (!functionsInstance) {
    functionsInstance = getFunctions(a);
    if (EMULATOR) connectFunctionsEmulator(functionsInstance, EMULATOR.host, EMULATOR.functionsPort);
  }
  return functionsInstance;
}

/** Kept for backwards compatibility with older call sites. */
export async function initFirebase(): Promise<FirebaseApp | null> {
  return getFirebaseApp();
}
