// Writes .dev.vars (git-ignored) for `wrangler dev` from the shell environment,
// so the API keys never have to be typed into a file. Prints names only.
import { writeFileSync } from 'node:fs';

const required = ['ALPACA_KEY_ID', 'ALPACA_SECRET_KEY', 'FINNHUB_KEY'];
const optional = ['ALERT_URL', 'DEV_FORCE_OPEN', 'ALLOWED_ORIGINS'];

const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
const lines = [...required, ...optional]
  .filter(name => process.env[name])
  .map(name => `${name}=${JSON.stringify(process.env[name])}`);
writeFileSync(new URL('../.dev.vars', import.meta.url), lines.join('\n') + '\n', { mode: 0o600 });
console.log(`.dev.vars written with: ${[...required, ...optional].filter(n => process.env[n]).join(', ')}`);
