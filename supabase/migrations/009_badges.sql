-- ============================================================================
--  Migration 009 — badges / achievements system
--
--  badges       : catalog of all possible badges (static, admin-managed)
--  user_badges  : which members have earned which badges, and when
--
--  Awarding badges is server-side (SECURITY DEFINER functions), not a plain
--  client insert — otherwise any signed-in user could grant themselves any
--  badge directly via the RLS-writable table. Real-time badge check functions
--  land in a follow-up migration once the underlying data they check
--  (connections, views, referrals, etc.) exists.
--  Safe to re-run.
-- ============================================================================

create type public.badge_criteria_type as enum (
    'manual',
    'connector',
    'pioneer',
    'explorer',
    'verified',
    'complete_profile',
    'ambassador',
    'multi_talented',
    'rising_star',
    'local_voice',
    'anniversary'
);

-- ============================================================================
--  BADGES  (catalog)
-- ============================================================================
create table if not exists public.badges (
    id            uuid primary key default gen_random_uuid(),
    slug          text unique not null,
    name          text not null,
    description   text not null,
    icon          text not null,                 -- emoji, e.g. '🤝'
    criteria_type public.badge_criteria_type not null,
    created_at    timestamptz not null default now()
);

-- ============================================================================
--  USER_BADGES  (earned badges)
-- ============================================================================
create table if not exists public.user_badges (
    id        uuid primary key default gen_random_uuid(),
    user_id   uuid not null references auth.users(id) on delete cascade,
    badge_id  uuid not null references public.badges(id) on delete cascade,
    earned_at timestamptz not null default now(),
    unique (user_id, badge_id)
);

create index if not exists user_badges_user_idx  on public.user_badges (user_id);
create index if not exists user_badges_badge_idx on public.user_badges (badge_id);

-- ============================================================================
--  ROW-LEVEL SECURITY
-- ============================================================================
alter table public.badges      enable row level security;
alter table public.user_badges enable row level security;

-- badges: public catalog, readable by anyone (incl. logged-out directory view)
drop policy if exists badges_read on public.badges;
create policy badges_read on public.badges
    for select using (true);

-- only admins edit the catalog directly (SQL editor / admin UI later)
drop policy if exists badges_admin_write on public.badges;
create policy badges_admin_write on public.badges
    for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- user_badges: public read (directory cards + profile page show anyone's
-- earned badges). No direct client insert/update/delete — badges are only
-- ever awarded through SECURITY DEFINER functions (added alongside the check
-- logic) or by an admin.
drop policy if exists user_badges_read on public.user_badges;
create policy user_badges_read on public.user_badges
    for select using (true);

drop policy if exists user_badges_admin_write on public.user_badges;
create policy user_badges_admin_write on public.user_badges
    for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- ============================================================================
--  SEED DATA — the 10 badges
-- ============================================================================
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
