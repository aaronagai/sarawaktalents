-- Multi-select industries on profiles. Keep legacy `industry` text as the
-- primary (first) value for older readers / Complete Profile checks.
alter table public.profiles
  add column if not exists industries jsonb not null default '[]'::jsonb;

update public.profiles
set industries = jsonb_build_array(btrim(industry))
where coalesce(btrim(industry), '') <> ''
  and industries = '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
