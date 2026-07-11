# Operations

How TRIP's data and environments are run in production. (Schema lives in
`supabase/schema.sql` + `supabase/migration-*.sql`; app-side docs in README.)

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

## Backups (self-managed)

Supabase's free tier has no automated backups, so `.github/workflows/db-backup.yml`
`pg_dump`s production weekly (Mon 04:00 KST) and keeps the gzipped dump as a
GitHub **artifact** (90-day retention, free). Manual run: Actions → *DB backup* →
*Run workflow*.

- **One-time setup**: add a repo Actions secret **`SUPABASE_DB_URL`** =
  production's connection string from Supabase → Settings → Database →
  *Connection string* → **Session pooler** (URI form; it includes the password
  and is IPv4-friendly, which the direct connection isn't on GitHub runners):
  `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`
  Set it with `gh secret set SUPABASE_DB_URL -R dongj12-lee/TRIP` (paste when prompted).
- **Restore** into a fresh/empty project: `gunzip -c trip-backup-*.sql.gz | psql "<target DB_URL>"`
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
