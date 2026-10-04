# Price robot (Cloudflare Worker)

Refreshes stock prices during US market hours and serves them to the app. Design and limits: [docs/PRICE-ROBOT-DESIGN.md](../../docs/PRICE-ROBOT-DESIGN.md).

- **Sources:** Alpaca (IEX) for all 110 tickers every 2 minutes; Finnhub for 15 tickers per run as cross-check and fallback (7.5/min). Display approved in writing by both providers.
- **Storage:** one Workers KV key (`prices:v1`).
- **Endpoints:** `GET /v1/prices`, `GET /v1/quote/:symbol`, `GET /v1/health`.
- **Watchdog:** every 5 minutes; alerts to ntfy.sh or Discord if prices are more than 10 minutes old.
- **Cost:** $0 on the Workers Free plan. No card needed.

## Local development

```sh
npm ci
npm test              # unit tests with fake APIs (no keys, no network)
npm run typecheck
npm run dev           # .dev.vars from your shell env (ALPACA_KEY_ID, ALPACA_SECRET_KEY, FINNHUB_KEY), then wrangler dev
curl "http://127.0.0.1:8787/__scheduled?cron=*/2+13-21+*+*+1-5"   # run one refresh
curl http://127.0.0.1:8787/v1/prices
```
Outside market hours a refresh does nothing by design. `DEV_FORCE_OPEN=1 npm run dev` treats the market as open, for local testing only; never set it on the deployed Worker. `.dev.vars` is git-ignored; delete it when done.

## Deploy (Jeremiah, on his Cloudflare account)

You need Node 22 and a checkout of the repo at the commit to deploy. About 15 minutes the first time.

1. **Install and log in.** The browser login authorizes this computer only; no token to store or share.
   ```sh
   cd workers/price-robot
   npm ci
   npx wrangler login
   npx wrangler whoami          # check it shows your account
   ```
2. **Check the cron budget.** The Free plan allows 5 cron triggers per account and this Worker uses 2. Dashboard → Workers & Pages: any other Worker with cron triggers counts toward the 5.
3. **Create the KV namespace** and put its id in `wrangler.toml` (`[[kv_namespaces]]` → `id`). The id isn't secret; commit it.
   ```sh
   npx wrangler kv namespace create PRICES
   ```
4. **Set the allowed web origins** in `wrangler.toml` under `[vars]`:
   ```toml
   ALLOWED_ORIGINS = "https://<production web domain>,https://<project>-*-<team>.vercel.app"
   ```
   `*` matches one hostname part, which covers Vercel preview URLs; list every web deployment that should show prices. Native apps aren't affected.
5. **Set the secrets.** Each command prompts for the value; nothing is written to disk or shell history.
   ```sh
   npx wrangler secret put ALPACA_KEY_ID
   npx wrangler secret put ALPACA_SECRET_KEY
   npx wrangler secret put FINNHUB_KEY
   npx wrangler secret put ALERT_URL        # e.g. https://ntfy.sh/<long random topic>, or a Discord webhook URL
   ```
   For ntfy, install the ntfy app on your phone and subscribe to the same topic name. Treat the topic name like a password: anyone who knows it can read and send.
6. **Deploy.**
   ```sh
   npx wrangler deploy
   ```
   It prints the URL, e.g. `https://price-robot.<your-subdomain>.workers.dev`.
7. **Check it.**
   - **Right away:** `curl https://price-robot.<your-subdomain>.workers.dev/v1/health`. Before the first run it says `"ok":false` with no prices; that's expected.
   - **During market hours:** within 2 minutes, `/v1/health` should show `"ok":true` and `/v1/prices` about 110 quotes.
   - `npx wrangler tail` shows each run's summary live: calls made, sources used, KV write.
8. **Give the URL to the app:** set `EXPO_PUBLIC_PRICE_API_URL` to it in Vercel (production) and EAS when the app PR ships.

**Afterwards:**
- **Logs:** dashboard → Workers & Pages → price-robot → Logs, or `npx wrangler tail`.
- **Roll back:** `npx wrangler rollback` returns to the previous version. If the Worker is stopped or deleted, the app falls back to saved prices (never blank).
- **Rotate a key:** run `npx wrangler secret put <NAME>` again. It applies on the next run, no redeploy needed.

### If someone else deploys for you

Create an API token instead of sharing your login: dashboard → My Profile → API Tokens → Create Token → template **"Edit Cloudflare Workers"**.
- **Account resources:** your account only.
- **Zone resources:** none.
- **Expiry:** 30 days.

Hand it over through a secret store, never in chat, email or a repo. For Claude Code, that's the cloud environment's settings, as `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Revoke it when done.
