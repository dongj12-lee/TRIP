-- Migration 021 — mutual-friend awareness ("X added you").
-- Run in the Supabase SQL editor.
--
-- friend_links stay locked to their owner (migration-020 RLS), so a user can't
-- directly read who added THEM. This security-definer RPC surfaces exactly that
-- — people who added you and whom you haven't added back — so the Friends tab
-- can prompt you to add them back (mutual growth). Only public profile fields
-- are returned.

create or replace function public.friends_added_me()
returns table (id uuid, display_name text, handle text, country text, stamp_count int, district_count int)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.handle, p.country, p.stamp_count, p.district_count
  from public.friend_links fl
  join public.profiles p on p.id = fl.user_id
  where fl.friend_id = auth.uid()
    and not p.banned
    and not exists (
      select 1 from public.friend_links me
      where me.user_id = auth.uid() and me.friend_id = fl.user_id
    )
  order by p.stamp_count desc;
$$;
