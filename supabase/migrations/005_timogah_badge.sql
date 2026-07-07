-- Grant the Timogah badge to @timogah (not pickable in the join/edit UI).
update public.profiles
set
    org_photo  = 'photos/badges/timogah-icon.svg',
    org_photos = '["photos/badges/timogah-icon.svg"]'::jsonb,
    updated_at = now()
where lower(username) = 'timogah';