-- Migration 015 — write rate limits (anti-spam / anti-bot).
-- Run in the Supabase SQL editor.
--
-- RLS says WHO may insert; it says nothing about HOW OFTEN. A compromised or
-- scripted account could still flood posts/comments/chat. This adds a generic
-- BEFORE INSERT guard that caps how many rows one actor may create in a rolling
-- window, enforced server-side (a client can't bypass it).
--
-- Limits are generous for real humans and only bite automation:
--   posts            20 / hour
--   comments         30 / 5 min
--   buddy_messages   30 / min   (chat is bursty — kept high on purpose)
--   buddies          10 / hour
--   buddy_interests  30 / hour
--   reports          30 / hour
--
-- The trigger is SECURITY DEFINER so its COUNT sees all of the actor's rows
-- (e.g. the private buddy_messages table) regardless of the caller's RLS view.

create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor_col text := tg_argv[0];
  v_max int := tg_argv[1]::int;
  v_window_secs int := tg_argv[2]::int;
  v_actor uuid;
  v_count int;
begin
  -- Pull the actor id from whichever column this table uses.
  v_actor := (to_jsonb(new) ->> v_actor_col)::uuid;
  if v_actor is null then
    return new; -- nothing to attribute the write to; let other constraints handle it
  end if;

  execute format(
    'select count(*) from public.%I where %I = $1 and created_at > now() - make_interval(secs => $2)',
    tg_table_name, v_actor_col
  ) into v_count using v_actor, v_window_secs;

  if v_count >= v_max then
    raise exception 'rate limit: too many % in a short time — please slow down', tg_table_name
      using errcode = 'check_violation';
  end if;

  return new;
end; $$;

drop trigger if exists rate_limit_posts on public.posts;
create trigger rate_limit_posts before insert on public.posts
  for each row execute function public.enforce_rate_limit('author_id', '20', '3600');

drop trigger if exists rate_limit_comments on public.comments;
create trigger rate_limit_comments before insert on public.comments
  for each row execute function public.enforce_rate_limit('author_id', '30', '300');

drop trigger if exists rate_limit_buddy_messages on public.buddy_messages;
create trigger rate_limit_buddy_messages before insert on public.buddy_messages
  for each row execute function public.enforce_rate_limit('sender_id', '30', '60');

drop trigger if exists rate_limit_buddies on public.buddies;
create trigger rate_limit_buddies before insert on public.buddies
  for each row execute function public.enforce_rate_limit('author_id', '10', '3600');

drop trigger if exists rate_limit_buddy_interests on public.buddy_interests;
create trigger rate_limit_buddy_interests before insert on public.buddy_interests
  for each row execute function public.enforce_rate_limit('user_id', '30', '3600');

drop trigger if exists rate_limit_reports on public.reports;
create trigger rate_limit_reports before insert on public.reports
  for each row execute function public.enforce_rate_limit('reporter_id', '30', '3600');
