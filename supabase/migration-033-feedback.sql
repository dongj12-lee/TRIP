-- Migration 033 — in-app feedback ("Help & feedback").
-- Run in the Supabase SQL editor, prod and dev.
--
-- The app can report a post and react to a shared route, but there was nowhere
-- to say the app itself is confusing, or that a place's hours are wrong. That
-- second one matters most: the catalogue is ~3,800 tourism-board rows, and
-- hours and prices go stale on their own. The people who notice are standing
-- in front of the place.
--
-- ─── Why there is no insert policy ──────────────────────────────────────
-- Browsing BADA needs no account, so feedback must not either — requiring a
-- sign-in to report a wrong opening time would lose most of the reports worth
-- having. But an anonymous INSERT policy is an open write endpoint, and RLS
-- says who may write, never how often (see migration-015).
--
-- So the table takes no writes from clients at all. The submit-feedback Edge
-- Function rate-limits by IP and inserts with the service role, the same shape
-- used for the OpenAI-spending functions. `user_id` is filled in when the
-- sender happens to be signed in, and left null otherwise.

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  kind        text not null check (kind in ('wrong', 'confusing', 'wish', 'broken')),
  body        text not null check (length(btrim(body)) between 1 and 4000),
  -- What the sender was looking at. Set automatically when feedback is opened
  -- from a place, so nobody has to type "the Hapjeong cafe street one".
  place_slug  text,
  -- App version / OS / device, attached by the client. Never asked for in the
  -- form: people do not know their build number, and asking costs completions.
  context     jsonb not null default '{}',
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists feedback_open_idx on public.feedback (created_at desc) where not handled;
create index if not exists feedback_place_idx on public.feedback (place_slug) where place_slug is not null;

alter table public.feedback enable row level security;

-- Senders may read their own, when they had an account at all. No insert,
-- update or delete policy exists for anyone: writes arrive through the Edge
-- Function, and triage happens through the RPC below.
drop policy if exists "read own feedback" on public.feedback;
create policy "read own feedback" on public.feedback for select
  using (auth.uid() is not null and auth.uid() = user_id);


-- ─── Admin triage ───────────────────────────────────────────────────────
-- Same shape as admin_list_reports in migration-016: SECURITY DEFINER, gated
-- on is_admin(), and narrow. Admins get no table-level write policy, so the
-- only mutation possible is flipping `handled` through the function below.
create or replace function public.admin_list_feedback(include_handled boolean default false)
returns table (
  id uuid,
  kind text,
  body text,
  place_slug text,
  place_name text,
  context jsonb,
  handled boolean,
  sender text,
  created_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;
  return query
    select f.id, f.kind, f.body, f.place_slug, p.name, f.context, f.handled,
           coalesce(pr.handle, '(guest)'), f.created_at
      from public.feedback f
      left join public.places p on p.slug = f.place_slug
      left join public.profiles pr on pr.id = f.user_id
     where include_handled or not f.handled
     order by f.created_at desc
     limit 200;
end; $$;

create or replace function public.admin_set_feedback_handled(feedback_id uuid, value boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;
  update public.feedback set handled = value where id = feedback_id;
end; $$;

revoke all on function public.admin_list_feedback(boolean) from public, anon;
revoke all on function public.admin_set_feedback_handled(uuid, boolean) from public, anon;
grant execute on function public.admin_list_feedback(boolean) to authenticated;
grant execute on function public.admin_set_feedback_handled(uuid, boolean) to authenticated;


-- ─── Verify ─────────────────────────────────────────────────────────────
--   select count(*) from public.feedback;                      -- 0
--
-- Anonymous write must be refused — the function is the only way in:
--   curl -X POST "$URL/rest/v1/feedback" -H "apikey: $ANON" \
--        -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
--        -d '{"kind":"broken","body":"test"}'                  -- expect 401/403
