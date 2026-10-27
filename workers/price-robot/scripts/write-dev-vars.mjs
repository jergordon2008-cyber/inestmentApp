// Writes .dev.vars (git-ignored) for `wrangler dev` from the shell environment,
// so the API keys never have to be typed into a file. Prints names only.
import { writeFileSync } from 'node:fs';

const required = ['FINNHUB_KEY'];
const optional = ['ALERT_URL', 'DEV_FORCE_OPEN', 'ALLOWED_ORIGINS'];
// Dev-only settings, always written here: this file is git-ignored and
// `wrangler deploy` never uploads it, so they can't reach the deployed Worker.
const devSettings = { DEV_ALLOW_LOCALHOST: '1' };

const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
const lines = [...required, ...optional]
  .filter(name => process.env[name])
  .map(name => `${name}=${JSON.stringify(process.env[name])}`);
for (const [name, value] of Object.entries(devSettings)) lines.push(`${name}=${JSON.stringify(value)}`);
writeFileSync(new URL('../.dev.vars', import.meta.url), lines.join('\n') + '\n', { mode: 0o600 });
console.log(`.dev.vars written with: ${[...required, ...optional].filter(n => process.env[n]).concat(Object.keys(devSettings)).join(', ')}`);
