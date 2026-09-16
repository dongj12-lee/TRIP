-- Migration 032 — hold the push config in a private table, not a GUC.
-- Run in the Supabase SQL editor, prod and dev. Requires 031 first.
--
-- Why this exists: 031 (and 003 before it) read their settings from
-- `current_setting('app.settings.…')`, which has to be populated with
--
--   alter database postgres set app.settings.service_role_key = '…';
--
-- and that fails on managed Supabase:
--
--   ERROR: 42501: permission denied to set parameter "app.settings.service_role_key"
--
-- ALTER DATABASE … SET needs to be the database owner or a superuser, and the
-- `postgres` role the SQL editor connects as is neither — the database is owned
-- by supabase_admin. So the original instructions could never have worked here,
-- which is the real reason this was left unset all along.
--
-- A table in a schema PostgREST does not expose solves it without any elevated
-- privilege. `private` is not in the API's exposed schemas, so there is no REST
-- route to it at all; on top of that the grants below remove anon/authenticated
-- access, and RLS with no policy denies whatever might slip past. notify_user is
-- SECURITY DEFINER and runs as the owner, so it reads the row regardless.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_config (
  key   text primary key,
  value text not null
);

alter table private.app_config enable row level security;
-- Deliberately no policies: nothing but a SECURITY DEFINER function gets in.

revoke all on private.app_config from public, anon, authenticated;


-- ─── notify_user, now reading from the table ────────────────────────────
create or replace function public.notify_user(
  target_user uuid,
  title text,
  body text,
  data jsonb default '{}'
)
returns void language plpgsql security definer set search_path = public as $$
declare
  tok text;
  base_url text;
  svc text;
begin
  select push_token into tok from public.profiles where id = target_user;
  if tok is null or tok = '' then return; end if;

  select value into base_url from private.app_config where key = 'supabase_url';
  select value into svc      from private.app_config where key = 'service_role_key';

  -- Unconfigured is not an error. The caller is a trigger on a user action and
  -- must not be failed by a notification that cannot be sent.
  if base_url is null or base_url = '' or svc is null or svc = '' then
    return;
  end if;

  begin
    perform net.http_post(
      url := base_url || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || svc
      ),
      body := jsonb_build_object('token', tok, 'title', title, 'body', body, 'data', data)
    );
  exception when others then
    raise warning 'notify_user: push dispatch failed for % (%)', target_user, sqlerrm;
  end;
end; $$;


-- ─── Then, separately: the two rows ─────────────────────────────────────
-- Not in this file — one of them is the service-role key and this repo is
-- public. Run them from the generated file kept outside the repo:
--
--   insert into private.app_config (key, value) values
--     ('supabase_url',     'https://<ref>.supabase.co'),
--     ('service_role_key', '<service_role key>')
--   on conflict (key) do update set value = excluded.value;
--
-- No ALTER DATABASE, no new connection needed — it takes effect immediately.
--
-- ─── Verify ─────────────────────────────────────────────────────────────
--   select key, length(value) as len from private.app_config order by key;
--     -- expect supabase_url ≈ 40, service_role_key ≈ 219
--
-- And confirm it is genuinely unreachable from the API — this must 404 or
-- return an error, never the rows:
--   curl "$URL/rest/v1/app_config?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
