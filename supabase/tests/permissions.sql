-- Run as postgres against a disposable Supabase project after the migration.
-- Every fixture is rolled back. Any failed assertion aborts the transaction.
begin;
create function pg_temp.assert_true(value boolean, message text) returns void language plpgsql as $$ begin if not coalesce(value,false) then raise exception 'FAIL: %',message; end if; end; $$;
insert into auth.users(id,email,invited_at) values
 ('90000000-0000-4000-8000-000000000001','admin@test.invalid',now()),
 ('90000000-0000-4000-8000-000000000002','viewer@test.invalid',now()),
 ('90000000-0000-4000-8000-000000000003','revoked@test.invalid',now());
set constraints auth.on_invited_user immediate;
update public.profiles set role='admin' where id='90000000-0000-4000-8000-000000000001';
update public.profiles set is_active=false where id='90000000-0000-4000-8000-000000000003';
insert into public.videos(id,title,slug,year,youtube_video_id,provider_video_id,is_draft,is_published) values
 ('91000000-0000-4000-8000-000000000001','Published draft','rls-test-published',2026,'aqz-KE-bpKQ','aqz-KE-bpKQ',true,true),
 ('91000000-0000-4000-8000-000000000002','Hidden draft','rls-test-hidden',2026,'aqz-KE-bpKQ','aqz-KE-bpKQ',true,false),
 ('91000000-0000-4000-8000-000000000003','Final','rls-test-final',2026,'aqz-KE-bpKQ','aqz-KE-bpKQ',false,true);
select pg_temp.assert_true(not has_table_privilege('anon','public.videos','select'),'anon cannot read films');
select pg_temp.assert_true(not has_table_privilege('anon','public.feedback','select'),'anon cannot read feedback');
select pg_temp.assert_true(not has_column_privilege('authenticated','public.profiles','role','update'),'viewers cannot escalate roles');
select pg_temp.assert_true(not has_table_privilege('authenticated','public.profiles','insert'),'users cannot self-create profiles');
do $$ begin
 begin insert into auth.users(id,email) values('90000000-0000-4000-8000-000000000004','uninvited@test.invalid');
 raise exception 'FAIL: non-invited signup allowed';
 exception when raise_exception then if sqlerrm <> 'Invitation required' then raise; end if; end;
end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true((select count(*)=2 from public.videos where slug like 'rls-test-%'),'viewer sees only published films');
select pg_temp.assert_true(not public.is_admin(),'viewer is not admin');
insert into public.feedback(video_id,comment) values('91000000-0000-4000-8000-000000000001','Draft feedback');
do $$ begin
 begin insert into public.feedback(video_id,comment) values('91000000-0000-4000-8000-000000000003','Not a draft');
 raise exception 'FAIL: feedback allowed on final';exception when insufficient_privilege then null;end;
 begin insert into public.videos(title,slug,year,youtube_video_id,provider_video_id) values('Bad','rls-test-bad',2026,'aqz-KE-bpKQ','aqz-KE-bpKQ');
 raise exception 'FAIL: viewer wrote film';exception when insufficient_privilege then null;end;
end; $$;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_true((select count(*)=0 from public.videos),'revoked member sees no films');
select pg_temp.assert_true((select count(*)=0 from public.feedback),'revoked member sees no feedback');
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true(public.is_admin(),'owner is admin');
select pg_temp.assert_true((select count(*)=3 from public.videos where slug like 'rls-test-%'),'admin sees unpublished films');
update public.videos set title='Updated by admin' where slug='rls-test-hidden';
select pg_temp.assert_true((select title='Updated by admin' from public.videos where slug='rls-test-hidden'),'admin may edit films');
reset role;
rollback;

-- Additional integration regression: viewers cannot mutate any administrative table.
begin;
insert into auth.users(id,email,invited_at) values ('92000000-0000-4000-8000-000000000001','permissions-viewer@test.invalid',now());
set constraints auth.on_invited_user immediate;
insert into public.categories(id,name,slug) values ('92000000-0000-4000-8000-000000000002','Test category','permissions-test');
insert into public.projects(id,title) values ('92000000-0000-4000-8000-000000000003','Test project');
set local role authenticated;
select set_config('request.jwt.claim.sub','92000000-0000-4000-8000-000000000001',true);
do $$ declare n integer; begin
 begin insert into public.categories(name,slug) values('Forbidden','forbidden'); raise exception 'FAIL: viewer created category'; exception when insufficient_privilege then null; end;
 begin insert into public.projects(title) values('Forbidden'); raise exception 'FAIL: viewer created project'; exception when insufficient_privilege then null; end;
 begin update public.profiles set role='admin' where id=auth.uid(); raise exception 'FAIL: viewer promoted self'; exception when insufficient_privilege then null; end;
 update public.categories set name='Forbidden' where slug='permissions-test'; get diagnostics n=row_count; if n<>0 then raise exception 'FAIL: viewer edited category'; end if;
 delete from public.categories where slug='permissions-test'; get diagnostics n=row_count; if n<>0 then raise exception 'FAIL: viewer deleted category'; end if;
 update public.projects set title='Forbidden' where id='92000000-0000-4000-8000-000000000003'; get diagnostics n=row_count; if n<>0 then raise exception 'FAIL: viewer edited project'; end if;
 update public.profiles set is_active=false where id=auth.uid(); get diagnostics n=row_count; if n<>0 then raise exception 'FAIL: viewer changed membership'; end if;
end; $$;
reset role;
rollback;
