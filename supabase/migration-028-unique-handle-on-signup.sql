-- Migration 028 — stop sign-up from failing when two users share an email local-part.
-- Run in the Supabase SQL editor (production AND dev).
--
-- THE BUG
-- `profiles.handle` is UNIQUE, and handle_new_user() derived it from
-- split_part(new.email, '@', 1) with only `on conflict (id) do nothing`. That
-- clause covers the primary key, not the handle index, so the second person
-- whose email starts with the same word hit
--     23505 duplicate key value violates unique constraint "profiles_handle_key"
-- and the whole sign-up transaction failed with a 500. Real example:
-- dongj1210@yonsei.ac.kr could not register because dongj1210+reviewer@gmail.com
-- already owned the handle "dongj1210". Any common local-part (alex, info,
-- contact, admin…) collides the same way, so this got worse as users signed up.
--
-- THE FIX
-- Sanitize the local-part, then append a counter until the handle is free.
-- The insert is retried inside an exception handler rather than trusting a
-- prior existence check, so two simultaneous sign-ups racing for the same
-- handle still both succeed.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_handle text;
  candidate   text;
  suffix      int := 0;
begin
  -- Handles are shown publicly, so keep them to safe characters. An email like
  -- "dongj1210+reviewer@…" would otherwise carry the "+reviewer" through.
  base_handle := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  if base_handle is null or base_handle = '' then
    base_handle := 'traveler';
  end if;
  base_handle := left(base_handle, 24);
  candidate := base_handle;

  loop
    begin
      insert into public.profiles (id, handle, display_name)
      values (new.id, candidate, coalesce(new.raw_user_meta_data->>'name', 'Traveler'))
      on conflict (id) do nothing;
      exit; -- inserted, or this id already had a profile
    exception when unique_violation then
      suffix := suffix + 1;
      -- Give up on prettiness rather than spinning forever; after a few
      -- collisions fall back to something guaranteed free.
      if suffix > 50 then
        candidate := base_handle || '_' || replace(gen_random_uuid()::text, '-', '');
        candidate := left(candidate, 40);
      else
        candidate := base_handle || suffix::text;
      end if;
    end;
  end loop;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();
