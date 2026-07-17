-- Migration 022 — editorial "verified by TRIP" Foreigner-Fit tags.
-- Run in the Supabase SQL editor.
--
-- The Foreigner-Fit checklist (migration-007) is deliberately a pure crowd
-- layer — imported places start honestly blank, with zero pre-filled tags.
-- With zero users yet, that's a cold-start problem: the checklist may never
-- get its first vote. This adds a SEPARATE, clearly-distinct layer for facts
-- the TRIP team can state with real confidence — either mechanically derived
-- from Visit Seoul's own objective fields (english_site, wheelchair), or a
-- well-established category-level fact (e.g. department stores take cards
-- everywhere in Korea) — never a per-place guess. It never writes to `votes`
-- or the boolean vote-backed columns, so it can't be confused with or
-- clobber real traveler votes.

alter table public.places
  add column if not exists verified_tags jsonb not null default '[]'::jsonb;
