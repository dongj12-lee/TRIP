-- Migration 024 — deep link to each place's real Naver Map page.
-- Run in the Supabase SQL editor (dev, then prod).
--
-- We can't legally cache Google/Naver review content (Places API forbids
-- storing anything but the place ID; Naver's Local Search API has no review
-- field at all), so instead of embedding reviews in-app we store a permanent
-- link to the place's own Naver Map page — the traveler taps through to see
-- live reviews/photos/hours on Naver's own site. Populated by
-- scripts/backfill-naver-map-link.ts (npm run backfill:naver-map-link).

alter table public.places add column if not exists naver_map_url text;
