# Operations

How TRIP's data and environments are run in production. (Schema lives in
`supabase/schema.sql` + `supabase/migration-*.sql`; app-side docs in README.)

## Maps — Naver Maps JS SDK (native WebView + web static page)

`components/WebMap.tsx` (native) / `WebMap.web.tsx` (web) render real maps
(Explore browse map, day-route lines) using the **Naver Maps JavaScript SDK
v3**, not a native map SDK. Deliberate: the only maintained "native Kakao
map" package turned out to be a mislabeled navigation-launcher (not an
embeddable map view), and Naver's *Mobile* Dynamic Map SDK has no free
quota, while the *Web* Dynamic Map JS SDK gets 6M free requests/month on the
representative NCP account — same product used on map.naver.com. Net effect:
a real interactive map, zero native modules, **the app stays on Expo Go**.

- **Setup**: NCP Console → Menu (☰) → search "Maps" (it's under a top-level
  **Maps** product, not nested in "AI·NAVER API") → Application → register
  with API **Dynamic Map only** (Directions/Geocoding aren't needed — TRIP
  already has coordinates from Visit Seoul, and an unused API on a
  client-exposed key is needless surface area). Add Service URLs:
  `http://127.0.0.1:8081` (exact host **and port** — `localhost` without a
  port, or the wrong port, both 401), and the real deploy domain (e.g.
  `https://dongj12-lee.github.io`) for the gh-pages build. Put the Client ID
  in `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID` (`.env` / `.env.production`) — meant
  to be public, secured by Service-URL whitelisting not secrecy.
- **Why two different implementations**: `react-native-webview` has no web
  target at all (native only). On web, loading the map HTML via a `srcDoc`
  (or `blob:`) iframe seems natural but **always 401s** — the Naver SDK
  reads `window.location` itself for its domain check, and a srcDoc/blob
  iframe reports `about:srcdoc` (or a `blob:` URL), which can never match a
  registered Service URL, no matter what you register. Native WebViews don't
  have this problem — `loadDataWithBaseURL`/`loadHTMLString(baseURL:)`
  genuinely let `window.location` report the given `baseUrl`, which is why
  `WebMap.tsx` can safely inline HTML with `source={{ html, baseUrl }}`.
  The web fix: **`public/naver-map.html`** is a real, same-origin static
  file (Expo Router copies `public/` into `dist/` on export, and serves it
  in local dev too) that `WebMap.web.tsx` points an `<iframe src=...>` at,
  then feeds pins/polyline to via `postMessage` once loaded — genuinely
  same-origin, so the domain check passes for real.
- **Graceful fallback**: `ExploreMap.tsx` and `RouteMap.tsx` render the
  original stylized SVG map (no key needed) whenever
  `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID` is unset — the app never breaks for a
  contributor without the key configured.
- **Shared runtime**: all rendering (grid clustering that re-clusters on
  zoom, category-colored pins, numbered route stops, cluster tap → zoom in)
  lives in `MAP_RUNTIME_JS` in `components/webMapHtml.ts`, injected into both
  the native WebView and the web iframe so the two platforms stay identical.
  `ExploreMap` passes `cluster` (dense browse map); `RouteMap` leaves it off
  (few numbered stops + a dashed polyline).

## Per-leg transit estimates (trip planner)

`lib/transit.ts` renders "how to get there" info between consecutive planner
stops in two tiers:

- **Heuristic (always on, no API)**: straight-line distance from the coords we
  already have → suggested mode (walk ≤1km / subway-bus ≤6km / taxi beyond)
  + rough minutes, displayed as "~14 min" to signal it's an estimate. Tapping
  a leg opens real turn-by-turn: Naver Map app via its documented
  `nmap://route/{walk|public|car}` URL scheme, falling back to a Google Maps
  directions URL (no key needed for either).
- **Seoul transit upgrade (dormant until enabled)**: `lib/transitSeoul.ts`
  swaps a transit-mode leg's estimate for a real route (exact minutes,
  line names, transfers) from the 서울시 대중교통환승경로 API (data.go.kr,
  permanently free government data — chosen over ODsay, whose free tier
  expires after 6 months). Requires: (1) 활용신청 for
  data.go.kr/data/15000414 on the existing data.go.kr account, (2) a
  `seoul-transit` Edge Function proxy (keeps the key server-side; NOT built
  yet), (3) set `EXPO_PUBLIC_SEOUL_TRANSIT_ENABLED=1`. Until then the hook
  no-ops and everything stays on the heuristic — outside-Seoul legs and API
  failures also fall back, so leg info never disappears.

## Weather — KMA (기상청) via Edge Function

Weather comes from the Korea Meteorological Administration open APIs on
data.go.kr (KOGL Type-1 → commercial use OK **with "기상청" attribution**, which
the weather sheet shows). Open-Meteo was dropped because its free tier forbids
commercial use.

- **Proxy**: the `seoul-weather` Supabase Edge Function
  (`supabase/functions/seoul-weather/index.ts`) calls 초단기실황 + 단기예보 +
  중기(기온/육상), merges to the app's `Weather` shape, and 20-min-caches. The
  `KMA_SERVICE_KEY` (the data.go.kr key, **shared with TourAPI**) lives only as a
  function secret — never in the app bundle.
- **Client**: `lib/weather.ts` fetches the function via a plain GET (no headers →
  no CORS preflight); deployed `--no-verify-jwt`.
- **Redeploy** (after editing the function), per project ref
  (dev `iqezjcmpsgawgkvjzcaa`, prod `dwajyyyimwpspdvxeflp`):
  ```
  npx supabase login
  npx supabase functions deploy seoul-weather --no-verify-jwt --project-ref <REF>
  npx supabase secrets set KMA_SERVICE_KEY=<data.go.kr key> --project-ref <REF>
  ```
- data.go.kr APIs needed (활용신청, auto-approved): 기상청_단기예보 조회서비스,
  기상청_중기예보 조회서비스. Seoul grid nx=60 ny=127; mid-term regIds
  11B10101 (기온) / 11B00000 (육상).

## Automated data pipeline (GitHub Actions)

`.github/workflows/data-refresh.yml`, no server needed:

| When | What |
| --- | --- |
| Daily 05:00 KST | `npm run prune:events` — removes time-bound events whose Visit Seoul end date has passed (candidates scan) |
| Tue 03:00 KST (weekly) | `npm run import:visitseoul` (full catalog upsert by slug — new places, updated hours/photos) **then** `npm run prune:events -- --all` (full sweep; runs after the import because the importer can re-add an ended event filed under a permanent category) |

- Manual run: repo → Actions → *Data refresh* → *Run workflow* (check **full**
  for the weekly behavior), or `gh workflow run data-refresh.yml -f full=true`.
- Credentials come from repo Actions secrets: `EXPO_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `VISITSEOUL_API_KEY` (already set). Rotating a
  key = update the secret; nothing in the repo changes.
- If a run fails, GitHub emails the repo owner; data just stays one day stale,
  nothing breaks.

## Web deploy (gh-pages)

Deploy the **web export only**: `npx expo export --platform web` then force-push
`dist/` to the `gh-pages` branch. Do NOT include the iOS export in that commit —
GitHub push protection false-positives on byte patterns inside the Hermes
bundle (`*.hbc` once matched a "PostHog key" regex) and blocks the push. Build
iOS separately when needed for verification.

## Backups (self-managed)

Supabase's free tier has no automated backups, so `.github/workflows/db-backup.yml`
`pg_dump`s production weekly (Mon 04:00 KST) and keeps the gzipped dump as a
GitHub **artifact** (90-day retention, free). Manual run: Actions → *DB backup* →
*Run workflow*.

- **One-time setup**: add a repo Actions secret **`SUPABASE_DB_PASSWORD`** = the
  production DB password only (raw). The host/user (`aws-1-ap-south-1.pooler.supabase.com`,
  `postgres.<ref>`, port 5432, Session pooler — IPv4-friendly) are non-secret and
  hardcoded in the workflow; the password goes via `PGPASSWORD` so special
  characters can't break connection-string parsing (an earlier URI attempt hit
  exactly that). Set it with `gh secret set SUPABASE_DB_PASSWORD -R dongj12-lee/TRIP`.
- **Restore** into a fresh/empty project: `gunzip -c trip-backup-*.sql.gz | psql "<target conn string>"`
  (the dump uses `--clean --if-exists --no-owner --no-privileges`, so it's portable).

## Environments

| File | Points at | Used by |
| --- | --- | --- |
| `.env` | **dev** project (local day-to-day work) | `expo start`, all `scripts/` (they read `.env` via dotenv — so a stray script run hits dev, not real users) |
| `.env.production` | **prod** project (real users) | `expo export` / release builds (Expo loads `.env.production` over `.env` when `NODE_ENV=production`, which export sets by default) |

All `.env*` variants are gitignored except `.env.example`. The repo is
**public** — never commit a real key, and treat the anon key as public
(it is shipped in the app bundle; RLS is the actual security boundary).
The service role key bypasses RLS and must only ever live in `.env`,
`.env.production`, and GitHub secrets.

### Creating the dev project (one-time, ~10 min)

1. supabase.com → New project (free tier is fine).
2. `node scripts/print-setup-sql.mjs > /tmp/setup.sql`, paste into the new
   project's SQL editor, run. This is the base schema + all migrations in
   order. (Use `node …` directly, or `npm run -s db:setup-sql` — a bare
   `npm run` prepends its script banner into the redirected file, which the
   SQL editor then rejects.)
3. Put the new project's URL / anon key / service-role key into `.env`
   (current prod values are already preserved in `.env.production`).
4. Optional seed content: `npm run import:visitseoul` (uses `.env` = dev),
   `npm run seed:themes`.
5. Auth settings worth mirroring from prod: email confirmation ON,
   Site URL for redirect links.

### Adding a migration

Write `supabase/migration-0NN-name.sql` (idempotent: `if not exists` /
`drop ... if exists`), run it against **dev first**, then prod, then commit.
`db:setup-sql` picks it up automatically for future fresh environments.

## Foreigner-Fit: crowd votes vs "verified by TRIP"

The Foreigner-Fit checklist (migration-007) is a pure crowd layer — imported
places start honestly blank, no pre-fills. `migration-022-verified-tags.sql`
adds a separate `places.verified_tags` column for facts the team can state
with real confidence (never a per-place guess): either a mechanical promotion
of an existing objective Visit Seoul field (`english_site`, `wheelchair`), or
a well-established category-level fact (department stores/malls take cards
everywhere in Korea). It never touches `votes` or the vote-backed boolean
columns, so it can't clobber a real traveler vote — the UI shows both, with
a distinct "✓ TRIP verified" badge, plus a "be the first to confirm" nudge
when a place has neither.

Re-run after a fresh Visit Seoul import so newly-added places get covered:
```
npm run backfill:verified-tags            # dev (.env)
node -r dotenv/config ./node_modules/.bin/tsx scripts/backfill-verified-tags.ts dotenv_config_path=.env.production   # prod
```
Add `-- --dry-run` to preview counts without writing. The rules live in
`scripts/backfill-verified-tags.ts` — idempotent, safe to re-run anytime.
