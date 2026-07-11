-- Migration 017 — avatar image storage.
-- Run in the Supabase SQL editor.
--
-- Profiles carried only an avatar_url text field with no way to actually upload
-- an image. This creates a public-read Storage bucket for avatars and restricts
-- writes so a user can only manage files under their own uid prefix:
--   avatars/<auth-uid>/<filename>
--
-- Public read is intentional — avatars are shown to everyone in the feed/buddy
-- lists, same trust level as the display name. Nothing sensitive lives here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- The first path segment must equal the caller's uid, so nobody can write into
-- someone else's folder.
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

