import { describe, expect, it } from '@jest/globals';
import { publicDisplayName, FALLBACK_PUBLIC_NAME } from '../publicName';

// The plain-JS copy used by scripts/privacy-cleanup-checklist.js.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- a CommonJS Node script, not app code
const port = require('../../../scripts/public-name') as {
  publicDisplayName: (n: string | null | undefined) => string;
  FALLBACK_PUBLIC_NAME: string;
};

describe('scripts/public-name.js matches src/utils/publicName.ts', () => {
  const names = [
    'Jeremiah Gordon', 'Malik', '  jeremiah   gordon ', 'JEREMIAH GORDON', 'jeremiah gordon',
    'Jeremiah Lee Gordon', 'Jeremiah Gordon Jr.', 'Jeremiah Gordon III', 'DeShawn McKenzie',
    'mary-jane watson', 'jeremiah.gordon', 'jeremiah_gordon', 'jgordon2008', 'Zoë Ångström',
    'José de la Cruz', 'Jeremiah O\'Brien', 'Jeremiah 2nd', 'Jeremiah G.', 'Investor', 'Mr. Gordon',
    '', '   ', 'A'.repeat(100) + ' Smith', 'élodie durand', 'ÉLODIE', '李 小龙', 'Ana-María de-la-Vega',
  ];

  it.each(names)('%j', name => {
    expect(port.publicDisplayName(name)).toBe(publicDisplayName(name));
  });

  it('missing names and the fallback agree', () => {
    expect(port.publicDisplayName(undefined)).toBe(publicDisplayName(undefined));
    expect(port.publicDisplayName(null)).toBe(publicDisplayName(null));
    expect(port.FALLBACK_PUBLIC_NAME).toBe(FALLBACK_PUBLIC_NAME);
  });
});
