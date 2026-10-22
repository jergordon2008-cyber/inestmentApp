# Price robot: design (S6)

**Status:** Finnhub only. Built and tested; not deployed yet. Jeremiah deploys the Worker (§7), then ships the app.
**Date:** 2026-10-22. Limits below were checked on this date (sources at the end).

## 0. Licensing: display NOT approved (accepted risk)

| | Alpaca (free, IEX feed) | Finnhub (free) |
|---|---|---|
| **Display to students** | **Refused** | **Not approved** |
| **In the live robot** | No. The adapter stays in the code, disabled (`alpaca.ts`) | Yes, the only source |

- **Alpaca** refused permission to show its data to our students. Nothing in the live path calls Alpaca; a test fails if any Worker file imports `alpaca.ts` or if `wrangler.toml` names Alpaca secrets.
- **Finnhub's** terms require *"written approval from Finnhub"* to share its data or results derived from it. We don't have that approval. **Both founders decided on 2026-10-22 to go live on Finnhub anyway and accept the risk** (Finnhub could refuse or revoke the key, or ask us to stop). Twelve Data, the licensed alternative, isn't available to us.
- **What limits the risk:**
  - prices are shown only inside the app, to signed-in students, for education;
  - no resale and no public feed: `/v1/prices` and `/v1/quote/*` answer only the app's own web origins (§3);
  - the app credits the source ("Prices from Finnhub").
- **What would make it worse:** charging for the app, or exposing prices to anyone outside the app.
- **If Finnhub refuses the key** (HTTP 401/403): the watchdog sends an ntfy alert and the app falls back to saved prices, labelled as such (§5). There is no second source to switch to.
- **The robot uses a dedicated, server-only Finnhub key**, used by nothing else and never in the app. The old key from the app bundle (public, already refused) must not be reused.

## 1. Verified limits

| Service | Free limit (checked 2026-10-22) | Our use |
|---|---|---|
| **Cloudflare Workers** | 100,000 requests/day · **10 ms CPU** per request and per cron run · **50 subrequests** per invocation (fetch; KV operations have their own limit of 1,000) · 6 open connections · **5 cron triggers per account** | 2 crons. **At most 48 subrequests per run**, counting the 3 KV operations even though they have their own limit. |
| **Workers KV** | 100,000 reads/day · **1,000 writes/day** · 1 write/s per key · 25 MiB per value | ≈ 400 writes per trading day plus at most 200 for the demand list (§4). The price blob is ~15 KB. |
| **Finnhub** free | **60 calls/min** (30/s cap) | **45 per minute**, hard-capped in code; the watchdog's rare catch-up adds at most 10 (55). |

**Tested with the new key on 2026-10-22, during market hours:**
- `/quote` works for stocks and ETFs: **AAPL and VOO answered** (VOO 701.71, trade 16:56 UTC).
- `/stock/market-holiday?exchange=US` lists holidays and early closes for 2026 and 2027 (Nov 27 and Dec 24, 2026 close at 13:00).
- **Full Worker in `wrangler dev`, three cron runs one minute apart:**
  - each run made 45 Finnhub calls and 48 subrequests in all;
  - 45 → 88 → 109 tickers stored;
  - the ticker opened in the app (`ZM`) was fetched first in every run;
  - `/v1/prices` without an `Origin` answered 403.
- **`EA` gets no price:** Finnhub answers `c: 0` (no quote data) while its company profile still exists. EA stays on the January snapshot and can't be traded; whether to keep it in the stock list is an open decision.
- **`SQ` → `XYZ`:** `SQ` last traded on 2025-01-17 (Block changed its ticker). The robot serves `XYZ` and maps `SQ` to it.

**Accounts:** Cloudflare (free, no card) is owned by Jeremiah and managed with his agreement. The Finnhub key for the robot is new and server-only.

## 2. Tickers supported

- **Exactly the app's 110 tickers** (`stockDatabase` in `stockDataService.ts`), with `SQ` served as `XYZ`. A test fails if the Worker's list and the app's drift apart.
- The Worker rejects any other symbol (404).

## 3. How it works

```
            ┌──────────── Cloudflare Worker "price-robot" (Jeremiah's account, Free) ───────────────┐
 cron * ───▶│ refresh(): calendar gate → plan 45 tickers (priority first) → Finnhub → 1 KV write      │
 cron */5 ─▶│ watchdog(): prices > 10 min old in session → one 10-call catch-up → ntfy alert         │
            │       KV  prices:v1 (~15 KB)    demand:v1 (held/opened tickers)    watchdog:v1        │
 app ──GET─▶│ /v1/prices?held=…   /v1/quote/:sym   /v1/health    (cached, CORS for app origins)       │
            └────────────────────────────────────────────────────────────────────────────────────────┘
 Worker secrets only: FINNHUB_KEY, ALERT_URL
```

Firebase is unchanged (Spark plan); prices never go through Firestore.

### Schedule (2 of the account's 5 cron triggers)
- **Refresh: `* 13-21 * * 1-5` (UTC), every minute.**
  - That window covers 9:30–16:00 New York time in both EDT and EST.
  - Each run checks the trading calendar first: Finnhub's holiday list, fetched once a day (one call, counted in the 45) and stored in the blob. If Finnhub's list can't be fetched, regular weekday hours are used.
  - From one minute before the open until the close, the run refreshes. At any other time it stops before any price call, so nights, weekends, holidays and early-close afternoons make none.
- **Closing snapshot:** runs after the close continue (up to 6 minutes) until every ticker has a price confirmed after the close (3 runs at 45 a run), then the day is marked `final`. Later runs that day do nothing.
- **Watchdog: `*/5 * * * *`.** Acts from 5 minutes after the open until 15 minutes after the close; otherwise it exits immediately.

### Refresh run (≤ 45 Finnhub calls, ≤ 48 subrequests)
1. **Plan 45 tickers** (44 on the one run a day that fetches the calendar):
   - **Priority, up to 12 slots:** tickers students **hold** (the app sends them with each poll, `?held=AAPL,VOO`) or **opened recently** (`/v1/quote/:sym`), within the last 30 minutes. Least recently confirmed first.
   - **Rotation, the other 33+:** every other ticker, least recently confirmed first (never-confirmed first; Tier 1 before the rest on ties).
2. **Finnhub `/quote`** for those tickers, 5 at a time. The key goes in a header, never in the URL. A 429 or 401/403 stops the batch for that run.
3. **Store:** each answered ticker gets the price, the trade time `t` and the confirmation time `at`. An answer with an older trade time than the stored one is ignored. Unanswered tickers keep their last price and `at`.
4. **One KV write** of the merged blob (retried once if it fails).

### How often each of the 110 tickers is refreshed
Simulated over a full trading day (390 one-minute runs, `test/merge.test.ts` checks the bounds):

| Priority tickers (held or opened) | Priority tickers refreshed | Every other ticker refreshed |
|---|---|---|
| 0 | — | every 2.4 min on average, **at most 3 min** |
| 5 | **every minute** | every 2.6 min on average, at most 3 min |
| 12 | **every minute** | every 3.0 min on average, at most 3 min |
| 20 | every 1.7 min on average, at most 2 min | every 2.7 min on average, at most 3 min |
| 40 | every 2.0 min on average, at most 3 min | every 2.8 min on average, at most 3 min |
| all 110 (a misbehaving client) | every 2.4 min on average, at most 3 min | — |

So **every ticker is reconfirmed at least every 3 minutes** while Finnhub answers, whatever the priority list holds; up to 12 held/opened tickers every minute. Exceptions: a ticker Finnhub has no data for (today `EA`), and runs Finnhub refuses (429/5xx), which the watchdog reports.

### Priority list (`demand:v1`)
- Requests only note tickers in the Worker's memory. At most once a minute, each Worker instance merges them into KV, after sending the response.
- It writes only when it has a ticker KV doesn't know, or one KV last saw more than 10 minutes ago. **Hard cap: 200 writes a day.** Past that, priority stops updating for the day and the rotation still covers everything.
- Two instances writing at once can drop each other's tickers; the next flush adds them back. Best effort by design.
- The list holds ticker names and times only: no user ids, nothing about who holds what.

**Blob `prices:v1`:**
```json
{ "v": 1, "asOf": "2026-10-22T16:58:38.362Z", "market": "open", "final": false, "closeFrom": null,
  "session": { "date": "2026-10-22", "open": 570, "close": 960, "source": "finnhub" },
  "finnhubOk": true, "finnhubFails": 0, "authError": null,
  "quotes": { "VOO": { "p": 701.83, "pc": 710.72, "t": "2026-10-22T16:58:14.000Z", "src": "finnhub", "at": "2026-10-22T16:58:38.362Z", "hi": 705.66, "lo": 700.52 } } }
```
`t` is the trade time, never the fetch time, so a price is never presented as newer than its trade. `at` is when the robot last got it from Finnhub.

### HTTP endpoints (read-only; prices only for the app's own sites; none calls Finnhub)
- **`GET /v1/prices`:** all quotes, trimmed to what the app reads: `v`, `asOf`, `market` and, per ticker, `p`, `pc`, `t`, `src`, `hi`, `lo`, `at` (an allow-list in `publicView`, so a field added later isn't served by accident). `?held=` (up to 40 known tickers) feeds the priority list and doesn't change the answer. Cached for 30 s in the Worker's memory, so KV is read about twice a minute per Worker instance, not once per student.
- **`GET /v1/quote/:SYM`:** one ticker from KV, cached 15 s. **No upstream call** (before: an on-demand Alpaca fetch): asking makes the ticker a priority, so the next run, within a minute, refreshes it. That keeps Finnhub at a fixed 45/min whatever the traffic. Unknown symbols get 404; `SQ` answers as `XYZ`.
- **`GET /v1/health`:** age, `finnhubOk`, refused-key status, and `counts` (`quotes` stored, `confirmed` = Finnhub price within 5 minutes, out of 110, `old`); **503** when prices are stale during the session. Always open, so the watchdog and a person can check it.
- **Origin check (`/v1/prices` and `/v1/quote/*`):** unchanged. **403** unless the request's `Origin` header is in `ALLOWED_ORIGINS` (exact, or with `*` inside a hostname for Vercel preview URLs), and also when there is no `Origin` at all. The check runs first, so a refused request reads no KV and records no priority. `localhost` is **not** allowed on the deployed Worker; `npm run dev` adds it through `DEV_ALLOW_LOCALHOST` in the git-ignored `.dev.vars`.
  - **What it stops:** other websites using the API; a person opening or sharing the URL in a browser; curl and scripts that send no `Origin`.
  - **What it doesn't stop:** a script that sends `Origin: <an allowed site>`. It is not authentication.

### Watchdog
- If the blob is **more than 10 minutes old** during the session (and the closing snapshot isn't done), it runs one **catch-up refresh of at most 10 Finnhub calls** (45 + 10 stays under 60/min). It alerts only if prices are still stale afterwards.
- **Also alerts on:**
  - Finnhub returning no prices for 3 runs in a row;
  - more than 10 tickers without a price confirmed in the last 5 minutes while the market is open (trades in them are blocked);
  - Finnhub refusing the key (401/403).
- **One message when a problem starts and one when it clears.** The state is a small KV key written only on a change.
- **Channel:** `ALERT_URL` takes an **ntfy.sh** topic URL (push to a phone) or a **Discord webhook**. Without it, alerts only go to the Worker log.

## 4. Free-plan budget

| Resource | Per trading day | Limit | Headroom |
|---|---|---|---|
| Finnhub calls | **45/min** during the session, fixed; +10 in a watchdog catch-up | 60/min | 15/min |
| Subrequests per run | ≤ 45 Finnhub + 3 KV = **48** | 50 | 2 |
| KV writes | 391 session runs + ~3 closing runs + 1 new-day session ≈ **395**; demand list **≤ 200** (capped); watchdog changes only | 1,000 | ≥ 1.7× in the worst case |
| KV reads | ≈ 2/min per active Worker instance + 2 per cron run + demand flushes ≈ **3,000** | 100,000 | 30× |
| Worker requests | crons ≈ 830; app polls every **minute** while open ⇒ 60 per student-hour | 100,000 | ≈ **1,650 student-hours/day** |
| CPU per run | 45 small JSON answers + one ~15 KB blob | 10 ms | not measured on Cloudflare; small payloads |

**Expected cost: $0.** There's no card on the Cloudflare account, so going over a limit can't create a charge. The Worker would return errors until the daily reset (UTC), and the app would fall back as in §5. The app now polls every minute instead of every 2, which halves the student-hours the request limit allows; Workers Paid ($5/mo, card needed) lifts it if we ever get close.

## 5. App changes

1. **`priceRobotAdapter.ts`** polls `/v1/prices?held=<this student's holdings>` **every minute** while the app is open; stock detail and the trade re-quote use `/v1/quote/:SYM` (which also makes that stock a priority). `EXPO_PUBLIC_PRICE_API_URL` is the Worker URL; not a secret. Without it the app runs on the January snapshot, labelled "Simulated prices".
2. **Never blank, never stuck on "Loading…":** screens render at once from the best price on the device; fetches time out after 5 s; the fallback order is live → saved on the device → Jan 15 snapshot.
3. **Label and credit:** "Prices as of 3:58 PM", "Closing prices · Oct 2", "Saved prices from Oct 2, 3:58 PM" or "Not live · Jan 15 snapshot"; the stock page shows the stock's own "Price as of 3:58 PM · Finnhub"; the credit **"Prices from Finnhub"** follows whenever robot prices are on screen.
4. **Trades only at prices confirmed in the last 5 minutes.** During the session the 5 minutes count from the robot's own confirmation (`at`, measured against the run time `asOf`, so a wrong device clock doesn't matter), not from when the device downloaded the price. A ticker the robot couldn't reconfirm stops being tradable after 5 minutes even if the device just polled. Not counted: up to ~1 minute between the robot writing a price and the device receiving it (KV propagation and the 30 s cache). Outside the session closing prices count from the download, so trades fill at the closing price, as before. Saved prices never fill a trade, mark a position or grade a prediction.
5. **No Finnhub key and no direct Finnhub call in the app bundle.** Earnings signals stay off; company news stays hidden.
6. `SQ` → `XYZ`; saved `SQ` positions keep working through the alias. Prices saved on a device before the switch still say "· Alpaca" until replaced.

## 6. The old version after the old key is rotated

Production is the Vercel web app only; there's no phone app. The old production key is **already refused by Finnhub (403)**. Until the new version is deployed, the old one keeps the Jan 15 snapshot prices, saved positions at their last real mark, and trading blocked ("price unavailable"). Students get the new version with the next Vercel production deploy (a page reload). Rotation still matters: the old key is public in every old bundle.

## 7. Setup and deploy

Deploy steps for Jeremiah are in `workers/price-robot/README.md`. In short:
1. Log in with `npx wrangler login`.
2. KV namespace: already created (id in `wrangler.toml`).
3. Set **two** secrets: `FINNHUB_KEY` (the new server-only key) and `ALERT_URL`. If the Alpaca secrets were set on an earlier deploy, delete them.
4. Deploy, then check `/v1/health`.

**Local testing (no Cloudflare account needed):**
```sh
cd workers/price-robot
npm ci
npm test                       # unit tests, fake APIs
FINNHUB_KEY=… npm run dev      # writes .dev.vars from your shell env, starts wrangler dev
curl "http://127.0.0.1:8787/__scheduled?cron=*+13-21+*+*+1-5"   # one refresh run (45 Finnhub calls)
curl -H "Origin: http://localhost:8081" http://127.0.0.1:8787/v1/prices
```
Wait a minute between manual runs: each one uses 45 of Finnhub's 60 calls a minute. Outside market hours a run does nothing by design; `DEV_FORCE_OPEN=1 npm run dev` treats the market as open, for local testing only.

**App release (Jeremiah; production is the Vercel web app only):**
1. Merge the app PR.
2. Vercel → production project → Settings → Environment Variables: add `EXPO_PUBLIC_PRICE_API_URL` = the Worker URL (no trailing slash); **delete `EXPO_PUBLIC_FINNHUB_KEY`**.
3. **Redeploy** production: env vars are baked in at build time.
4. Rotate the old Finnhub key in the Finnhub dashboard.

## 8. Code and tests

`workers/price-robot/src/`:

| File | What it does |
|---|---|
| `finnhub.ts` | The live source; the 45/run budget, 12 priority slots, 10-call catch-up |
| `alpaca.ts` | **Disabled** Alpaca adapter, kept for the future |
| `calendar.ts` | Market hours, from Finnhub's holiday list |
| `demand.ts` | Priority list (held and opened tickers) |
| `merge.ts` | Which tickers each run fetches, and how answers are stored |
| `refresh.ts` | Cron run |
| `watchdog.ts` | Staleness checks and alerts |
| `http.ts` | Endpoints |
| `symbols.ts` | The 110 tickers and the `SQ` alias |

**Worker tests** (vitest, fake APIs; no keys, no network): 100 tests, covering:
- ≤ 45 Finnhub calls and ≤ 50 subrequests per run; no Alpaca call ever; the key never in a URL;
- priority first, every run; the refresh-frequency table above;
- holidays, early closes, weekends, daylight-saving changes; the calendar fallback;
- the closing snapshot completing across runs, then stopping;
- 429 and refused keys; the KV write retry; an older trade never replacing a newer one;
- the demand list: parsing, once-a-minute flushes, the 10-minute re-stamp, 30-minute expiry, the daily write cap;
- the watchdog: 10-call catch-up, alerts only on changes;
- endpoints, caching, CORS, the `at` field, the health counts;
- the disabled Alpaca adapter still parsing correctly and not imported anywhere;
- the symbol list and cron schedule matching the app and `wrangler.toml`.

**App tests** (`priceRobotAdapter.test.ts`, 22 tests): fallbacks, the 5-second timeout, `?held=`, the 5-minute rule counted from the robot's confirmation, closing prices, labels, the credit, the `SQ` alias, a single poller.

**CI:** the `price-robot` job runs the Worker typecheck and tests.

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Finnhub display not approved** | Finnhub may revoke the key or ask us to stop | Accepted by both founders (§0); app-only, origin-restricted, credited; watchdog alerts on a refused key |
| Finnhub is the only source | A Finnhub outage or refused key means no live prices | App falls back to saved prices, labelled; trades blocked; ntfy alert |
| 45/min near the 60/min limit | A burst over 60 gets 429s | Fixed budget in code; no endpoint calls Finnhub; catch-up limited to 10; a 429 stops that run's batch |
| A ticker with no Finnhub data (`EA` today) | Stays on the snapshot, untradable | Visible in `/v1/health` (`old`); keep or remove `EA` is an open decision |
| Prices up to 3 min old between reconfirmations | The "Prices as of" time is the last run, not every ticker's | The stock page shows each stock's own trade time; trades use the per-ticker 5-minute rule |
| KV is eventually consistent (up to ~60 s between regions) | A student may see the previous run; priority list a minute late | Within the 5-minute rule; labels show real times |
| Over ~1,650 student-hours/day | Worker errors until the daily reset | App falls back to saved prices; Workers Paid is $5/mo with a card (Jeremiah's call) |
| Demand cap reached (200 writes) | Priority stops updating for the day | Rotation still covers every ticker within 3 min |
| Cloudflare account belongs to Jeremiah | Only he can grant deploy access | Scoped, expiring tokens |
| Cron runs late or skipped | Missed runs | Watchdog catches up, then alerts |

## Sources
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Workers KV limits: https://developers.cloudflare.com/kv/platform/limits/
- Finnhub API (quote, market holiday): https://finnhub.io/docs/api
- Finnhub terms: https://finnhub.io/terms-of-service
- Alpaca redistribution (standard terms): https://alpaca.markets/support/redistribute-alpaca-api
