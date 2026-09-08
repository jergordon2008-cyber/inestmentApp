/**
 * Rewrites `import.meta` to an empty object literal.
 *
 * Why: zustand/esm/middleware.mjs reads `import.meta.env.MODE` to decide
 * whether to wire up the Redux devtools extension. Importing `persist` from
 * `zustand/middleware` pulls that whole module in, so the expression lands in
 * the bundle even though nothing in this app calls `devtools()`.
 *
 * Metro's dev server serves the bundle as a classic <script>, and `import.meta`
 * is a *parse-time* SyntaxError there — the whole bundle fails to evaluate
 * before React mounts, which is a white screen with one console error. The
 * production export escaped it only because build:web rewrites the tag to
 * <script type="module">, where the syntax is legal.
 *
 * `({}).env` is undefined, so zustand falls through to its
 * `window.__REDUX_DEVTOOLS_EXTENSION__` check, finds nothing, and no-ops —
 * the same behaviour as before, minus the syntax that can't be parsed.
 *
 * The off-the-shelf babel-plugin-transform-import-meta does not work here: it
 * only rewrites `import.meta.url` (not `.env`), and emits a Node-only
 * `require('url')` call that has no place in a browser bundle.
 */
module.exports = function neutralizeImportMeta() {
  return {
    name: 'neutralize-import-meta',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta && path.node.meta.name === 'import') {
          path.replaceWithSourceString('({})');
        }
      },
    },
  };
};
