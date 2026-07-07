-- Migration 014 — support category-specific Foreigner-Fit tags.
-- Run in the Supabase SQL editor.
--
-- The Foreigner-Fit checklist is now tailored per category (a museum asks about
-- English audio guides; a restaurant asks about vegetarian options). The
-- original five tags keep their boolean columns (they drive the Explore
-- filter); the new tags live only in places.votes jsonb — no column, no filter.
--
-- Two changes:
--   1. Allow the new tag keys in place_tag_votes (the old CHECK only permitted
--      the original five).
--   2. Make the vote trigger skip the boolean-column sync for keys that don't
--      have a column, instead of erroring on a NULL column name.

alter table public.place_tag_votes drop constraint if exists place_tag_votes_tag_key_check;
alter table public.place_tag_votes add constraint place_tag_votes_tag_key_check
  check (tag_key in (
    'soloOk', 'englishMenu', 'priceTransparent', 'cardOk', 'englishSpoken',
    'vegFriendly', 'halalFriendly', 'laptopOk', 'englishInfo', 'worthIt',
    'photoOk', 'notCrowded', 'taxFree', 'beginnerOk', 'bookingNeeded', 'goodFacilities'
  ));

create or replace function public.bump_place_tag_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_slug text := coalesce(new.place_slug, old.place_slug);
  v_key text := coalesce(new.tag_key, old.tag_key);
  v_yes_delta int := 0;
  v_no_delta int := 0;
  v_cur_yes int := 0;
  v_cur_no int := 0;
  v_column text := case v_key
    when 'soloOk' then 'solo_ok'
    when 'englishMenu' then 'english_menu'
    when 'priceTransparent' then 'price_transparent'
    when 'cardOk' then 'card_ok'
    when 'englishSpoken' then 'english_spoken'
    else null
  end;
begin
  if tg_op = 'INSERT' then
    if new.vote = 'yes' then v_yes_delta := 1; else v_no_delta := 1; end if;
  elsif tg_op = 'DELETE' then
    if old.vote = 'yes' then v_yes_delta := -1; else v_no_delta := -1; end if;
  elsif tg_op = 'UPDATE' and new.vote is distinct from old.vote then
    if new.vote = 'yes' then v_yes_delta := 1; v_no_delta := -1;
    else v_yes_delta := -1; v_no_delta := 1; end if;
  end if;

  select
    greatest(0, coalesce((votes #>> array[v_key, 'yes'])::int, 0) + v_yes_delta),
    greatest(0, coalesce((votes #>> array[v_key, 'no'])::int, 0) + v_no_delta)
    into v_cur_yes, v_cur_no
    from public.places where slug = v_slug;

  update public.places
     set votes = jsonb_set(coalesce(votes, '{}'::jsonb), array[v_key], jsonb_build_object('yes', v_cur_yes, 'no', v_cur_no), true)
   where slug = v_slug;

  -- Only the original five have a denormalized boolean column; skip the rest.
  if v_column is not null then
    execute format('update public.places set %I = ($1 > $2) where slug = $3', v_column)
      using v_cur_yes, v_cur_no, v_slug;
  end if;

  return null;
end; $$;

drop trigger if exists on_place_tag_vote on public.place_tag_votes;
create trigger on_place_tag_vote
  after insert or update or delete on public.place_tag_votes
  for each row execute function public.bump_place_tag_vote();
