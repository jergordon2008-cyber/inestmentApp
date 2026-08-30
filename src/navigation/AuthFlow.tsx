/**
 * AuthFlow
 *
 * The signup / login / onboarding handlers. They stay in App.tsx because they
 * own the Firebase uid and the Firestore hydration that follows a successful
 * auth; this context just carries them down to the auth screens now that those
 * screens are routes rather than JSX branches.
 */

import React, { createContext, useContext } from 'react';
import type { OnboardingAnswers } from '../data/onboarding';

export interface AuthActions {
  onSignupAuthed: (uid: string, email: string, name?: string) => void;
  onLoginAuthed: (uid: string, email: string) => void | Promise<void>;
  onOnboardingComplete: (answers: OnboardingAnswers) => void;
  onSignOut: () => void;
  onRestartOnboarding: () => void;
  isAdmin: boolean;
}

const AuthActionsContext = createContext<AuthActions | null>(null);

export function useAuthActions(): AuthActions {
  const value = useContext(AuthActionsContext);
  if (!value) throw new Error('useAuthActions must be used inside <AuthActionsProvider>');
  return value;
}

export function AuthActionsProvider({ value, children }: { value: AuthActions; children: React.ReactNode }) {
  return <AuthActionsContext.Provider value={value}>{children}</AuthActionsContext.Provider>;
}
