-- Migration 019 — passport leaderboard (Seoul Explorers ranking).
-- Run in the Supabase SQL editor.
--
-- The passport was local-only. To rank travelers by how much of Seoul they've
-- collected, we mirror two counts onto the (public-read) profile: total stamps
-- and districts. The client keeps these in sync (see lib/store). Counts are
-- self-reported — fine for a casual, reward-free leaderboard.

alter table public.profiles add column if not exists stamp_count int default 0;
alter table public.profiles add column if not exists district_count int default 0;
create index if not exists profiles_stamp_count_idx on public.profiles (stamp_count desc);

-- The caller's rank = 1 + how many (non-banned) travelers have more stamps.
-- SECURITY DEFINER so it can read counts across all profiles regardless of the
-- caller; it only ever returns a single integer.
create or replace function public.my_passport_rank()
returns int language sql stable security definer set search_path = public as $$
  select 1 + count(*)::int
  from public.profiles p
  where not p.banned
    and p.stamp_count > coalesce((select stamp_count from public.profiles where id = auth.uid()), 0);
$$;

-- Total ranked travelers (denominator for "#12 of 340").
create or replace function public.passport_player_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.profiles where not banned and stamp_count > 0;
$$;
