# Price robot: design (S6)

**Status:** approved; licensing resolved. Worker and app switch are built and tested. Not deployed yet: Jeremiah deploys the Worker (§7), then ships the app.
**Date:** 2026-10-04. Limits below were checked on this date (sources at the end).

## 0. Licensing: approved in writing

Both providers' standard free-plan terms forbid redistribution: Alpaca's support page says *"you cannot redistribute Alpaca API data"*, and Finnhub's terms require *"written approval from Finnhub"* to share data or derived results. **Both have now given that approval in writing:**

| | Alpaca (Basic, free, IEX feed) | Finnhub (free) |
|---|---|---|
| **What's approved** | Displaying Alpaca prices to our students in the app | Displaying Finnhub prices to our students in the app |
| **Setup it covers** | A robot fetching on a server and sharing cached prices with all students | Same, at **about 8 requests a minute** |
| **Plan** | Free plan | Free plan |
| **Duration** | No expiry | No expiry |
| **Conditions** | Educational and non-commercial use; no resale | Educational and non-commercial use; no resale |

What this means for us:
- The robot must stay within the setup described. Finnhub's rate is capped in code at 15 calls per 2-minute run (7.5/min), and nothing else in the Worker calls Finnhub (§3).
- Charging for the app, reselling prices, or exposing them as a public data feed would fall outside the approvals: ask again first.
- **Credit:** the app shows a small "Prices from Alpaca/Finnhub" next to prices (§5).
- The original emails are kept in Jeremiah's inbox and in our shared folder.

**Optional future adapter, not built:** Twelve Data (Venture plan, or its non-profit programme) explicitly allows external display, if we ever need a licensed source that doesn't depend on these approvals. Sources sit behind one interface (`alpaca.ts`, `finnhub.ts`), so adding it would touch one file plus the merge rules.

## 1. Verified limits

| Service | Free limit (checked 2026-10-04) | Our use |
|---|---|---|
| **Cloudflare Workers** | 100,000 requests/day · **10 ms CPU** per request and per cron run · cron wall clock 15 min · **50 subrequests** per invocation · 6 open connections · **5 cron triggers per account** · 128 MB | 2 crons. **At most 19 subrequests per run.** Parsing the 110-ticker snapshot takes ~0.8 ms CPU. |
| **Workers KV** | 100,000 reads/day · **1,000 writes/day** · 1 write/s per key · 25 MiB per value | ~200 writes per trading day, see §4. The price blob is ~12 KB. |
| **Alpaca** Basic | 200 calls/min · IEX feed only (one exchange) · WebSocket 30 symbols | 1 call per 2 min for all tickers, plus on-demand calls. |
| **Finnhub** free | 60 calls/min (30/s cap) | **15 per run = 7.5/min**, within the approved ~8/min. |

**Tested with the real keys:**
- **Alpaca:** one `/v2/stocks/snapshots?feed=iex` call returns all 110 app tickers (66 KB, 0.45 s).
- **Finnhub:** `/quote` works for stocks and ETFs (AAPL, VOO).
- **Calendar:** Alpaca's calendar knows holidays and early closes (Nov 27, 2026 closes at 13:00).
- **IEX vs. consolidated close (Oct 2):** AAPL 333.75 vs 333.69 (0.02%), VOO 707.35 vs 707.54 (0.03%).
- **Full Worker in `wrangler dev`:**
  - one refresh run made 16 calls (1 Alpaca + 15 Finnhub), wrote all 110 tickers and took 0.8 s wall time;
  - the next run moved on to the next 15 tickers;
  - `/v1/quote/SQ` answered with `XYZ`.
- **`SQ` → `XYZ`:** `SQ` last traded on 2025-01-17 (Block changed its ticker). The robot serves `XYZ` and maps `SQ` to it.

**Accounts** (owned by Jeremiah, managed with his agreement):
- **Alpaca:** paper-trading account; market-data keys need no funding and no card.
- **Cloudflare:** free account, no card; the Worker runs on a `*.workers.dev` URL, no domain needed.

## 2. Tickers supported

- **Exactly the app's 110 tickers** (`stockDatabase` in `stockDataService.ts`), with `SQ` served as `XYZ`. Students can't open or trade anything else, so **all 110 are refreshed in one Alpaca call every 2 minutes**. Held and recently requested tickers are always a subset of these.
- **Real maximum per run:** Alpaca documents no symbol cap (a 1,090-symbol request worked). The limit is the 10 ms CPU budget: about **500 tickers** with a safe margin (estimate). A test fails if the list grows past 500.
- The Worker rejects any other symbol. A test fails if its list and the app's drift apart.

## 3. How it works

```
            ┌──────────── Cloudflare Worker "price-robot" (Jeremiah's account, Free) ───────────┐
 cron */2 ─▶│ refresh(): calendar gate → Alpaca snapshot (110) → Finnhub (15) → merge → 1 KV write │
 cron */5 ─▶│ watchdog(): prices > 10 min old in session → one Alpaca-only catch-up → alert        │
            │                         KV  prices:v1  (~12 KB)                                       │
 app ──GET─▶│ /v1/prices   /v1/quote/:sym   /v1/health      (cached 30 s, CORS for app origins)     │
            └───────────────────────────────────────────────────────────────────────────────────────┘
 Worker secrets only: ALPACA_KEY_ID, ALPACA_SECRET_KEY, FINNHUB_KEY, ALERT_URL
```

Firebase is unchanged (Spark plan); prices never go through Firestore.

### Schedule (2 of the account's 5 cron triggers)
- **Refresh: `*/2 13-21 * * 1-5` (UTC).**
  - That window covers 9:30–16:00 New York time in both EDT and EST.
  - Each run checks the trading calendar first. It's fetched from Alpaca once a day and stored in the blob; if Alpaca is down, regular weekday hours are used.
  - From one minute before the open until the close, the run refreshes. At any other time it stops before any price call, so nights, weekends, holidays and early-close afternoons make none.
- **Closing snapshot:** the first run after the close (within 6 minutes) fetches once more and marks the day `final`. Later runs that day do nothing.
- **Watchdog: `*/5 * * * *`.** Acts from 5 minutes after the open until 15 minutes after the close; otherwise it exits immediately.

### Refresh run (≤ 19 subrequests: calendar ≤ 1, Alpaca ≤ 3, Finnhub 15)
1. **Alpaca:** one snapshot call for all 110 tickers. On a network error, 429 or 5xx it retries after 1 s and 3 s. A 401/403 isn't retried, and the watchdog reports it.
2. **Finnhub:** 15 tickers, picked in this order:
   - tickers flagged by the previous run;
   - then the tickers Finnhub checked longest ago, Tier 1 first on ties.

   That one ordering gives two behaviours:
   - **normally:** a cross-check of every ticker about every 15 minutes;
   - **during an Alpaca outage:** Tier 1's 37 tickers get Finnhub prices within 3 runs (~6 min), and all 110 within 8 runs (~16 min).

   The key goes in a header, never in the URL. A 429 or 401/403 stops the batch for that run.
3. **Per-ticker choice:**

   | Situation | Shown price |
   |---|---|
   | Alpaca trade < 15 min old, and Finnhub agrees within 1% or wasn't checked this run | Alpaca |
   | Alpaca and Finnhub differ by **more than 1.0%** | Finnhub; the ticker is flagged and re-checked next run |
   | Alpaca's last trade is **older than 15 min** (no recent IEX trade), or Alpaca failed | Finnhub, if fetched this run |
   | Nothing new this run | The newest price we have. If that's over 15 min old it's marked `stale` and flagged for Finnhub next run. |

   **Why 1.0%:** real gaps on these liquid names are a few hundredths of a percent (0.02–0.03% measured). Above 1%, one feed is wrong. A lower threshold would flip sources on normal noise.
4. **One KV write** of the merged blob (retried once if it fails).

**Blob `prices:v1`:**
```json
{ "v": 1, "asOf": "2026-10-02T19:58:00.000Z", "market": "open", "final": false,
  "session": { "date": "2026-10-02", "open": 570, "close": 960, "source": "alpaca" },
  "alpacaOk": true, "alpacaFails": 0, "authError": null, "retry": [],
  "quotes": { "AAPL": { "p": 333.75, "pc": 330.44, "t": "2026-10-02T19:57:59.000Z", "src": "alpaca", "hi": 334.5, "lo": 330.6, "chk": 0.02, "chkAt": "…" } } }
```
`t` is the trade time, never the fetch time, so a price is never presented as newer than its trade.

### HTTP endpoints (public, read-only)
- **`GET /v1/prices`:** all quotes, without the robot's bookkeeping (`retry`, `chk`, keys). Cached for 30 s in the Worker's memory, so KV is read about twice a minute per Worker instance, not once per student. (The Cache API does nothing on `*.workers.dev`; it's used too, and helps if we ever add a custom domain.)
- **`GET /v1/quote/:SYM`** (on-demand; "jumps the queue"):
  - **When it fetches:** if the stored quote is more than **4 minutes** old (or stale) during the session, it asks **Alpaca** for that one ticker right away.
  - **Caching:** the answer is cached 15 s the same way, so a classroom opening the same stock costs about one call.
  - **Limits:**
    - no KV write, to protect the 1,000/day budget;
    - no Finnhub call, to stay within the approved rate.
  - **Other symbols:** unknown ones get 404; `SQ` answers as `XYZ`.
- **`GET /v1/health`:** age, source counts, Alpaca status, refused-key status; **503** when prices are stale during the session.
- **CORS:** only the origins in `ALLOWED_ORIGINS` (exact, or with `*` inside a hostname for Vercel preview URLs), plus `localhost`. Native apps send no Origin; this keeps other websites from embedding the feed, it isn't access control.

### Watchdog
- If the blob is **more than 10 minutes old** during the session (and the day isn't already `final`), it runs one **Alpaca-only** catch-up refresh. It alerts only if prices are still stale afterwards.
- **Also alerts on:**
  - Alpaca failing 3 runs in a row;
  - more than 10 tickers on Finnhub or stale;
  - a provider refusing a key (401/403).
- **One message when a problem starts and one when it clears.** The state is a small KV key written only on a change, so a long outage doesn't send an alert every 5 minutes.
- **Channel:** `ALERT_URL` takes either an **ntfy.sh** topic URL (push to a phone, no account) or a **Discord webhook**. Without it, alerts only go to the Worker log.

## 4. Free-plan budget

| Resource | Per trading day | Limit | Headroom |
|---|---|---|---|
| KV writes | 196 refresh runs (6.5 h × 30) + 1 close + 1 new-day session + watchdog changes ≈ **200** | 1,000 | 5× |
| KV reads | ≈ 2/min per active Worker instance + cron reads ≈ **2,000**; never more than 1 per app request | 100,000 | 50× |
| Worker requests | crons ≈ 560; app polls every **2 min** while open ⇒ 30 per student-hour | 100,000 | ≈ **3,300 student-hours/day** |
| Alpaca calls | 0.5/min + on-demand | 200/min | large |
| Finnhub calls | **7.5/min**, fixed | 60/min (approved ~8/min) | within approval |

**Expected cost: $0.** There's no card on the Cloudflare account, so going over a limit can't create a charge. The Worker would return errors until the daily reset (UTC), and the app would fall back as in §5.

## 5. App changes

1. **New `priceRobotAdapter.ts`** replaces `finnhubAdapter.ts` (deleted).
   - Polls `/v1/prices` every 2 minutes while the app is open: one request for all tickers, instead of up to 110 Finnhub calls per device.
   - Stock detail and the trade re-quote use `/v1/quote/:SYM`.
   - `EXPO_PUBLIC_PRICE_API_URL` is the Worker URL; it's not a secret. Without it the app runs on the January snapshot, labelled "Simulated prices".
   - `stockDataService` stays the one in-memory store every screen reads from. Each price is tagged **live** (confirmed by the robot within the last 5 minutes) or **saved** (device storage, or not reconfirmed).
2. **Never blank, never stuck on "Loading…":**
   - Screens render right away from the best price on the device.
   - Fetches time out after 5 s and never block the screen.
   - The last good prices are saved on the device, so the fallback order is live → saved → Jan 15 snapshot.
   - Browse and the stock page open from the device's prices at once; the stock page no longer shows "Loading…".
3. **Label and credit:** one small line under prices on Home, Portfolio, Browse, the stock page and the trade ticket:
   - the shared label is "Prices as of 3:58 PM", "Closing prices · Oct 2", "Saved prices from Oct 2, 3:58 PM" or "Not live · Jan 15 snapshot";
   - the stock page shows the stock's own label instead, e.g. "Price as of 3:58 PM · Alpaca" or "Closing price · Oct 2 · Finnhub";
   - the credit **"Prices from Alpaca/Finnhub"** follows whenever robot prices are on screen.
4. **Trade re-quote** keeps today's rule (no confirmed quote, no fill) and asks `/v1/quote`. Saved prices never fill a trade, mark a position or grade a prediction.
5. **Remove `EXPO_PUBLIC_FINNHUB_KEY`** and every direct Finnhub call from the bundle.
   - **Earnings signals** are turned off for now (`earningsData.ts` returns no quarters, so no signal shows); they'd need their own robot endpoint.
   - **Company news** is already hidden.
6. Rename `SQ` → `XYZ`. Saved positions in `SQ` keep working through the alias.
7. Only confirmed live prices are written into saved positions, which then feed the leaderboard (unchanged rule).

## 6. Old app versions after the old key is rotated

The old production key is **already refused by Finnhub (403)**, so rotating it changes nothing students see today:
- **Prices:** old builds show the Jan 15 snapshot.
- **Saved positions:** keep their last real mark.
- **Trading:** old builds can't trade ("price unavailable"), as today.

How each platform gets the new version:

| Platform | How |
|---|---|
| **Web** | Next Vercel production deploy. |
| **iOS / Android** | `expo-updates` is configured (`runtimeVersion: appVersion`) and this change is JavaScript only, so an **EAS Update** reaches installed apps on their next launch or two, with no store review. |

Rotation still matters: the old key is public in every old bundle.

## 7. Setup and deploy

Deploy steps for Jeremiah are in `workers/price-robot/README.md`. In short:
1. Create an API token from the **"Edit Cloudflare Workers"** template, limited to his account, with a 30-day expiry.
2. Create the KV namespace.
3. Set the four secrets and `ALLOWED_ORIGINS`.
4. Deploy, then check `/v1/health`.

**Local testing (no Cloudflare account needed):**
```sh
cd workers/price-robot
npm ci
npm test                       # unit tests, fake APIs
npm run dev                    # writes .dev.vars from your shell env, starts wrangler dev
curl "http://127.0.0.1:8787/__scheduled?cron=*/2+13-21+*+*+1-5"   # one refresh run
curl http://127.0.0.1:8787/v1/prices
```
Outside market hours a run does nothing by design. `DEV_FORCE_OPEN=1 npm run dev` treats the market as open, for local testing only; never set it on the deployed Worker.

**App release (Jeremiah):**
1. Merge the app PR.
2. Set `EXPO_PUBLIC_PRICE_API_URL` in Vercel production and EAS, and **delete `EXPO_PUBLIC_FINNHUB_KEY`** from both.
3. Redeploy web and publish an EAS Update.
4. Rotate the old Finnhub key.

## 8. Code and tests

`workers/price-robot/src/`:

| File | What it does |
|---|---|
| `alpaca.ts`, `finnhub.ts` | Source adapters |
| `calendar.ts` | Market hours |
| `merge.ts` | The rules in §3 |
| `refresh.ts` | Cron run |
| `watchdog.ts` | Staleness checks and alerts |
| `http.ts` | Endpoints |
| `symbols.ts` | The 110 tickers and the `SQ` alias |

**App tests** (`priceRobotAdapter.test.ts`, 17 tests): live, saved and snapshot fallbacks; the 5-second timeout; saved prices never replacing live ones or reaching positions; on-demand quotes; labels; the `SQ` alias; the credit; a single poller. A web build with an old `EXPO_PUBLIC_FINNHUB_KEY` set was checked: no key and no `finnhub.io` in the bundle.

**Worker tests** (vitest, fake APIs; no keys, no network): 62 tests, covering:
- the merge rules: fresh, divergence, stale, Alpaca down, both down, refused keys;
- full Finnhub coverage during an outage;
- holiday, early close and daylight-saving changes;
- the closing snapshot happening once;
- subrequests ≤ 20;
- the KV write retry;
- the watchdog alerting only on changes;
- endpoints, the 30-second cache, CORS and the 404 for unknown symbols;
- the symbol list and cron schedule matching the app and `wrangler.toml`.

**CI:** a separate `price-robot` job runs the typecheck and the tests.

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Use outside the approvals (monetising, resale, a public feed) | Approvals no longer cover us | Noted here; ask the providers first |
| IEX is one exchange; its last trade and close differ slightly from official prices | Small differences (0.02–0.03% measured) | Finnhub cross-check over 1%; the credit names the sources |
| IEX raised its real-time data fees (Oct 1, 2026) | Alpaca could change the free IEX feed (unverified) | Finnhub covers; the watchdog alerts on refused keys |
| 10 ms CPU per run | A much larger list could hit the cap | ~0.8 ms measured; a test caps the list at 500 |
| KV is eventually consistent (up to ~60 s between regions) | A student may see the previous run | Within the 2-minute cadence; labels show real times |
| Over 3,300 student-hours/day | Worker errors until the daily reset | App falls back to saved prices; Workers Paid is $5/mo with a card (Jeremiah's call) |
| Cloudflare and Alpaca accounts belong to Jeremiah | Only he can grant deploy access | Scoped, expiring tokens if anyone else deploys |
| Cron runs late or skipped | Missed runs | Watchdog catches up, then alerts |

## Sources
- Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Workers KV limits: https://developers.cloudflare.com/kv/platform/limits/
- Alpaca market data plans: https://docs.alpaca.markets/docs/about-market-data-api
- Alpaca snapshots endpoint: https://docs.alpaca.markets/reference/stocksnapshots-1
- Alpaca redistribution (standard terms): https://alpaca.markets/support/redistribute-alpaca-api
- Finnhub terms: https://finnhub.io/terms-of-service
- IEX real-time TOPS fee change (Oct 1, 2026): https://www.federalregister.gov/documents/2026/07/29/2026-15247/
