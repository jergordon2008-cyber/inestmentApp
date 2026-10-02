import { describe, it, expect } from '@jest/globals';
import { resolveEmulatorConfig } from '../firebaseEmulator';

describe('resolveEmulatorConfig', () => {
  it('is off unless the flag is exactly "true"', () => {
    expect(resolveEmulatorConfig({ projectId: 'demo-investiq' })).toBeNull();
    expect(resolveEmulatorConfig({ useEmulators: 'false', projectId: 'demo-investiq' })).toBeNull();
    expect(resolveEmulatorConfig({ useEmulators: '1', projectId: 'demo-investiq' })).toBeNull();
  });

  it('connects to localhost by default for a demo- project', () => {
    expect(resolveEmulatorConfig({ useEmulators: 'true', projectId: 'demo-investiq' })).toEqual({
      host: '127.0.0.1',
      authPort: 9099,
      firestorePort: 8080,
      functionsPort: 5001,
    });
  });

  it('accepts a custom host (e.g. 10.0.2.2 for the Android emulator)', () => {
    expect(
      resolveEmulatorConfig({ useEmulators: 'true', projectId: 'demo-investiq', host: '10.0.2.2' })?.host,
    ).toBe('10.0.2.2');
  });

  it('refuses emulator mode for a project id that does not start with "demo-"', () => {
    expect(() => resolveEmulatorConfig({ useEmulators: 'true', projectId: 'investiq-club-74cfc' })).toThrow(/demo-/);
    expect(() => resolveEmulatorConfig({ useEmulators: 'true', projectId: '' })).toThrow(/demo-/);
    expect(() => resolveEmulatorConfig({ useEmulators: 'true' })).toThrow(/demo-/);
    expect(() => resolveEmulatorConfig({ useEmulators: 'true', projectId: 'my-demo-app' })).toThrow(/demo-/);
  });
});
