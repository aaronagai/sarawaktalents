-- ============================================================================
--  Migration 004 — multi-use invite codes (e.g. a shareable public code)
--
--  Single-use codes set invites.used_by (one person). That can't work for a
--  code meant for everyone, so we track claims per-user in invite_claims and
--  add a `multi_use` flag. has_claimed_invite() now checks invite_claims,
--  which works for both single- and multi-use codes.
--  Safe to re-run.
-- ============================================================================

alter table public.invites add column if not exists multi_use boolean not null default false;

-- One row per user who has been granted access (via any code).
create table if not exists public.invite_claims (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    invite_id  uuid references public.invites(id) on delete set null,
    claimed_at timestamptz not null default now()
);
alter table public.invite_claims enable row level security;

drop policy if exists invite_claims_read on public.invite_claims;
create policy invite_claims_read on public.invite_claims
    for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists invite_claims_admin on public.invite_claims;
create policy invite_claims_admin on public.invite_claims
    for all using (public.is_admin()) with check (public.is_admin());

-- Back-fill existing single-use claims so current members stay consistent.
insert into public.invite_claims (user_id, invite_id)
select used_by, id from public.invites where used_by is not null
on conflict (user_id) do nothing;

-- Is this code usable? (exists AND (multi-use OR still unused))
create or replace function public.validate_invite(p_code text)
returns boolean
language sql stable security definer set search_path = public
as $$
    select exists (
        select 1 from public.invites
        where code = p_code and (multi_use or used_by is null)
    );
$$;

-- Claim a code for the signed-in user. Records a per-user claim (grants profile
-- creation). Single-use codes also stamp used_by; multi-use codes stay open.
create or replace function public.claim_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_multi boolean; v_used uuid;
begin
    if auth.uid() is null then raise exception 'Not authenticated'; end if;

    select id, multi_use, used_by into v_id, v_multi, v_used
      from public.invites where code = p_code;

    if v_id is null then raise exception 'Invalid invite code'; end if;

    if not v_multi and v_used is not null and v_used <> auth.uid() then
        raise exception 'Invalid or already-used invite code';
    end if;

    if not v_multi then
        update public.invites set used_by = auth.uid(), used_at = now()
         where id = v_id and (used_by is null or used_by = auth.uid());
    end if;

    insert into public.invite_claims (user_id, invite_id)
    values (auth.uid(), v_id)
    on conflict (user_id) do update set invite_id = excluded.invite_id, claimed_at = now();

    return v_id;
end;
$$;

create or replace function public.has_claimed_invite()
returns boolean
language sql stable security definer set search_path = public
as $$
    select exists (select 1 from public.invite_claims where user_id = auth.uid());
$$;

-- The shareable public code — anyone can use it.
insert into public.invites (code, note, multi_use)
values ('STALENTS10', 'public shareable code', true)
on conflict (code) do update set multi_use = true;
