-- Migration 020 — friends for the passport leaderboard.
-- Run in the Supabase SQL editor.
--
-- A lightweight, directional "friend" link: adding someone just bookmarks whose
-- passport you want to compare against. No request/accept flow and no new
-- privacy exposure — passport counts + handle are already public (migration-019,
-- "profiles readable"). RLS lets a user see and manage only their OWN links, so
-- who-added-whom stays private.

create table if not exists public.friend_links (
  user_id uuid references public.profiles(id) on delete cascade,
  friend_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, friend_id),
  constraint friend_not_self check (user_id <> friend_id)
);
alter table public.friend_links enable row level security;

drop policy if exists "own friend links" on public.friend_links;
create policy "own friend links" on public.friend_links for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
