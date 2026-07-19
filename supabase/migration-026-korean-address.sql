-- Migration 026 — adds places.address_ko: the genuine Hangul road address,
-- for the place detail phrase sheet's "show this address" toggle (a taxi
-- driver reads Korean script far more easily than a romanized address).
-- Run in the Supabase SQL editor (dev, then prod).
--
-- Populated by scripts/import-visitseoul.ts (a second contents/info call on
-- each item's KO-locale cid, same mechanism already used for name_ko — see
-- that file's header for why this was chosen over NCP Reverse Geocoding).
-- Existing places only get it once you re-run a FULL Visit Seoul import
-- (npm run import:visitseoul) — it doesn't backfill retroactively on its own.

alter table public.places add column if not exists address_ko text;
