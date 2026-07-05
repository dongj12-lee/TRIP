-- Migration 002 — run in the Supabase SQL editor (idempotent).
-- Tracks where each place row came from so multi-source imports (seed data,
-- TourAPI, Visit Seoul API) can be managed/deduped independently, and adds
-- English-description storage for foreigner-facing content.

alter table public.places add column if not exists source text default 'seed';
alter table public.places add column if not exists description_en text;
alter table public.places add column if not exists hours_note text;

-- Backfill: rows imported from TourAPI have a trailing "-{contentid}" numeric
-- suffix in the slug and empty foreigner-tag votes; simplest reliable marker
-- is that the hand-curated seed slugs are known and finite.
update public.places set source = 'tourapi'
where source = 'seed'
  and slug not in (
    'nogari-alley-manseon','eulji-myeonok','euljiro-coffee-hanyak',
    'gwangjang-yukhoe','gs25-euljiro-combo','siloam-sauna'
  );
