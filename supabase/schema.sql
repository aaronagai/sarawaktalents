-- ============================================================================
--  Sarawak Talents — Supabase schema
--  Invite-only directory: Google sign-in → claim invite → create profile.
--
--  Run this in your Supabase project:  Dashboard → SQL Editor → New query →
--  paste the whole file → Run. Safe to re-run (idempotent where practical).
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ============================================================================
--  ADMINS
--  Add a row here (your auth user id) to grant admin powers. After you sign in
--  with Google once, find your id in Auth → Users and insert it (see SETUP.md).
-- ============================================================================
create table if not exists public.admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ============================================================================
--  INVITES
--  One code = one entry. Admin creates them; a user "claims" one at signup.
-- ============================================================================
create table if not exists public.invites (
    id         uuid primary key default gen_random_uuid(),
    code       text unique not null,
    note       text,                    -- who it's for, optional
    created_by uuid references auth.users(id) on delete set null,
    used_by    uuid references auth.users(id) on delete set null,
    used_at    timestamptz,
    created_at timestamptz not null default now()
);

-- ============================================================================
--  PROFILES
--  One row per member, keyed to their auth user id.
-- ============================================================================
create table if not exists public.profiles (
    id         uuid primary key references auth.users(id) on delete cascade,
    name       text not null,
    role       text,                    -- headline, e.g. "Software Engineer"
    organisation text,                  -- employer / org name (free text)
    category   text,                    -- Tech / Arts / Business / Science ...
    location   text,                    -- Kuching, Miri, Sibu ...
    industry   text,                    -- free text, e.g. "Software Development"
    background text,                    -- optional (Iban, Malay, Chinese ...)
    bio        text,
    links      jsonb not null default '{}'::jsonb,   -- {website, x, linkedin, ...}
    avatar_url text,                     -- storage public URL
    org_photo  text,                     -- primary org/badge image (= org_photos[0])
    org_photos jsonb not null default '[]'::jsonb,  -- up to 3 org logo URLs
    education  jsonb not null default '{}'::jsonb,   -- { program, school }
    status     text not null default 'active' check (status in ('active','hidden')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists profiles_status_idx   on public.profiles (status);
create index if not exists profiles_category_idx  on public.profiles (category);
create index if not exists profiles_location_idx  on public.profiles (location);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
    for each row execute function public.touch_updated_at();

-- Reservable username (handle): unique, case-insensitive, 3–20 [a-z0-9_]
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_lower_key
    on public.profiles (lower(username));
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_]{3,20}$');

-- ============================================================================
--  RPCs  (SECURITY DEFINER so they can touch the invites table under controlled
--         rules without exposing the whole table to clients)
-- ============================================================================

-- Is this username free and well-formed? (client checks live while typing)
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

-- Does this code exist and is it still unused? (client checks before sign-in)
create or replace function public.validate_invite(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.invites
        where code = p_code and used_by is null
    );
$$;

-- Claim an invite for the signed-in user. Must be called while authenticated.
-- Marks the invite used and returns its id. Raises if invalid/used.
create or replace function public.claim_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    -- Idempotent for the same user: claiming a code you already hold is fine
    -- (covers the OAuth round-trip resuming the flow).
    update public.invites
       set used_by = auth.uid(), used_at = now()
     where code = p_code and (used_by is null or used_by = auth.uid())
    returning id into v_id;

    if v_id is null then
        raise exception 'Invalid or already-used invite code';
    end if;

    return v_id;
end;
$$;

-- ============================================================================
--  ROW-LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.invites  enable row level security;
alter table public.admins   enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
-- Anyone (even logged-out) can read ACTIVE profiles; you can read your own even
-- if hidden; admins read all.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
    for select
    using (status = 'active' or id = auth.uid() or public.is_admin());

-- You may create YOUR OWN profile only if you have claimed an invite.
-- The claim check runs through a SECURITY DEFINER helper because the invites
-- table's RLS is admin-only — a direct subquery here would see zero rows.
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

-- You may edit your own row; admins may edit anyone (e.g. hide).
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
    for update
    using (id = auth.uid() or public.is_admin())
    with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
    for delete using (public.is_admin());

-- ── invites ─────────────────────────────────────────────────────────────────
-- Only admins touch the table directly. Everyone else uses the RPCs above.
drop policy if exists invites_admin_all on public.invites;
create policy invites_admin_all on public.invites
    for all using (public.is_admin()) with check (public.is_admin());

-- ── admins ──────────────────────────────────────────────────────────────────
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins
    for select using (public.is_admin());
-- (inserts to admins are done from the SQL editor / service role, not the client)

-- ============================================================================
--  STORAGE  (avatars bucket)
--  Public read; each user can write only inside a folder named by their uid.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
    for select using (bucket_id = 'avatars');

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
    for update to authenticated
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
--  Done. Next: create some invites, e.g.
--    insert into public.invites (code, note) values ('SARAWAK-001', 'first batch');
--  and make yourself admin (see SETUP.md).
-- ============================================================================
