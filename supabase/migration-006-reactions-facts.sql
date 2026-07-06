-- Migration 006 — place like/dislike + Visit Seoul "Good to know" facts.
-- Run in the Supabase SQL editor.
--
-- Two things:
--  1. place_reactions: per-user like/dislike on a place, with live like_count /
--     dislike_count kept on `places` by a trigger (same pattern as route_feedback).
--     Powers the new map-top "Recommended" rail and the community satisfaction
--     signal, replacing the interest-only "For You".
--  2. Objective facts columns populated from the Visit Seoul API (subway access,
--     free entry, English website, step-free access) for the place-detail
--     "Good to know" strip — kept separate from the community-voted Foreigner
--     Fit checklist, which stays traveler-driven.

-- 1a. counts + facts on places
alter table public.places add column if not exists like_count int not null default 0;
alter table public.places add column if not exists dislike_count int not null default 0;
alter table public.places add column if not exists subway text;
alter table public.places add column if not exists free_entry boolean not null default false;
alter table public.places add column if not exists english_site boolean not null default false;
alter table public.places add column if not exists wheelchair boolean not null default false;

-- 1b. reactions table
create table if not exists public.place_reactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_slug text not null references public.places(slug) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  primary key (user_id, place_slug)
);
alter table public.place_reactions enable row level security;

drop policy if exists "read own or none" on public.place_reactions;
create policy "reactions readable by owner" on public.place_reactions
  for select using (auth.uid() = user_id);
drop policy if exists "insert own reaction" on public.place_reactions;
create policy "insert own reaction" on public.place_reactions
  for insert with check (auth.uid() = user_id);
drop policy if exists "update own reaction" on public.place_reactions;
create policy "update own reaction" on public.place_reactions
  for update using (auth.uid() = user_id);
drop policy if exists "delete own reaction" on public.place_reactions;
create policy "delete own reaction" on public.place_reactions
  for delete using (auth.uid() = user_id);

-- 1c. keep the aggregate counts in sync
create or replace function public.bump_place_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare d_like int := 0; d_dislike int := 0;
begin
  if tg_op = 'INSERT' then
    if new.reaction = 'like' then d_like := 1; else d_dislike := 1; end if;
  elsif tg_op = 'DELETE' then
    if old.reaction = 'like' then d_like := -1; else d_dislike := -1; end if;
  elsif tg_op = 'UPDATE' and new.reaction <> old.reaction then
    if new.reaction = 'like' then d_like := 1; d_dislike := -1; else d_like := -1; d_dislike := 1; end if;
  end if;
  update public.places
     set like_count = greatest(0, like_count + d_like),
         dislike_count = greatest(0, dislike_count + d_dislike)
   where slug = coalesce(new.place_slug, old.place_slug);
  return null;
end; $$;

drop trigger if exists on_place_reaction on public.place_reactions;
create trigger on_place_reaction
  after insert or update or delete on public.place_reactions
  for each row execute function public.bump_place_reaction();
