-- Field (category) is no longer collected on join/edit — only industry.
-- Complete Profile badge should not require category.
create or replace function public.is_profile_complete(p public.profiles)
returns boolean language sql immutable as $$
    select p.avatar_url is not null and p.avatar_url <> ''
       and p.bio        is not null and p.bio <> ''
       and p.industry   is not null and p.industry <> ''
       and p.links       <> '{}'::jsonb
       and p.education   <> '{}'::jsonb
$$;
