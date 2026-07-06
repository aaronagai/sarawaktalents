-- ============================================================================
--  Migration 001 — reservable usernames (handles)
--  Adds a unique, case-insensitive username to profiles + an availability
--  check callable from the client. Safe to re-run.
-- ============================================================================

alter table public.profiles
    add column if not exists username text;

-- Case-insensitive uniqueness (one @handle per person)
create unique index if not exists profiles_username_lower_key
    on public.profiles (lower(username));

-- Format: 3–20 chars, lowercase letters / numbers / underscore
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_]{3,20}$');

-- Availability check. SECURITY DEFINER so it can see every row (incl. hidden /
-- pending) while the caller can't read those directly.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select lower(p_username) ~ '^[a-z0-9_]{3,20}$'
       and not exists (
           select 1 from public.profiles where lower(username) = lower(p_username)
       );
$$;

grant execute on function public.username_available(text) to anon, authenticated;
