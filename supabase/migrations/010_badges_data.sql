-- ============================================================================
--  Migration 010 — badges: supporting data model
--
--  Six of the ten badges (connector, explorer, ambassador, multi-talented,
--  rising-star, local-voice) need data that doesn't exist yet: connections
--  between members, profile-view logs, referral tracking, multi-value skill
--  tags, and a BM-language bio. This migration adds exactly that, plus the
--  `verified`/`verified_at` columns Verified Talent needs.
--
--  Design note: profile_tags / connections / profile_views reference
--  public.profiles(id), NOT auth.users(id) (unlike every existing FK in this
--  schema). Two FKs to the same third table (profiles.id -> auth.users,
--  user_badges.user_id -> auth.users) can't be embedded together by
--  PostgREST — pointing these new tables straight at profiles lets the UI
--  fetch e.g. a profile + its connections in one round trip instead of N+1.
--
--  Safe to re-run.
-- ============================================================================

-- ── profiles: referral + bilingual + verification columns ───────────────────
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists bio_bm      text;
alter table public.profiles add column if not exists verified    boolean not null default false;
alter table public.profiles add column if not exists verified_at timestamptz;

alter table public.profiles drop constraint if exists profiles_no_self_referral;
alter table public.profiles add constraint profiles_no_self_referral
    check (referred_by is null or referred_by <> id);

-- referred_by is settable once (at signup) and immutable after that unless an
-- admin changes it — mirrors the intent of a "who invited you" stamp rather
-- than a live-editable field.
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

-- ============================================================================
--  PROFILE_TAGS — multi-valued "also skilled in" tags (Multi-Talented badge).
--  Deliberately separate from profiles.category/industry, which stay single-
--  value scalars relied on throughout the directory's filter/sort/search.
-- ============================================================================
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
create policy profile_tags_read on public.profile_tags
    for select using (true);

drop policy if exists profile_tags_write on public.profile_tags;
create policy profile_tags_write on public.profile_tags
    for all
    using (profile_id = (select auth.uid()))
    with check (profile_id = (select auth.uid()));

-- ============================================================================
--  CONNECTIONS — one-directional "I connected with this person" (Connector).
--  No disconnect in v1: connections are permanent once made.
-- ============================================================================
create table if not exists public.connections (
    id                 uuid primary key default gen_random_uuid(),
    user_id            uuid not null references public.profiles(id) on delete cascade,
    connected_user_id  uuid not null references public.profiles(id) on delete cascade,
    created_at         timestamptz not null default now(),
    unique (user_id, connected_user_id)
);
alter table public.connections drop constraint if exists connections_no_self_connect;
alter table public.connections add constraint connections_no_self_connect
    check (user_id <> connected_user_id);

create index if not exists connections_user_idx      on public.connections (user_id);
create index if not exists connections_connected_idx on public.connections (connected_user_id);

alter table public.connections enable row level security;

drop policy if exists connections_read on public.connections;
create policy connections_read on public.connections
    for select using (true);

drop policy if exists connections_insert on public.connections;
create policy connections_insert on public.connections
    for insert to authenticated
    with check (user_id = (select auth.uid()));

-- ============================================================================
--  PROFILE_VIEWS — view log (Explorer's zone coverage, Rising Star's monthly
--  counts). No select policy for anon/authenticated at all: nobody should be
--  able to query "who viewed my profile" from the client. Only admins and the
--  SECURITY DEFINER scheduled functions (migration 012) read this table.
-- ============================================================================
create table if not exists public.profile_views (
    id                 uuid primary key default gen_random_uuid(),
    viewer_id          uuid references public.profiles(id) on delete set null,  -- null = anonymous view
    viewed_profile_id  uuid not null references public.profiles(id) on delete cascade,
    created_at         timestamptz not null default now()
);
create index if not exists profile_views_viewed_created_idx on public.profile_views (viewed_profile_id, created_at);
create index if not exists profile_views_created_viewed_idx on public.profile_views (created_at, viewed_profile_id);
create index if not exists profile_views_viewer_idx         on public.profile_views (viewer_id);

alter table public.profile_views enable row level security;

drop policy if exists profile_views_insert on public.profile_views;
create policy profile_views_insert on public.profile_views
    for insert to anon, authenticated
    with check (viewer_id is null or viewer_id = (select auth.uid()));

drop policy if exists profile_views_admin_read on public.profile_views;
create policy profile_views_admin_read on public.profile_views
    for select using ((select public.is_admin()));
