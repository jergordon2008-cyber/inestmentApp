/**
 * Vercel's static-file uploader silently drops any path containing a
 * "node_modules" segment — including legitimate icon font files that
 * Metro's web export bundles at dist/assets/node_modules/... (the whole
 * @expo/vector-icons font set: Ionicons, MaterialIcons, FontAwesome, etc).
 * That 404s in production, so every icon glyph renders as an empty box.
 *
 * Fix: copy those files to a path without "node_modules" in it, then
 * rewrite the matching URL strings inside the built JS bundle(s) so they
 * point at the new path.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const SRC = path.join(DIST, 'assets', 'node_modules');
const DEST = path.join(DIST, 'assets', 'vendor');

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function walkFiles(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(p, exts, out);
    else if (exts.some(ext => entry.name.endsWith(ext))) out.push(p);
  }
  return out;
}

if (!fs.existsSync(SRC)) {
  console.log('[fix-vendor-assets] No dist/assets/node_modules found — nothing to do.');
  process.exit(0);
}

copyRecursive(SRC, DEST);

const jsFiles = walkFiles(path.join(DIST, '_expo'), ['.js']);
let totalReplacements = 0;
for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const updated = content.split('/assets/node_modules/').join('/assets/vendor/');
  if (updated !== content) {
    const count = content.split('/assets/node_modules/').length - 1;
    totalReplacements += count;
    fs.writeFileSync(file, updated);
  }
}

fs.rmSync(SRC, { recursive: true, force: true });

console.log(`[fix-vendor-assets] Copied vendor assets to dist/assets/vendor and rewrote ${totalReplacements} reference(s) across ${jsFiles.length} bundle file(s).`);
