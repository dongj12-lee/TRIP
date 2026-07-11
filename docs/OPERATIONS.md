# Operations

How TRIP's data and environments are run in production. (Schema lives in
`supabase/schema.sql` + `supabase/migration-*.sql`; app-side docs in README.)

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
