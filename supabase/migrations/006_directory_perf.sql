-- ============================================================================
--  Migration 006 — directory read performance
--
--  Two changes, both additive and safe to re-run. Neither alters WHAT a client
--  can see — only how fast Postgres decides it.
--
--  1. RLS initplan fix. The old profiles_read policy called auth.uid() and
--     public.is_admin() bare, so Postgres re-evaluated them ONCE PER ROW while
--     scanning the table. Wrapping each in a scalar sub-select makes the planner
--     treat them as initplans — evaluated a single time per query. For an
--     anonymous homepage load (the hot path) this turns N is_admin() calls into
--     one. This is the standard Supabase RLS optimisation.
--     https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
--  2. Partial index matching the directory query exactly:
--        ... where status = 'active' order by created_at asc
--     Lets the filter + sort be served straight from the index instead of a
--     seq scan + sort as the table grows.
-- ============================================================================

-- ── 1. RLS: evaluate auth/admin checks once per query, not once per row ──────
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
    for select
    using (
        status = 'active'
        or id = (select auth.uid())
        or (select public.is_admin())
    );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
    for update
    using (id = (select auth.uid()) or (select public.is_admin()))
    with check (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
    for insert
    with check (id = (select auth.uid()) and (select public.has_claimed_invite()));

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
    for delete using ((select public.is_admin()));

-- ── 2. Partial index for the public directory listing ───────────────────────
--  Covers `where status = 'active' order by created_at`. Partial (only active
--  rows) keeps it small and lets the sort come free from the index order.
create index if not exists profiles_active_created_idx
    on public.profiles (created_at)
    where status = 'active';

-- The old plain-status index is now redundant for the directory read (the
-- partial index above supersedes it). Kept in case other queries filter on
-- status alone; drop it later if EXPLAIN shows it unused.
-- drop index if exists profiles_status_idx;
