/**
 * Local-development switch for the Firebase emulators.
 *
 * Emulator mode is only allowed for a "demo-" project id. Firebase treats
 * demo- projects as offline-only (no real project can have that id), so a
 * misconfigured .env can never point "local" traffic at production data.
 */

export interface EmulatorConfig {
  host: string;
  authPort: number;
  firestorePort: number;
  functionsPort: number;
}

export function resolveEmulatorConfig(env: {
  useEmulators?: string;
  projectId?: string;
  host?: string;
}): EmulatorConfig | null {
  if (env.useEmulators !== 'true') return null;
  const projectId = env.projectId ?? '';
  if (!projectId.startsWith('demo-')) {
    throw new Error(
      `Refusing Firebase emulator mode: project id "${projectId}" must start with "demo-". ` +
      'Set EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-investiq (see .env.local.example).',
    );
  }
  return {
    host: env.host || '127.0.0.1',
    authPort: 9099,
    firestorePort: 8080,
    functionsPort: 5001,
  };
}
