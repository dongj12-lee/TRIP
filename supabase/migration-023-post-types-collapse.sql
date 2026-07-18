-- Migration 023 — collapse post types to three meaningful kinds.
-- Run in the Supabase SQL editor (dev, then prod).
--
-- The old model split casual posts across thought / tip / review, but that
-- distinction was fuzzy and added posting friction. We keep only the kinds that
-- carry real meaning: "post" (the freeform default, absorbing thought/tip),
-- "route" (structural — a shared itinerary), and "question" (a distinct intent).

-- 1. Fold any legacy rows onto the new default before tightening the constraint.
--    (No 'review' has ever been storable — the schema's check never allowed it —
--     but map it anyway in case one slipped in.)
alter table public.posts drop constraint if exists posts_type_check;
update public.posts set type = 'post' where type in ('thought', 'tip', 'review');

-- 2. New constraint + default.
alter table public.posts add constraint posts_type_check
  check (type in ('post', 'route', 'question'));
alter table public.posts alter column type set default 'post';
