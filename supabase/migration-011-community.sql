-- Migration 011 — make the Feed a real community: casual posts, comment
-- replies, and comment likes. Run in the Supabase SQL editor.
--
-- Goals: lower the bar to posting (a body-only "thought", no forced title/type)
-- and let conversation actually flow (reply to a comment, like a comment).

-- 1. A lightweight, casual post type alongside the structured tip/route/question.
alter table public.posts drop constraint if exists posts_type_check;
alter table public.posts add constraint posts_type_check
  check (type in ('thought', 'tip', 'route', 'question'));
-- Title-less posts are allowed now (a thought is just a body); keep the column
-- but stop requiring it.
alter table public.posts alter column title drop not null;

-- 2. One level of threaded replies on comments.
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
create index if not exists comments_parent_idx on public.comments (parent_id);

-- 3. Comment likes, with a live like_count kept on the comment by a trigger
--    (same pattern as post/place reactions).
alter table public.comments add column if not exists like_count int not null default 0;

create table if not exists public.comment_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
alter table public.comment_likes enable row level security;

drop policy if exists "comment likes readable by owner" on public.comment_likes;
create policy "comment likes readable by owner" on public.comment_likes
  for select using (auth.uid() = user_id);
drop policy if exists "insert own comment like" on public.comment_likes;
create policy "insert own comment like" on public.comment_likes
  for insert with check (auth.uid() = user_id);
drop policy if exists "delete own comment like" on public.comment_likes;
create policy "delete own comment like" on public.comment_likes
  for delete using (auth.uid() = user_id);

create or replace function public.bump_comment_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set like_count = like_count + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.comments set like_count = greatest(0, like_count - 1) where id = old.comment_id;
  end if;
  return null;
end; $$;

drop trigger if exists on_comment_like on public.comment_likes;
create trigger on_comment_like
  after insert or delete on public.comment_likes
  for each row execute function public.bump_comment_like();
