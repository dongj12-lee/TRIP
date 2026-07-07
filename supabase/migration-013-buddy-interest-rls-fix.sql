-- Migration 013 — close a privilege-escalation hole in buddy_interests.
-- Run in the Supabase SQL editor (after migration-012).
--
-- SECURITY FIX: the original "own buddy_interests" policy was `for all`, which
-- also granted UPDATE on your own row. A requester could therefore set their
-- own status to 'accepted' (or insert a row pre-accepted), bypassing the host's
-- approval — and thus gain read/write access to the private group chat, whose
-- RLS trusts the 'accepted' status. Verified exploitable before this fix.
--
-- The fix splits that blanket policy into least-privilege pieces:
--   * a requester may INSERT only their own row, and only as 'pending';
--   * a requester may DELETE (withdraw) their own row;
--   * only the host may UPDATE status (accept/decline), via the policy from
--     migration-012;
--   * SELECT stays public (buddy_interests are shown as social proof).

drop policy if exists "own buddy_interests" on public.buddy_interests;

drop policy if exists "insert own pending interest" on public.buddy_interests;
create policy "insert own pending interest" on public.buddy_interests for insert
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "delete own interest" on public.buddy_interests;
create policy "delete own interest" on public.buddy_interests for delete
  using (auth.uid() = user_id);
