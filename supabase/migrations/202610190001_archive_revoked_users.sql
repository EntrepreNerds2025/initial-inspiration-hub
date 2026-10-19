begin;
-- Removing a revoked user from the list preserves their account and feedback.
alter table public.profiles add column is_archived boolean not null default false;
alter table public.profiles add constraint archived_profiles_inactive check (not is_archived or not is_active);
-- Existing admin-only, non-self update RLS remains in effect.
grant update(is_archived) on public.profiles to authenticated;
commit;
