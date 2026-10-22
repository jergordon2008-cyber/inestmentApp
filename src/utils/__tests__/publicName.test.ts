import { describe, expect, it } from '@jest/globals';
import { publicDisplayName } from '../publicName';

describe('publicDisplayName', () => {
  it.each([
    ['Jeremiah Gordon', 'Jeremiah G.'],
    ['Malik', 'Malik'],
    ['  jeremiah   gordon ', 'Jeremiah G.'],
    ['JEREMIAH GORDON', 'Jeremiah G.'],
    ['jeremiah gordon', 'Jeremiah G.'],
    ['malik', 'Malik'],
    ['Jeremiah Lee Gordon', 'Jeremiah G.'],
    ['Jeremiah Gordon Jr.', 'Jeremiah G.'],
    ['Jeremiah Gordon III', 'Jeremiah G.'],
    ['DeShawn McKenzie', 'DeShawn M.'],
    ['mary-jane watson', 'Mary-Jane W.'],
    ['jeremiah.gordon', 'Jeremiah G.'],           // email-prefix fallback
    ['jgordon2008', 'Jgordon2008'],
    ['Zoë Ångström', 'Zoë Å.'],
    ['José de la Cruz', 'José C.'],
    ['Jeremiah O\'Brien', 'Jeremiah O.'],
    ['Jeremiah 2nd', 'Jeremiah'],                  // no letter to take an initial from
  ])('%j → %j', (input, expected) => {
    expect(publicDisplayName(input)).toBe(expected);
  });

  it('empty, blank or missing names fall back to "Investor"', () => {
    expect(publicDisplayName('')).toBe('Investor');
    expect(publicDisplayName('   ')).toBe('Investor');
    expect(publicDisplayName(undefined)).toBe('Investor');
    expect(publicDisplayName(null)).toBe('Investor');
  });

  it('stays within the 60 characters firestore.rules allows', () => {
    expect(publicDisplayName('A'.repeat(100) + ' Smith').length).toBeLessThanOrEqual(60);
  });

  it('is stable: an already-short name comes back unchanged (old and new docs both display right)', () => {
    for (const n of ['Jeremiah G.', 'Malik', 'DeShawn M.', 'Mary-Jane W.', 'Investor']) expect(publicDisplayName(n)).toBe(n);
  });

  it('never contains the full last name', () => {
    expect(publicDisplayName('Jeremiah Gordon')).not.toContain('Gordon');
  });
});
