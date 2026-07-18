-- Migration 025 — rename places.naver_map_url to places.website_url.
-- Run in the Supabase SQL editor (dev, then prod), after migration-024.
--
-- Correction: migration-024 assumed the Naver Local Search API's `link` field
-- pointed to the place's Naver Map page (for reviews). Verified against the
-- real API response — `link` is actually the business's own registered
-- website (e.g. their homepage), not a Naver Map URL. Naver has no official
-- API, free or paid, that returns a place ID or a review-page link. So this
-- field now honestly represents "the business's own website, when they have
-- one" — a real, useful, ToS-clean piece of info, just not what migration-024
-- described. Column is empty at rename time (bad data was cleared before
-- this migration), so a plain rename is safe.

alter table public.places rename column naver_map_url to website_url;
 