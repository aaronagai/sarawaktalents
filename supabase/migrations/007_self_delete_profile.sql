-- ============================================================================
--  Migration 007 — self-service profile deletion
--
--  "Delete my profile" on the edit-profile screen lets a member remove their
--  own directory listing. The delete policy previously only allowed admins;
--  this widens it to match the existing self-service update/insert policies
--  (id = auth.uid()) while keeping the admin override.
-- ============================================================================

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
    for delete using (id = (select auth.uid()) or (select public.is_admin()));
