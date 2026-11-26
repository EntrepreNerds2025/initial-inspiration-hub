-- PREPARED LOCALLY ONLY. Approval required. No scheduler, send, billing, Auth or storage changes.
begin;
create table dept_gallery_private.email_controls (
 id boolean primary key default true check(id), enabled boolean not null default false,
 verified_until timestamptz, daily_limit integer not null default 80 check(daily_limit between 1 and 80),
 monthly_limit integer not null default 2400 check(monthly_limit between 1 and 2400),
 blocked_until timestamptz, last_run timestamptz
);
insert into dept_gallery_private.email_controls(id) values(true);
create table dept_gallery_private.email_settings (
 gallery_id uuid primary key references public.dept_galleries(id) on delete cascade,
 draft jsonb not null, revision integer not null default 1, updated_at timestamptz not null default now()
);
create table dept_gallery_private.email_outbox (
 id uuid primary key default gen_random_uuid(), gallery_id uuid references public.dept_galleries(id) on delete set null,
 recipient text not null, kind text not null check(kind in ('delivery','reminder','expiration')),
 dedupe text not null unique, settings_revision integer not null, fingerprint text not null,
 snapshot jsonb, status text not null default 'queued' check(status in ('queued','sending','accepted','delivered','delayed','bounced','complained','failed','held','cancelled','skipped','unknown')),
 due_at timestamptz not null, deadline timestamptz not null,
 created_at timestamptz not null default now(), first_attempt timestamptz, attempts integer not null default 0,
 lease uuid, lease_until timestamptz, provider_id text unique, accepted_at timestamptz, reason text,
 unique(gallery_id,kind,dedupe)
);
create index gallery_email_due on dept_gallery_private.email_outbox(due_at) where status in ('queued','held','sending');
create index gallery_email_history on dept_gallery_private.email_outbox(gallery_id,created_at desc);
create table dept_gallery_private.email_events (
 event_id text primary key, provider_id text not null, status text not null, occurred_at timestamptz not null,
 created_at timestamptz not null default now()
);
create table dept_gallery_private.email_usage (
 job_id uuid references dept_gallery_private.email_outbox(id) on delete cascade,
 reserved_at timestamptz not null default now(),
 reserved_day date not null default ((now() at time zone 'UTC')::date), primary key(job_id,reserved_day)
);
create index gallery_email_usage_time on dept_gallery_private.email_usage(reserved_at);
create table dept_gallery_private.email_suppression (recipient text primary key, reason text not null);
alter table dept_gallery_private.email_controls enable row level security;
alter table dept_gallery_private.email_settings enable row level security;
alter table dept_gallery_private.email_outbox enable row level security;
alter table dept_gallery_private.email_events enable row level security;
alter table dept_gallery_private.email_usage enable row level security;
alter table dept_gallery_private.email_suppression enable row level security;
revoke all on dept_gallery_private.email_controls,dept_gallery_private.email_settings,dept_gallery_private.email_outbox,dept_gallery_private.email_events,dept_gallery_private.email_usage,dept_gallery_private.email_suppression from public,anon,authenticated;

create function dept_gallery_private.email_fingerprint(g public.dept_galleries) returns text language sql stable set search_path='' as $$
 select md5(concat(g.slug,'|',g.title,'|',g.status,'|',g.visibility,'|',extract(epoch from g.expires_at),'|',a.password_required,'|',a.share_key)) from (select 1) t left join dept_gallery_private.access_settings a on a.gallery_id=g.id;
$$;
create function dept_gallery_private.email_snapshot(g public.dept_galleries,d jsonb,k text) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('recipient',d->>'recipient','client_name',d->>'client_name','subject',d->>(k||'_subject'),'body',d->>(k||'_body'),'gallery_title',g.title,'slug',g.slug,'expires_at',g.expires_at,'password_required',g.visibility='private' and coalesce(a.password_required,true),'share_key',case when g.visibility='private' and not a.password_required then a.share_key else null end) from (select 1) t left join dept_gallery_private.access_settings a on a.gallery_id=g.id;
$$;
create function public.gallery_email_state(p_gallery_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c dept_gallery_private.email_controls;
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into c from dept_gallery_private.email_controls;
 return jsonb_build_object('settings',(select to_jsonb(s) from dept_gallery_private.email_settings s where gallery_id=p_gallery_id),
 'controls',to_jsonb(c),'daily_used',(select count(*) from dept_gallery_private.email_usage where reserved_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'),
 'monthly_used',(select count(*) from dept_gallery_private.email_usage where reserved_at>now()-interval '31 days'),
 'history',coalesce((select jsonb_agg(h order by h.created_at desc) from (select id,kind,recipient,status,due_at,deadline,created_at,attempts,reason,accepted_at from dept_gallery_private.email_outbox where gallery_id=p_gallery_id order by created_at desc limit 50) h),'[]'::jsonb));
end;$$;
create function public.gallery_email_save(p_gallery_id uuid,p_draft jsonb,p_revision integer) returns integer language plpgsql security definer set search_path='' as $$
declare s dept_gallery_private.email_settings; k text; v text; r integer;
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 perform 1 from public.dept_galleries where id=p_gallery_id for update;
 if not found then raise exception 'Gallery unavailable'; end if;
 if length(p_draft::text)>16000 then raise exception 'Message is too long'; end if;
 p_draft=jsonb_build_object('recipient',lower(btrim(p_draft->>'recipient')),'client_name',coalesce(p_draft->>'client_name',''),'reminder',coalesce((p_draft->>'reminder')::boolean,true),'expiration',coalesce((p_draft->>'expiration')::boolean,false)) || (p_draft - 'recipient' - 'client_name' - 'reminder' - 'expiration');
 if coalesce(p_draft->>'recipient','') !~ '^[^[:space:]@,;<>]+@[^[:space:]@,;<>]+\.[^[:space:]@,;<>]+$' or length(p_draft->>'recipient')>254 then raise exception 'Enter one valid recipient'; end if;
 if length(p_draft->>'client_name')>120 or p_draft->>'client_name' ~ '[<>\r\n]' then raise exception 'Invalid client name'; end if;
 foreach k in array array['delivery','reminder','expiration'] loop
 if coalesce(length(btrim(p_draft->>(k||'_subject'))),0) not between 1 and 160 or p_draft->>(k||'_subject') ~ '[\r\n]' or coalesce(length(btrim(p_draft->>(k||'_body'))),0) not between 1 and 4000 then raise exception 'Invalid subject or message length'; end if;
 v=(p_draft->>(k||'_subject'))||E'\n'||(p_draft->>(k||'_body'));
 if v ~* '[<>]|https?:|www\.|ug\.link|share-download|\y[[:alnum:]_-]+\.[a-z]{2,}([/[:space:]]|$)' or regexp_replace(v,'\{\{(client_name|gallery_title|expiration)\}\}','','g') ~ '\{\{[^}]+\}\}' then raise exception 'No links, HTML or unsupported placeholders in email text'; end if;
 end loop;
 select * into s from dept_gallery_private.email_settings where gallery_id=p_gallery_id for update;
 if coalesce(s.revision,0)<>p_revision then raise exception 'Email changed elsewhere. Refresh first.'; end if;
 if s.draft=p_draft then return s.revision; end if;
 insert into dept_gallery_private.email_settings(gallery_id,draft) values(p_gallery_id,p_draft)
 on conflict(gallery_id) do update set draft=excluded.draft,revision=dept_gallery_private.email_settings.revision+1,updated_at=now() returning revision into r;
 update dept_gallery_private.email_outbox set status=case when status='sending' then 'unknown' else 'cancelled' end,reason='Email settings changed',snapshot=null where gallery_id=p_gallery_id and status in ('queued','held','sending');
 return r;
end;$$;
create function public.gallery_email_enqueue(p_gallery_id uuid,p_revision integer) returns uuid language plpgsql security definer set search_path='' as $$
declare g public.dept_galleries; s dept_gallery_private.email_settings; jid uuid; dk text;
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into g from public.dept_galleries where id=p_gallery_id for update;
 if not found or g.status<>'published' or g.expires_at<=now() then raise exception 'Publish an active gallery before sending'; end if;
 select * into s from dept_gallery_private.email_settings where gallery_id=g.id;
 if s.revision is null or s.revision<>p_revision then raise exception 'Save and review the current email first'; end if;
 dk='delivery/'||g.id||'/'||s.revision;
 select id into jid from dept_gallery_private.email_outbox where dedupe=dk;
 if found then return jid; end if;
 if not exists(select 1 from dept_gallery_private.email_controls where enabled and verified_until>now()) then raise exception 'Email sending is disabled pending free-plan setup approval'; end if;
 if (select count(*) from dept_gallery_private.email_outbox)>20000 or pg_database_size(current_database())>450000000 then raise exception 'Email storage safety limit reached'; end if;
 insert into dept_gallery_private.email_outbox(gallery_id,recipient,kind,dedupe,settings_revision,fingerprint,snapshot,due_at,deadline)
 values(g.id,s.draft->>'recipient','delivery',dk,s.revision,dept_gallery_private.email_fingerprint(g),dept_gallery_private.email_snapshot(g,s.draft,'delivery'),now(),least(now()+interval '7 days',coalesce(g.expires_at,now()+interval '7 days'))) returning id into jid;
 return jid;
end;$$;
-- Invoked only by the protected service worker. Calendar arithmetic is DST-aware.
create function public.gallery_email_schedule() returns void language plpgsql security definer set search_path='' as $$
declare g public.dept_galleries; s dept_gallery_private.email_settings; k text; day date; due timestamptz; stop timestamptz;
begin
 update dept_gallery_private.email_controls set last_run=now();
 if not exists(select 1 from dept_gallery_private.email_controls where enabled and verified_until>now()) then return; end if;
 if (select count(*) from dept_gallery_private.email_outbox)>20000 or pg_database_size(current_database())>450000000 then return; end if;
 for g in select * from public.dept_galleries where status='published' and expires_at>now() loop
 select * into s from dept_gallery_private.email_settings where gallery_id=g.id;
 if s.gallery_id is null or not exists(select 1 from dept_gallery_private.email_outbox where gallery_id=g.id and kind='delivery' and recipient=s.draft->>'recipient' and accepted_at is not null and status in ('accepted','delivered','delayed')) then continue; end if;
 foreach k in array array['reminder','expiration'] loop
 if not coalesce((s.draft->>k)::boolean,false) then continue; end if;
 day=(g.expires_at at time zone 'America/Toronto')::date-case when k='reminder' then 7 else 0 end;
 due=(day+time '09:00') at time zone 'America/Toronto'; stop=least((day+1)::timestamp at time zone 'America/Toronto',g.expires_at);
 insert into dept_gallery_private.email_outbox(gallery_id,recipient,kind,dedupe,settings_revision,fingerprint,snapshot,due_at,deadline,status,reason)
 values(g.id,s.draft->>'recipient',k,g.id||'/'||md5(s.draft->>'recipient')||'/'||k||'/'||extract(epoch from g.expires_at),s.revision,dept_gallery_private.email_fingerprint(g),dept_gallery_private.email_snapshot(g,s.draft,k),due,stop,case when stop<=now() or due>=stop then 'skipped' else 'queued' end,case when stop<=now() or due>=stop then 'Reminder window missed or expires before 09:00' end)
 on conflict(dedupe) do update set settings_revision=excluded.settings_revision,fingerprint=excluded.fingerprint,snapshot=excluded.snapshot,status=excluded.status,reason=excluded.reason
 where dept_gallery_private.email_outbox.attempts=0 and dept_gallery_private.email_outbox.status='cancelled';
 end loop; end loop;
 -- Bounded own-feature cleanup; durable outbox dedupe survives. No gallery or auth deletion.
 delete from dept_gallery_private.email_events where event_id in(select event_id from dept_gallery_private.email_events where created_at<now()-interval '90 days' limit 500);
 update dept_gallery_private.email_outbox set snapshot=null where status not in ('queued','held','sending') and created_at<now()-interval '7 days';
end;$$;
create function public.gallery_email_claim(p_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare j dept_gallery_private.email_outbox; c dept_gallery_private.email_controls; g public.dept_galleries; s dept_gallery_private.email_settings; daycount integer; monthcount integer; token uuid;
begin
 select * into c from dept_gallery_private.email_controls for update;
 if not c.enabled or c.verified_until is null or c.verified_until<=now() or c.blocked_until>now() then return null; end if;
 update dept_gallery_private.email_outbox set status='unknown',reason='Provider outcome needs review; automatic retry window closed',lease=null where status='sending' and lease_until<=now() and (first_attempt<now()-interval '23 hours' or attempts>=3);
 for j in select * from dept_gallery_private.email_outbox where (p_id is null or id=p_id) and due_at<=now() and (status in ('queued','held') or (status='sending' and lease_until<=now())) order by due_at for update skip locked limit 20 loop
 select * into g from public.dept_galleries where id=j.gallery_id;
 select * into s from dept_gallery_private.email_settings where gallery_id=j.gallery_id;
 if g.id is null or g.status<>'published' or g.expires_at<=now() or s.revision<>j.settings_revision or dept_gallery_private.email_fingerprint(g)<>j.fingerprint or exists(select 1 from dept_gallery_private.email_suppression where recipient=j.recipient) or (j.kind<>'delivery' and not exists(select 1 from dept_gallery_private.email_outbox d where d.gallery_id=j.gallery_id and d.recipient=j.recipient and d.kind='delivery' and d.accepted_at is not null and d.status in ('accepted','delivered','delayed'))) then
 update dept_gallery_private.email_outbox set status=case when attempts>0 then 'unknown' else 'cancelled' end,reason='Gallery, recipient or settings no longer eligible',snapshot=null where id=j.id; continue; end if;
 if j.deadline<=now() then update dept_gallery_private.email_outbox set status=case when attempts>0 then 'unknown' else 'skipped' end,reason='Send window ended',snapshot=null where id=j.id; continue; end if;
 select count(*) into daycount from dept_gallery_private.email_usage where reserved_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 select count(*) into monthcount from dept_gallery_private.email_usage where reserved_at>now()-interval '31 days';
 if not exists(select 1 from dept_gallery_private.email_usage where job_id=j.id and reserved_day=(now() at time zone 'UTC')::date) then
 if daycount>=c.daily_limit or monthcount>=c.monthly_limit then update dept_gallery_private.email_outbox set status='held',reason='Free sending budget reached' where id=j.id; return null; end if;
 insert into dept_gallery_private.email_usage(job_id) values(j.id);
 end if;
 token=gen_random_uuid();
 update dept_gallery_private.email_outbox set status='sending',lease=token,lease_until=now()+interval '5 minutes',first_attempt=coalesce(first_attempt,now()),attempts=attempts+1,reason=null where id=j.id;
 return jsonb_build_object('id',j.id,'lease',token,'snapshot',j.snapshot);
 end loop;
 return null;
end;$$;
create function public.gallery_email_finish(p_id uuid,p_lease uuid,p_result text,p_provider text default null) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from dept_gallery_private.email_controls for update;
 if p_result not in ('accepted','failed','uncertain','quota') then raise exception 'Invalid result'; end if;
 update dept_gallery_private.email_outbox set status=case when p_result='accepted' then 'accepted' when p_result='failed' then 'failed' else 'sending' end,
 provider_id=coalesce(p_provider,provider_id),accepted_at=case when p_result='accepted' then now() else accepted_at end,
 lease_until=case when p_result='quota' then now()+interval '1 hour' else now()+interval '10 minutes' end,
 reason=case when p_result='quota' then 'Provider quota/rate limit; held without paid fallback' when p_result='uncertain' then 'Uncertain provider response; same-key retry only' when p_result='failed' then 'Provider rejected message; check sender setup and recipient' end
 where id=p_id and lease=p_lease and status='sending';
 if p_result='quota' then update dept_gallery_private.email_controls set blocked_until=now()+interval '1 hour'; end if;
 -- An event may arrive before the send response is recorded. Reconcile it now.
 update dept_gallery_private.email_outbox o set status=e.status from (select status from dept_gallery_private.email_events where provider_id=p_provider order by case status when 'complained' then 5 when 'bounced' then 4 when 'failed' then 3 when 'delivered' then 2 else 1 end desc limit 1)e where o.id=p_id and o.provider_id=p_provider;
 insert into dept_gallery_private.email_suppression(recipient,reason) select recipient,status from dept_gallery_private.email_outbox where id=p_id and status in ('bounced','complained') on conflict do nothing;
end;$$;
create function public.gallery_email_event(p_event text,p_provider text,p_status text,p_time timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 if length(p_event)>200 or length(p_provider)>100 or p_status not in ('delivered','delayed','bounced','complained','failed') then return; end if;
 insert into dept_gallery_private.email_events(event_id,provider_id,status,occurred_at) values(p_event,p_provider,p_status,p_time) on conflict do nothing;
 if not found then return; end if;
 update dept_gallery_private.email_outbox set status=p_status where provider_id=p_provider and
 (case p_status when 'complained' then 5 when 'bounced' then 4 when 'failed' then 3 when 'delivered' then 2 else 1 end) >
 (case status when 'complained' then 5 when 'bounced' then 4 when 'failed' then 3 when 'delivered' then 2 when 'delayed' then 1 else 0 end);
 insert into dept_gallery_private.email_suppression(recipient,reason) select recipient,p_status from dept_gallery_private.email_outbox where provider_id=p_provider and p_status in ('bounced','complained') on conflict do nothing;
end;$$;
create function dept_gallery_private.email_cancel_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare gid uuid;
begin
 if tg_table_name='dept_galleries' then gid=old.id; else gid=old.gallery_id; end if;
 if tg_op='UPDATE' then
 if tg_table_name='dept_galleries' then
  if new.slug=old.slug and new.title=old.title and new.status=old.status and new.visibility=old.visibility and new.expires_at is not distinct from old.expires_at then return new; end if;
 elsif new=old then return new; end if;
end if;
 update dept_gallery_private.email_outbox set status=case when status='sending' then 'unknown' else 'cancelled' end,reason='Gallery access changed or gallery deleted',snapshot=null where gallery_id=gid and status in ('queued','held','sending');
 if tg_op='DELETE' then update dept_gallery_private.email_outbox set snapshot=null,recipient='[deleted]' where gallery_id=gid; return old; end if;
 return new;
end;$$;
create trigger gallery_email_changed before update or delete on public.dept_galleries for each row execute function dept_gallery_private.email_cancel_changed();
create trigger gallery_email_access_changed after update on dept_gallery_private.access_settings for each row execute function dept_gallery_private.email_cancel_changed();
revoke all on function public.gallery_email_state(uuid),public.gallery_email_save(uuid,jsonb,integer),public.gallery_email_enqueue(uuid,integer) from public,anon,authenticated;
grant execute on function public.gallery_email_state(uuid),public.gallery_email_save(uuid,jsonb,integer),public.gallery_email_enqueue(uuid,integer) to authenticated;
revoke all on function public.gallery_email_schedule(),public.gallery_email_claim(uuid),public.gallery_email_finish(uuid,uuid,text,text),public.gallery_email_event(text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.gallery_email_schedule(),public.gallery_email_claim(uuid),public.gallery_email_finish(uuid,uuid,text,text),public.gallery_email_event(text,text,text,timestamptz) to service_role;
revoke all on function dept_gallery_private.email_fingerprint(public.dept_galleries),dept_gallery_private.email_snapshot(public.dept_galleries,jsonb,text),dept_gallery_private.email_cancel_changed() from public,anon,authenticated;
-- Final eligibility check after claim; public callers cannot execute it.
create function public.gallery_email_ready(p_id uuid,p_lease uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from dept_gallery_private.email_outbox j join public.dept_galleries g on g.id=j.gallery_id join dept_gallery_private.email_settings s on s.gallery_id=g.id cross join dept_gallery_private.email_controls c where j.id=p_id and j.lease=p_lease and j.status='sending' and j.lease_until>now() and j.deadline>now() and c.enabled and c.verified_until>now() and g.status='published' and (g.expires_at is null or g.expires_at>now()) and (j.kind='delivery' or exists(select 1 from dept_gallery_private.email_outbox d where d.gallery_id=j.gallery_id and d.recipient=j.recipient and d.kind='delivery' and d.accepted_at is not null and d.status in ('accepted','delivered','delayed'))) and j.settings_revision=s.revision and j.fingerprint=dept_gallery_private.email_fingerprint(g) and not exists(select 1 from dept_gallery_private.email_suppression where recipient=j.recipient));
$$;
revoke all on function public.gallery_email_ready(uuid,uuid) from public,anon,authenticated;
grant execute on function public.gallery_email_ready(uuid,uuid) to service_role;
commit;
