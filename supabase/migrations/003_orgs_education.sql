-- ============================================================================
--  Migration 003 — multiple organisation logos + education
--    org_photos : up to 3 logo URLs (org_photo stays as the first, for the
--                 directory badge / backward compatibility)
--    education  : { program, school }
--  Facebook is just another key in the existing links jsonb — no column needed.
--  Safe to re-run.
-- ============================================================================

alter table public.profiles add column if not exists org_photos jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists education jsonb not null default '{}'::jsonb;
