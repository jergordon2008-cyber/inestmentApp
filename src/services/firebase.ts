/**
 * Firebase Configuration — LIVE
 *
 * Project: investiq-club-74cfc
 * Services used: Authentication (email/password), Firestore (data storage),
 * Cloud Functions (Stripe subscription backend).
 *
 * Config values come from EXPO_PUBLIC_FIREBASE_* env vars (see .env).
 * These are safe to ship in the client bundle — they identify the project,
 * not a secret; real access control is enforced by Firestore security rules
 * (firestore.rules), not by hiding this config.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';

export const FIREBASE_CONFIG = {
  apiKey:        process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain:    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId:     process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:         process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const FIREBASE_ENABLED = !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.projectId;

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!FIREBASE_ENABLED) return null;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  if (!FIREBASE_ENABLED) return null;
  const a = getFirebaseApp();
  if (!a) return null;
  if (!authInstance) authInstance = getAuth(a);
  return authInstance;
}

export function getFirebaseDb(): Firestore | null {
  if (!FIREBASE_ENABLED) return null;
  const a = getFirebaseApp();
  if (!a) return null;
  if (!dbInstance) dbInstance = getFirestore(a);
  return dbInstance;
}

export function getFirebaseFunctions(): Functions | null {
  if (!FIREBASE_ENABLED) return null;
  const a = getFirebaseApp();
  if (!a) return null;
  if (!functionsInstance) functionsInstance = getFunctions(a);
  return functionsInstance;
}

/** Kept for backwards compatibility with older call sites. */
export async function initFirebase(): Promise<FirebaseApp | null> {
  return getFirebaseApp();
}
