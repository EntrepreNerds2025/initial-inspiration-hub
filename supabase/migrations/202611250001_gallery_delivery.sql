-- Phase 3 additive migration. Review/approve before applying. No existing records removed.
begin;
alter table public.dept_gallery_photos alter column original_object_key drop not null;
alter table public.dept_gallery_photos add column preview_file_size bigint check(preview_file_size between 1 and 2097152);
alter table dept_gallery_private.storage_deletions alter column original_object_key drop not null;
create table dept_gallery_private.delivery (
 gallery_id uuid primary key references public.dept_galleries on delete cascade,
 url text, enabled boolean not null default false,
 constraint enabled_requires_url check(not enabled or url is not null)
);
create table dept_gallery_private.preview_uploads (
 id uuid primary key, gallery_id uuid not null references public.dept_galleries on delete cascade,
 actor uuid not null references auth.users on delete cascade, photo_id uuid not null, replacing boolean not null,
 object_key text not null unique, filename text not null, original_bytes bigint not null,
 preview_bytes bigint not null, width integer not null,height integer not null,
 created_at timestamptz not null default now(), completed boolean not null default false
);
alter table dept_gallery_private.delivery enable row level security;
alter table dept_gallery_private.preview_uploads enable row level security;
revoke all on dept_gallery_private.delivery,dept_gallery_private.preview_uploads from public,anon,authenticated;
create index gallery_upload_expiry on dept_gallery_private.preview_uploads(created_at) where not completed;
-- Exact verified UGREEN hosts only. Do not allow wildcard domains, IPs or arbitrary redirects.
create function dept_gallery_private.valid_delivery_url(u text) returns boolean language sql immutable set search_path='' as $$
 select u is null or (length(u)<=2048 and u ~ '^https://(ug[.]link|www[.]ug[.]link)/[a-zA-Z0-9_-]+/filemgr/share-download/[?]id=[a-f0-9]{32}$')
 or (length(u)<=2048 and u ~ '^https://dept-hq[.]us25[.]ug[.]link/filemgr/share-download/[?]id=[a-f0-9]{32}$');
$$;
alter table dept_gallery_private.delivery add constraint verified_share_url check(dept_gallery_private.valid_delivery_url(url));
create function dept_gallery_private.actor_admin(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=uid and p.is_active and (p.role='admin' or exists(select 1 from public.gallery_admin_roles r where r.user_id=p.id)));
$$;
-- Preserve original gallery validation/revision/password behavior, adding delivery atomically.
alter function public.gallery_save(jsonb,text) rename to gallery_save_phase2;
revoke all on function public.gallery_save_phase2(jsonb,text) from public,anon,authenticated;
create function public.gallery_save(p_gallery jsonb,p_password text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid;
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 gid=public.gallery_save_phase2(p_gallery,p_password);
 if p_gallery ? 'download_url' then
 insert into dept_gallery_private.delivery(gallery_id,url,enabled)
 values(gid,nullif(p_gallery->>'download_url',''),coalesce((p_gallery->>'downloads_enabled')::boolean,false))
 on conflict(gallery_id) do update set url=excluded.url,enabled=excluded.enabled;
 end if;
 return gid;
end;$$;
create or replace function public.gallery_admin_list() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(g)||jsonb_build_object('download_url',d.url,'downloads_enabled',coalesce(d.enabled,false),'passwordConfigured',exists(select 1 from dept_gallery_private.passwords p where p.gallery_id=g.id),'photos',coalesce((select jsonb_agg(to_jsonb(p)-'original_object_key'-'preview_object_key' order by p.sort_order,p.id) from public.dept_gallery_photos p where p.gallery_id=g.id),'[]'::jsonb)) order by g.sort_order,g.created_at) from public.dept_galleries g left join dept_gallery_private.delivery d on d.gallery_id=g.id),'[]'::jsonb);
end;$$;
-- This manifest is SERVICE ONLY. It never goes directly to a browser.
create function public.gallery_media_manifest(p_slug text,p_token text default null,p_actor uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.dept_galleries; until_time timestamptz; session_end timestamptz; isadmin boolean; d dept_gallery_private.delivery;
begin
 isadmin=coalesce(dept_gallery_private.actor_admin(p_actor),false);
 select * into g from public.dept_galleries where slug=p_slug;
 if not found then return jsonb_build_object('state','locked'); end if;
 until_time=now()+interval '120 seconds';
 if not isadmin then
 if g.status<>'published' or (g.expires_at is not null and g.expires_at<=now()) then return jsonb_build_object('state','locked'); end if;
 until_time=least(until_time,coalesce(g.expires_at,until_time));
 if g.visibility='private' then
 select expires_at into session_end from dept_gallery_private.access_sessions where gallery_id=g.id and token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
 if not found then return jsonb_build_object('state','locked'); end if;
 until_time=least(until_time,session_end);
 end if;
 end if;
 select * into d from dept_gallery_private.delivery where gallery_id=g.id;
 return jsonb_build_object('state',case when g.visibility='public' then 'public' else 'authorized' end,'ttl',greatest(0,floor(extract(epoch from until_time-now()))),'download_url',case when d.enabled and g.status='published' and (g.expires_at is null or g.expires_at>now()) then d.url else null end,
 'gallery',dept_gallery_private.presentation(g.id)||jsonb_build_object('cover_photo_id',g.cover_photo_id,'photos',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'filename',p.filename,'width',p.width,'height',p.height,'alt',p.filename,'credit_url','','preview_bytes',p.preview_file_size,'key',p.preview_object_key) order by p.sort_order,p.id) from public.dept_gallery_photos p where p.gallery_id=g.id and p.preview_file_size is not null),'[]'::jsonb)));
end;$$;
create function public.gallery_preview_reserve(p_actor uuid,p_upload uuid,p_gallery uuid,p_replace uuid,p_filename text,p_original bigint,p_bytes bigint,p_width integer,p_height integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare u dept_gallery_private.preview_uploads; pid uuid;
begin
 if not dept_gallery_private.actor_admin(p_actor) then raise exception 'Administrator access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(250011);
 select * into u from dept_gallery_private.preview_uploads where id=p_upload;
 if found then
 if u.actor<>p_actor or u.gallery_id<>p_gallery then raise exception 'Upload conflict'; end if;
 return to_jsonb(u);
 end if;
 perform 1 from public.dept_galleries where id=p_gallery for update;
 if not found then raise exception 'Gallery no longer exists'; end if;
 if length(p_filename) not between 1 and 255 or p_original not between 1 and 83886080 or p_bytes not between 1 and 2097152 or p_width not between 1 and 2048 or p_height not between 1 and 2048 then raise exception 'Invalid optimized JPEG'; end if;
 if (select coalesce(sum(preview_file_size),0) from public.dept_gallery_photos)+(select coalesce(sum(preview_bytes),0) from dept_gallery_private.preview_uploads where not completed)+p_bytes>943718400 then raise exception 'Preview budget reached (900 MB). Remove unused previews first.'; end if;
 if p_replace is not null and not exists(select 1 from public.dept_gallery_photos where id=p_replace and gallery_id=p_gallery) then raise exception 'Photo no longer exists'; end if;
 pid=coalesce(p_replace,gen_random_uuid());
 insert into dept_gallery_private.preview_uploads(id,gallery_id,actor,photo_id,replacing,object_key,filename,original_bytes,preview_bytes,width,height)
 values(p_upload,p_gallery,p_actor,pid,p_replace is not null,p_gallery::text||'/'||gen_random_uuid()::text||'.jpg',p_filename,p_original,p_bytes,p_width,p_height) returning * into u;
 return to_jsonb(u);
end;$$;
create function public.gallery_preview_finish(p_actor uuid,p_upload uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare u dept_gallery_private.preview_uploads; oldkey text;
begin
 if not dept_gallery_private.actor_admin(p_actor) then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into u from dept_gallery_private.preview_uploads where id=p_upload and actor=p_actor for update;
 if not found then raise exception 'Upload not reserved'; end if;
 if u.completed then return u.photo_id; end if;
 if u.created_at<now()-interval '30 minutes' then raise exception 'Upload expired'; end if;
 perform 1 from public.dept_galleries where id=u.gallery_id for update;
 if not found then raise exception 'Gallery no longer exists'; end if;
 if not exists(select 1 from storage.objects where bucket_id='dept-gallery-previews' and name=u.object_key) then raise exception 'Preview not stored'; end if;
 if u.replacing then
 select preview_object_key into oldkey from public.dept_gallery_photos where id=u.photo_id and gallery_id=u.gallery_id for update;
 if not found then raise exception 'Photo no longer exists'; end if;
 update public.dept_gallery_photos set filename=u.filename,original_object_key=null,preview_object_key=u.object_key,width=u.width,height=u.height,original_file_size=u.original_bytes,preview_file_size=u.preview_bytes,content_type='image/jpeg' where id=u.photo_id;
 insert into dept_gallery_private.storage_deletions(preview_object_key) values(oldkey);
 else
 insert into public.dept_gallery_photos(id,gallery_id,filename,preview_object_key,width,height,original_file_size,preview_file_size,content_type,sort_order)
 values(u.photo_id,u.gallery_id,u.filename,u.object_key,u.width,u.height,u.original_bytes,u.preview_bytes,'image/jpeg',coalesce((select max(sort_order)+1 from public.dept_gallery_photos where gallery_id=u.gallery_id),0));
 end if;
 update dept_gallery_private.preview_uploads set completed=true where id=u.id;
 update public.dept_galleries set cover_photo_id=coalesce(cover_photo_id,u.photo_id),updated_at=now() where id=u.gallery_id;
 return u.photo_id;
end;$$;
-- Deleted galleries also queue unfinished uploads, before their reservation FK cascades.
create function dept_gallery_private.upload_removed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not old.completed then insert into dept_gallery_private.storage_deletions(preview_object_key) values(old.object_key); end if;
 return old;
end;$$;
create trigger gallery_upload_removed before delete on dept_gallery_private.preview_uploads for each row execute function dept_gallery_private.upload_removed();
create function public.gallery_preview_cleanup(p_ack bigint[] default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 delete from dept_gallery_private.storage_deletions where id=any(p_ack) and not exists(select 1 from public.dept_gallery_photos where preview_object_key=dept_gallery_private.storage_deletions.preview_object_key);
 delete from dept_gallery_private.preview_uploads where created_at<now()-interval '1 hour';
 return coalesce((select jsonb_agg(to_jsonb(q)) from (select d.id,d.preview_object_key from dept_gallery_private.storage_deletions d where not exists(select 1 from public.dept_gallery_photos p where p.preview_object_key=d.preview_object_key) and not exists(select 1 from dept_gallery_private.preview_uploads u where u.object_key=d.preview_object_key and not u.completed) order by d.id limit 100) q),'[]'::jsonb);
end;$$;
revoke all on all functions in schema dept_gallery_private from public,anon,authenticated;
revoke all on function public.gallery_save(jsonb,text) from public,anon;
grant execute on function public.gallery_save(jsonb,text) to authenticated;
revoke all on function public.gallery_media_manifest(text,text,uuid),public.gallery_preview_reserve(uuid,uuid,uuid,uuid,text,bigint,bigint,integer,integer),public.gallery_preview_finish(uuid,uuid),public.gallery_preview_cleanup(bigint[]) from public,anon,authenticated;
grant execute on function public.gallery_media_manifest(text,text,uuid),public.gallery_preview_reserve(uuid,uuid,uuid,uuid,text,bigint,bigint,integer,integer),public.gallery_preview_finish(uuid,uuid),public.gallery_preview_cleanup(bigint[]) to service_role;
create function public.gallery_save_delivery(p_gallery jsonb,p_password text default null) returns uuid language sql security invoker set search_path='' as $$select public.gallery_save(p_gallery,p_password);$$;
revoke all on function public.gallery_save_delivery(jsonb,text) from public,anon;
grant execute on function public.gallery_save_delivery(jsonb,text) to authenticated;
-- New private bucket only. Existing buckets/auth/storage policies are unchanged.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('dept-gallery-previews','dept-gallery-previews',false,2097152,array['image/jpeg']);
-- No object policies: only the role-checked Edge Function may upload/sign/delete.
commit;
