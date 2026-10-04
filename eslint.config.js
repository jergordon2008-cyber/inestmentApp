// ESLint 9 flat config. Uses Expo's shared rules (eslint-config-expo, already a
// devDependency) rather than a hand-rolled set, so lint matches what Expo
// projects expect. Run with `npm run lint`.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Node scripts (build steps, data scans) and this file run in Node, not the app.
    files: ['scripts/**/*.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        require: 'readonly', module: 'writable', exports: 'writable', process: 'readonly',
        __dirname: 'readonly', __filename: 'readonly', console: 'readonly', Buffer: 'readonly',
      },
    },
  },
  {
    // Apostrophes and quotes in text ("you're") are literal in React Native's
    // <Text>; the HTML-escaping concern this rule guards against doesn't apply.
    rules: { 'react/no-unescaped-entities': 'off' },
  },
  {
    // Build output and generated folders, never hand-written. functions/ is
    // the Firebase Cloud Functions package: it has its own package.json,
    // node_modules and `tsc` build, deploys to Firebase (not Vercel), and its
    // dependencies (firebase-functions, firebase-admin, stripe) aren't
    // installed when the web app is built — linting it from here fails
    // import/no-unresolved there. Lint or typecheck it from inside functions/.
    // workers/ is the same: Cloudflare Workers with their own package.json,
    // typechecked and tested from inside each worker (see CI).
    ignores: ['dist/*', 'web-build/*', '.expo/*', 'functions/**', 'workers/**'],
  },
]);
