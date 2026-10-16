begin;
-- Supabase inserts the Auth user before updating invited_at in the same transaction.
-- Validate the final row at commit, retaining the invitation-only database constraint.
create or replace function public.invited_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare invited_user auth.users%rowtype;
begin
 select * into invited_user from auth.users where id=new.id;
 if not found then return new; end if;
 if invited_user.invited_at is null then raise exception 'Invitation required'; end if;
 insert into public.profiles(id,email,display_name)
 values(invited_user.id,invited_user.email,split_part(invited_user.email,'@',1));
 return new;
end; $$;
drop trigger on_invited_user on auth.users;
create constraint trigger on_invited_user after insert on auth.users
 deferrable initially deferred for each row execute function public.invited_profile();
commit;
