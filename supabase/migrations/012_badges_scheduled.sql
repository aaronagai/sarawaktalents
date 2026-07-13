-- ============================================================================
--  Migration 012 — badges: scheduled checks
--
--  Pioneer, Anniversary, Explorer, and Rising Star can't be decided from a
--  single user's data the way migration 011's real-time checks are — they
--  need to scan across all profiles/views. These functions are reachable
--  only via the service_role key (workers/badge-scheduler.js's Cron Trigger
--  calls run_scheduled_badge_checks() through the REST RPC endpoint), never
--  from client code — hence the explicit revoke below (Postgres grants
--  EXECUTE to PUBLIC by default on CREATE FUNCTION, unlike the harmless
--  is_admin()-style helpers elsewhere in this schema).
--
--  Safe to re-run.
-- ============================================================================

-- ── Pioneer: first 100 users to join. One-time backfill; also safe to re-run
--    daily since it's a plain on-conflict-do-nothing insert. ─────────────────
create or replace function public.run_pioneer_backfill()
returns void
language sql
security definer
set search_path = public
as $$
    insert into public.user_badges (user_id, badge_id)
    select t.id, (select id from public.badges where slug = 'pioneer')
    from (select id from public.profiles order by created_at asc limit 100) t
    on conflict (user_id, badge_id) do nothing;
$$;

-- ── Anniversary: active member for 1+ year ───────────────────────────────────
create or replace function public.run_anniversary_check()
returns void
language sql
security definer
set search_path = public
as $$
    insert into public.user_badges (user_id, badge_id)
    select p.id, (select id from public.badges where slug = 'anniversary')
    from public.profiles p
    where p.status = 'active' and p.created_at <= now() - interval '1 year'
    on conflict (user_id, badge_id) do nothing;
$$;

-- ── Explorer: viewed an active profile in each of Sarawak's 6 divisional
--    capitals (the authoritative "major zones" list — hardcoded here, not
--    client-supplied). Anonymous views (viewer_id null) can't earn this. ─────
create or replace function public.run_explorer_check()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_zones text[] := array['Kuching','Miri','Sibu','Bintulu','Sri Aman','Limbang'];
begin
    insert into public.user_badges (user_id, badge_id)
    select v.viewer_id, (select id from public.badges where slug = 'explorer')
    from (
        select pv.viewer_id, count(distinct pr.location) as zones_seen
        from public.profile_views pv
        join public.profiles pr on pr.id = pv.viewed_profile_id
        where pv.viewer_id is not null
          and pr.status = 'active'
          and pr.location = any (v_zones)
        group by pv.viewer_id
        having count(distinct pr.location) >= array_length(v_zones, 1)
    ) v
    on conflict (user_id, badge_id) do nothing;
end;
$$;

-- ── Rising Star: this calendar month's most-viewed active profile(s).
--    Delete-and-reinsert, not an is_current/expires_at column — every other
--    badge type is purely additive; adding a "current" flag for just this
--    one would force every future badge-reading query to remember to filter
--    it. Trade-off: no history of past monthly winners (acceptable — nothing
--    in the brief asks for a "hall of fame"; a separate history table can be
--    added later without touching user_badges if that's ever wanted). ───────
create or replace function public.run_rising_star_recompute()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_badge_id uuid; v_top_count bigint;
begin
    select id into v_badge_id from public.badges where slug = 'rising-star';

    delete from public.user_badges where badge_id = v_badge_id;

    select max(view_count) into v_top_count
    from (
        select pv.viewed_profile_id, count(*) as view_count
        from public.profile_views pv
        join public.profiles pr on pr.id = pv.viewed_profile_id
        where pr.status = 'active'
          and pv.created_at >= date_trunc('month', now())
        group by pv.viewed_profile_id
    ) t;

    if v_top_count is null or v_top_count = 0 then
        return;   -- no views logged this month yet — nobody holds the badge
    end if;

    insert into public.user_badges (user_id, badge_id)
    select pv.viewed_profile_id, v_badge_id
    from public.profile_views pv
    join public.profiles pr on pr.id = pv.viewed_profile_id
    where pr.status = 'active'
      and pv.created_at >= date_trunc('month', now())
    group by pv.viewed_profile_id
    having count(*) = v_top_count
    on conflict (user_id, badge_id) do nothing;
end;
$$;

-- ── dispatcher: each check isolated so one failure doesn't block the rest ────
create or replace function public.run_scheduled_badge_checks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    begin perform public.run_pioneer_backfill();   exception when others then raise warning 'pioneer backfill failed: %', sqlerrm; end;
    begin perform public.run_anniversary_check();  exception when others then raise warning 'anniversary check failed: %', sqlerrm; end;
    begin perform public.run_explorer_check();     exception when others then raise warning 'explorer check failed: %', sqlerrm; end;
    begin perform public.run_rising_star_recompute(); exception when others then raise warning 'rising star recompute failed: %', sqlerrm; end;
end;
$$;

revoke execute on function public.run_pioneer_backfill()        from public, anon, authenticated;
revoke execute on function public.run_anniversary_check()       from public, anon, authenticated;
revoke execute on function public.run_explorer_check()          from public, anon, authenticated;
revoke execute on function public.run_rising_star_recompute()   from public, anon, authenticated;
revoke execute on function public.run_scheduled_badge_checks()  from public, anon, authenticated;
