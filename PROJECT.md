# BADA — project brief

A single document that should let someone (or a fresh Claude session) pick this
codebase up cold. Written 2026-09-13, while v1.0 build 16 sits in App Store
review.

Repo: `github.com/dongj12-lee/TRIP` (public). App code lives in `mobile/`.

---

## 1. What it is

An iOS travel app for **foreign, English-speaking visitors to Seoul**. Not a
general Korea guide and not a Korean-language app: every screen assumes someone
who does not read Hangul, does not have a Korean payment card, and is worried
about turning up somewhere that will not serve one person.

Three things it does that a general travel app does not:

- **Foreigner Fit.** Every place carries community-voted tags for the things
  that actually decide whether a visit works — solo-friendly, card accepted,
  price shown up front, English spoken, English info. Votes are public counts;
  who voted is private.
- **Plan-my-day / trip planner.** Turns a set of interests and a few days into
  a real ordered itinerary with per-leg travel estimates, then lets you edit it
  in plain language ("day 2 is too packed").
- **Themes.** 29 hand-written editorial guides — street food, what to pack,
  yajang culture, delivery apps, day trips — the part that is genuinely hard to
  copy and the reason to keep the repo's content under review before changing.

The name is Korean for "sea". App Store listing: *BADA: Korea Travel Guide*,
subtitle *Seoul trips, food & local tips*.

---

## 2. Stack

| | |
|---|---|
| Runtime | Expo SDK **54**, React Native 0.81.5, React 19.1 |
| Routing | `expo-router` v6 (file-based, `app/`) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Build | EAS Build, `appVersionSource: "remote"` with `autoIncrement` |
| Language | TypeScript throughout, `tsc --noEmit` is the only type gate |
| On-device AI | `@react-native-ai/apple` — Apple Foundation Models, iOS only |

Read the **versioned** Expo docs before writing code against an Expo API. This
SDK moved several APIs into `/legacy` subpaths, and guessing from memory has
cost real debugging time here more than once (see §8).

Two Supabase projects:

| | ref |
|---|---|
| dev | `iqezjcmpsgawgkvjzcaa` |
| prod | `dwajyyyimwpspdvxeflp` |

Env lives in `mobile/.env` (dev) and `mobile/.env.production` (prod), both
gitignored. `.env.example` documents the keys. **`dotenv` does not override
variables that are already set in the environment** — a prod-targeted script
can silently hit dev if something pre-injects them. Keep VS Code's
`python.terminal.useEnvFile` off for this reason.

---

## 3. Layout

```
mobile/
  app/            22 screens, expo-router
  components/     39 files — shared UI + the bottom sheets
  lib/            34 modules — all the domain logic (see below)
  data/           types, seed content, Supabase read/write layer
  scripts/        22 one-off + pipeline scripts (tsx)
  supabase/
    functions/    10 Edge Functions (Deno)
    migration-*.sql   030 and counting, applied by hand
```

### Screens

Four tabs — `index` (Explore), `themes`, `feed`, `my` — plus detail routes:
`place/[slug]`, `theme/[slug]`, `post/[slug]`, `creator/[id]`, `planner`,
`trip`, `passport`, `leaderboard`, `compose`, `auth`, `onboarding`, `settings`,
`admin`, `legal/[doc]`.

`app/index.tsx` is the gate: unconfigured → local demo, signed out → `/auth`,
otherwise onboarding or tabs. Guests get in without an account — browsing,
themes and the planner never require sign-in, and the app must never open on a
sign-up wall.

### The logic lives in `lib/`

Worth knowing before changing anything:

- `tripPlan.ts` / `dayPlan.ts` — the itinerary generators
- `tripChat.ts` / `tripEdit.ts` / `tripIntake.ts` — natural-language planning
- `routeSuggest.ts` / `routeHealth.ts` — scoring and "is this day sane"
- `transit.ts` / `transitSeoul.ts` — per-leg estimates, plus the map hand-off
- `screener.ts` — natural-language place search
- `stamps.ts` / `prominence.ts` / `personalize.ts` — passport, ranking, interests
- `store.tsx` — AsyncStorage; doubles as the whole data layer when Supabase is
  unconfigured
- `auth.tsx` / `requireAuth.tsx` — session, and the guard for the few actions
  that genuinely need a server identity
- `remoteData.tsx` — the read models. Note the deliberate split: `places` is
  **Seoul-only** (Explore, planner, AddStop), while `placeBySlug` keeps every
  city, so a link to a non-Seoul place still resolves.

---

## 4. Data

20 tables, all with RLS enabled. The ones that matter:

- **`places`** (~3,840 in prod, Seoul) — the catalogue. Imported from TourAPI
  and VisitSeoul, then curated. `votes` jsonb holds the Foreigner Fit tallies;
  five of those tags also have denormalised boolean columns because the Explore
  filter needs them indexable.
- **`themes`** (29) — the editorial guides, seeded from `data/seed.ts`, which
  is the source of truth. Edit the file, run `npm run seed:themes`.
- **`posts` / `comments`** — the community feed. Public read by design.
- **`profiles`** — public read, but no email column; handle, display name,
  country, interests, points, stamp/district counts.
- **`place_tag_votes` / `route_feedback`** — individual votes, owner-only.
  Aggregates live on the parent row (`places.votes`, `posts.feedback_counts`)
  and are public, which is the intended split: **counts are visible, who voted
  is not**.

### Edge Functions

| Function | Does | Caller |
|---|---|---|
| `seoul-weather` | KMA short + mid-term forecast | app |
| `korea-holidays` | KASI holidays + 24 solar terms | app |
| `festivals-now` | festivals running today | app |
| `naver-search` | Naver Local Search proxy | app |
| `static-map` | NCP Static Map proxy | app |
| `trip-intake` | free text → trip parameters (OpenAI) | app |
| `trip-chat` | chat edits over an itinerary (OpenAI) | app |
| `place-blurb` | backfill: one-line "why this stop" (OpenAI) | script only |
| `place-fit` | backfill: judge Foreigner Fit tags (OpenAI) | script only |
| `send-push` | forwards to Expo push | DB trigger only |

All ten deploy with `--no-verify-jwt`, so Supabase checks nothing about the
caller. The last three now verify an internal bearer themselves; the two
OpenAI-spending app-facing ones are rate-limited per IP. See §6.

---

## 5. Current state

**v1.0 build 16 is in App Store review.** It has been rejected twice:

1. **Guideline 2.1** — fixed (sign-up was broken by a duplicate-handle crash,
   `migration-028`).
2. **Guideline 4 (Design)** — overlapping elements on iPad, and every map
   action going to Naver with no alternative.

Both are fixed and verified on a physical iPad in iPhone compatibility mode
(the app is iPhone-only, `supportsTablet: false`, so that is the configuration
Apple reviews). `apple-resolution-center-reply.md` holds the reply that was
sent; `appstore-submission-checklist.md` holds the full submission procedure
and the defect history.

Build numbers are not contiguous — 12 and 15 were consumed by a failed and a
cancelled build, 13 and 14 were superseded. **Never predict the next build
number; read it from `eas build:view`.**

### Deferred until review passes

- **Regional-city content.** The `city-day-trips` theme has a `PlacesBlock`
  commented out, and two import scripts would add ~336 non-Seoul places. This
  is held back for one specific reason: doing it during a review once already
  put Korean-named places in front of a reviewer. Not a build concern — it is
  a "do not mutate production content while a review is open" concern.
- **Push notifications.** `migration-003-push.sql` was never applied to prod
  (`profiles.push_token` does not exist there), so push has never worked in
  production. The app registers a token, fails, and logs a warning. Applying
  003 plus persisting two DB settings turns it on; see §6.
- **Storage object listing.** `post-images` and `avatars` are public buckets
  and their object lists are enumerable by anon. Only exposes user ids, which
  are already public on `posts.author_id`, so it is low value to fix and the
  fix (signed URLs) needs an app change.

---

## 6. Security posture

The repo is **public** and the anon key ships inside the IPA, so RLS and the
function guards are the only real protection. Both were audited on 2026-09-13.

What that audit found, and what it means for future work:

- Reading policy files is not enough. `buddies` looked safe — its policy is
  `not removed and not exists (<blocked by me>)`, not `using (true)` — but for
  an anonymous caller `auth.uid()` is null, the subquery matches nothing, and
  the whole predicate evaluates true. **Test policies by querying with the anon
  key, not by reading them.**
- Endpoint secrecy is not a control. Function names, the project URL and the
  anon key all come straight out of the shipped IPA (`unzip`, then `strings`
  the JS bundle). Making the repo private would not change that.
- Supabase injects `SUPABASE_SERVICE_ROLE_KEY` into functions as the **new
  41-char API key**, while the DB trigger and the scripts hold the **legacy
  219-char JWT**. Comparing against the injected value alone rejects every
  legitimate caller. The guard accepts either, plus an explicit
  `INTERNAL_CALLER_TOKEN` secret.

OpenAI spend is capped at $30/month at the account level, which is the only
hard ceiling — the per-IP rate limit is in-memory and per warm instance, so it
is a speed bump, not a wall.

---

## 7. Working agreements

Things that came from experience on this project, not from preference:

- **Verify at the destination.** Photo upload "worked" for months while both
  Storage buckets sat empty in production. Checking whether data ever arrived
  found in one step what two rounds of client-side reasoning had missed.
- **Never report build or deploy state from memory.** Query it. Several
  mistakes here came from asserting a build was running or a deploy had landed
  without checking.
- **Production is confirm-first.** Destructive SQL, content changes, pushes and
  submissions get proposed as a reviewable script or command, not executed on a
  hunch. Builds and submissions spend the owner's account — ask first.
- **Fix the class, not the instance.** Apple reported one overlapping screen;
  the same uncapped-container bug existed in two more sheets and made two of
  them impossible to dismiss at all. Sweeping every modal found those.
- **One commit per verified state.** The tree had drifted 97 files from HEAD
  with no restore point before the submission commit.

---

## 8. Traps already hit

Each of these cost real time. They are all still true.

- `fetch()` in React Native **cannot read `file://` URIs**. Use
  `expo-file-system`'s `File`. This silently broke all image upload.
- `expo-image-manipulator`'s entry calls `requireNativeModule()` at module
  scope, so a static import throws at load time if the native module is
  missing — and `data/remote.ts` is imported nearly everywhere, so that is a
  startup crash, not a broken feature. Require it lazily inside try/catch, the
  same as `lib/foundationModels.ios.ts` does.
- `ImagePicker` presented from inside an RN `Modal` never resolves its promise
  unless `presentationStyle: FULL_SCREEN` is set and the call is deferred with
  `InteractionManager.runAfterInteractions`.
- React Native **does not clip overflow**. Content in a squeezed `flex: 1`
  container renders on top of its siblings rather than being cut off — this is
  what Apple screenshotted.
- Bottom sheets are dismissed by tapping a scrim sized from the leftover space.
  An uncapped sheet on a tall viewport leaves zero scrim and becomes
  inescapable. Every sheet needs a `maxHeight`.
- KMA's `taMaxN` is indexed from the **forecast bulletin date**, not from
  today. Between 00:00 and 06:00 KST the app used yesterday's bulletin, so
  every mid-term day shifted by one — and a day KMA had not published fell
  through `?? 0` and rendered as a real 0 °C.
- `set_config(...)` in the SQL editor is **session-scoped**. Persisting a DB
  setting needs `ALTER DATABASE`.
- `eas` is not installed globally; use `npx eas-cli`. `UID` is a reserved zsh
  variable. Two concurrent EAS builds queue behind each other and turn a
  6-minute build into a 3-hour one.

---

## 9. Running it

```bash
cd mobile
npm install
cp .env.example .env          # fill in dev Supabase keys
npx expo start                # dev client, not Expo Go (native modules)
npx tsc --noEmit              # the type gate
```

Content and data:

```bash
npm run seed:themes           # data/seed.ts  → themes table
npm run import:tourapi-eng    # catalogue import
npm run backfill:foreigner-fit
npm run check:release-env     # also runs as an EAS pre-install hook
```

Build and ship:

```bash
npx eas-cli build --profile production --platform ios   # ~6 min, run only one
npx eas-cli build:view <id>                             # read the real number
npx eas-cli submit --platform ios --latest
npx supabase functions deploy <fn> --no-verify-jwt --project-ref <ref>
```

Migrations are applied by hand in the Supabase SQL editor, **dev and prod
separately**. That is how `migration-003` came to be missing from prod for
months. If you add one, apply it to both and verify by querying.
