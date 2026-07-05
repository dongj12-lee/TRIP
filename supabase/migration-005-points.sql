-- Migration 005 — make profile points real (run in the Supabase SQL editor).
-- Points now accrue from actual activity, mirroring the app's "How points work"
-- design (post a tip +25, get a helpful vote +5, …) so the Newcomer→Korea
-- Expert tier ladder is meaningful instead of a hardcoded number.
--
-- New users start at 0 (the profiles.points default), and climb as they use
-- the app. Safe to run once; triggers are recreated with drop-if-exists.

create or replace function public.award_points(target uuid, delta int)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set points = greatest(0, coalesce(points, 0) + delta) where id = target;
end; $$;

-- Posting a tip / route / question: +25 to the author.
create or replace function public.points_on_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.author_id is not null then perform public.award_points(new.author_id, 25); end if;
  return null;
end; $$;
drop trigger if exists on_post_points on public.posts;
create trigger on_post_points after insert on public.posts for each row execute function public.points_on_post();

-- Leaving a comment: +3 to the commenter.
create or replace function public.points_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.author_id is not null then perform public.award_points(new.author_id, 3); end if;
  return null;
end; $$;
drop trigger if exists on_comment_points on public.comments;
create trigger on_comment_points after insert on public.comments for each row execute function public.points_on_comment();

-- Receiving a helpful vote on your post: +5 to the post's author (−5 if undone).
create or replace function public.points_on_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if tg_op = 'INSERT' then
    select author_id into owner from public.posts where id = new.post_id;
    if owner is not null and owner <> new.user_id then perform public.award_points(owner, 5); end if;
  elsif tg_op = 'DELETE' then
    select author_id into owner from public.posts where id = old.post_id;
    if owner is not null and owner <> old.user_id then perform public.award_points(owner, -5); end if;
  end if;
  return null;
end; $$;
drop trigger if exists on_vote_points on public.post_votes;
create trigger on_vote_points after insert or delete on public.post_votes for each row execute function public.points_on_vote();
