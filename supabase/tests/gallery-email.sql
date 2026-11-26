-- Isolated/transactional fixtures. Do not run against production without separate approval.
do $$
declare gid uuid=gen_random_uuid(); jid uuid; claim jsonb; state jsonb; n integer; rev integer; d jsonb; exp timestamptz;
begin
 if has_function_privilege('anon','public.gallery_email_state(uuid)','execute') or has_function_privilege('authenticated','public.gallery_email_claim(uuid)','execute') or has_table_privilege('authenticated','dept_gallery_private.email_outbox','select') then raise exception 'Email privileges leaked'; end if;
 perform set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
 begin perform public.gallery_email_state(gid); raise exception 'Viewer allowed'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
 exp=(((now() at time zone 'America/Toronto')::date+7)+time '23:59') at time zone 'America/Toronto';
 insert into public.dept_galleries(id,slug,title,status,visibility,expires_at) values(gid,'email-test','Email test','published','public',exp);
 d=jsonb_build_object('recipient','Client@Example.test','client_name','Client','reminder',true,'expiration',true,'delivery_subject','Your gallery {{gallery_title}}','delivery_body','Hi {{client_name}}, your gallery is ready.','reminder_subject','Seven days','reminder_body','Save your files.','expiration_subject','Today','expiration_body','Last day.');
 rev=public.gallery_email_save(gid,d,0);
 if public.gallery_email_save(gid,d,rev)<>rev then raise exception 'Identical save caused new send version'; end if;
 begin perform public.gallery_email_enqueue(gid,rev); raise exception 'Disabled sending allowed'; exception when raise_exception then if sqlerrm='Disabled sending allowed' then raise; end if; end;
 update dept_gallery_private.email_controls set enabled=true,verified_until=now()+interval '1 day';
 jid=public.gallery_email_enqueue(gid,rev);
 if public.gallery_email_enqueue(gid,rev)<>jid then raise exception 'Duplicate manual job'; end if;
 claim=public.gallery_email_claim(jid);
 if claim is null or not public.gallery_email_ready(jid,(claim->>'lease')::uuid) then raise exception 'Valid job not claimed'; end if;
 if public.gallery_email_claim(jid) is not null then raise exception 'Concurrent claim duplicated'; end if;
 perform public.gallery_email_finish(jid,(claim->>'lease')::uuid,'accepted','provider-test');
 perform public.gallery_email_schedule();perform public.gallery_email_schedule();
 select count(*) into n from dept_gallery_private.email_outbox where gallery_id=gid;
 if n<>3 then raise exception 'Reminder duplicate/missing: %',n; end if;
 perform public.gallery_email_event('event-test','provider-test','delivered',now());
 perform public.gallery_email_event('event-test','provider-test','delivered',now());
 perform public.gallery_email_event('event-delay','provider-test','delayed',now());
 if (select status from dept_gallery_private.email_outbox where id=jid)<>'delivered' then raise exception 'Event downgrade'; end if;
 if (select count(*) from dept_gallery_private.email_events where event_id='event-test')<>1 then raise exception 'Duplicate event'; end if;
 state=public.gallery_email_state(gid);
 if state::text like '%share_key%' or state::text like '%snapshot%' then raise exception 'History leaks access payload'; end if;
 -- Usage is serialized and never exceeds the configured gallery allowance.
 update dept_gallery_private.email_controls set daily_limit=1;
 update dept_gallery_private.email_outbox set due_at=now()-interval '1 minute',deadline=now()+interval '1 hour' where gallery_id=gid and kind='reminder';
 if public.gallery_email_claim(null) is not null then raise exception 'Daily budget exceeded'; end if;
 update dept_gallery_private.email_controls set daily_limit=80;
 claim=public.gallery_email_claim(null);
 if claim is null then raise exception 'Reminder unavailable'; end if;
 -- Editing access cancels queued work, final ready rejects already claimed job.
 update public.dept_galleries set status='draft' where id=gid;
 if public.gallery_email_ready((claim->>'id')::uuid,(claim->>'lease')::uuid) then raise exception 'Unpublished send allowed'; end if;
 if public.gallery_email_claim(null) is not null then raise exception 'Draft claim allowed'; end if;
 delete from public.dept_galleries where id=gid;
 if exists(select 1 from dept_gallery_private.email_outbox where id=jid and (gallery_id is not null or snapshot is not null or recipient<>'[deleted]')) then raise exception 'Deletion did not scrub email'; end if;
 -- Stable calendar scheduling: same Toronto 09:00 on opposite sides of DST.
 if extract(hour from (('2027-03-15'::date+time '09:00') at time zone 'America/Toronto') at time zone 'UTC')<>13 or extract(hour from (('2027-01-15'::date+time '09:00') at time zone 'America/Toronto') at time zone 'UTC')<>14 then raise exception 'DST arithmetic wrong'; end if;
end;$$;
do $$
declare gid uuid=gen_random_uuid(); jid uuid; j2 uuid; claim jsonb; r integer; d jsonb;
begin
 perform set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
 update dept_gallery_private.email_controls set enabled=true,verified_until=now()+interval '1 day',daily_limit=80,monthly_limit=2400;
 insert into public.dept_galleries(id,slug,title,status,visibility) values(gid,'email-edge-cases','Email test','published','private');
 insert into dept_gallery_private.access_settings(gallery_id,password_required) values(gid,false);
 d=jsonb_build_object('recipient','edge@example.test','client_name','Client','reminder',true,'expiration',true,'delivery_subject','Your gallery','delivery_body','Ready.','reminder_subject','Seven days','reminder_body','Save your files.','expiration_subject','Today','expiration_body','Last day.');
 r=public.gallery_email_save(gid,d,0);jid=public.gallery_email_enqueue(gid,r);
 claim=public.gallery_email_claim(jid);
 if length(claim->'snapshot'->>'share_key')<>64 then raise exception 'Private secure link missing'; end if;
 perform public.gallery_email_finish(jid,(claim->>'lease')::uuid,'uncertain');
 update dept_gallery_private.email_outbox set lease_until=now()-interval '1 minute' where id=jid;
 claim=public.gallery_email_claim(jid);
 if claim->>'id'<>jid::text then raise exception 'Retry changed identity'; end if;
 if (select count(*) from dept_gallery_private.email_usage where job_id=jid)<>1 then raise exception 'Same day retry reservation duplicated'; end if;
 update dept_gallery_private.email_outbox set lease_until=now()-interval '1 minute',first_attempt=now()-interval '24 hours' where id=jid;
 claim=public.gallery_email_claim(jid);
 if claim is not null or (select status from dept_gallery_private.email_outbox where id=jid)<>'unknown' then raise exception 'Unsafe retry after idempotency expiry'; end if;
 -- New explicit version; snapshot frozen until access changes, which revokes the job.
 d=jsonb_set(d,'{delivery_body}','"A new version."');r=public.gallery_email_save(gid,d,r);j2=public.gallery_email_enqueue(gid,r);
 update dept_gallery_private.access_settings set share_key=encode(extensions.gen_random_bytes(32),'hex') where gallery_id=gid;
 if public.gallery_email_claim(j2) is not null then raise exception 'Rotated access key still sent'; end if;
 d=jsonb_set(d,'{delivery_body}','"One more version."');r=public.gallery_email_save(gid,d,r);j2=public.gallery_email_enqueue(gid,r);
 update dept_gallery_private.email_controls set verified_until=now()-interval '1 minute';
 if public.gallery_email_claim(j2) is not null then raise exception 'Stale billing verification allowed'; end if;
 update dept_gallery_private.email_controls set verified_until=now()+interval '1 day',monthly_limit=1;
 if public.gallery_email_claim(j2) is not null then raise exception 'Monthly quota exceeded'; end if;
 update dept_gallery_private.email_controls set monthly_limit=2400;
 update public.dept_galleries set expires_at=now()-interval '1 second' where id=gid;
 if public.gallery_email_claim(j2) is not null then raise exception 'Expired gallery sent'; end if;
 begin perform public.gallery_email_enqueue(gid,r); raise exception 'Expired enqueue allowed'; exception when raise_exception then if sqlerrm='Expired enqueue allowed' then raise; end if; end;
 -- No NAS URLs/HTML can enter editable content through a direct RPC.
 d=jsonb_set(d,'{delivery_body}','"https://ug.link/private"');
 begin perform public.gallery_email_save(gid,d,r); raise exception 'NAS URL saved'; exception when raise_exception then if sqlerrm='NAS URL saved' then raise; end if; end;
end;$$;
