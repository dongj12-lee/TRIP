# Reusing this codebase

Written for two follow-on projects: an app for foreigners in Korea that is
**not** about travel, and later a service aimed at **Koreans**. Neither reuses
the travel data, so this document is about the parts underneath it.

Read `PROJECT.md` first for what BADA is. This one only answers: what is worth
carrying over, what has to change, and what should be left behind.

The honest summary, counted rather than estimated: **3600 of the 23,209
lines are domain-neutral** — 2161 in the take-as-is layer, 940 in the share
cards, 499 of reusable SQL. Their value is not the line count. It is that
they already survived two App Store rejections and a security audit.

---

## 1. Take as-is

These have no idea what a "place" is. Copy the files, change the palette.

### Design system — `theme/` (227 lines) + `components/base.tsx` (260)

`tokens.ts` holds the palette and spacing; `theme.tsx` is the provider with
light/dark plus a user-selectable accent. `base.tsx` is `T` / `H` (text with
accessibility-scaling caps built in), `Button`, `IconButton`, `Screen`,
`ScreenTitle`, `DetailHeader`.

Two details worth keeping rather than rediscovering: text components cap
`maxFontSizeMultiplier`, so a user with huge system text does not explode the
layout; and `fontFamily` passed in a style overrides the default family, which
is how the share cards use a serif on iOS without shipping a font.

`Icon.tsx` is 35 hand-built stroke icons as inline SVG — no icon package, no
font, trivially recolourable.

### Local-first store — `lib/store.tsx` (373 lines)

The pattern worth stealing: **AsyncStorage is not a cache, it is the data
layer**, and Supabase is an optional upgrade. With no backend configured the
app is fully usable; when a session exists, the same actions also write
remotely. That is what makes guest mode real rather than a degraded mode.

You will replace the domain slices (saved, stamps, itinerary, votes) but keep
the shape: hydrate → optimistic local write → best-effort remote write.

### Guest-first auth — `lib/auth.tsx` (154) + `lib/requireAuth.tsx` (38)

Browsing needs no account; only actions that need a server identity — posting,
voting, following — are gated, and `requireAuth` wraps exactly those. The app
never opens on a sign-up wall.

`authErrorText` is small but hard-won: it maps Supabase auth failures to
sentences a person can act on, and refuses to surface a raw 5xx payload. Reuse
it verbatim.

### Moderation stack — `migration-016` + `ReportSheet.tsx` + `app/admin.tsx`

**Any app with user-generated content needs this to pass review.** Apple's
Guideline 1.2 wants reporting, blocking, and a way to act on reports.

The design is worth copying exactly: content tables get **no broad admin write
policy**. Moderation happens only through `admin_set_removed()`, a
security-definer RPC that can toggle one boolean and nothing else. An admin
account that leaks cannot rewrite content.

### Write rate limits — `migration-015`

A generic `BEFORE INSERT` trigger capping rows per actor per rolling window.
The comment states the principle: *RLS says who may insert; it says nothing
about how often.* Applies to any UGC table in any project.

### Small utilities

`haptics.ts` (crash-safe, no-ops on web and unsupported devices),
`reducedMotion.ts` (honours the OS accessibility setting), `Toast.tsx`,
`format.ts`, `legal/[doc].tsx` (renders Terms / Privacy / Community Guidelines
from markdown — also a review requirement).

---

## 2. Adapt — the pattern transfers, the content does not

### Community-voted attributes ("Foreigner Fit")

BADA's best structural idea, and it is not about travel. An entity carries a
set of yes/no attributes that the community votes on:

- individual votes are **owner-only**, aggregates are **public**
- a trigger maintains the tally on the parent row (`places.votes` jsonb)
- the handful of attributes that need filtering also get denormalised boolean
  columns, because jsonb is not indexable enough for a list filter
- attribute sets are per-category — a museum is asked different questions than
  a restaurant (`migration-014`)

Swap "is this place solo-friendly" for whatever your domain's uncertain,
crowd-knowable facts are. For a Korean-facing service the same machinery works
unchanged; only the question list changes.

See `migration-007`, `migration-014`, and `bump_place_tag_vote()`.

### Server-side API proxying — `supabase/functions/`

Every third-party key stays server-side in an Edge Function, and the client
calls the function. Ten examples in the tree covering weather, holidays, search
and map tiles. The template is the same each time: CORS block, input caps, a
warm-instance cache, a typed response.

Carry over the guard work too (`§6` of `PROJECT.md`): functions deployed
`--no-verify-jwt` are open to the internet, and endpoint names are extractable
from any shipped IPA. Server-only functions must verify a bearer themselves.

### Structured editorial content — `data/types.ts` `ThemeBlock`

Themes are not free-form HTML. They are typed blocks — `CompareBlock`,
`StepsBlock`, `PlacesBlock` — rendered by a switch. That is why 29 guides look
consistent and why a writer cannot break the layout.

If your new app has any "guide" or "explainer" surface, take the block-union
pattern and define your own block types. Leave the travel blocks behind.

### Share cards — `components/ShareCard.tsx` + `ShareCardSheet.tsx`

A 9:16 card rendered in RN, captured with `react-native-view-shot` at
1080×1920, handed to the native share sheet. Templates, per-cell photo slots,
and the one rule that is easy to get wrong: **editing affordances must be
hidden at capture time**, because `captureRef` photographs the live view.

Domain-neutral, and a cheap growth surface for any consumer app.

---

## 3. Leave behind

- `Place` (37 fields) and the whole tourism catalogue — TourAPI / VisitSeoul
  importers, the curation scripts, `prominence.ts`
- Trip planning: `tripPlan.ts`, `dayPlan.ts`, `routeSuggest.ts`,
  `routeHealth.ts`, `transit.ts`, `transitSeoul.ts`
- `stamps.ts` / passport / leaderboard — unless gamified collection fits the
  new domain, in which case it adapts rather than transfers
- Buddy (already removed here, parked in `_disabled-routes/`)

---

## 4. What changes for a Korean-facing service

The second project inverts most of BADA's assumptions. Worth knowing up front:

| BADA assumes | Korean-facing service |
|---|---|
| User cannot read Hangul | Korean is the primary language |
| English UI, Korean shown as a secondary line | Reverse, or Korean only |
| Foreign card, no Korean payment rails | KakaoPay / Toss / 카카오 로그인 expected |
| Email/password auth | Kakao or Naver social login is close to mandatory |
| Apple Maps must be offered (Guideline 4) | Still true, but Naver/Kakao Map is what users want |
| "Is this solo-friendly for a foreigner" | Different uncertainty entirely |

Two things carry over unchanged regardless: the moderation stack and the rate
limits. Every Korean UGC service needs both, and Apple reviews them the same
way.

One that does **not** carry over: the `Pretendard` font choice was made because
one family had to cover Latin and Hangul together. For a Korean-only app you
have more freedom.

---

## 5. The expensive knowledge

This is the part that is genuinely hard to re-derive, and the main reason to
start from this codebase rather than a blank Expo app.

**App Store review.** Two rejections, both documented with the exact fix:
`appstore-submission-checklist.md` (the full submission procedure, plus a defect
table) and `apple-resolution-center-reply.md` (how to write a reply that lands).
The Guideline 4 traps — RN not clipping overflow, uncapped bottom sheets
becoming inescapable on iPad, offering only a third-party map — will hit any RN
app the same way.

**Security.** `PROJECT.md §6`. The short version: test RLS by querying with the
anon key rather than reading the policies, because a policy that is not
`using (true)` can still evaluate true for an anonymous caller; and endpoint
secrecy is not a control when the binary is downloadable.

**Native traps.** `PROJECT.md §8`. `fetch()` cannot read `file://` in RN;
`requireNativeModule()` throws at import, not at use; `ImagePicker` inside an RN
`Modal` never resolves without `FULL_SCREEN`.

**Build pipeline.** EAS with remote `autoIncrement` burns a build number on
cancel or failure, so never predict the next one. Two concurrent builds queue
behind each other and turn six minutes into three hours.

---

## 6. Suggested starting point

For the non-travel foreigner app:

```
theme/            take as-is, repalette
components/base.tsx, Icon.tsx, Toast.tsx, ReportSheet.tsx
lib/              store.tsx, auth.tsx, requireAuth.tsx, haptics.ts,
                  reducedMotion.ts, format.ts
app/              auth.tsx, onboarding.tsx, settings.tsx, legal/[doc].tsx,
                  admin.tsx  — then your own tabs
supabase/         migration-015 (rate limits), 016 (moderation),
                  028 (unique handle on signup), 029/030 (RLS lessons)
docs              appstore-submission-checklist.md
```

That is a working, reviewable, guest-first app with moderation and a design
system before you write a line of domain code — which is most of what the four
months here actually bought.
