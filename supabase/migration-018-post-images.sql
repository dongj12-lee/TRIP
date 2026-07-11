-- Migration 018 — photos on community posts.
-- Run in the Supabase SQL editor.
--
-- Posts were text-only. This adds an optional image to a post and a Storage
-- bucket to hold them, mirroring the avatars setup (migration-017):
-- public-read (post images are shown to everyone in the feed), owner-scoped
-- writes so a user can only put files under their own uid prefix:
--   post-images/<auth-uid>/<filename>

alter table public.posts add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "post-images public read" on storage.objects;
create policy "post-images public read" on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists "post-images owner insert" on storage.objects;
create policy "post-images owner insert" on storage.objects for insert
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post-images owner update" on storage.objects;
create policy "post-images owner update" on storage.objects for update
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post-images owner delete" on storage.objects;
create policy "post-images owner delete" on storage.objects for delete
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
