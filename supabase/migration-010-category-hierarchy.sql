-- Migration 010 — store Visit Seoul's real category hierarchy.
-- Run in the Supabase SQL editor.
--
-- Until now `places.category` held an app-invented bucket (Attraction/Cafe/
-- Activity/Nightlife/...) that flattened Visit Seoul's own 3-level taxonomy
-- (61 category codes under 8 top-level groups). We're now importing the full
-- catalog (minus Accommodations and time-bound Festivals/Events/Performances)
-- and want Explore to browse it the way Visit Seoul itself organizes it:
-- top-level category (e.g. "Cuisine") → sub-category (e.g. "Foreign
-- Restaurant") → occasionally a third level (e.g. "Chinese").
--
-- `category` will now hold the real Visit Seoul L1 name (Culture, History,
-- Nature, Shopping, Cuisine, Experience Programs). The two new columns hold
-- the finer levels, nullable since not every place has them.

alter table public.places add column if not exists category_l2 text;
alter table public.places add column if not exists category_l3 text;

create index if not exists places_category_l2_idx on public.places (category_l2);
