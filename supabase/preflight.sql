-- READ ONLY. Run on pozmyqfosfaeheiqwioh before applying the original migration.
-- If any named objects already exist, STOP and compare their definitions first.
select schemaname, tablename from pg_tables
where schemaname='public' and tablename in ('profiles','videos','projects','categories','feedback');
select routine_schema,routine_name from information_schema.routines
where routine_schema='public' and routine_name in ('is_member','is_admin','invited_profile','stamp_feedback','stamp_updated');
select trigger_name,event_manipulation,action_statement from information_schema.triggers
where event_object_schema='auth' and event_object_table='users';
select count(*) as existing_auth_users from auth.users;
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in ('profiles','videos','projects','categories','feedback');
