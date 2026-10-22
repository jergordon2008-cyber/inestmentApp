/**
 * The name other students see: first name + last initial ("Jeremiah G.").
 *
 * Used wherever a name leaves the student's own device for others to read:
 * public_stats.displayName (leaderboard, class board), the trade activity
 * feed, and the class roster. The full name stays in the student's own
 * profile (users/{uid}), which only they can read.
 *
 * - Extra spaces, dots and underscores separate words ("  jeremiah   gordon ",
 *   "jeremiah.gordon" from an email-prefix fallback).
 * - A single name stays as it is: "Malik" → "Malik".
 * - All-lowercase or ALL-CAPS words are capitalised ("malik" → "Malik");
 *   mixed case is kept as typed ("DeShawn", "McKenzie").
 * - Middle names are dropped; a trailing suffix (Jr., Sr., II, III, IV) is
 *   skipped when picking the last initial.
 */
const SUFFIX = /^(jr|sr|ii|iii|iv|v)\.?$/i;
export const FALLBACK_PUBLIC_NAME = 'Investor';

function capitalise(word: string): string {
  const mixed = word !== word.toLowerCase() && word !== word.toUpperCase();
  if (mixed) return word;
  // Hyphenated names get each part capitalised: "mary-jane" → "Mary-Jane".
  return word.toLowerCase().split('-').map(part => {
    const chars = Array.from(part);
    return chars.length ? chars[0]!.toLocaleUpperCase() + chars.slice(1).join('') : part;
  }).join('-');
}

export function publicDisplayName(fullName: string | null | undefined): string {
  const words = (fullName ?? '').split(/[\s._]+/).filter(Boolean);
  if (words.length === 0) return FALLBACK_PUBLIC_NAME;
  const first = capitalise(words[0]!);
  const rest = words.slice(1).filter(w => !SUFFIX.test(w));
  const last = rest[rest.length - 1];
  const lead = last ? Array.from(last)[0] : undefined;
  const initial = lead && /\p{L}/u.test(lead) ? lead : undefined;
  const name = initial ? `${first} ${initial.toLocaleUpperCase()}.` : first;
  // firestore.rules accepts 1–60 characters for public_stats.displayName.
  return Array.from(name).slice(0, 60).join('');
}
