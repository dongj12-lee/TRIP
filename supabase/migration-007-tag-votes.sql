-- Migration 007 — make Foreigner Fit tags actually votable.
-- Run in the Supabase SQL editor.
--
-- Until now, the "Traveler-verified, tag by tag" checklist on the place detail
-- page had no write path at all: `places.votes` (jsonb counts) and the five
-- boolean columns (solo_ok, english_menu, price_transparent, card_ok,
-- english_spoken) were only ever set by import/seed scripts — there was no
-- button, no store action, no API call for a traveler to actually confirm a
-- tag. This adds the real thing: a per-user, per-tag vote, with a trigger that
-- keeps places.votes and the matching boolean column in sync (has = count > 0,
-- so a tag shows as confirmed as soon as one traveler backs it — same
-- cold-start logic as the place like/dislike rail in migration-006).

create table if not exists public.place_tag_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_slug text not null references public.places(slug) on delete cascade,
  tag_key text not null check (tag_key in ('soloOk', 'englishMenu', 'priceTransparent', 'cardOk', 'englishSpoken')),
  created_at timestamptz not null default now(),
  primary key (user_id, place_slug, tag_key)
);
alter table public.place_tag_votes enable row level security;

drop policy if exists "tag votes readable by owner" on public.place_tag_votes;
create policy "tag votes readable by owner" on public.place_tag_votes
  for select using (auth.uid() = user_id);
drop policy if exists "insert own tag vote" on public.place_tag_votes;
create policy "insert own tag vote" on public.place_tag_votes
  for insert with check (auth.uid() = user_id);
drop policy if exists "delete own tag vote" on public.place_tag_votes;
create policy "delete own tag vote" on public.place_tag_votes
  for delete using (auth.uid() = user_id);

create or replace function public.bump_place_tag_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_slug text := coalesce(new.place_slug, old.place_slug);
  v_key text := coalesce(new.tag_key, old.tag_key);
  v_delta int := case when tg_op = 'INSERT' then 1 when tg_op = 'DELETE' then -1 else 0 end;
  v_count int;
  v_column text := case v_key
    when 'soloOk' then 'solo_ok'
    when 'englishMenu' then 'english_menu'
    when 'priceTransparent' then 'price_transparent'
    when 'cardOk' then 'card_ok'
    when 'englishSpoken' then 'english_spoken'
  end;
begin
  update public.places
     set votes = jsonb_set(
           coalesce(votes, '{}'::jsonb),
           array[v_key],
           to_jsonb(greatest(0, coalesce((votes->>v_key)::int, 0) + v_delta))
         )
   where slug = v_slug
   returning (votes->>v_key)::int into v_count;

  execute format('update public.places set %I = ($1 > 0) where slug = $2', v_column) using v_count, v_slug;
  return null;
end; $$;

drop trigger if exists on_place_tag_vote on public.place_tag_votes;
create trigger on_place_tag_vote
  after insert or delete on public.place_tag_votes
  for each row execute function public.bump_place_tag_vote();
