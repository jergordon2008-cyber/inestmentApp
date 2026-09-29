/**
 * Post-export step for `npm run build:web`: make dist/index.html load the
 * bundle as an ES module.
 *
 * Expo's web export emits `<script src="/_expo/static/js/web/index-<hash>.js"
 * defer></script>`; the bundle needs `<script type="module" ...>`. This used
 * to be a `sed -i ''` in package.json, which is macOS-only syntax (GNU sed on
 * Linux reads '' as a file name), so the build couldn't run on Vercel or any
 * Linux CI. Node behaves the same everywhere.
 *
 * Fails the build if no bundle script tag is found, rather than silently
 * shipping an index.html that never loads the app.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'dist', 'index.html');
const DEFER_TAG = /<script src="(\/_expo\/static\/js\/web\/[^"]*)" defer><\/script>/g;
const MODULE_TAG = /<script type="module" src="\/_expo\/static\/js\/web\/[^"]*"><\/script>/;

const html = fs.readFileSync(FILE, 'utf8');
let count = 0;
const out = html.replace(DEFER_TAG, (_, src) => { count++; return `<script type="module" src="${src}"></script>`; });

if (count === 0 && !MODULE_TAG.test(html)) {
  console.error('[fix-index-html] no /_expo/static/js/web/ bundle <script> tag found in dist/index.html');
  process.exit(1);
}
fs.writeFileSync(FILE, out);
console.log(`[fix-index-html] ${count} bundle script tag(s) set to type="module"`);
