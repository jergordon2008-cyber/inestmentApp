/**
 * Cron schedules. Must match wrangler.toml [triggers].crons. Kept out of
 * index.ts: Workers treats every named export of the entry module as a
 * handler and refuses to start if one isn't.
 */
export const REFRESH_CRON = '*/2 13-21 * * 1-5';
export const WATCHDOG_CRON = '*/5 * * * *';
