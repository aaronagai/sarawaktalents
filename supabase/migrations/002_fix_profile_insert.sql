-- ============================================================================
--  Migration 002 — fix profiles INSERT under RLS
--
--  The profiles_insert policy checked `exists (select 1 from invites where
--  used_by = auth.uid())`, but the invites table's RLS is admin-only, so that
--  subquery is filtered to zero rows for a normal user → insert denied
--  ("new row violates row-level security policy for table profiles").
--
--  Fix: check the claim via a SECURITY DEFINER helper that bypasses RLS,
--  without exposing the invites table to clients. Safe to re-run.
-- ============================================================================

create or replace function public.has_claimed_invite()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (select 1 from public.invites where used_by = auth.uid());
$$;

grant execute on function public.has_claimed_invite() to authenticated;

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
    for insert
    with check (id = auth.uid() and public.has_claimed_invite());
