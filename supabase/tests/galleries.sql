-- Run inside a transaction and ROLLBACK. All gallery fixtures are disposable test records.
create function pg_temp.gallery_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAILED: %',label; end if;end;$$;
select set_config('test.gallery.admin',(select id::text from public.profiles where role='admin' and is_active limit 1),true);
select set_config('test.gallery.viewer',(select id::text from public.profiles where role='viewer' and is_active limit 1),true);
select pg_temp.gallery_assert(current_setting('test.gallery.admin')<>'' and current_setting('test.gallery.viewer')<>'','admin and viewer fixtures available');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.gallery.admin'),true);
select pg_temp.gallery_assert(public.is_gallery_admin(),'existing active admin authorized');
select public.gallery_save('{"id":"d9000000-0000-4000-8000-000000000001","slug":"phase2-test-public","title":"Disposable public","visibility":"public","status":"published"}',null);
select public.gallery_save('{"id":"d9000000-0000-4000-8000-000000000002","slug":"phase2-test-private","title":"Private title must not leak","visibility":"private","status":"published"}','gallery-test-password-2026');
select public.gallery_save('{"id":"d9000000-0000-4000-8000-000000000003","slug":"phase2-test-draft","title":"Draft","visibility":"public","status":"draft"}',null);
select public.gallery_save('{"id":"d9000000-0000-4000-8000-000000000004","slug":"phase2-test-expired","title":"Expired","visibility":"public","status":"published","expires_at":"2020-01-01T00:00:00Z"}',null);
-- Stale saves cannot overwrite newer changes.
do $$begin begin perform public.gallery_save('{"id":"d9000000-0000-4000-8000-000000000001","slug":"phase2-test-public","title":"Stale","revision":0}',null);raise exception 'stale write succeeded';exception when raise_exception then if sqlerrm='stale write succeeded' then raise;end if;end;end;$$;
select set_config('request.jwt.claim.sub',current_setting('test.gallery.viewer'),true);
select pg_temp.gallery_assert(not public.is_gallery_admin(),'viewer denied administrator access');
select pg_temp.gallery_assert((select count(*)=1 from public.dept_galleries where slug like 'phase2-test-%'),'viewer can only read public published unexpired metadata');
do $$begin
 begin perform public.gallery_admin_list();raise exception 'viewer read admin list';exception when insufficient_privilege then null;end;
 begin perform public.gallery_save('{"title":"Bad","slug":"bad"}',null);raise exception 'viewer saved';exception when insufficient_privilege then null;end;
 begin perform public.gallery_delete('d9000000-0000-4000-8000-000000000001',1);raise exception 'viewer deleted';exception when insufficient_privilege then null;end;
 begin insert into public.gallery_admin_roles(user_id) values(auth.uid());raise exception 'viewer self-promoted';exception when insufficient_privilege then null;end;
 begin perform * from dept_gallery_private.passwords;raise exception 'viewer read hashes';exception when insufficient_privilege then null;end;
end;$$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.gallery_assert((select count(*)=1 from public.dept_galleries where slug like 'phase2-test-%'),'anonymous direct RLS');
select pg_temp.gallery_assert(public.gallery_resolve('phase2-test-private')='{"state":"locked"}'::jsonb,'private identifiers disclose no metadata');
select pg_temp.gallery_assert(public.gallery_resolve('phase2-test-draft')='{"state":"locked"}'::jsonb,'draft not disclosed');
select pg_temp.gallery_assert(public.gallery_resolve('phase2-test-expired')='{"state":"locked"}'::jsonb,'expiration enforced');
select pg_temp.gallery_assert(public.gallery_resolve('does-not-exist')='{"state":"locked"}'::jsonb,'unknown indistinguishable from private');
select pg_temp.gallery_assert(public.gallery_unlock('phase2-test-private','incorrect')->>'state'='invalid','wrong password rejected');
select set_config('test.gallery.token',public.gallery_unlock('phase2-test-private','gallery-test-password-2026')->>'token',true);
select pg_temp.gallery_assert(length(current_setting('test.gallery.token'))=64,'random access token issued');
select pg_temp.gallery_assert(public.gallery_resolve('phase2-test-private',current_setting('test.gallery.token'))->>'state'='authorized','valid gallery-scoped session works');
select pg_temp.gallery_assert(not (public.gallery_resolve('phase2-test-private',current_setting('test.gallery.token'))::text like '%object_key%'),'authorized presentation contains no object keys');
select public.gallery_lock(current_setting('test.gallery.token'));
select pg_temp.gallery_assert(public.gallery_resolve('phase2-test-private',current_setting('test.gallery.token'))->>'state'='locked','lock revokes session');
select set_config('test.gallery.token',public.gallery_unlock('phase2-test-private','gallery-test-password-2026')->>'token',true);
reset role;
select pg_temp.gallery_assert((select password_hash <> 'gallery-test-password-2026' and password_hash like '$2%' from dept_gallery_private.passwords where gallery_id='d9000000-0000-4000-8000-000000000002'),'bcrypt hash stored instead of plaintext');
update dept_gallery_private.access_sessions set expires_at=now()-interval '1 second' where gallery_id='d9000000-0000-4000-8000-000000000002';
set local role anon;
select pg_temp.gallery_assert(public.gallery_resolve('phase2-test-private',current_setting('test.gallery.token'))->>'state'='locked','expired session rejected');
do $$declare i integer;r jsonb;begin for i in 1..12 loop r=public.gallery_unlock('phase2-test-private','wrong');end loop;perform pg_temp.gallery_assert(r->>'state'='rate-limited','attempts rate limited');end;$$;
reset role;
-- Reorder/cover/delete use only this gallery's photos and do not return storage keys.
insert into public.dept_gallery_photos(id,gallery_id,filename,original_object_key,preview_object_key,width,height,original_file_size,content_type) values
('d9100000-0000-4000-8000-000000000001','d9000000-0000-4000-8000-000000000001','test1.jpg','test/original1','test/preview1',100,100,1000,'image/jpeg'),
('d9100000-0000-4000-8000-000000000002','d9000000-0000-4000-8000-000000000001','test2.jpg','test/original2','test/preview2',100,100,2000,'image/jpeg');
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.gallery.admin'),true);
select public.gallery_photo_manage('d9000000-0000-4000-8000-000000000001',1,array['d9100000-0000-4000-8000-000000000002','d9100000-0000-4000-8000-000000000001']::uuid[]);
select pg_temp.gallery_assert((select sort_order=0 from public.dept_gallery_photos where id='d9100000-0000-4000-8000-000000000002'),'photo order persisted');
select public.gallery_save('{"id":"d9000000-0000-4000-8000-000000000001","slug":"phase2-test-public","title":"Disposable public","visibility":"public","status":"published","revision":2,"cover_photo_id":"d9100000-0000-4000-8000-000000000002"}',null);
select public.gallery_photo_manage('d9000000-0000-4000-8000-000000000001',3,null,'d9100000-0000-4000-8000-000000000002');
select pg_temp.gallery_assert((select cover_photo_id is null from public.dept_galleries where id='d9000000-0000-4000-8000-000000000001'),'deleted cover cleared');
select public.gallery_delete('d9000000-0000-4000-8000-000000000001',(select revision from public.dept_galleries where id='d9000000-0000-4000-8000-000000000001'));
reset role;
select pg_temp.gallery_assert((select count(*)=2 from dept_gallery_private.storage_deletions where original_object_key like 'test/original%'),'storage cleanup queued');
select 'PASS: gallery roles, RLS, CRUD, bcrypt, access sessions, expiration, rate limiting and photo metadata operations' as result;
