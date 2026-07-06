-- Migration 009 — fix the yes/no vote trigger from migration-008.
-- Run in the Supabase SQL editor (after migration-008).
--
-- Testing found that voting on a tag with no prior votes on that place (e.g.
-- the first "Card OK" vote on a place) silently failed to save: votes stayed
-- unchanged and the boolean column flipped to NULL instead of true/false. The
-- likely cause was combining a nested jsonb_set(...) with `UPDATE ... RETURNING
-- ... INTO` in one statement. Rewritten with a plain SELECT ... INTO for the
-- current counts, then a single non-nested jsonb_set — simpler and verified.

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
    from public.places
   where slug = v_slug;

  update public.places
     set votes = jsonb_set(coalesce(votes, '{}'::jsonb), array[v_key], jsonb_build_object('yes', v_cur_yes, 'no', v_cur_no), true)
   where slug = v_slug;

  execute format('update public.places set %I = $1 where slug = $2', v_column)
    using (v_cur_yes > v_cur_no), v_slug;

  return null;
end; $$;

drop trigger if exists on_place_tag_vote on public.place_tag_votes;
create trigger on_place_tag_vote
  after insert or update or delete on public.place_tag_votes
  for each row execute function public.bump_place_tag_vote();
