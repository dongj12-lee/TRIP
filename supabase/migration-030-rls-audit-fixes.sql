-- Migration 030 — three findings from a full RLS audit of all 20 tables.
-- Run in the Supabase SQL editor (prod and dev).
--
-- Context: the GitHub repo is public, so these policy files are readable by
-- anyone, and the anon key is public by design (it ships inside the IPA).
-- That makes RLS the only thing actually protecting the data, so it has to be
-- right rather than merely present. The audit tested every table with the
-- anon key against production, not just read the policies.
--
-- Not a finding, for the record: no table is missing RLS, and no policy
-- anywhere grants `with check (true)` — there is no table the public can
-- write to. The three below are all read-side.


-- ─── 1. buddy_interests leaked private messages ─────────────────────────
-- `for select using (true)`. An anonymous request returned user_id together
-- with `message` — the note one traveller sent another asking to meet — and
-- the accept/decline status. That is one-to-one correspondence; it was never
-- meant to leave the pair involved.
--
-- The Buddy feature has since been removed from the app (its routes live in
-- _disabled-routes/), so nothing reads this table any more, but the rows and
-- the open policy both survived the removal.
--
-- Owner access already exists via "own buddy_interests" (FOR ALL), so
-- dropping the open policy is most of the fix. The host of a meetup also
-- needs to see who asked — there is an UPDATE policy for exactly that
-- relationship but no matching SELECT, so add one, mirroring it. Without
-- this the table would be locked more tightly than the feature would need if
-- it ever came back.
drop policy if exists "buddy_interests readable" on public.buddy_interests;

drop policy if exists "host reads interests on own buddy" on public.buddy_interests;
create policy "host reads interests on own buddy" on public.buddy_interests for select
  using (exists (select 1 from public.buddies b where b.id = buddy_id and b.author_id = auth.uid()));


-- ─── 2. buddies exposed where people would be, and when ─────────────────
-- The policy reads `not removed and not exists (<blocked by me>)`, which is
-- not `true` and so did not show up in a scan for open policies — but for an
-- anonymous caller auth.uid() is null, the block subquery matches nothing,
-- and the whole thing evaluates true. Every non-removed row was readable by
-- the open internet: author_id, name, country, the place, the time, the note.
--
-- This was a public board *inside the app*, which is a different thing from
-- public to anyone with curl. Requiring a signed-in caller restores the
-- original intent without breaking the feature if it is ever restored.
drop policy if exists "buddies readable" on public.buddies;
create policy "buddies readable" on public.buddies for select using (
  auth.uid() is not null
  and not removed
  and not exists (
    select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = buddies.author_id
  )
);


-- ─── 3. admins policy recursed into itself ──────────────────────────────
-- Not a leak — the opposite. Reading `admins` required reading `admins`:
--
--   using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
--
-- so every query against it failed with "infinite recursion detected in
-- policy for relation admins", and admin tooling could not work at all.
--
-- public.is_admin() already exists and is SECURITY DEFINER with a pinned
-- search_path, so it runs as the owner and is not subject to this policy.
-- Calling it breaks the cycle without weakening anything: the test performed
-- is identical.
drop policy if exists "admins read admins" on public.admins;
create policy "admins read admins" on public.admins for select
  using (public.is_admin());


-- ─── Verify ─────────────────────────────────────────────────────────────
-- 1) Policies now in force on the three tables:
--
--   select tablename, policyname, cmd, qual
--     from pg_policies
--    where schemaname = 'public'
--      and tablename in ('buddies', 'buddy_interests', 'admins')
--    order by tablename, policyname;
--
-- 2) Should no longer recurse (returns 0 rows for a non-admin, not an error):
--
--   select count(*) from public.admins;
--
-- 3) From a shell, with the ANON key and no user token, both should return []:
--
--   curl -s "$URL/rest/v1/buddies?select=*&limit=1"          -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
--   curl -s "$URL/rest/v1/buddy_interests?select=*&limit=1"  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"


-- ─── Not done here, on purpose ──────────────────────────────────────────
-- The buddies / buddy_interests rows themselves (3 and 1 in production) are
-- left in place. Deleting data from a removed feature is reasonable, but it
-- is destructive and irreversible, so it belongs in a decision of its own
-- rather than riding along in a policy migration.
