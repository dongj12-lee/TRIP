-- Migration 003 — push notifications (run in Supabase SQL editor).
-- Stores each user's Expo push token, and adds DB triggers that fire an Edge
-- Function when someone joins your buddy plan or comments on your post.
-- The Edge Function itself lives in supabase/functions/send-push/ — deploy it
-- and set the config below before this actually delivers anything.

alter table public.profiles add column if not exists push_token text;

-- ─── Helper: call the send-push Edge Function via pg_net ───
-- Requires the pg_net extension (Supabase → Database → Extensions → enable "pg_net")
-- and two DB settings holding your project URL + service role key, set once:
--   select set_config('app.settings.supabase_url', 'https://YOUR-REF.supabase.co', false);
--   select set_config('app.settings.service_role_key', 'YOUR-SERVICE-ROLE-KEY', false);
-- (or hardcode them in the function body below — they never leave the DB).
create extension if not exists pg_net;

create or replace function public.notify_user(target_user uuid, title text, body text, data jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare
  tok text;
  fn_url text := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push';
  svc text := current_setting('app.settings.service_role_key', true);
begin
  select push_token into tok from public.profiles where id = target_user;
  if tok is null then return; end if;
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || svc),
    body := jsonb_build_object('token', tok, 'title', title, 'body', body, 'data', data)
  );
end; $$;

-- ─── Buddy interest → notify the plan's host ───
create or replace function public.on_buddy_interest_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare host uuid; act text;
begin
  select author_id, activity into host, act from public.buddies where id = new.buddy_id;
  if host is not null and host <> new.user_id then
    perform public.notify_user(host, 'Someone''s interested 🙋',
      coalesce(new.author_name, 'A traveler') || ' wants to join "' || act || '"',
      jsonb_build_object('type', 'buddy', 'id', new.buddy_id::text));
  end if;
  return null;
end; $$;
drop trigger if exists on_buddy_interest_notify on public.buddy_interests;
create trigger on_buddy_interest_notify
  after insert on public.buddy_interests for each row execute function public.on_buddy_interest_notify();

-- ─── Comment → notify the post's author ───
create or replace function public.on_comment_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; ttl text;
begin
  select author_id, title into owner, ttl from public.posts where id = new.post_id;
  if owner is not null and owner <> new.author_id then
    perform public.notify_user(owner, 'New comment 💬',
      coalesce(new.author_name, 'Someone') || ' replied to "' || ttl || '"',
      jsonb_build_object('type', 'post', 'id', new.post_id::text));
  end if;
  return null;
end; $$;
drop trigger if exists on_comment_notify on public.comments;
create trigger on_comment_notify
  after insert on public.comments for each row execute function public.on_comment_notify();
