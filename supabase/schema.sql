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
    industry   text,                    -- primary industry (first of industries[])
    industries jsonb not null default '[]'::jsonb,  -- multi-select list
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
--  BADGES / ACHIEVEMENTS  (see migrations 009-011 for full history/comments)
-- ============================================================================
create type public.badge_criteria_type as enum (
    'manual', 'connector', 'pioneer', 'explorer', 'verified',
    'complete_profile', 'ambassador', 'multi_talented', 'rising_star',
    'local_voice', 'anniversary'
);

create table if not exists public.badges (
    id            uuid primary key default gen_random_uuid(),
    slug          text unique not null,
    name          text not null,
    description   text not null,
    icon          text not null,
    criteria_type public.badge_criteria_type not null,
    created_at    timestamptz not null default now()
);

create table if not exists public.user_badges (
    id        uuid primary key default gen_random_uuid(),
    user_id   uuid not null references auth.users(id) on delete cascade,
    badge_id  uuid not null references public.badges(id) on delete cascade,
    earned_at timestamptz not null default now(),
    unique (user_id, badge_id)
);
create index if not exists user_badges_user_idx  on public.user_badges (user_id);
create index if not exists user_badges_badge_idx on public.user_badges (badge_id);

alter table public.badges      enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists badges_read on public.badges;
create policy badges_read on public.badges for select using (true);
drop policy if exists badges_admin_write on public.badges;
create policy badges_admin_write on public.badges for all using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists user_badges_read on public.user_badges;
create policy user_badges_read on public.user_badges for select using (true);
drop policy if exists user_badges_admin_write on public.user_badges;
create policy user_badges_admin_write on public.user_badges for all using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.badges (slug, name, description, icon, criteria_type) values
    ('connector',        'Connector',        'Connected with 10+ different people on the platform',                '🤝', 'connector'),
    ('pioneer',           'Pioneer',          'One of the first 100 users to join',                                  '🌱', 'pioneer'),
    ('explorer',          'Explorer',         'Viewed/interacted with profiles from all major Sarawak zones',       '🧭', 'explorer'),
    ('verified-talent',   'Verified Talent',  'Profile reviewed and verified by an admin',                           '✅', 'verified'),
    ('complete-profile',  'Complete Profile', 'Filled out 100% of profile fields',                                   '📸', 'complete_profile'),
    ('ambassador',        'Ambassador',       'Referred 5+ people who signed up and completed their profile',       '🗣️', 'ambassador'),
    ('multi-talented',    'Multi-Talented',   'Tagged under 2+ different fields/industries',                         '🎨', 'multi_talented'),
    ('rising-star',       'Rising Star',      'Most profile views/endorsements this month',                          '🔥', 'rising_star'),
    ('local-voice',       'Local Voice',      'Profile filled out in both EN and BM',                                '🏛️', 'local_voice'),
    ('anniversary',       'Anniversary',      'Active member for 1+ year',                                           '🎂', 'anniversary')
on conflict (slug) do nothing;

-- ── supporting data (connections, views, tags, referral/bilingual/verified) ─
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists bio_bm      text;
alter table public.profiles add column if not exists verified    boolean not null default false;
alter table public.profiles add column if not exists verified_at timestamptz;

alter table public.profiles drop constraint if exists profiles_no_self_referral;
alter table public.profiles add constraint profiles_no_self_referral
    check (referred_by is null or referred_by <> id);

create or replace function public.lock_referred_by()
returns trigger language plpgsql as $$
begin
    if not (select public.is_admin()) and new.referred_by is distinct from old.referred_by then
        new.referred_by := old.referred_by;
    end if;
    return new;
end; $$;

drop trigger if exists profiles_lock_referred_by on public.profiles;
create trigger profiles_lock_referred_by before update on public.profiles
    for each row execute function public.lock_referred_by();

create table if not exists public.profile_tags (
    id         uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    tag        text not null,
    created_at timestamptz not null default now(),
    unique (profile_id, tag)
);
create index if not exists profile_tags_profile_idx on public.profile_tags (profile_id);
alter table public.profile_tags enable row level security;
drop policy if exists profile_tags_read on public.profile_tags;
create policy profile_tags_read on public.profile_tags for select using (true);
drop policy if exists profile_tags_write on public.profile_tags;
create policy profile_tags_write on public.profile_tags for all
    using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create table if not exists public.connections (
    id                 uuid primary key default gen_random_uuid(),
    user_id            uuid not null references public.profiles(id) on delete cascade,
    connected_user_id  uuid not null references public.profiles(id) on delete cascade,
    created_at         timestamptz not null default now(),
    unique (user_id, connected_user_id)
);
alter table public.connections drop constraint if exists connections_no_self_connect;
alter table public.connections add constraint connections_no_self_connect check (user_id <> connected_user_id);
create index if not exists connections_user_idx      on public.connections (user_id);
create index if not exists connections_connected_idx on public.connections (connected_user_id);
alter table public.connections enable row level security;
drop policy if exists connections_read on public.connections;
create policy connections_read on public.connections for select using (true);
drop policy if exists connections_insert on public.connections;
create policy connections_insert on public.connections for insert to authenticated
    with check (user_id = (select auth.uid()));

create table if not exists public.profile_views (
    id                 uuid primary key default gen_random_uuid(),
    viewer_id          uuid references public.profiles(id) on delete set null,
    viewed_profile_id  uuid not null references public.profiles(id) on delete cascade,
    created_at         timestamptz not null default now()
);
create index if not exists profile_views_viewed_created_idx on public.profile_views (viewed_profile_id, created_at);
create index if not exists profile_views_created_viewed_idx on public.profile_views (created_at, viewed_profile_id);
create index if not exists profile_views_viewer_idx         on public.profile_views (viewer_id);
alter table public.profile_views enable row level security;
drop policy if exists profile_views_insert on public.profile_views;
create policy profile_views_insert on public.profile_views for insert to anon, authenticated
    with check (viewer_id is null or viewer_id = (select auth.uid()));
drop policy if exists profile_views_admin_read on public.profile_views;
create policy profile_views_admin_read on public.profile_views for select using ((select public.is_admin()));

-- ── real-time awarding functions ─────────────────────────────────────────────
create or replace function public.is_profile_complete(p public.profiles)
returns boolean language sql immutable as $$
    select p.avatar_url is not null and p.avatar_url <> ''
       and p.bio        is not null and p.bio <> ''
       and p.industry   is not null and p.industry <> ''
       and p.links       <> '{}'::jsonb
       and p.education   <> '{}'::jsonb
$$;

create or replace function public._try_award(p_user_id uuid, p_slug text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_badge_id uuid; v_inserted uuid;
begin
    select id into v_badge_id from public.badges where slug = p_slug;
    if v_badge_id is null then raise exception 'Unknown badge slug: %', p_slug; end if;
    insert into public.user_badges (user_id, badge_id) values (p_user_id, v_badge_id)
    on conflict (user_id, badge_id) do nothing returning badge_id into v_inserted;
    return v_inserted is not null;
end; $$;

create or replace function public.check_and_award_badges(p_user_id uuid)
returns setof public.badges language plpgsql security definer set search_path = public as $$
declare v_prof public.profiles; v_slugs text[] := '{}';
begin
    if auth.uid() is null then raise exception 'Not authenticated'; end if;
    select * into v_prof from public.profiles where id = p_user_id;
    if not found then return; end if;

    if public.is_profile_complete(v_prof) and public._try_award(p_user_id, 'complete-profile') then
        v_slugs := v_slugs || 'complete-profile';
    end if;
    if (select count(distinct connected_user_id) from public.connections where user_id = p_user_id) >= 10
       and public._try_award(p_user_id, 'connector') then
        v_slugs := v_slugs || 'connector';
    end if;
    if (select count(*) from public.profile_tags where profile_id = p_user_id) >= 2
       and public._try_award(p_user_id, 'multi-talented') then
        v_slugs := v_slugs || 'multi-talented';
    end if;
    if coalesce(v_prof.bio, '') <> '' and coalesce(v_prof.bio_bm, '') <> ''
       and public._try_award(p_user_id, 'local-voice') then
        v_slugs := v_slugs || 'local-voice';
    end if;
    if (select count(*) from public.profiles r where r.referred_by = p_user_id and public.is_profile_complete(r)) >= 5
       and public._try_award(p_user_id, 'ambassador') then
        v_slugs := v_slugs || 'ambassador';
    end if;

    return query select * from public.badges where slug = any(v_slugs);
end; $$;
grant execute on function public.check_and_award_badges(uuid) to authenticated;

create or replace function public.resolve_referrer(p_username text)
returns uuid language sql stable security definer set search_path = public as $$
    select id from public.profiles where lower(username) = lower(p_username) and status = 'active';
$$;
grant execute on function public.resolve_referrer(text) to anon, authenticated;

create or replace function public.admin_mark_verified(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
    if not (select public.is_admin()) then raise exception 'Not authorized'; end if;
    update public.profiles set verified = true, verified_at = now() where id = p_user_id;
    perform public._try_award(p_user_id, 'verified-talent');
end; $$;
grant execute on function public.admin_mark_verified(uuid) to authenticated;

-- ── scheduled badge checks (see migration 012) ───────────────────────────────
--  Reachable only via the service_role key — explicitly revoked from
--  anon/authenticated below (unlike is_admin()-style helpers, Postgres grants
--  EXECUTE to PUBLIC by default on CREATE FUNCTION).
create or replace function public.run_pioneer_backfill()
returns void language sql security definer set search_path = public as $$
    insert into public.user_badges (user_id, badge_id)
    select t.id, (select id from public.badges where slug = 'pioneer')
    from (select id from public.profiles order by created_at asc limit 100) t
    on conflict (user_id, badge_id) do nothing;
$$;

create or replace function public.run_anniversary_check()
returns void language sql security definer set search_path = public as $$
    insert into public.user_badges (user_id, badge_id)
    select p.id, (select id from public.badges where slug = 'anniversary')
    from public.profiles p
    where p.status = 'active' and p.created_at <= now() - interval '1 year'
    on conflict (user_id, badge_id) do nothing;
$$;

create or replace function public.run_explorer_check()
returns void language plpgsql security definer set search_path = public as $$
declare v_zones text[] := array['Kuching','Miri','Sibu','Bintulu','Sri Aman','Limbang'];
begin
    insert into public.user_badges (user_id, badge_id)
    select v.viewer_id, (select id from public.badges where slug = 'explorer')
    from (
        select pv.viewer_id, count(distinct pr.location) as zones_seen
        from public.profile_views pv
        join public.profiles pr on pr.id = pv.viewed_profile_id
        where pv.viewer_id is not null and pr.status = 'active' and pr.location = any (v_zones)
        group by pv.viewer_id
        having count(distinct pr.location) >= array_length(v_zones, 1)
    ) v
    on conflict (user_id, badge_id) do nothing;
end; $$;

create or replace function public.run_rising_star_recompute()
returns void language plpgsql security definer set search_path = public as $$
declare v_badge_id uuid; v_top_count bigint;
begin
    select id into v_badge_id from public.badges where slug = 'rising-star';
    delete from public.user_badges where badge_id = v_badge_id;

    select max(view_count) into v_top_count from (
        select pv.viewed_profile_id, count(*) as view_count
        from public.profile_views pv join public.profiles pr on pr.id = pv.viewed_profile_id
        where pr.status = 'active' and pv.created_at >= date_trunc('month', now())
        group by pv.viewed_profile_id
    ) t;
    if v_top_count is null or v_top_count = 0 then return; end if;

    insert into public.user_badges (user_id, badge_id)
    select pv.viewed_profile_id, v_badge_id
    from public.profile_views pv join public.profiles pr on pr.id = pv.viewed_profile_id
    where pr.status = 'active' and pv.created_at >= date_trunc('month', now())
    group by pv.viewed_profile_id
    having count(*) = v_top_count
    on conflict (user_id, badge_id) do nothing;
end; $$;

create or replace function public.run_scheduled_badge_checks()
returns void language plpgsql security definer set search_path = public as $$
begin
    begin perform public.run_pioneer_backfill();   exception when others then raise warning 'pioneer backfill failed: %', sqlerrm; end;
    begin perform public.run_anniversary_check();  exception when others then raise warning 'anniversary check failed: %', sqlerrm; end;
    begin perform public.run_explorer_check();     exception when others then raise warning 'explorer check failed: %', sqlerrm; end;
    begin perform public.run_rising_star_recompute(); exception when others then raise warning 'rising star recompute failed: %', sqlerrm; end;
end; $$;

revoke execute on function public.run_pioneer_backfill()       from public, anon, authenticated;
revoke execute on function public.run_anniversary_check()      from public, anon, authenticated;
revoke execute on function public.run_explorer_check()         from public, anon, authenticated;
revoke execute on function public.run_rising_star_recompute()  from public, anon, authenticated;
revoke execute on function public.run_scheduled_badge_checks() from public, anon, authenticated;

-- ============================================================================
--  Done. Next: create some invites, e.g.
--    insert into public.invites (code, note) values ('SARAWAK-001', 'first batch');
--  and make yourself admin (see SETUP.md).
-- ============================================================================
