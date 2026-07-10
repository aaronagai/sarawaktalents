-- ============================================================================
--  Migration 008 — free-text organisation name on profiles
--
--  Members can enter their employer / organisation in plain text. Optional
--  org_photos badges remain separate (directory affiliate marks).
--  Safe to re-run.
-- ============================================================================

alter table public.profiles add column if not exists organisation text;
