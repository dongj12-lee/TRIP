-- Migration 004 — structured one-click feedback on shared Route posts.
-- Run in the Supabase SQL editor (idempotent).
--
-- Instead of forcing everyone to write a comment, a route post shows a few
-- fixed prompts ("Too packed?", "Good order?", "What's missing?"…) that anyone
-- can tap. Each tap is one reaction; the post shows live tallies. This is the
-- back half of the plan→share→feedback loop.

create table if not exists public.route_feedback (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  prompt text not null,          -- one of the fixed prompt keys (see app: ROUTE_PROMPTS)
  created_at timestamptz default now(),
  primary key (post_id, user_id, prompt)
);
create index if not exists route_feedback_post_idx on public.route_feedback (post_id);

-- Denormalized tally on the post so lists/detail need no aggregation query.
-- Shape: { "packed": 3, "order": 1, ... }
alter table public.posts add column if not exists feedback_counts jsonb default '{}';

create or replace function public.bump_route_feedback()
returns trigger language plpgsql security definer set search_path = public as $$
declare key text;
begin
  key := coalesce(new.prompt, old.prompt);
  if tg_op = 'INSERT' then
    update public.posts
      set feedback_counts = jsonb_set(
        feedback_counts,
        array[key],
        to_jsonb(coalesce((feedback_counts->>key)::int, 0) + 1)
      )
      where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts
      set feedback_counts = jsonb_set(
        feedback_counts,
        array[key],
        to_jsonb(greatest(coalesce((feedback_counts->>key)::int, 0) - 1, 0))
      )
      where id = old.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists on_route_feedback_change on public.route_feedback;
create trigger on_route_feedback_change
  after insert or delete on public.route_feedback for each row execute function public.bump_route_feedback();

-- RLS: tallies are public (readable via posts), individual reactions are owner-scoped.
alter table public.route_feedback enable row level security;
create policy "route_feedback readable" on public.route_feedback for select using (true);
create policy "own route_feedback" on public.route_feedback for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
