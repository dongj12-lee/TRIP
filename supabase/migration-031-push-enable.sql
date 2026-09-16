-- Migration 031 — actually turn push notifications on.
-- Run in the Supabase SQL editor, prod and dev.
--
-- Background: migration-003 was written months ago but never applied to
-- production — `profiles.push_token` does not exist there. The app has been
-- requesting notification permission on every sign-in, obtaining a token, and
-- silently failing to store it (lib/notifications.ts logs a warning and moves
-- on). iOS asks for that permission exactly once per install, so every early user
-- who granted it had the grant thrown away, and everyone who declined is gone
-- for good. That is why this is worth doing before release rather than after.
--
-- This supersedes migration-003. Do not run 003; run this instead. Three
-- differences, all of them deliberate:
--
--   1. notify_user() cannot break the action that triggered it. In 003 the
--      Edge Function call sat bare inside an AFTER INSERT trigger, so any
--      failure — and `'Bearer ' || NULL` is a failure, since NULL settings
--      make the whole header NULL — would raise inside the transaction and
--      roll back the comment that fired it. A notification is best-effort;
--      it has no business failing a write. Now it returns early when unset
--      and swallows transport errors.
--   2. No buddy trigger. That feature was removed from the app (its routes
--      are parked in _disabled-routes/), so the trigger would fire on a table
--      nothing writes to any more.
--   3. The settings are read once into locals and checked, rather than being
--      concatenated blind.
--
-- The two settings themselves are NOT in this file: one of them is the
-- service-role key, and this repo is public. Set them separately — see the
-- note at the bottom. Because of change 1, running this migration without
-- them is safe: push simply stays off until they exist.

alter table public.profiles add column if not exists push_token text;

create extension if not exists pg_net;


-- ─── Deliver one notification, best-effort ──────────────────────────────
create or replace function public.notify_user(
  target_user uuid,
  title text,
  body text,
  data jsonb default '{}'
)
returns void language plpgsql security definer set search_path = public as $$
declare
  tok text;
  base_url text := current_setting('app.settings.supabase_url', true);
  svc text := current_setting('app.settings.service_role_key', true);
begin
  -- Nothing to send to.
  select push_token into tok from public.profiles where id = target_user;
  if tok is null or tok = '' then return; end if;

  -- Not configured yet. Leaving quietly is the point: the caller is a trigger
  -- on a user action, and an unconfigured server must not fail that action.
  if base_url is null or base_url = '' or svc is null or svc = '' then
    return;
  end if;

  begin
    perform net.http_post(
      url := base_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        -- send-push verifies this (see its isInternalCaller). It accepts
        -- either the legacy service-role JWT or INTERNAL_CALLER_TOKEN.
        'Authorization', 'Bearer ' || svc
      ),
      body := jsonb_build_object('token', tok, 'title', title, 'body', body, 'data', data)
    );
  exception when others then
    -- Never let a push failure roll back the write that triggered it.
    raise warning 'notify_user: push dispatch failed for % (%)', target_user, sqlerrm;
  end;
end; $$;


-- ─── Comment on your post → notify you ──────────────────────────────────
create or replace function public.on_comment_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; ttl text;
begin
  select author_id, title into owner, ttl from public.posts where id = new.post_id;
  if owner is not null and owner <> new.author_id then
    perform public.notify_user(
      owner,
      'New comment 💬',
      coalesce(new.author_name, 'Someone') || ' replied to "' || coalesce(ttl, 'your post') || '"',
      jsonb_build_object('type', 'post', 'id', new.post_id::text)
    );
  end if;
  return null;
end; $$;

drop trigger if exists on_comment_notify on public.comments;
create trigger on_comment_notify
  after insert on public.comments for each row execute function public.on_comment_notify();

-- Remove the buddy trigger if migration-003 was ever applied to this database
-- (it was, on dev). The feature is gone; the trigger should go with it.
drop trigger if exists on_buddy_interest_notify on public.buddy_interests;
drop function if exists public.on_buddy_interest_notify();


-- ─── Then, separately: the two settings ─────────────────────────────────
-- These carry the service-role key, so they are not committed here.
--
--   alter database postgres set app.settings.supabase_url = 'https://<ref>.supabase.co';
--   alter database postgres set app.settings.service_role_key = '<service_role key>';
--
-- Use ALTER DATABASE, not set_config(): set_config only lasts for the session,
-- which is how migration-003's instructions left this unset in the first place.
-- ALTER DATABASE applies to *new* connections, so open a fresh SQL editor tab
-- before verifying.
--
-- ─── Verify ─────────────────────────────────────────────────────────────
--   select current_setting('app.settings.supabase_url', true) as url,
--          current_setting('app.settings.service_role_key', true) is not null as key_set;
--
--   select count(*) from information_schema.columns
--    where table_name = 'profiles' and column_name = 'push_token';   -- expect 1
--
--   select tgname from pg_trigger where tgrelid = 'public.comments'::regclass
--      and not tgisinternal;                                          -- expect on_comment_notify
--
-- End to end: sign in on a device, grant notifications, then check that
-- profiles.push_token is non-null for that account. Have a second account
-- comment on the first account's post and confirm the notification arrives.
