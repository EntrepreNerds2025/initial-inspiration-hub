-- Optional passwords; existing galleries retain password-required behavior.
-- Prepared only: requires approval before applying.
begin;
create table dept_gallery_private.access_settings (
 gallery_id uuid primary key references public.dept_galleries on delete cascade,
 password_required boolean not null default true,
 share_key text not null default encode(extensions.gen_random_bytes(32),'hex') check(share_key ~ '^[a-f0-9]{64}$')
);
alter table dept_gallery_private.access_settings enable row level security;
revoke all on dept_gallery_private.access_settings from public,anon,authenticated;
create or replace function public.gallery_save_phase2(p_gallery jsonb, p_password text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid; old public.dept_galleries; vis text; stat text;
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 gid=coalesce(nullif(p_gallery->>'id','')::uuid,gen_random_uuid());
 select * into old from public.dept_galleries where id=gid for update;
 if found and old.revision<>coalesce((p_gallery->>'revision')::integer,-1) then raise exception 'Collection changed elsewhere. Refresh before saving.'; end if;
 vis=coalesce(p_gallery->>'visibility','private'); stat=coalesce(p_gallery->>'status','draft');
 if p_password is not null and (char_length(p_password)<4 or octet_length(p_password)>72) then raise exception 'Use at least 4 characters, up to 72 UTF-8 bytes.'; end if;
 if vis='private' and stat='published' and coalesce((p_gallery->>'password_required')::boolean,(select password_required from dept_gallery_private.access_settings where gallery_id=gid),true) and p_password is null and not exists(select 1 from dept_gallery_private.passwords where gallery_id=gid) then raise exception 'Set a password before publishing a private gallery.'; end if;
 insert into public.dept_galleries(id,slug,title,description,category,visibility,status,expires_at,sort_order,cover_photo_id)
 values(gid,p_gallery->>'slug',btrim(p_gallery->>'title'),coalesce(p_gallery->>'description',''),coalesce(p_gallery->>'category','PHOTOGRAPHY'),vis,stat,nullif(p_gallery->>'expires_at','')::timestamptz,coalesce((p_gallery->>'sort_order')::integer,0),nullif(p_gallery->>'cover_photo_id','')::uuid)
 on conflict(id) do update set slug=excluded.slug,title=excluded.title,description=excluded.description,category=excluded.category,visibility=excluded.visibility,status=excluded.status,expires_at=excluded.expires_at,sort_order=excluded.sort_order,cover_photo_id=excluded.cover_photo_id;
 if p_password is not null then
 insert into dept_gallery_private.passwords(gallery_id,password_hash) values(gid,extensions.crypt(p_password,extensions.gen_salt('bf',12)))
 on conflict(gallery_id) do update set password_hash=excluded.password_hash,updated_at=now();
 delete from dept_gallery_private.access_sessions where gallery_id=gid;
 end if;
 return gid;
end;$$;
create or replace function public.gallery_save(p_gallery jsonb,p_password text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid;
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 gid=public.gallery_save_phase2(p_gallery,p_password);
 if p_gallery ? 'download_url' then
 insert into dept_gallery_private.delivery(gallery_id,url,enabled)
 values(gid,nullif(p_gallery->>'download_url',''),coalesce((p_gallery->>'downloads_enabled')::boolean,false))
 on conflict(gallery_id) do update set url=excluded.url,enabled=excluded.enabled;
 end if;
 if p_gallery ? 'password_required' then
 if coalesce((select password_required from dept_gallery_private.access_settings where gallery_id=gid),true) is distinct from (p_gallery->>'password_required')::boolean then delete from dept_gallery_private.access_sessions where gallery_id=gid; end if;
 insert into dept_gallery_private.access_settings(gallery_id,password_required) values(gid,(p_gallery->>'password_required')::boolean)
 on conflict(gallery_id) do update set password_required=excluded.password_required,share_key=case when dept_gallery_private.access_settings.password_required<>excluded.password_required then encode(extensions.gen_random_bytes(32),'hex') else dept_gallery_private.access_settings.share_key end;
 end if;
 return gid;
end;$$;
create or replace function public.gallery_admin_list() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(g)||jsonb_build_object('passwordRequired',coalesce(a.password_required,true),'shareKey',case when not a.password_required and g.visibility='private' then a.share_key else null end,'download_url',d.url,'downloads_enabled',coalesce(d.enabled,false),'passwordConfigured',exists(select 1 from dept_gallery_private.passwords p where p.gallery_id=g.id),'photos',coalesce((select jsonb_agg(to_jsonb(p)-'original_object_key'-'preview_object_key' order by p.sort_order,p.id) from public.dept_gallery_photos p where p.gallery_id=g.id),'[]'::jsonb)) order by g.sort_order,g.created_at) from public.dept_galleries g left join dept_gallery_private.delivery d on d.gallery_id=g.id left join dept_gallery_private.access_settings a on a.gallery_id=g.id),'[]'::jsonb);
end;$$;
create or replace function public.gallery_unlock(p_slug text,p_password text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.dept_galleries; hash text; token text; bucket_id integer; n integer; until_time timestamptz;
begin
 if p_slug is null or length(p_slug)>100 or p_password is null or octet_length(p_password)>72 then return jsonb_build_object('state','invalid'); end if;
 -- Hash collisions deliberately share a budget. One row per bucket, atomic updates serialize attempts.
 bucket_id=(hashtextextended(p_slug,0)&4095)::integer;
 insert into dept_gallery_private.access_limits(bucket,window_start,attempts) values(bucket_id,now(),1)
 on conflict(bucket) do update set attempts=case when dept_gallery_private.access_limits.window_start<now()-interval '15 minutes' then 1 else dept_gallery_private.access_limits.attempts+1 end,
 window_start=case when dept_gallery_private.access_limits.window_start<now()-interval '15 minutes' then now() else dept_gallery_private.access_limits.window_start end returning attempts into n;
 if n>10 then return jsonb_build_object('state','rate-limited'); end if;
 select * into g from public.dept_galleries where slug=p_slug for update;
 select password_hash into hash from dept_gallery_private.passwords where gallery_id=g.id;
 if exists(select 1 from dept_gallery_private.access_settings where gallery_id=g.id and not password_required) then return jsonb_build_object('state','invalid'); end if;
 if hash is null or extensions.crypt(p_password,hash)<>hash then return jsonb_build_object('state','invalid'); end if;
 if g.status<>'published' or g.visibility<>'private' or (g.expires_at is not null and g.expires_at<=now()) then return jsonb_build_object('state','expired'); end if;
 token=encode(extensions.gen_random_bytes(32),'hex'); until_time=least(now()+interval '15 minutes',coalesce(g.expires_at,now()+interval '15 minutes'));
 delete from dept_gallery_private.access_sessions where expires_at<=now();
 insert into dept_gallery_private.access_sessions(token_hash,gallery_id,expires_at) values(encode(extensions.digest(token,'sha256'),'hex'),g.id,until_time);
 return jsonb_build_object('state','unlocked','token',token,'expires_at',until_time,'gallery',dept_gallery_private.presentation(g.id));
end;$$;
create function public.gallery_unlock_link(p_slug text,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.dept_galleries; token text; until_time timestamptz;
begin
 if p_key is null or p_key !~ '^[a-f0-9]{64}$' then return jsonb_build_object('state','invalid'); end if;
 select * into g from public.dept_galleries where slug=p_slug for update;
 if not found or not exists(select 1 from dept_gallery_private.access_settings where gallery_id=g.id and not password_required and share_key=p_key) then return jsonb_build_object('state','invalid'); end if;
 if g.visibility<>'private' or g.status<>'published' or (g.expires_at is not null and g.expires_at<=now()) then return jsonb_build_object('state','expired'); end if;
 token=encode(extensions.gen_random_bytes(32),'hex');until_time=least(now()+interval '15 minutes',coalesce(g.expires_at,now()+interval '15 minutes'));
 delete from dept_gallery_private.access_sessions where expires_at<=now();
 insert into dept_gallery_private.access_sessions(token_hash,gallery_id,expires_at) values(encode(extensions.digest(token,'sha256'),'hex'),g.id,until_time);
 return jsonb_build_object('state','unlocked','token',token,'expires_at',until_time);
end;$$;
create function public.gallery_save_access(p_gallery jsonb,p_password text default null) returns uuid language sql security invoker set search_path='' as $$select public.gallery_save(p_gallery,p_password);$$;
revoke all on function public.gallery_unlock_link(text,text),public.gallery_save_access(jsonb,text) from public,anon,authenticated;
grant execute on function public.gallery_unlock_link(text,text) to anon,authenticated;
grant execute on function public.gallery_save_access(jsonb,text) to authenticated;
commit;
