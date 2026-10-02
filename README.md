# InvestIQ

## Local development

Runs the app against local Firebase emulators (Auth + Firestore), so you can
sign in without production credentials and without touching real data.

Needs Node 20+ and Java 11+ (for the Firestore emulator).

```sh
cp .env.local.example .env.local   # once; Expo loads it automatically
npm run emulators                  # terminal 1 — wait for "All emulators ready"
npm run emulators:seed             # terminal 2 — demo accounts + test classroom
npm run web                        # or npm start for iOS/Android
```

Sign in with `student@example.com` or `admin@example.com` (admin, teacher of
the test classroom, join code `TEST9`), password `password123`. Emulator UI:
http://127.0.0.1:4000. Data is wiped when the emulators stop; re-run the seed.

- The emulator project is `demo-investiq`. The app refuses emulator mode for
  any project id that doesn't start with `demo-`, and the seed script refuses
  to run against anything but `demo-` projects on localhost.
- Android emulator: set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=10.0.2.2` in
  `.env.local`; a physical device needs your machine's LAN IP (and the
  emulators bound to it).
- `npm run test:rules` runs the Firestore security-rules tests
  (`tests/firestore-rules/`) on a throwaway emulator. If the emulators are
  already running, use `npx jest --config jest.rules.config.js` instead.
- Cloud Functions (Stripe checkout) are not emulated; those calls fail locally.
- Never run `firebase deploy` from this setup — `npm run emulators` passes
  `--project demo-investiq` explicitly, but `.firebaserc` still defaults to
  production.
