-- ============================================================================
--  Migration 011 — badges: real-time awarding functions
--
--  Awarding happens exclusively through SECURITY DEFINER functions, never a
--  raw client insert into user_badges (see migration 009's RLS) — otherwise
--  any signed-in user could grant themselves any badge directly.
--
--  check_and_award_badges() covers the five badge types that can be decided
--  purely from data that already exists once a profile/tag/connection is
--  saved: complete-profile, connector, multi-talented, local-voice,
--  ambassador. verified-talent is awarded separately by admin_mark_verified()
--  (admin action, not a criteria check). The four scheduled badge types
--  (pioneer, anniversary, explorer, rising-star) are in migration 012 — they
--  need to scan across all profiles/views, not just one user's data.
--
--  Safe to re-run.
-- ============================================================================

-- ── is_profile_complete: the one definition of "100% filled out" ────────────
--  Reused by both complete-profile and ambassador (a referred profile only
--  counts once it's actually complete).
create or replace function public.is_profile_complete(p public.profiles)
returns boolean
language sql
immutable
as $$
    select p.avatar_url is not null and p.avatar_url <> ''
       and p.bio        is not null and p.bio <> ''
       and p.industry   is not null and p.industry <> ''
       and p.links       <> '{}'::jsonb
       and p.education   <> '{}'::jsonb
$$;

-- ── _try_award: shared "insert if not already earned" helper ────────────────
--  Returns true only when a row was actually inserted (i.e. newly earned),
--  so callers can tell a fresh award apart from an already-held badge.
create or replace function public._try_award(p_user_id uuid, p_slug text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_badge_id uuid; v_inserted uuid;
begin
    select id into v_badge_id from public.badges where slug = p_slug;
    if v_badge_id is null then
        raise exception 'Unknown badge slug: %', p_slug;
    end if;

    insert into public.user_badges (user_id, badge_id)
    values (p_user_id, v_badge_id)
    on conflict (user_id, badge_id) do nothing
    returning badge_id into v_inserted;

    return v_inserted is not null;
end;
$$;

-- ── check_and_award_badges: the real-time dispatcher ─────────────────────────
--  Deliberately NOT restricted to auth.uid() = p_user_id. Ambassador must be
--  re-checked for the REFERRER when the REFERRED person saves their profile
--  — that save happens in the referred user's session, not the referrer's.
--  Every check here is purely read-derived and _try_award is idempotent, so
--  letting any authenticated caller trigger a recompute for any user is
--  harmless (worst case a no-op). Capped at `authenticated` (not `anon`) so
--  logged-out clients can't spam recomputes.
create or replace function public.check_and_award_badges(p_user_id uuid)
returns setof public.badges
language plpgsql
security definer
set search_path = public
as $$
declare
    v_prof   public.profiles;
    v_slugs  text[] := '{}';
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    select * into v_prof from public.profiles where id = p_user_id;
    if not found then
        return;
    end if;

    -- Complete Profile
    if public.is_profile_complete(v_prof) and public._try_award(p_user_id, 'complete-profile') then
        v_slugs := v_slugs || 'complete-profile';
    end if;

    -- Connector: 10+ distinct connections
    if (select count(distinct connected_user_id) from public.connections where user_id = p_user_id) >= 10
       and public._try_award(p_user_id, 'connector') then
        v_slugs := v_slugs || 'connector';
    end if;

    -- Multi-Talented: 2+ additional tags
    if (select count(*) from public.profile_tags where profile_id = p_user_id) >= 2
       and public._try_award(p_user_id, 'multi-talented') then
        v_slugs := v_slugs || 'multi-talented';
    end if;

    -- Local Voice: EN + BM bio both filled in
    if coalesce(v_prof.bio, '') <> '' and coalesce(v_prof.bio_bm, '') <> ''
       and public._try_award(p_user_id, 'local-voice') then
        v_slugs := v_slugs || 'local-voice';
    end if;

    -- Ambassador: 5+ referred profiles that are themselves complete
    if (
        select count(*) from public.profiles r
        where r.referred_by = p_user_id and public.is_profile_complete(r)
    ) >= 5
       and public._try_award(p_user_id, 'ambassador') then
        v_slugs := v_slugs || 'ambassador';
    end if;

    return query select * from public.badges where slug = any(v_slugs);
end;
$$;
grant execute on function public.check_and_award_badges(uuid) to authenticated;

-- ── resolve_referrer: turn a ?ref=<username> into a user id ─────────────────
--  Public (mirrors username_available / validate_invite) — must work
--  pre-auth, since it runs on the join page before sign-in completes.
create or replace function public.resolve_referrer(p_username text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select id from public.profiles where lower(username) = lower(p_username) and status = 'active';
$$;
grant execute on function public.resolve_referrer(text) to anon, authenticated;

-- ── admin_mark_verified: the one manually-awarded badge ──────────────────────
--  Routes through a function (not a raw admin update + insert) so all ten
--  badges are awarded through server-side logic uniformly, matching the
--  invariant migration 009's RLS comment establishes for the other nine.
create or replace function public.admin_mark_verified(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not (select public.is_admin()) then
        raise exception 'Not authorized';
    end if;

    update public.profiles
       set verified = true, verified_at = now()
     where id = p_user_id;

    perform public._try_award(p_user_id, 'verified-talent');
end;
$$;
grant execute on function public.admin_mark_verified(uuid) to authenticated;
