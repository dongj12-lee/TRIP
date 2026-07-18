-- Migration 024 — adds places.naver_map_url.
--
-- SUPERSEDED by migration-025, which renames this column to `website_url`:
-- the assumption below (that Naver's Local Search `link` field points to a
-- Naver Map review page) turned out to be wrong — verified against the real
-- API response, `link` is the business's own external website. Naver has no
-- official API, free or paid, that exposes a place ID or review-page link.
-- Kept here unedited as the historical record; see migration-025 for the
-- correction.

alter table public.places add column if not exists naver_map_url text;
