-- Migration 029 — stop exposing who cast which route-feedback vote.
-- Run in the Supabase SQL editor (dev and prod).
--
-- migration-004 created route_feedback with two policies, and RLS ORs
-- permissive policies together:
--
--   "route_feedback readable"  for select using (true)              ← anyone
--   "own route_feedback"       for all    using (auth.uid() = user_id)
--
-- so any signed-in client could query the raw table and read which user
-- pressed "Too packed" on which itinerary. Nothing in the app does that, but
-- the data was never actually protected. place_tag_votes — the same shape of
-- data, added later in migration-007 — is already owner-only; this brings
-- route_feedback in line with it.
--
-- Dropping the permissive policy is the whole fix: "own route_feedback" is
-- `for all`, which already covers SELECT for the row's owner. No replacement
-- policy is needed.
--
-- The visible tallies are unaffected. They do not come from this table: the
-- bump_route_feedback trigger maintains posts.feedback_counts (a jsonb column
-- on posts), and that is what RouteFeedbackBar renders. The only client read
-- of this table, fetchMyRouteFeedback, already filters to the current user.

drop policy if exists "route_feedback readable" on public.route_feedback;

-- Verify: this should list exactly one policy, "own route_feedback" (ALL).
--   select policyname, cmd, qual
--     from pg_policies
--    where schemaname = 'public' and tablename = 'route_feedback';
