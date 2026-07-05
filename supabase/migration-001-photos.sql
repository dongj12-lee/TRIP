-- Migration 001 — run this in the SQL editor AFTER schema.sql if you already
-- ran schema.sql once (idempotent: safe to run multiple times).
-- Adds real photo support for TourAPI-imported places.

alter table public.places add column if not exists photo_url text;
