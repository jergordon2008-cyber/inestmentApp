/**
 * Plain-JS copy of publicDisplayName() in src/utils/publicName.ts, for Node
 * scripts (privacy-cleanup-checklist.js) that can't import the app's
 * TypeScript. Same rule: first name + last initial ("Jeremiah G."). Keep the
 * two in step — src/utils/__tests__/publicName.port.test.ts checks they agree.
 */
const SUFFIX = /^(jr|sr|ii|iii|iv|v)\.?$/i;
const FALLBACK_PUBLIC_NAME = 'Investor';

function capitalise(word) {
  const mixed = word !== word.toLowerCase() && word !== word.toUpperCase();
  if (mixed) return word;
  return word.toLowerCase().split('-').map(part => {
    const chars = Array.from(part);
    return chars.length ? chars[0].toLocaleUpperCase() + chars.slice(1).join('') : part;
  }).join('-');
}

function publicDisplayName(fullName) {
  const words = (fullName ?? '').split(/[\s._]+/).filter(Boolean);
  if (words.length === 0) return FALLBACK_PUBLIC_NAME;
  const first = capitalise(words[0]);
  const rest = words.slice(1).filter(w => !SUFFIX.test(w));
  const last = rest[rest.length - 1];
  const lead = last ? Array.from(last)[0] : undefined;
  const initial = lead && /\p{L}/u.test(lead) ? lead : undefined;
  const name = initial ? `${first} ${initial.toLocaleUpperCase()}.` : first;
  return Array.from(name).slice(0, 60).join('');
}

module.exports = { publicDisplayName, FALLBACK_PUBLIC_NAME };
