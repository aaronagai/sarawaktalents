-- ============================================================================
--  Helper query (NOT a migration — safe read-only SELECT).
--
--  Finds existing profiles whose fields would read awkwardly under the
--  grammar-proof profile line, so they can be nudged to edit (or hand-fixed):
--    1. job title == industry   → e.g. "Legal in Legal"
--    2. industry is free-text not in the canonical ST_INDUSTRIES list
--       (paste the current list from industries.js into the VALUES below)
--
--  Run in the Supabase SQL editor. Fix by editing the profile in the app.
-- ============================================================================

-- 1) Title duplicates industry (reads "works in X" now, but worth tidying):
select id, username, name, role, industry, category
from public.profiles
where role is not null
  and industry is not null
  and lower(btrim(role)) = lower(btrim(industry))
order by name;

-- 2) Industry is off the canonical list (free-text entered before the dropdown).
--    Keep this VALUES list in sync with window.ST_INDUSTRIES in industries.js.
select id, username, name, role, industry, category
from public.profiles
where industry is not null
  and lower(btrim(industry)) not in (
    'technology','oil & gas','agriculture','healthcare','education',
    'finance & banking','tourism & hospitality','manufacturing','construction',
    'retail & e-commerce','media & creative arts','government & public service',
    'non-profit & ngo','logistics & transportation','energy & utilities',
    'food & beverage','real estate','legal services','telecommunications',
    'fashion & design','sports & fitness','environmental & sustainability'
  )
order by industry, name;
