-- Migration 027 — adds places.blurb_ai: a short, AI-written one-line summary
-- of the place, precomputed once (see scripts/backfill-place-blurb.ts).
-- Run in the Supabase SQL editor (dev, then prod).
--
-- lib/placeBlurb.ts still does the live opening-sentence extraction as the
-- fallback for any row this hasn't reached yet (new imports, or a backfill
-- run that skipped a short/sparse description) — this column only overrides
-- it when populated. Null is the normal, expected state until the backfill
-- script runs for a given row.

alter table public.places add column if not exists blurb_ai text;
