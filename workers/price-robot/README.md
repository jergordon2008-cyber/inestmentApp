# Price robot (Cloudflare Worker)

Refreshes stock prices during US market hours and serves them to the app. Design and limits: [docs/PRICE-ROBOT-DESIGN.md](../../docs/PRICE-ROBOT-DESIGN.md).

- **Source:** Finnhub only, every minute during market hours, at most 45 calls a minute (limit 60). Tickers students hold or opened recently first (up to 12 every minute), every other ticker at least every 3 minutes. Alpaca is disabled (no display permission); its adapter stays in `src/alpaca.ts` for the future.
- **Licensing:** Finnhub has **not** approved showing its data to students; both founders accepted that risk (design §0).
- **Storage:** Workers KV keys `prices:v1`, `demand:v1` (priority tickers), `watchdog:v1`.
- **Endpoints:** `GET /v1/prices`, `GET /v1/quote/:symbol`, `GET /v1/health`. None of them calls Finnhub.
- **Watchdog:** every 5 minutes; alerts to ntfy.sh or Discord if prices are more than 10 minutes old.
- **Cost:** $0 on the Workers Free plan. No card needed.

## Local development

```sh
npm ci
npm test              # unit tests with fake APIs (no keys, no network)
npm run typecheck
npm run dev           # .dev.vars from your shell env (FINNHUB_KEY), then wrangler dev
curl "http://127.0.0.1:8787/__scheduled?cron=*+13-21+*+*+1-5"   # run one refresh (45 Finnhub calls)
curl -H "Origin: http://localhost:8081" http://127.0.0.1:8787/v1/prices
```
`/v1/prices` and `/v1/quote/*` answer 403 to a request without an allowed `Origin`, so curl needs the header. `npm run dev` writes `DEV_ALLOW_LOCALHOST=1` into `.dev.vars`, which allows `http://localhost` / `http://127.0.0.1` origins in local development only; it is never in `wrangler.toml`, and it has no effect on the deployed Worker. To run the app locally against the local Worker, set `EXPO_PUBLIC_PRICE_API_URL=http://127.0.0.1:8787`; the deployed Worker will not answer a localhost page.

Each manual run uses 45 of Finnhub's 60 calls a minute: wait a minute between runs. Outside market hours a refresh does nothing by design. `DEV_FORCE_OPEN=1 npm run dev` treats the market as open, for local testing only; never set it on the deployed Worker. `.dev.vars` is git-ignored; delete it when done.

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
   ALLOWED_ORIGINS = "https://<production web domain>,https://investmentapp-*-malik-c31f.vercel.app"
   ```
   `*` matches one hostname part, which covers Vercel preview URLs. Only these sites can read `/v1/prices` and `/v1/quote/*`: any other site, and any request with no `Origin` (curl, a browser tab opened on the URL), gets 403. `/v1/health` stays open. `localhost` is not allowed on the deployed Worker. This is not authentication: a script that sends an allowed `Origin` header still gets through, and a native app (no `Origin`) would be refused too.
5. **Set the two secrets.** Each command prompts for the value; nothing is written to disk or shell history.
   ```sh
   npx wrangler secret put FINNHUB_KEY      # the NEW server-only Finnhub key; never the key the app used to carry
   npx wrangler secret put ALERT_URL        # e.g. https://ntfy.sh/<long random topic>, or a Discord webhook URL
   ```
   - **`FINNHUB_KEY`:** create a dedicated key in the Finnhub dashboard for the robot only. Don't reuse it anywhere else (not in Vercel, not in the app): it must stay on the server. Check it first: `curl -H "X-Finnhub-Token: <key>" "https://finnhub.io/api/v1/quote?symbol=VOO"` should answer a price, not 401/403.
   - **`ALERT_URL`:** for ntfy, install the ntfy app on your phone and subscribe to the same topic name. Treat the topic name like a password: anyone who knows it can read and send.
   - **If you already deployed the Alpaca version**, remove its now-unused secrets:
     ```sh
     npx wrangler secret list                 # names only
     npx wrangler secret delete ALPACA_KEY_ID
     npx wrangler secret delete ALPACA_SECRET_KEY
     ```
6. **Deploy.**
   ```sh
   npx wrangler deploy
   ```
   It prints the URL, e.g. `https://price-robot.<your-subdomain>.workers.dev`.
7. **Check it.**
   - **Right away:** `curl https://price-robot.<your-subdomain>.workers.dev/v1/health`. Before the first run it says `"ok":false` with no prices; that's expected.
   - **During market hours:** within 3 minutes, `/v1/health` should show `"ok":true`, `"finnhubOk":true`, `"authError":null` and `"counts":{"quotes":110,…}` (109 while Finnhub has no data for `EA`). `confirmed` should stay close to the quote count; `old` near 0. `/v1/prices` needs an allowed origin: `curl -H "Origin: https://<production web domain>" https://price-robot.<your-subdomain>.workers.dev/v1/prices`. Without the header it answers 403, which is expected.
   - **Daily request count:** Cloudflare counts every request to the Worker, refused ones included. Dashboard → Workers & Pages → price-robot → Metrics (up to three months back). The Free plan allows 100,000 a day.
   - `npx wrangler tail` shows each run's summary live: `finnhubCalls` (≤ 45), `priority`, `subrequests` (≤ 48), `wrote`, `old`.
8. **Give the URL to the app:** when the app PR ships, set `EXPO_PUBLIC_PRICE_API_URL` to it in Vercel (production), delete `EXPO_PUBLIC_FINNHUB_KEY`, and redeploy.

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
