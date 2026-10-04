/**
 * Price robot: Cloudflare Worker entry point.
 * Design and limits: docs/PRICE-ROBOT-DESIGN.md.
 */
import { WATCHDOG_CRON } from './crons';
import { handleRequest } from './http';
import { refresh } from './refresh';
import type { Deps, Env } from './types';
import { watchdog } from './watchdog';

function realDeps(): Deps {
  return {
    fetch: (input, init) => fetch(input, init),
    now: () => new Date(),
    sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
  };
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(req, env, realDeps(), ctx);
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const deps = realDeps();
    if (controller.cron === WATCHDOG_CRON) {
      const summary = await watchdog(env, deps);
      if (summary.checked) console.log(JSON.stringify({ job: 'watchdog', ...summary }));
      return;
    }
    const summary = await refresh(env, deps, { finnhub: true });
    console.log(JSON.stringify({ job: 'refresh', ...summary }));
  },
} satisfies ExportedHandler<Env>;
