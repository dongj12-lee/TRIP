-- Migration 008 — Foreigner Fit tags get a real "no" vote too.
-- Run in the Supabase SQL editor (after migration-007).
--
-- migration-007 only tracked confirmations ("yes"). This adds "no" so a tag
-- that travelers actually disagree with doesn't look confirmed just because
-- nobody bothered to vote it down. votes becomes { yes: n, no: n } per tag,
-- and a tag counts as "confirmed" (has=true) only when yes > no.

-- 1. Migrate the 6 hand-seeded places' legacy flat-number votes (e.g.
--    {"cardOk": 28}, demo numbers from before this feature existed — not real
--    user data) into the new { yes, no } shape.
update public.places
set votes = (
  select jsonb_object_agg(
    key,
    case jsonb_typeof(value)
      when 'number' then jsonb_build_object('yes', value::int, 'no', 0)
      else value
    end
  )
  from jsonb_each(votes)
)
where votes is not null and votes <> '{}'::jsonb
  and exists (select 1 from jsonb_each(votes) e where jsonb_typeof(e.value) = 'number');

-- 2. A vote is now yes or no, not just "present".
alter table public.place_tag_votes add column if not exists vote text not null default 'yes' check (vote in ('yes', 'no'));

-- 3. Rewrite the trigger to track both directions and derive "confirmed" as
--    yes > no (a tie or more no's than yes's should not show as confirmed).
create or replace function public.bump_place_tag_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_slug text := coalesce(new.place_slug, old.place_slug);
  v_key text := coalesce(new.tag_key, old.tag_key);
  v_yes_delta int := 0;
  v_no_delta int := 0;
  v_yes int;
  v_no int;
  v_column text := case v_key
    when 'soloOk' then 'solo_ok'
    when 'englishMenu' then 'english_menu'
    when 'priceTransparent' then 'price_transparent'
    when 'cardOk' then 'card_ok'
    when 'englishSpoken' then 'english_spoken'
  end;
begin
  if tg_op = 'INSERT' then
    if new.vote = 'yes' then v_yes_delta := 1; else v_no_delta := 1; end if;
  elsif tg_op = 'DELETE' then
    if old.vote = 'yes' then v_yes_delta := -1; else v_no_delta := -1; end if;
  elsif tg_op = 'UPDATE' and new.vote <> old.vote then
    if new.vote = 'yes' then v_yes_delta := 1; v_no_delta := -1;
    else v_yes_delta := -1; v_no_delta := 1; end if;
  end if;

  update public.places
     set votes = jsonb_set(
           jsonb_set(
             coalesce(votes, '{}'::jsonb),
             array[v_key, 'yes'],
             to_jsonb(greatest(0, coalesce((votes #>> array[v_key, 'yes'])::int, 0) + v_yes_delta)),
             true
           ),
           array[v_key, 'no'],
           to_jsonb(greatest(0, coalesce((votes #>> array[v_key, 'no'])::int, 0) + v_no_delta)),
           true
         )
   where slug = v_slug
   returning (votes #>> array[v_key, 'yes'])::int, (votes #>> array[v_key, 'no'])::int into v_yes, v_no;

  execute format('update public.places set %I = ($1 > $2) where slug = $3', v_column) using v_yes, v_no, v_slug;
  return null;
end; $$;

drop trigger if exists on_place_tag_vote on public.place_tag_votes;
create trigger on_place_tag_vote
  after insert or update or delete on public.place_tag_votes
  for each row execute function public.bump_place_tag_vote();
