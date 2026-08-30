/**
 * Auth Service — real Firebase email/password accounts.
 *
 * Every student gets a real, unique account. The Firebase Auth uid is the
 * single source of truth used to key all of their data in Firestore
 * (users/{uid}, portfolios/{uid}, journals/{uid}, public_stats/{uid}).
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

export interface AuthResult {
  success: boolean;
  uid?: string;
  email?: string;
  error?: string;
}

function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try logging in instead.';
    case 'auth/invalid-email': return 'That email address looks invalid.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
    default: return 'Something went wrong. Please try again.';
  }
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) return { success: false, error: 'Accounts are not configured yet.' };
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    return { success: true, uid: cred.user.uid, email: cred.user.email ?? email };
  } catch (e: any) {
    return { success: false, error: friendlyAuthError(e?.code ?? '') };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) return { success: false, error: 'Accounts are not configured yet.' };
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    return { success: true, uid: cred.user.uid, email: cred.user.email ?? email };
  } catch (e: any) {
    return { success: false, error: friendlyAuthError(e?.code ?? '') };
  }
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}

export function subscribeToAuthChanges(cb: (user: FirebaseUser | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, cb);
}

export function getCurrentUid(): string | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser?.uid ?? null;
}
